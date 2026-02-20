export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Quero FIAGROs API",
    description:
      "API para consultar fundos de investimento agrícola (FIAGROs) listados na B3 e dados do fiagro.com.br.",
    version: "1.0.0",
  },
  servers: [
    { url: "https://querofiis.vercel.app", description: "Produção" },
    { url: "http://localhost:3001", description: "Local" },
  ],
  paths: {
    "/api/ping": {
      get: {
        summary: "Health check",
        description: "Verifica se a API está no ar.",
        operationId: "ping",
        tags: ["Geral"],
        responses: {
          "200": {
            description: "API operacional",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    pong: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "ok" },
                        timestamp: {
                          type: "string",
                          format: "date-time",
                          example: "2026-02-20T10:00:00.000Z",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/b3-funds": {
      get: {
        summary: "Lista FIAGROs da B3",
        description:
          "Retorna a lista completa de fundos FIAGRO registrados na B3, incluindo nome, ticker e informações básicas.",
        operationId: "getB3Funds",
        tags: ["B3"],
        responses: {
          "200": {
            description: "Lista de fundos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    page: {
                      type: "object",
                      properties: {
                        pageNumber: { type: "integer", example: 1 },
                        pageSize: { type: "integer", example: 120 },
                        totalRecords: { type: "integer", example: 44 },
                        totalPages: { type: "integer", example: 1 },
                      },
                    },
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer", example: 1 },
                          typeName: { type: "string", nullable: true, example: "Fiagro" },
                          acronym: { type: "string", example: "FGAA" },
                          fundName: { type: "string", example: "Fiagro Agro" },
                          tradingName: { type: "string", example: "FIAGRO AGRO" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "502": { description: "Resposta inválida da B3" },
          "500": { description: "Erro interno" },
        },
      },
    },
    "/api/fiagro-data": {
      get: {
        summary: "Dados de FIAGROs por tickers",
        description:
          "Busca preço, DY e dados básicos de um ou mais FIAGROs a partir do fiagro.com.br. Aceita lista separada por vírgula.",
        operationId: "getFiagroData",
        tags: ["Fiagro"],
        parameters: [
          {
            name: "tickers",
            in: "query",
            required: true,
            description: "Tickers separados por vírgula (com ou sem o sufixo 11)",
            schema: { type: "string", example: "FGAA,SNAG" },
          },
        ],
        responses: {
          "200": {
            description: "Lista de FIAGROs com dados do scraping",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/FiagroData" } },
              },
            },
          },
          "400": { description: "Parâmetro tickers ausente" },
          "502": { description: "Homepage do fiagro.com.br indisponível" },
          "500": { description: "Erro interno" },
        },
      },
    },
    "/api/fiagro-detail": {
      get: {
        summary: "Detalhe de um FIAGRO",
        description:
          "Busca dados completos de um fundo específico: P/VP, patrimônio líquido e último rendimento.",
        operationId: "getFiagroDetail",
        tags: ["Fiagro"],
        parameters: [
          {
            name: "ticker",
            in: "query",
            required: true,
            description: "Ticker do fundo (com ou sem o sufixo 11)",
            schema: { type: "string", example: "FGAA" },
          },
        ],
        responses: {
          "200": {
            description: "Dados detalhados do fundo",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FiagroData" },
              },
            },
          },
          "400": { description: "Parâmetro ticker ausente" },
          "404": { description: "Página do fundo não encontrada" },
          "500": { description: "Erro interno" },
        },
      },
    },
  },
  components: {
    schemas: {
      FiagroData: {
        type: "object",
        properties: {
          ticker: { type: "string", example: "FGAA11" },
          nome: { type: "string", example: "Fiagro Agro" },
          preco: {
            type: "string",
            example: "9.85",
            description: "Preço atual em R$, ou '—' se indisponível",
          },
          dy: { type: "string", example: "14.2", description: "Dividend Yield 12m em %, ou '—'" },
          pvp: { type: "string", example: "0.95", description: "Preço/Valor Patrimonial, ou '—'" },
          pl: {
            type: "string",
            example: "250.000.000",
            description: "Patrimônio Líquido em R$, ou '—'",
          },
          last_div: {
            type: "string",
            example: "0.12",
            description: "Último rendimento em R$, ou '—'",
          },
          setor: { type: "string", example: "Fiagro" },
        },
      },
    },
  },
} as const;
