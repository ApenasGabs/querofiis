import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FiagroExplorer from "../FiagroExplorer";

/** Response-like para mocks com headers (evita "reading 'get' of undefined") */
function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    headers: new Headers({ "Content-Type": "application/json" }),
    json: () => Promise.resolve(body),
  } as Response;
}

/** Lista da homepage: tickers com sufixo 11, P/VP e last_div podem ser "—" */
const mockFiagrosFromApi = [
  {
    ticker: "FGAA11",
    preco: "9.45",
    dy: "13.8",
    pvp: "—",
    pl: "—",
    setor: "Fiagro",
    last_div: "—",
    nome: "FIAGRO FGA",
  },
  {
    ticker: "SNAG11",
    preco: "10.05",
    dy: "11.45",
    pvp: "—",
    pl: "—",
    setor: "Fiagro",
    last_div: "—",
    nome: "FIAGRO SUNO",
  },
];

describe("FiagroExplorer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exibe loading e depois lista de FIAGROs quando B3 e fiagro-data retornam dados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (typeof url === "string" && (url === "/api/b3-funds" || url.includes("/api/b3-funds"))) {
          return Promise.resolve(
            jsonResponse({
              page: { pageNumber: 1, pageSize: 120, totalRecords: 2, totalPages: 1 },
              results: [{ acronym: "FGAA" }, { acronym: "SNAG" }],
            }),
          );
        }
        if (typeof url === "string" && url.includes("fiagro-data")) {
          return Promise.resolve(jsonResponse(mockFiagrosFromApi));
        }
        return Promise.reject(new Error("unexpected fetch"));
      }) as unknown as typeof fetch,
    );

    render(<FiagroExplorer />);

    expect(screen.getByTestId("fiagro-loading")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId("fiagro-card-FGAA11")).toBeInTheDocument());

    expect(screen.getByTestId("fiagro-list")).toBeInTheDocument();
    expect(screen.getByTestId("assets-tracked")).toHaveTextContent("2");
    expect(screen.getByTestId("fiagro-card-FGAA11")).toBeInTheDocument();
    expect(screen.getByTestId("fiagro-card-SNAG11")).toBeInTheDocument();
    expect(screen.getByTestId("fiagro-card-FGAA11")).toHaveTextContent("R$ 9.45");
  });

  it("carrega lista a partir da B3 (results.acronym) e depois da API fiagro-data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (typeof url === "string" && (url === "/api/b3-funds" || url.includes("/api/b3-funds"))) {
          return Promise.resolve(
            jsonResponse({
              page: { pageNumber: 1, pageSize: 120, totalRecords: 2, totalPages: 1 },
              results: [{ acronym: "FGAA" }, { acronym: "SNAG" }],
            }),
          );
        }
        if (typeof url === "string" && url.includes("fiagro-data")) {
          return Promise.resolve(jsonResponse(mockFiagrosFromApi));
        }
        return Promise.resolve(jsonResponse({ error: "not found" }, false));
      }) as unknown as typeof fetch,
    );

    render(<FiagroExplorer />);

    await waitFor(() => expect(screen.getByTestId("fiagro-card-FGAA11")).toBeInTheDocument());

    expect(screen.getByTestId("assets-tracked")).toHaveTextContent("2");
    expect(screen.getByTestId("fiagro-card-FGAA11")).toBeInTheDocument();
    expect(screen.getByTestId("fiagro-card-SNAG11")).toBeInTheDocument();
  });

  it("quando /api/b3-funds falha, exibe mensagem de erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (typeof url === "string" && (url === "/api/b3-funds" || url.includes("/api/b3-funds"))) {
          return Promise.resolve(jsonResponse({ error: "unavailable" }, false));
        }
        return Promise.reject(new Error("unexpected"));
      }) as unknown as typeof fetch,
    );

    render(<FiagroExplorer />);

    await waitFor(() => expect(screen.getByTestId("fiagro-error")).toBeInTheDocument());

    expect(screen.getByTestId("fiagro-error")).toHaveTextContent("Failed to load tickers");
  });

  it("quando /api/b3-funds retorna formato inválido (sem results), exibe erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/b3-funds") {
          return Promise.resolve(
            jsonResponse({
              error: true,
              message: "Token de autenticação não fornecido",
              code: "MISSING_TOKEN",
            }),
          );
        }
        return Promise.resolve(jsonResponse({}, false));
      }) as unknown as typeof fetch,
    );

    render(<FiagroExplorer />);

    await waitFor(() => expect(screen.getByTestId("fiagro-error")).toBeInTheDocument());

    expect(screen.getByTestId("fiagro-error")).toHaveTextContent("Failed to load tickers");
  });

  it("exibe mensagem de erro quando fetch falha (rede)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network"))) as unknown as typeof fetch,
    );

    render(<FiagroExplorer />);

    await waitFor(() => expect(screen.getByTestId("fiagro-error")).toBeInTheDocument());

    expect(screen.getByTestId("fiagro-error")).toHaveTextContent("Failed to load tickers");
  });
});
