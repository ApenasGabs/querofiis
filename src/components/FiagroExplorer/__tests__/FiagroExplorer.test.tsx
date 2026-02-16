import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FiagroExplorer from "../FiagroExplorer";

const mockData = [
  { ticker: "FGAA11", preco: 9.45, variacao: 13.8, volume: 12345 },
  { ticker: "SNAG11", preco: 10.05, variacao: 11.45, volume: 54321 },
  { ticker: "BASE100", preco: 98.5, variacao: 14.1, volume: 23456 },
];

describe("FiagroExplorer", () => {
  beforeEach(() => {
    // garante que não há mock residual
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exibe loading e depois lista de FIAGROs (fallback local)", async () => {
    // simula falha da B3 e fallback para /fiagros.json
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (typeof url === "string" && (url === "/b3-funds" || url.includes("/b3-funds"))) {
          return Promise.resolve({ ok: false });
        }
        if (typeof url === "string" && url.endsWith("/fiagros.json")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) });
        }
        return Promise.reject(new Error("unexpected fetch"));
      }) as unknown as typeof fetch,
    );

    render(<FiagroExplorer />);

    // loading inicial
    expect(screen.getByTestId("fiagro-loading")).toBeInTheDocument();

    // aguarda os cards aparecerem
    await waitFor(() => expect(screen.getByTestId("fiagro-list")).toBeInTheDocument());

    // checa número de assets
    expect(screen.getByTestId("assets-tracked")).toHaveTextContent(String(mockData.length));

    // checa um card específico
    expect(screen.getByTestId("fiagro-card-FGAA11")).toBeInTheDocument();
    expect(screen.getByTestId("fiagro-card-FGAA11")).toHaveTextContent("R$ 9.45");
  });

  it("carrega lista a partir da B3 (results.acronym) e busca cotações na brapi (tentando sufuxo 11)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (typeof url === "string" && (url === "/b3-funds" || url.includes("/b3-funds"))) {
          // retorna formato real da B3 com 'results' e 'acronym'
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ results: [{ acronym: "FGAA" }, { acronym: "SNAG" }] }),
          });
        }

        if (typeof url === "string" && url.includes("brapi.dev/api/quote/FGAA11")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    regularMarketPrice: 9.45,
                    regularMarketChangePercent: 13.8,
                    regularMarketVolume: 12345,
                  },
                ],
              }),
          });
        }

        if (typeof url === "string" && url.includes("brapi.dev/api/quote/SNAG11")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    regularMarketPrice: 10.05,
                    regularMarketChangePercent: 11.45,
                    regularMarketVolume: 54321,
                  },
                ],
              }),
          });
        }

        return Promise.resolve({ ok: false });
      }) as unknown as typeof fetch,
    );

    render(<FiagroExplorer />);

    await waitFor(() => expect(screen.getByTestId("fiagro-list")).toBeInTheDocument());

    expect(screen.getByTestId("assets-tracked")).toHaveTextContent("2");
    // componentes devem usar o ticker com sufixo 11 porque brapi respondeu somente para FGAA11/SNAG11
    expect(screen.getByTestId("fiagro-card-FGAA11")).toBeInTheDocument();
    expect(screen.getByTestId("fiagro-card-SNAG11")).toBeInTheDocument();
  });

  it("quando B3 lista símbolos mas brapi falha, faz fallback para local", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (typeof url === "string" && (url === "/b3-funds" || url.includes("/b3-funds"))) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ funds: [{ symbol: "FGAA11" }] }),
          });
        }

        if (typeof url === "string" && url.includes("brapi.dev/api/quote/FGAA11")) {
          // brapi falha
          return Promise.resolve({ ok: false });
        }

        if (typeof url === "string" && url.endsWith("/fiagros.json")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) });
        }

        return Promise.resolve({ ok: false });
      }) as unknown as typeof fetch,
    );

    render(<FiagroExplorer />);

    await waitFor(() => expect(screen.getByTestId("fiagro-list")).toBeInTheDocument());

    // fallback local deve ser usado
    expect(screen.getByTestId("assets-tracked")).toHaveTextContent(String(mockData.length));
    expect(screen.getByTestId("fiagro-card-FGAA11")).toBeInTheDocument();
    // fonte exibida como local
    expect(screen.getByText("/fiagros.json (local)")).toBeInTheDocument();
  });

  it("quando B3 exige token (MISSING_TOKEN) deve usar fallback local sem chamar brapi", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/b3-funds") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              error: true,
              message: "Token de autenticação não fornecido",
              code: "MISSING_TOKEN",
            }),
        });
      }

      if (url.endsWith("/fiagros.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) });
      }

      // Se o código tentar chamar brapi, falha (não deve acontecer)
      if (url.includes("brapi.dev")) {
        return Promise.reject(new Error("brapi should not be called when B3 is protected"));
      }

      return Promise.resolve({ ok: false });
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<FiagroExplorer />);

    await waitFor(() => expect(screen.getByTestId("fiagro-list")).toBeInTheDocument());

    expect(screen.getByTestId("assets-tracked")).toHaveTextContent(String(mockData.length));
    expect(screen.getByText("B3 (requer token) — usando /fiagros.json")).toBeInTheDocument();

    // Garantir que nenhuma chamada para brapi foi feita
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("brapi.dev"));
  });

  it("exibe mensagem de erro quando fetch falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network"))) as unknown as typeof fetch,
    );

    render(<FiagroExplorer />);

    await waitFor(() => expect(screen.getByTestId("fiagro-error")).toBeInTheDocument());

    expect(screen.getByTestId("fiagro-error")).toHaveTextContent(
      "Não foi possível carregar os FIAGROs",
    );
  });
});
