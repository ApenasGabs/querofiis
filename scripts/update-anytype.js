const token = process.env.ANYTYPE_API_KEY;
const space = 'bafyreiesudr3yvac65l3vtyfyu7oesc6cpkr2p5cluqhnhjgvch5shuugy.n5psirv676ui';
const noteId = 'bafyreifokml737ydopwz5ktw6vjv6liwcbjx6zvnencvlrc5gm2ut5ijgq';
const parentId = 'bafyreicwlrg4hk75l65qmydrylmqvtllrnm66or36coo7a4upof6qza32i';

const markdownContent = `# 🌱 querofiis (Fiagro Risk Engine)

> Sistema de inteligência de crédito e predição de risco de default para Fiagros (Fundos Agroindustriais) através de ingestão automatizada de relatórios com Lightpanda e extração estruturada de CRAs via DeepSeek V4 Flash.

---

### 📌 Ficha Técnica
- **Repositório GitHub:** https://github.com/ApenasGabs/querofiis
- **Visibilidade:** Público
- **Stack Principal:** Node.js 22 (Express + tsx), React 19, Vite 7, Tailwind CSS 4, DaisyUI 5, Lightpanda Browser, DeepSeek V4 Flash (Vercel AI Gateway), PostgreSQL, Prisma
- **Onde Roda:** Servidor Homelab gabisa (scrapers e ingestão contínua) + Local (Dashboard React Vite)
- **Status:** 🚧 Em Desenvolvimento
- **Roda no Homelab:** Sim (Scrapers B3/CVM e motor de extração em background)

---

### 🎯 1. Objetivo & Problema Resolvido
- **Por que foi construído:** A análise tradicional de Fiagros foca apenas em métricas passadas (Dividend Yield, P/VP). Contudo, o risco no agronegócio é correlacionado e antecede os balanços financeiros (secas, quebras de safra e processos jurídicos contra devedores de CRAs ocorrem meses antes do calote).
- **Casos de Uso:**
  1. **Monitoramento de Carteira de Ativos:** Leitura mensal automatizada dos relatórios gerenciais da CVM/B3 para fundos como **RZAG11** e **VGIA11**.
  2. **Extração Estruturada via LLM:** Identificação dos devedores subjacentes aos CRAs, garantias, taxas e índices de concentração.
  3. **Risk Engine Defensivo:** Predição antecipada de sinistros antes do default oficializado.

---

### 🧠 2. Arquitetura de Alto Nível & Decisões Técnicas
- **100% Node.js Unificado (ApenasTemplate):** Reutilização de componentes UI já prontos (React 19 + DaisyUI 5) e backend Express leve com tsx, evitando a sobrecarga de múltiplos microsserviços.
- **Lightpanda no lugar de Puppeteer:** Desenvolvido em Zig, o Lightpanda consome ~30MB de RAM (10x menos que o Chromium/Puppeteer de ~400MB) e inicia em <100ms, viabilizando scraping no servidor doméstico gabisa sem travar a máquina.
- **DeepSeek V4 Flash via Vercel AI Gateway:** Custo extremamente acessível ($0,08 input / $0,18 output por 1M tokens), com cache de prefixo automático e conformidade tipada estrita via Zod e Vercel AI SDK (ai).
- **Engenharia de Custos (Teto R$ 10/mês):**
  - Deduplicação por hash SHA-256 no disco (se o PDF já foi processado no mês, custo = R$ 0,00).
  - Filtro heurístico local com pdf-parse para extrair apenas páginas relevantes da carteira de crédito (~6.000 tokens por PDF).
  - Custo total projetado para os 45 Fiagros do mercado: **~R$ 0,20 a R$ 0,35 por mês**.

---

### 🚀 3. Setup Rápido & Comandos de Execução
\`\`\`bash
# Clonar repositório
git clone https://github.com/ApenasGabs/querofiis.git
cd querofiis

# Instalar dependências
npm install

# Instalar o engine do Lightpanda
npx @lightpanda/browser install

# Executar Frontend (Vite) + API Local simultaneamente
npm run dev:full
\`\`\`

---

<details>
<summary>📂 4. Estrutura de Arquivos & Diretórios (Clique para expandir)</summary>

\`\`\`text
querofiis/
├── api/                    # Serviços auxiliares de integração
│   └── fiagro-data.ts      # Tipos e utilitários da API de fundos
├── docs/                   # Documentação e especificações de arquitetura
│   └── architecture.md     # Documento de arquitetura geral (FRE)
├── src/                    # Frontend React 19 + Vite (ApenasTemplate)
│   ├── components/         # UI Components (Cards, Badges, Tables, Alerts)
│   ├── assets/             # Ícones e assets visuais
│   └── App.tsx             # Dashboard principal
├── storage/                # Armazenamento de dados local
│   └── bronze/pdfs/        # PDFs originais coletados da CVM/B3 (deduplicados por SHA-256)
├── services/               # Motor de Scraping e Extração
│   ├── scraper.service.ts  # Descoberta B3/CVM e download via Lightpanda
│   └── llm.service.ts      # Extração de CRAs via DeepSeek V4 Flash + Zod
├── local-api.ts            # Servidor Express com rotas de API e orquestração
├── package.json            # Scripts de automação e dependências
└── AGENTS.md               # Contexto de IA e integração Anytype (gabisa)
\`\`\`

</details>

<details>
<summary>⚙️ 5. Principais Funções, Módulos & Fluxo do Sistema (Clique para expandir)</summary>

### Catálogo de Módulos e Funções:
| Módulo / Arquivo | Responsabilidade | Principais Funções / Métodos |
|:---|:---|:---|
| services/scraper.service.ts | Coleta e deduplicação | findLatestReports(ticker), downloadAndDeduplicate(url, ticker) |
| services/llm.service.ts | Extração estruturada de dados | extractCraFromPdf(filePath), filterRelevantSections(text) |
| local-api.ts | Endpoints da aplicação | GET /api/b3-funds, POST /api/extract-report, GET /api/fiagro-detail |

### Fluxo de Execução de Dados:
1. **Entrada (Descoberta):** O serviço consulta a API oficial de fundos listados da B3 e CVM para recuperar os relatórios gerenciais mais recentes de RZAG11 e VGIA11.
2. **Ingestão (Bronze):** O PDF é baixado e verificado com hash SHA-256. Se já existir na pasta storage/bronze/pdfs/, o processamento é interrompido para economizar chamadas.
3. **Pré-processamento:** O arquivo é convertido em texto via pdf-parse e filtrado por termos-chave de ativos de crédito.
4. **Extração Estruturada (Silver):** O DeepSeek V4 Flash processa o texto via Vercel AI Gateway e retorna um payload JSON estritamente validado com Zod.
5. **Apresentação:** O frontend em React 19 consome a API e renderiza a carteira de crédito e métricas de risco no dashboard.

</details>

<details>
<summary>🔌 6. Variáveis de Ambiente & Configurações (Clique para expandir)</summary>

| Variável | Obrigatória? | Descrição / Exemplo |
|:---|:---|:---|
| PORT | Não (Default: 3001) | Porta da API Node.js |
| VERCEL_AI_GATEWAY_URL | Sim | https://gateway.ai.vercel.com/v1 |
| VERCEL_AI_GATEWAY_API_KEY | Sim | Chave de acesso da Vercel AI Gateway |
| DEEPSEEK_MODEL | Sim | deepseek/deepseek-chat |
| STORAGE_PATH | Não | Diretório de armazenamento da camada Bronze |

</details>

<details>
<summary>🐳 7. Backup Homelab gabisa (Docker & Deploy) (Clique para expandir)</summary>

\`\`\`yaml
# docker-compose.homelab.yml
services:
  querofiis-worker:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: querofiis-worker
    restart: unless-stopped
    environment:
      - PORT=3001
      - VERCEL_AI_GATEWAY_URL=https://gateway.ai.vercel.com/v1
      - VERCEL_AI_GATEWAY_API_KEY=\${VERCEL_AI_GATEWAY_API_KEY}
      - DEEPSEEK_MODEL=deepseek/deepseek-chat
    volumes:
      - ./storage:/app/storage
    ports:
      - "3001:3001"
\`\`\`

</details>

<details>
<summary>🧪 8. Troubleshooting & Testes (Clique para expandir)</summary>

- **Comandos de Teste:** npm test (Vitest) e npm run e2e (Playwright).
- **Problemas Conhecidos:**
  - *Lightpanda não inicializa:* Executar npx @lightpanda/browser install para baixar o binário nativo para a plataforma.
  - *Rate Limit da CVM/B3:* Utilizar cabeçalho User-Agent padrão de navegador e intervalo mínimo de 2 segundos entre downloads.

</details>
`;

async function main() {
  console.log('1. Atualizando corpo da página...');
  const resUpdate = await fetch(`http://192.168.31.60:31009/v1/spaces/${space}/objects/${noteId}`, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '🌱 querofiis — Fiagro Risk Engine',
      markdown: markdownContent,
      properties: [
        { key: 'created_in_context', objects: [parentId] }
      ]
    })
  });
  console.log('Update page status:', resUpdate.status);

  console.log('2. Vinculando à coleção/lista...');
  const resList = await fetch(`http://192.168.31.60:31009/v1/spaces/${space}/lists/${parentId}/objects`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ objects: [noteId] })
  });
  console.log('Add to list status:', resList.status);

  console.log('3. Atualizando link no Catálogo de Projetos (Pai)...');
  const resParent = await fetch(`http://192.168.31.60:31009/v1/spaces/${space}/objects/${parentId}`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const parentData = await resParent.json();
  const parentMarkdown = parentData.object.markdown;

  const targetLine = '- **querofiis** — Análise e acompanhamento de Fundos Imobiliários (FIIs).';
  const newLine = `- **[querofiis](anytype://object?objectId=${noteId}&spaceId=${space})** — Motor de inteligência de risco para Fiagros com scraper Lightpanda e DeepSeek V4 Flash.`;

  let updatedParentMarkdown = parentMarkdown;
  if (parentMarkdown.includes(targetLine)) {
    updatedParentMarkdown = parentMarkdown.replace(targetLine, newLine);
  } else {
    updatedParentMarkdown = parentMarkdown.replace(
      /- \*\*querofiis\*\*.*$/m,
      newLine
    );
  }

  const resParentPatch = await fetch(`http://192.168.31.60:31009/v1/spaces/${space}/objects/${parentId}`, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown: updatedParentMarkdown })
  });
  console.log('Update parent link status:', resParentPatch.status);
  console.log('Finalizado com sucesso!');
}

main().catch(console.error);
