# Quero FIAGROs – Arquitetura

**Versão:** 0.2.0  
**Status:** Produção  
**URL:** https://querofiis.vercel.app

---

## 1. Visão Geral

**Quero FIAGROs** é uma aplicação web que permite visualizar e filtrar fundos de investimento agrícola (FIAGROs) listados na B3. Os dados são obtidos em real-time via:

- **B3 API** – lista oficial de tickers cadastrados na bolsa
- **fiagro.com.br (scraping)** – preço atual, Dividend Yield (DY), P/VP, patrimônio líquido e último rendimento

A interface exibe cards por fundo com filtros avançados (preço, DY, setor) e um modal de detalhes carregado sob demanda.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript, Vite 7 |
| Estilo | Tailwind CSS 4 + daisyUI 5 |
| API (prod) | Vercel Serverless Functions (Node.js) |
| API (local) | Express.js (`local-api.ts`) |
| Scraping | axios + cheerio |
| Testes unitários | Vitest + @testing-library/react |
| Testes E2E | Playwright |
| Deploy | Vercel (framework: vite) |

---

## 3. Fluxo de Dados

```
Usuário abre a app
       │
       ▼
[React] useFiagros (passo 1)
       │  GET /api/b3-funds
       ▼
[Vercel] api/b3-funds.ts
       │  proxy → B3 API (sistemaswebb3-listados.b3.com.br)
       │  retorna: { page, results: [{ acronym, fundName, ... }] }
       ▼
[React] monta cards básicos instantaneamente (nome + ticker, demais = "—")

       │ (logo após)
       │  GET /api/fiagro-data?tickers=FGAA,SNAG,...
       ▼
[Vercel] api/fiagro-data.ts
       │  scraping → https://fiagro.com.br/
       │  cache em memória de 15 min
       │  retorna: FiagroData[]
       ▼
[React] atualiza cards com preço e DY reais

  (usuário clica em um card)
       │  GET /api/fiagro-detail?ticker=FGAA
       ▼
[Vercel] api/fiagro-detail.ts
       │  scraping → https://fiagro.com.br/fgaa11/
       │  retorna: FiagroData (com P/VP, PL, último div)
       ▼
[React] abre modal com dados completos
```

---

## 4. Estrutura de Pastas

```
querofiis/
├── api/                        # Vercel Serverless Functions
│   │                           # ⚠️  TODO arquivo .ts nesta raiz vira endpoint HTTP
│   ├── _lib/                   # ← pasta privada (Vercel ignora prefixo `_`)
│   │   ├── fiagroScraper.ts    #   scraper: parseListFromHomepage, parseDetailPage…
│   │   └── openapi-spec.ts     #   objeto OpenAPI 3.0.3 compartilhado
│   ├── __tests__/              # testes das funções e do scraper
│   ├── index.ts                # GET /api        → Swagger UI (HTML)
│   ├── ping.ts                 # GET /api/ping   → health check
│   ├── b3-funds.ts             # GET /api/b3-funds → proxy B3
│   ├── fiagro-data.ts          # GET /api/fiagro-data → scraping lista
│   ├── fiagro-detail.ts        # GET /api/fiagro-detail → scraping detalhe
│   └── openapi.ts              # GET /api/openapi → spec JSON
│
├── src/
│   ├── App.tsx                 # layout principal
│   ├── main.tsx                # entry point React
│   ├── hooks/
│   │   └── useFiagros.ts       # toda a lógica de dados, filtros e paginação
│   └── components/
│       ├── FiagroExplorer/     # componente principal (sidebar + grid + modal)
│       ├── Navbar/             # barra superior
│       ├── Footer/             # rodapé
│       └── ...                 # componentes UI reutilizáveis
│
├── public/
│   ├── fiagros.json            # snapshot estático (fallback)
│   ├── sitemap.xml
│   └── robots.txt
│
├── local-api.ts                # servidor Express para dev local (porta 3001)
├── vite.config.ts              # proxy /api/* → localhost:3001
├── vercel.json                 # configuração Vercel
└── package.json
```

---

## 5. Ambientes

### Produção (Vercel)

- Frontend estático servido pelo CDN do Vercel (output: `dist/`)
- `api/*.ts` são compilados como serverless functions automaticamente
- `api/_lib/*.ts` são arquivos privados — o Vercel ignora pastas com prefixo `_`
- `vercel.json` faz rewrite: rotas não-API (`/((?!api(/|$)).*)`) → `index.html`

### Desenvolvimento Local

```bash
yarn dev:full
```

Executa em paralelo:
- **Vite** na porta `5173` (frontend com HMR)
- **Express** (`local-api.ts`) na porta `3001`
- Vite proxeia `/api/*` → `http://localhost:3001`

---

## 6. Cache

`api/fiagro-data.ts` mantém um cache em memória (`listCache`) com TTL de **15 minutos**. Isso evita múltiplas requisições ao fiagro.com.br para diferentes usuários dentro do mesmo período de vida da instância serverless.

> Serverless functions na Vercel são descartadas após inatividade, então o cache é melhor-esforço.

---

## 7. Deploy

1. Push para `main` → Vercel triggera build automático
2. `yarn build` executa `tsc -b && vite build`
3. Funções em `api/*.ts` são detectadas e compiladas pela Vercel
4. Frontend vai para `dist/`, servido pelo CDN

Configuração relevante em [vercel.json](../vercel.json):

```json
{
  "version": 2,
  "framework": "vite",
  "outputDirectory": "dist",
  "trailingSlash": false,
  "rewrites": [
    { "source": "/((?!api(/|$)).*)", "destination": "/index.html" }
  ]
}
```
