# 🌾 Quero FIAGROs

Aplicação web para visualizar e filtrar **Fundos de Investimento nas Cadeias Produtivas Agroindustriais (FIAGROs)** listados na B3, com dados em tempo real via scraping.

🔗 **[querofiis.vercel.app](https://querofiis.vercel.app)**  
📖 **[Documentação da API](https://querofiis.vercel.app/api)**

---

## Funcionalidades

- **Lista todos os FIAGROs** cadastrados na B3 (via API oficial)
- **Dados de mercado** em tempo real: preço, Dividend Yield, P/VP, patrimônio líquido e último rendimento (via scraping do fiagro.com.br)
- **Filtros avançados**: faixa de preço, DY mínimo, P/VP e setor
- **Busca** por ticker
- **Ordenação** por DY ou preço
- **Detalhes do fundo** sob demanda (clique no card)
- **Paginação incremental** (6 cards por vez)
- **Suporte a temas** (light/dark via daisyUI)
- **"Número mágico"**: rendimento mensal estimado para R$ 1.000 investidos

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript, Vite 7 |
| Estilo | Tailwind CSS 4 + daisyUI 5 |
| API | Vercel Serverless Functions |
| Scraping | axios + cheerio |
| Testes | Vitest + Playwright |
| Deploy | Vercel |

---

## Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- Yarn

### Instalação

```bash
git clone https://github.com/ApenasGabs/querofiis.git
cd querofiis
yarn install
```

### Executar

```bash
# Frontend (Vite) + API local (Express) em paralelo
yarn dev:full

# Apenas o frontend (sem backend)
yarn dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Swagger UI (local): http://localhost:5173/api

> O Vite proxeia `/api/*` automaticamente para `localhost:3001`.

### Scripts disponíveis

```bash
yarn dev          # Frontend Vite com HMR
yarn dev:full     # Frontend + API local em paralelo
yarn build        # Build de produção (tsc + vite build)
yarn test         # Testes unitários (watch)
yarn vitest run   # Testes unitários (execução única)
yarn test:ui      # Interface visual Vitest
yarn test:coverage # Cobertura de testes
yarn e2e          # Testes E2E Playwright (headless)
yarn e2e:ui       # Testes E2E com interface visual
yarn lint         # ESLint
yarn lint:fix     # ESLint com autocorreção
```

---

## API

Documentação completa: [`/api`](https://querofiis.vercel.app/api) (Swagger UI)

| Endpoint | Descrição |
|---|---|
| `GET /api/ping` | Health check |
| `GET /api/b3-funds` | Lista FIAGROs da B3 |
| `GET /api/fiagro-data?tickers=FGAA,SNAG` | Preço e DY por tickers |
| `GET /api/fiagro-detail?ticker=FGAA` | Detalhes completos de um fundo |
| `GET /api/openapi` | Spec OpenAPI 3.0.3 em JSON |

Referência detalhada: [docs/api.md](./docs/api.md)

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/architecture.md](./docs/architecture.md) | Arquitetura, fluxo de dados, estrutura de pastas |
| [docs/api.md](./docs/api.md) | Referência completa da API REST |
| [docs/frontend.md](./docs/frontend.md) | Componentes, hook `useFiagros`, filtros |
| [docs/SETUP.md](./docs/SETUP.md) | Configuração de ambiente e ferramentas |
| [docs/RELEASE.md](./docs/RELEASE.md) | Versionamento e releases automáticas |
| [CHANGELOG.md](./CHANGELOG.md) | Histórico de versões |

---

## Licença

MIT
