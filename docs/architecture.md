# Fiagro Risk Engine (FRE) - Documentação de Arquitetura

**Status:** Em Desenvolvimento
**Versão:** 1.0.0
**Stack:** Nx Monorepo (NestJS, Next.js, Python, PostgreSQL)

---

## 1. Visão Geral e Tese Acadêmica

O **Fiagro Risk Engine** é um sistema de inteligência financeira focado na predição de risco de crédito e oportunidades de arbitragem em Fundos de Investimento nas Cadeias Produtivas Agroindustriais (Fiagros).

### 1.1. O Problema

A análise tradicional de Fiagros foca em métricas passadas (Dividend Yield, P/VP). No entanto, o risco real do agronegócio é sistêmico, correlacionado e antecede os relatórios financeiros. Eventos climáticos (seca/chuva) e jurídicos (processos) impactam a solvência do devedor meses antes do *default* (calote) ser oficializado.

### 1.2. Objetivos do Sistema

1. **Risk Engine (Defensivo):** Calcular a probabilidade de inadimplência de um CRA baseada na saúde das fazendas lastreadas (Clima + Safra) e no comportamento jurídico do devedor.
2. **Market Engine (Ofensivo/Alpha):** Identificar ineficiências de preço (Panic Selling) onde o valor de mercado do fundo descola do seu valor justo calculado pelo modelo.

---

## 2. Modelagem de Domínio (Domain Driven Design)

O sistema opera sobre uma hierarquia de dados específica que conecta o mercado financeiro à realidade física do campo.

```mermaid
graph TD
    Fund[Fundo (Ex: RZAG11)] -->|Possui| Asset[Ativo (CRA/LCA)]
    Asset -->|Devedor| Debtor[Devedor (CNPJ/Grupo)]
    Debtor -->|Propriedade| Farm[Fazenda/Unidade Produtiva]
    
    Farm -.->|Monitora| Climate[Dados Climáticos (INMET/NASA)]
    Farm -.->|Monitora| Crop[Dados de Safra (CONAB)]
    Debtor -.->|Monitora| Legal[Dados Jurídicos (TJs/Diários)]
```

---

## 3. Arquitetura Técnica (Tech Stack)

O projeto utiliza uma arquitetura de **Monorepo** gerenciada pelo **Nx**, permitindo compartilhamento de tipos e código entre serviços.

| Componente | Tecnologia | Responsabilidade |
| :--- | :--- | :--- |
| **Orquestrador** | **Nx** | Build system, cache e gestão do monorepo. |
| **Backend API** | **NestJS** (Node.js) | Gateway, Regras de Negócio e Gestão de Usuários. |
| **Data Ingestion** | **Puppeteer** + **BullMQ** | Crawlers (CVM, TJs, Clima) rodando em background com filas de retentativa. |
| **ML Service** | **Python** (FastAPI) | Treinamento e inferência de modelos (Scikit-Learn/Pandas). |
| **Database** | **PostgreSQL** | Armazenamento relacional robusto. |
| **ORM** | **Prisma** | Modelagem de dados e Type-safety entre DB e Backend. |
| **Frontend** | **Next.js** (React) | Dashboard interativo e visualização de dados. |

---

## 4. Estrutura do Repositório (Folder Structure)

```text
/
├── apps/
│   ├── api/                 # (NestJS) API Principal (REST/GraphQL)
│   ├── web/                 # (Next.js) Dashboard do Investidor
│   ├── scraper-worker/      # (Node.js) Microsserviço de coleta de dados (Consumers BullMQ)
│   └── ml-service/          # (Python) Microsserviço de Inteligência Artificial
├── libs/
│   ├── core-data/           # (TS) Interfaces e Tipos compartilhados (Entity, DTOs)
│   ├── database/            # (TS) Client Prisma e Scripts de Seed
│   └── util-formatting/     # (TS) Helpers (Formatadores de Moeda, CNPJ, Data)
├── tools/                   # Scripts de automação
├── docker-compose.yml       # Infraestrutura local (Postgres, Redis)
└── schema.prisma            # Definição do Banco de Dados
```

---

## 5. Pipeline de Dados (ETL & Feature Engineering)

O fluxo de dados segue o padrão *Bronze -> Silver -> Gold*.

1. **Ingestão (Bronze):** Scripts baixam PDFs da CVM, HTML de notícias e JSONs de clima. Dados brutos são salvos ou processados imediatamente.
2. **Refinamento (Silver):** Normalização.
    * *Ex:* Converter "Saca a R$ 120" e "Ton a R$ 2000" para mesma unidade.
    * *Ex:* Vincular um CNPJ genérico a uma Lat/Long específica.
3. **Feature Store (Gold):** Dados prontos para o Modelo (Tabela `TrainingSample`).
    * Criação de métricas relativas (z-scores, médias móveis).
    * *Ex:* `rain_anomaly_30d` (Desvio padrão da chuva nos últimos 30 dias).

---

## 6. Schema do Banco de Dados (Prisma)

```prisma
// schema.prisma

model Fiagro {
  id        String   @id @default(uuid())
  ticker    String   @unique // Ex: RZAG11
  assets    Asset[]
  marketData MarketHistory[]
}

model Asset {
  id          String   @id @default(uuid())
  fiagroId    String
  fiagro      Fiagro   @relation(fields: [fiagroId], references: [id])
  name        String   // Ex: CRA Grupo X
  debtorCnpj  String?  
  sector      String   // SOJA, MILHO
  riskData    RiskSnapshot[]
}

// Séries Temporais de Mercado
model MarketHistory {
  id          String   @id @default(uuid())
  fiagroId    String
  fiagro      Fiagro   @relation(fields: [fiagroId], references: [id])
  date        DateTime @db.Date
  closePrice  Float
  volume      Float
  pvp         Float?
  
  @@unique([fiagroId, date])
}

// Dados Climáticos (Risk Drivers)
model ClimateData {
  id          String   @id @default(uuid())
  city        String
  state       String
  date        DateTime @db.Date
  precipitationMm  Float 
  historicalAvgMm  Float 
}

// Tabela de Treinamento (Feature Store)
model TrainingSample {
  idString    String   @id @default(uuid())
  ticker      String   
  referenceDate DateTime @db.Date

  // Features (X)
  feat_rain_anomaly_60d      Float? 
  feat_legal_lawsuits_count  Int?   
  feat_price_drawdown        Float?

  // Targets (Y)
  target_price_return_30d    Float? 
  target_is_default          Boolean?

  @@unique([ticker, referenceDate])
}
```

---

## 7. Estratégia de Machine Learning

### 7.1. Metodologia

Utilizaremos aprendizado supervisionado com janelas de tempo deslizantes (*Sliding Windows*).

* **Target (Y):** Evento de Default (Binário) ou Retorno do Preço em 30 dias (Regressão).
* **Features (X):** Dados defasados (Lagged) de T-30, T-60 e T-90 dias.

### 7.2. Modelos

1. **Detecção de Anomalias (Isolation Forest):** Para identificar comportamentos fora do padrão (ex: aumento súbito de processos jurídicos).
2. **Scoring (XGBoost):** Para atribuir uma nota de 0 a 100 para o risco de crédito do devedor.

---

## 8. Guia de Implementação (Passos Iniciais)

1. **Setup:** Inicializar o workspace Nx e subir containers Docker (Postgres/Redis).
2. **Database:** Rodar `npx prisma migrate dev` para criar as tabelas.
3. **Ingestão A (Carteiras):** Criar script em `scraper-worker` para ler PDF da CVM e popular a tabela `Asset`.
4. **Ingestão B (Mercado):** Criar script para buscar cotações históricas da B3 e popular `MarketHistory`.
5. **Dashboard:** Criar visualização simples em `apps/web` listando os Fundos e seus Ativos.
