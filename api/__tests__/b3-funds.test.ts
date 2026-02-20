import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../b3-funds";

interface MockResponse {
  statusCode: number | undefined;
  payload: unknown;
}

function createRequest(overrides?: Partial<VercelRequest>): VercelRequest {
  return { method: "GET", query: {}, ...overrides } as unknown as VercelRequest;
}

function createResponse(): MockResponse {
  return { statusCode: undefined, payload: undefined };
}

function asVercelResponse(mock: MockResponse): VercelResponse {
  const res: Partial<VercelResponse> & MockResponse = {
    ...mock,
    status(code: number) {
      mock.statusCode = code;
      return res as VercelResponse;
    },
    json(data: unknown) {
      mock.payload = data;
      return res as VercelResponse;
    },
  };
  return res as unknown as VercelResponse;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API /api/b3-funds", () => {
  it("deve retornar uma lista de tickers", async () => {
    const req = createRequest({ method: "GET" });
    const mock = createResponse();
    const mockResults = [
      { acronym: "TEST", fundName: "Test Fund", tradingName: "Test" },
      { acronym: "MOCK", fundName: "Mock Fund", tradingName: "Mock" },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    } as Response);

    await handler(req, asVercelResponse(mock));

    expect(mock.statusCode).toBe(200);
    const jsonData = mock.payload as { results: typeof mockResults };
    expect(Array.isArray(jsonData.results)).toBe(true);
    expect(jsonData.results).toEqual(mockResults);
  });

  it("deve retornar 405 para métodos diferentes de GET", async () => {
    const req = createRequest({ method: "POST" });
    const mock = createResponse();

    await handler(req, asVercelResponse(mock));

    expect(mock.statusCode).toBe(405);
    const jsonData = mock.payload as { error: string };
    expect(jsonData.error).toBeDefined();
  });
});
