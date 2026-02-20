import axios from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../fiagro-data";

vi.mock("axios");
const mockedAxiosGet = vi.mocked(axios.get);

interface MockResponse {
  statusCode: number | undefined;
  payload: unknown;
}

function createRequest(overrides?: Partial<VercelRequest>): VercelRequest {
  return {
    method: "GET",
    query: {},
    ...overrides,
  } as VercelRequest;
}

function createResponse(): MockResponse {
  const mock: MockResponse = { statusCode: undefined, payload: undefined };
  return mock;
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

function mockAxiosHtml(html: string) {
  const axiosResponse: AxiosResponse<string> = {
    data: html,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  };
  mockedAxiosGet.mockResolvedValueOnce(axiosResponse);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("API /api/fiagro-data", () => {
  it("deve retornar erro se não passar tickers", async () => {
    const req = createRequest({ query: {} });
    const mock = createResponse();

    await handler(req, asVercelResponse(mock));

    expect(mock.statusCode).toBe(400);
    const jsonData = mock.payload as { error: string };
    expect(jsonData.error).toBeDefined();
  });

  it("deve retornar lista filtrada se passar tickers", async () => {
    const req = createRequest({ query: { tickers: "RZAG11" } });
    const mock = createResponse();
    const padding = "<!-- pad -->".repeat(100);
    const html = `
      <html><head></head><body>${padding}
      <div>
        <a href="/rzag11/">
          RZAG11
          <span>R$ 10,00</span>
          <span>DY 12 %</span>
        </a>
      </div>
      </body></html>
    `;

    mockAxiosHtml(html);

    await handler(req, asVercelResponse(mock));

    expect(mock.statusCode).toBe(200);
    const data = mock.payload as Array<{ ticker: string }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]?.ticker).toBe("RZAG11");
  });

  it("deve retornar erro para método diferente de GET", async () => {
    const req = createRequest({ method: "POST", query: {} });
    const mock = createResponse();

    await handler(req, asVercelResponse(mock));

    expect(mock.statusCode).toBe(405);
    const jsonData = mock.payload as { error: string };
    expect(jsonData.error).toBeDefined();
  });
});
