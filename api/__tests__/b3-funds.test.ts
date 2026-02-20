import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../b3-funds";

type HandlerRequest = Parameters<typeof handler>[0];
type HandlerResponse = Parameters<typeof handler>[1];

interface TestResponse extends HandlerResponse {
  statusCode?: number;
  payload?: unknown;
}

function createResponse(): TestResponse {
  const res: Partial<TestResponse> = {
    statusCode: undefined,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this as TestResponse;
    },
    json(data: unknown) {
      this.payload = data;
    },
  };
  return res as TestResponse;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API /api/b3-funds", () => {
  it("deve retornar uma lista de tickers", async () => {
    const req: HandlerRequest = { method: "GET", query: {} };
    const res = createResponse();
    const mockResults = [
      { acronym: "TEST", fundName: "Test Fund", tradingName: "Test" },
      { acronym: "MOCK", fundName: "Mock Fund", tradingName: "Mock" },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    } as Response);

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const jsonData: { results: typeof mockResults } = res.payload as {
      results: typeof mockResults;
    };
    expect(Array.isArray(jsonData.results)).toBe(true);
    expect(jsonData.results).toEqual(mockResults);
  });

  it("deve retornar 405 para métodos diferentes de GET", async () => {
    const req: HandlerRequest = { method: "POST", query: {} };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    const jsonData = res.payload as { error: string };
    expect(jsonData.error).toBeDefined();
  });
});
