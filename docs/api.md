# Quero FIAGROs – Referência da API

Base URL produção: `https://querofiis.vercel.app`  
Base URL local: `http://localhost:3001`

Documentação interativa (Swagger UI): [`/api`](https://querofiis.vercel.app/api)  
Spec JSON (OpenAPI 3.0.3): [`/api/openapi`](https://querofiis.vercel.app/api/openapi)

---

## Endpoints

### `GET /api/ping`

Health check. Confirma que a API está no ar.

**Resposta 200**
```json
{
  "pong": {
    "status": "ok",
    "timestamp": "2026-02-20T10:00:00.000Z"
  }
}
```

---

### `GET /api/b3-funds`

Retorna a lista completa de FIAGROs registrados na B3, via proxy da API oficial da bolsa.

**Resposta 200**
```json
{
  "page": {
    "pageNumber": 1,
    "pageSize": 120,
    "totalRecords": 44,
    "totalPages": 1
  },
  "results": [
    {
      "id": 1,
      "typeName": "Fiagro",
      "acronym": "FGAA",
      "fundName": "Fiagro Agro",
      "tradingName": "FIAGRO AGRO"
    }
  ]
}
```

| Código | Descrição |
|---|---|
| 200 | Sucesso |
| 502 | Formato inválido retornado pela B3 |
| 500 | Erro interno |

> **Nota:** `acronym` é o ticker sem o sufixo `11` (ex: `FGAA`, não `FGAA11`).

---

### `GET /api/fiagro-data?tickers={tickers}`

Busca preço atual e DY de um ou mais FIAGROs via scraping do [fiagro.com.br](https://fiagro.com.br/).  
Os dados são mantidos em cache em memória por 15 minutos.

**Parâmetros de query**

| Nome | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `tickers` | string | ✅ | Tickers separados por vírgula. Aceita com ou sem o sufixo `11`. |

**Exemplos**
```
GET /api/fiagro-data?tickers=FGAA,SNAG
GET /api/fiagro-data?tickers=FGAA11,SNAG11
```

**Resposta 200**
```json
[
  {
    "ticker": "FGAA11",
    "nome": "Fiagro Agro",
    "preco": "9.85",
    "dy": "14.20",
    "pvp": "—",
    "pl": "—",
    "setor": "Fiagro",
    "last_div": "—"
  }
]
```

| Código | Descrição |
|---|---|
| 200 | Lista de fundos encontrados (pode ser vazia se nenhum ticker bater) |
| 400 | Parâmetro `tickers` ausente |
| 502 | Homepage do fiagro.com.br indisponível ou HTML inválido |
| 500 | Erro interno |

> `pvp`, `pl` e `last_div` são retornados como `"—"` neste endpoint. Para obter esses dados, use `/api/fiagro-detail`.

---

### `GET /api/fiagro-detail?ticker={ticker}`

Busca dados detalhados de um fundo específico via scraping da página individual em fiagro.com.br.

**Parâmetros de query**

| Nome | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ticker` | string | ✅ | Ticker do fundo. Aceita com ou sem o sufixo `11`. |

**Exemplos**
```
GET /api/fiagro-detail?ticker=FGAA
GET /api/fiagro-detail?ticker=FGAA11
```

**Resposta 200**
```json
{
  "ticker": "FGAA11",
  "nome": "Fiagro Agro",
  "preco": "9.85",
  "dy": "14.20",
  "pvp": "0.95",
  "pl": "250.000.000",
  "setor": "Fiagro",
  "last_div": "0.12"
}
```

| Código | Descrição |
|---|---|
| 200 | Dados detalhados do fundo |
| 400 | Parâmetro `ticker` ausente ou vazio |
| 404 | Página do fundo não encontrada no fiagro.com.br |
| 500 | Erro interno |

---

### `GET /api/openapi`

Retorna a especificação OpenAPI 3.0.3 da API em JSON.

```
Content-Type: application/json
Access-Control-Allow-Origin: *
```

---

### `GET /api`

Retorna a interface Swagger UI em HTML para exploração interativa da API.

---

## Modelo de Dados

### `FiagroData`

```typescript
interface FiagroData {
  ticker: string;    // Ex: "FGAA11"
  nome: string;      // Nome de negociação do fundo
  preco: string;     // Preço atual em R$, formato "9.85", ou "—" se indisponível
  dy: string;        // Dividend Yield 12m em %, formato "14.20", ou "—"
  pvp: string;       // Preço / Valor Patrimonial, ou "—"
  pl: string;        // Patrimônio Líquido em R$, ou "—"
  last_div: string;  // Último rendimento distribuído em R$, ou "—"
  setor: string;     // Sempre "Fiagro" nesta versão
}
```

> Campos numéricos são retornados como `string` pois podem ser `"—"` quando o dado não está disponível. No frontend, use `parseFloat()` para operar matematicamente, verificando `isNaN`.

---

## Fontes de Dados

| Endpoint | Fonte | Frequência |
|---|---|---|
| `/api/b3-funds` | B3 API oficial | Por requisição |
| `/api/fiagro-data` | fiagro.com.br (scraping) | Cache 15min |
| `/api/fiagro-detail` | fiagro.com.br (scraping) | Por requisição |
