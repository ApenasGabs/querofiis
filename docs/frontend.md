# Quero FIAGROs – Frontend

## Visão Geral

O frontend é uma SPA React (Single Page Application) construída com Vite. Toda a lógica de dados está centralizada no hook `useFiagros`, e a UI principal vive no componente `FiagroExplorer`.

---

## Estrutura de Componentes

```
App.tsx
└── FiagroExplorer
    ├── Sidebar (filtros avançados)
    │   ├── Price Range (slider)
    │   ├── Min DY (slider)
    │   ├── P/VP toggles (Abaixo de 1 / Acima de 1)
    │   └── Sectors (checkboxes)
    ├── Header (busca por ticker + ordenação + refresh)
    ├── Stats Bar (DY médio do mercado + top performer + "número mágico")
    ├── Grid de Cards
    │   └── FundCard (preço, DY, setor, botão de detalhe)
    └── Modal de Detalhe (P/VP, PL, último rendimento)
```

> Em mobile, a sidebar é substituída pelo drawer `#filter-drawer` do daisyUI.

---

## Hook `useFiagros`

**Arquivo:** [src/hooks/useFiagros.ts](../src/hooks/useFiagros.ts)

Centraliza todo o estado de dados, filtros, paginação e detalhe. É o único ponto de comunicação com a API.

### Estado interno

| State | Tipo | Descrição |
|---|---|---|
| `allFiagros` | `Fiagro[]` | Lista completa após scraping (sem filtros) |
| `b3Fiagros` | `Fiagro[]` | Cards básicos montados a partir da B3 (exibidos imediatamente) |
| `tickers` | `string[]` | Tickers obtidos da B3 (primeiros 25) |
| `filters` | `Filters` | Estado atual dos filtros |
| `search` | `string` | Busca por ticker |
| `sortBy` | `"dy" \| "price"` | Critério de ordenação |
| `page` | `number` | Página atual (paginação incremental) |
| `detailByTicker` | `Record<string, Fiagro>` | Cache de detalhes por ticker |
| `loadingDetailTicker` | `string \| null` | Ticker sendo carregado no momento |

### Sequência de loading

```
1. Monta → fetchTickers() → GET /api/b3-funds
   └── Exibe cards básicos instantaneamente (preco/dy/pvp = "—")

2. tickers[] populado → fetchFiagros() → GET /api/fiagro-data?tickers=...
   └── Atualiza cards com preco e dy reais do scraping

3. Usuário clica em "Ver detalhes" → fetchDetail(ticker) → GET /api/fiagro-detail?ticker=...
   └── Abre modal com P/VP, PL e último rendimento
   └── Resultado fica no cache (detailByTicker) — não refetch
```

### Interface `Filters`

```typescript
interface Filters {
  priceMin: number;    // Preço mínimo em R$ (default: 8)
  priceMax: number;    // Preço máximo em R$ (default: 110)
  dyMin: number;       // DY mínimo em % (default: 0)
  pvpBelow1: boolean;  // Exibir apenas P/VP < 1 (default: false)
  pvpFair: boolean;    // Exibir apenas P/VP >= 1 (default: false)
  sectors: string[];   // Setores permitidos; [] = todos (default: [])
}
```

> `pvpBelow1` e `pvpFair` só são aplicados quando o detalhe do fundo foi carregado (P/VP != "—").

### Filtro e ordenação

O `useMemo` aplica os filtros sobre `allFiagros` na seguinte ordem:

1. Faixa de preço (`priceMin` / `priceMax`)
2. DY mínimo (`dyMin`)
3. P/VP (se `pvpBelow1` ou `pvpFair` ativos e P/VP numérico disponível)
4. Setor (se `sectors.length > 0`)
5. Busca por ticker (substring, case-insensitive)
6. Ordenação por DY (desc) ou preço (asc)
7. Paginação incremental (`ITEMS_PER_PAGE = 6`)

### API exposta pelo hook

```typescript
interface UseFiagrosReturn {
  fiagros: Fiagro[];                           // Lista paginada e filtrada
  loading: boolean;                            // Loading do scraping principal
  error: string | null;                        // Mensagem de erro
  filters: Filters;                            // Filtros atuais
  setFilters: (filters: Filters) => void;      // Atualizar filtros
  search: string;                              // Busca atual
  setSearch: (search: string) => void;         // Atualizar busca
  sortBy: "dy" | "price";                      // Ordenação atual
  setSortBy: (sortBy: "dy" | "price") => void; // Mudar ordenação
  loadMore: () => void;                        // Carregar próxima página
  hasMore: boolean;                            // Há mais itens para carregar
  refresh: () => void;                         // Resetar e recarregar tudo
  detailByTicker: Record<string, Fiagro>;      // Cache de detalhes
  loadingDetailTicker: string | null;          // Ticker carregando detalhe
  fetchDetail: (ticker: string) => Promise<void>; // Buscar detalhe
}
```

---

## Componente `FiagroExplorer`

**Arquivo:** [src/components/FiagroExplorer/FiagroExplorer.tsx](../src/components/FiagroExplorer/FiagroExplorer.tsx)

Consome o `useFiagros` e renderiza toda a interface. Não possui estado próprio — tudo via hook.

### Métricas calculadas localmente

| Métrica | Cálculo |
|---|---|
| **DY médio do mercado** | Média de `dy` de todos os `fiagros` visíveis |
| **Top performer** | Fundo com maior `dy` na lista atual |
| **Número mágico** | `(1000 × DY/100) / 12` — rendimento mensal estimado para R$ 1.000 investidos |

### Props

Nenhuma. O componente é autossuficiente via hook.

### data-testid

| Atributo | Elemento |
|---|---|
| `data-testid="fiagro-explorer"` | `<div>` raiz do componente |

---

## Componentes UI Reutilizáveis

Localizados em `src/components/`, todos construídos sobre daisyUI + Tailwind:

| Componente | Descrição |
|---|---|
| `Alert` | Alertas de erro/sucesso |
| `Badge` | Badge de texto (setor, status) |
| `Button` | Botão com variantes (primary, ghost, etc.) |
| `Card` | Container de card |
| `Checkbox` | Checkbox com label |
| `CounterCard` | Card com valor numérico grande |
| `Divider` | Separador visual |
| `ExternalLink` | Link externo com ícone |
| `FeatureCard` | Card de feature com ícone |
| `Footer` | Rodapé da aplicação |
| `Input` | Campo de texto |
| `Label` | Label de formulário |
| `Loading` | Spinner de carregamento |
| `Logo` | Logo do projeto |
| `Navbar` | Barra de navegação superior |
| `Progress` | Barra de progresso |
| `Radio` | Radio button |
| `Textarea` | Campo de texto multilinha |
| `ThemeSelector` | Seletor de tema (light/dark) |
| `ToolItem` | Item de ferramenta/link |

---

## Temas

O `ThemeSelector` permite alternar entre temas do daisyUI. O tema selecionado é persistido no `localStorage` e aplicado via atributo `data-theme` no `<html>`.

---

## Testes

### Unitários (Vitest)

```bash
yarn test          # watch mode
yarn vitest run    # execução única
yarn test:coverage # com cobertura
```

Arquivos de teste: `src/**/__tests__/*.test.tsx`, `api/__tests__/*.test.ts`

### E2E (Playwright)

```bash
yarn e2e          # headless
yarn e2e:ui       # com interface visual
yarn e2e:debug    # modo debug
```

Arquivos de teste: `e2e/**/*.spec.ts`
