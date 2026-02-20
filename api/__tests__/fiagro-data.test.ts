import axios from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../fiagro-data";

vi.mock("axios");
const mockedAxiosGet = vi.mocked(axios.get);

type HandlerRequest = Parameters<typeof handler>[0];
type HandlerResponse = Parameters<typeof handler>[1];

type TestResponse = HandlerResponse & { payload?: unknown };

function createRequest(overrides?: Partial<HandlerRequest>): HandlerRequest {
  return {
    method: "GET",
    query: {},
    ...overrides,
  } as HandlerRequest;
}

function createResponse(): TestResponse {
  const socket = new Socket();
  const req = new IncomingMessage(socket);
  const res = new ServerResponse(req) as TestResponse;
  res.payload = undefined;
  res.end = ((chunk?: unknown) => {
    if (chunk) {
      const text = typeof chunk === "string" ? chunk : String(chunk);
      res.payload = JSON.parse(text);
    }
    socket.destroy();
    return res;
  }) as TestResponse["end"];
  return res;
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
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    const jsonData = res.payload as { error: string };
    expect(jsonData.error).toBeDefined();
  });

  it("deve retornar lista filtrada se passar tickers", async () => {
    const req = createRequest({ query: { tickers: "RZAG11" } });
    const res = createResponse();
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

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const data = res.payload as Array<{ ticker: string }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]?.ticker).toBe("RZAG11");
  });

  it("deve retornar erro para método diferente de GET", async () => {
    const req = createRequest({ method: "POST", query: {} });
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    const jsonData = res.payload as { error: string };
    expect(jsonData.error).toBeDefined();
  });
});
