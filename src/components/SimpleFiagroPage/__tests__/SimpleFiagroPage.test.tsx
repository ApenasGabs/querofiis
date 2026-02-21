import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SimpleFiagroPage } from "../SimpleFiagroPage";

// ─── helpers ─────────────────────────────────────────────────────────────────

function jsonOk(body: unknown): Response {
  return {
    ok: true,
    headers: new Headers({ "Content-Type": "application/json" }),
    json: () => Promise.resolve(body),
  } as Response;
}

function jsonFail(body: unknown = { error: "server error" }): Response {
  return {
    ok: false,
    headers: new Headers({ "Content-Type": "application/json" }),
    json: () => Promise.resolve(body),
  } as Response;
}

// ─── dados de fixture (simulam exatamente o que a API real retorna) ───────────

const B3_MOCK = {
  page: { pageNumber: 1, pageSize: 120, totalRecords: 3, totalPages: 1 },
  results: [
    { acronym: "FGAA", fundName: "FIAGRO FGA", tradingName: "FGA Agritech" },
    { acronym: "SNAG", fundName: "FIAGRO SUNO", tradingName: "Suno Agro" },
    { acronym: "XPTO", fundName: "FIAGRO XPTO", tradingName: "XPTO Agro" }, // sem dados no scraper
  ],
};

/**
 * O scraper retorna tickers com "11" e só retorna os que encontrou na homepage.
 * XPTO não está presente → deve ser descartado.
 */
const FIAGRO_MOCK = [
  {
    ticker: "FGAA11",
    preco: "9.45",
    dy: "13.80",
    pvp: "0.98",
    pl: "100000000",
    setor: "Fiagro",
    last_div: "0.11",
    nome: "FGA Agritech",
  },
  {
    ticker: "SNAG11",
    preco: "10.05",
    dy: "11.45",
    pvp: "1.02",
    pl: "80000000",
    setor: "Fiagro",
    last_div: "0.09",
    nome: "Suno Agro",
  },
];

function setupFetch(b3: unknown = B3_MOCK, fiagro: unknown = FIAGRO_MOCK) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/api/b3-funds")) return Promise.resolve(jsonOk(b3));
      if (url.includes("/api/fiagro-data")) return Promise.resolve(jsonOk(fiagro));
      return Promise.reject(new Error(`fetch inesperado: ${url}`));
    }) as unknown as typeof fetch,
  );
}

// ─── testes ──────────────────────────────────────────────────────────────────

describe("SimpleFiagroPage — integração (fetch mockado)", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  // ── 1. Fluxo feliz principal ─────────────────────────────────────────────

  it("exibe loading e depois a tabela com dados reais sem '—'", async () => {
    setupFetch();
    render(<SimpleFiagroPage />);

    // Loading visível imediatamente
    expect(screen.getByTestId("simple-loading")).toBeInTheDocument();

    // Aguarda a tabela aparecer
    await waitFor(() => expect(screen.getByTestId("simple-table")).toBeInTheDocument());

    // Loading sumiu
    expect(screen.queryByTestId("simple-loading")).not.toBeInTheDocument();
  });

  it("exibe exatamente os fundos com dados reais — descarta os sem dados", async () => {
    setupFetch();
    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-table")).toBeInTheDocument());

    // FGAA e SNAG aparecem (sem o "11")
    expect(screen.getByTestId("simple-row-FGAA")).toBeInTheDocument();
    expect(screen.getByTestId("simple-row-SNAG")).toBeInTheDocument();

    // XPTO estava na B3 mas sem dados no scraper → não deve aparecer
    expect(screen.queryByTestId("simple-row-XPTO")).not.toBeInTheDocument();
  });

  it("os valores na tela são idênticos aos retornados pela API", async () => {
    setupFetch();
    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-row-FGAA")).toBeInTheDocument());

    const rowFGAA = within(screen.getByTestId("simple-row-FGAA"));
    // Preço
    expect(rowFGAA.getByText("R$ 9.45")).toBeInTheDocument();
    // DY
    expect(rowFGAA.getByText("13.80%")).toBeInTheDocument();
    // P/VP
    expect(rowFGAA.getByText("0.98")).toBeInTheDocument();
    // Último dividendo
    expect(rowFGAA.getByText("R$ 0.11")).toBeInTheDocument();

    const rowSNAG = within(screen.getByTestId("simple-row-SNAG"));
    expect(rowSNAG.getByText("R$ 10.05")).toBeInTheDocument();
    expect(rowSNAG.getByText("11.45%")).toBeInTheDocument();
    expect(rowSNAG.getByText("1.02")).toBeInTheDocument();
    expect(rowSNAG.getByText("R$ 0.09")).toBeInTheDocument();
  });

  it("nenhuma célula visível contém '—' após o carregamento", async () => {
    setupFetch();
    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-table")).toBeInTheDocument());

    // Percorre todas as células da tabela e garante que nenhuma seja literalmente "—"
    const cells = screen.getAllByRole("cell").filter((cell) => cell.textContent?.trim() === "—");

    expect(cells).toHaveLength(0);
  });

  it("o subtítulo mostra a quantidade correta de fundos encontrados", async () => {
    setupFetch();
    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-table")).toBeInTheDocument());

    // Apenas 2 (FGAA + SNAG); XPTO sem dados é descartado
    expect(screen.getByText(/2 fundos encontrados/)).toBeInTheDocument();
  });

  // ── 2. Busca / Filtro ────────────────────────────────────────────────────

  it("filtra a tabela ao digitar no campo de busca", async () => {
    setupFetch();
    const user = userEvent.setup();
    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-table")).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/buscar por ticker/i);
    await user.type(input, "FGAA");

    expect(screen.getByTestId("simple-row-FGAA")).toBeInTheDocument();
    expect(screen.queryByTestId("simple-row-SNAG")).not.toBeInTheDocument();
  });

  it("limpar a busca restaura todos os fundos", async () => {
    setupFetch();
    const user = userEvent.setup();
    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-table")).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/buscar por ticker/i);
    await user.type(input, "FGAA");
    await user.clear(input);

    expect(screen.getByTestId("simple-row-FGAA")).toBeInTheDocument();
    expect(screen.getByTestId("simple-row-SNAG")).toBeInTheDocument();
  });

  // ── 3. Ordenação ─────────────────────────────────────────────────────────

  it("ordena por DY decrescente por padrão (FGAA 13.8% antes de SNAG 11.45%)", async () => {
    setupFetch();
    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-table")).toBeInTheDocument());

    const rows = screen.getAllByRole("row").slice(1); // remove o <tr> do <thead>
    expect(rows[0]).toHaveAttribute("data-testid", "simple-row-FGAA");
    expect(rows[1]).toHaveAttribute("data-testid", "simple-row-SNAG");
  });

  it("ao selecionar 'Ticker (A→Z)' ordena alfabeticamente", async () => {
    setupFetch();
    const user = userEvent.setup();
    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-table")).toBeInTheDocument());

    await user.selectOptions(screen.getByRole("combobox"), "ticker");

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveAttribute("data-testid", "simple-row-FGAA");
    expect(rows[1]).toHaveAttribute("data-testid", "simple-row-SNAG");
  });

  // ── 4. Casos de erro ─────────────────────────────────────────────────────

  it("exibe mensagem de erro quando /api/b3-funds falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/b3-funds")) return Promise.resolve(jsonFail());
        return Promise.reject(new Error("inesperado"));
      }) as unknown as typeof fetch,
    );

    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-error")).toBeInTheDocument());
    expect(screen.getByTestId("simple-error")).toHaveTextContent(/falha ao buscar lista da b3/i);
    expect(screen.queryByTestId("simple-table")).not.toBeInTheDocument();
  });

  it("exibe mensagem de erro quando /api/fiagro-data falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/b3-funds")) return Promise.resolve(jsonOk(B3_MOCK));
        if (url.includes("/api/fiagro-data")) return Promise.resolve(jsonFail());
        return Promise.reject(new Error("inesperado"));
      }) as unknown as typeof fetch,
    );

    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-error")).toBeInTheDocument());
    expect(screen.getByTestId("simple-error")).toHaveTextContent(
      /falha ao buscar dados do fiagro/i,
    );
  });

  it("exibe erro de rede quando fetch rejeita completamente", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("Network Error"))) as unknown as typeof fetch,
    );

    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-error")).toBeInTheDocument());
    expect(screen.getByTestId("simple-error")).toHaveTextContent("Network Error");
  });

  it("exibe tabela vazia quando scraper retorna array vazio", async () => {
    setupFetch(B3_MOCK, []);
    render(<SimpleFiagroPage />);

    await waitFor(() => expect(screen.getByTestId("simple-table")).toBeInTheDocument());
    expect(screen.getByText("Nenhum fundo encontrado.")).toBeInTheDocument();
  });
});
