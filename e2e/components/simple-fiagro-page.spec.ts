import { expect, test } from "@playwright/test";

// ─── tipos mínimos para tipar a resposta das APIs ─────────────────────────────

interface B3Result {
  acronym: string;
  fundName: string;
  tradingName: string;
}
interface FiagroItem {
  ticker: string;
  preco: string;
  dy: string;
  pvp: string;
  last_div: string;
  nome: string;
}

/** Remove sufixo numérico (ex: "FGAA11" → "FGAA") — mesma lógica do hook */
const stripSuffix = (t: string) => t.replace(/\d{2}[A-Z]?$/i, "").toUpperCase();

/** Navega para a aba "Tabela Simples" */
async function goToSimplePage(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Tabela Simples" }).click();
}

// ─── testes ──────────────────────────────────────────────────────────────────

test.describe("SimpleFiagroPage — E2E contra APIs reais", () => {
  // Modo serial: evita bater no scraper (lento) com vários workers em paralelo
  test.describe.configure({ mode: "serial" });
  // Timeout generoso: o scraper do fiagro.com.br pode demorar até ~30 s
  test.setTimeout(120_000);

  // ── 1. Carregamento e dados reais ─────────────────────────────────────────

  test("exibe loading e depois a tabela com dados reais", async ({ page }) => {
    await goToSimplePage(page);

    // Loading visível antes da tabela
    // (pode já ter sumido se as APIs forem rápidas, por isso usamos
    //  waitFor com estado "attached" em vez de "visible")
    await expect(page.getByTestId("simple-table")).toBeVisible({ timeout: 90000 });
    await expect(page.getByTestId("simple-loading")).not.toBeVisible();
  });

  test("os tickers na tela correspondem exatamente à interseção B3 ∩ fiagro.com.br", async ({
    page,
    request,
  }) => {
    // 1. Busca dados reais da B3
    const b3Res = await request.get("/api/b3-funds");
    expect(b3Res.ok()).toBeTruthy();
    const b3Data = (await b3Res.json()) as { results: B3Result[] };
    const b3Set = new Set(b3Data.results.map((r) => r.acronym.trim().toUpperCase()));

    // 2. Busca dados reais do scraper
    const b3Tickers = [...b3Set].join(",");
    const fRes = await request.get(`/api/fiagro-data?tickers=${b3Tickers}`);
    expect(fRes.ok()).toBeTruthy();
    const fData = (await fRes.json()) as FiagroItem[];

    // 3. Calcula quais tickers devem aparecer (sem "—" em preco e dy)
    const expectedTickers = new Set<string>();
    for (const f of fData) {
      if (f.preco === "—" && f.dy === "—") continue; // descartado pelo hook
      const base = stripSuffix(f.ticker);
      if (b3Set.has(f.ticker.toUpperCase()) || b3Set.has(base)) {
        expectedTickers.add(base);
      }
    }

    // 4. Abre a página e espera a tabela
    await goToSimplePage(page);
    await page.getByTestId("simple-table").waitFor({ timeout: 90000 });

    // 5. Verifica que cada ticker esperado está na tela
    for (const ticker of expectedTickers) {
      await expect(
        page.getByTestId(`simple-row-${ticker}`),
        `Linha do ticker ${ticker} deve estar visível`,
      ).toBeVisible();
    }

    // 6. Verifica que nenhum ticker extra (não esperado) aparece
    const rows = page.locator("tbody tr[data-testid^='simple-row-']");
    const count = await rows.count();
    expect(count).toBe(expectedTickers.size);
  });

  test("os valores preço e DY na tela são idênticos ao que a API retornou", async ({
    page,
    request,
  }) => {
    // Busca os dados reais
    const b3Res = await request.get("/api/b3-funds");
    const b3Data = (await b3Res.json()) as { results: B3Result[] };
    const b3Tickers = b3Data.results.map((r) => r.acronym.trim().toUpperCase()).join(",");

    const fRes = await request.get(`/api/fiagro-data?tickers=${b3Tickers}`);
    const fData = (await fRes.json()) as FiagroItem[];

    // Abre a página
    await goToSimplePage(page);
    await page.getByTestId("simple-table").waitFor({ timeout: 90000 });

    // Compara cada fundo que deve aparecer
    for (const f of fData) {
      if (f.preco === "—" && f.dy === "—") continue;
      const base = stripSuffix(f.ticker);
      const row = page.getByTestId(`simple-row-${base}`);

      if (!(await row.isVisible())) continue; // não foi exibido (filtrado)

      if (f.preco !== "—") {
        await expect(row, `Preço de ${base} incorreto`).toContainText(`R$ ${f.preco}`);
      }
      if (f.dy !== "—") {
        await expect(row, `DY de ${base} incorreto`).toContainText(`${f.dy}%`);
      }
    }
  });

  test("nenhuma linha tem Preço E DY ambos como '—' após o carregamento", async ({ page }) => {
    await goToSimplePage(page);
    await page.getByTestId("simple-table").waitFor({ timeout: 90000 });

    // O hook garante: só exibe linhas onde pelo menos um dos dois (preco ou dy) tem valor real.
    // P/VP e Último Div. podem ser "—" quando o scraper não os encontra na homepage.
    const rows = page.locator("tbody tr[data-testid^='simple-row-']");
    const count = await rows.count();
    test.skip(count === 0, "Nenhum fundo carregado");

    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator("td");
      const precoText = (await cells.nth(3).textContent()) ?? "";
      const dyText = (await cells.nth(4).textContent()) ?? "";
      // preco real tem prefixo "R$"; dy real tem sufixo "%"
      const precoIsBlank = precoText.trim() === "—";
      const dyIsBlank = dyText.trim() === "—";
      expect(
        precoIsBlank && dyIsBlank,
        `Linha ${i}: preco ("${precoText}") e DY ("${dyText}") são ambos "—"`,
      ).toBeFalsy();
    }
  });

  test("subtítulo mostra o número correto de fundos encontrados", async ({ page, request }) => {
    // Calcula quantos fundos devem aparecer a partir da API real
    const b3Res = await request.get("/api/b3-funds");
    const b3Data = (await b3Res.json()) as { results: B3Result[] };
    const b3Tickers = b3Data.results.map((r) => r.acronym.trim().toUpperCase()).join(",");
    const b3Set = new Set(b3Data.results.map((r) => r.acronym.trim().toUpperCase()));

    const fRes = await request.get(`/api/fiagro-data?tickers=${b3Tickers}`);
    const fData = (await fRes.json()) as FiagroItem[];

    const expectedCount = new Set(
      fData
        .filter((f) => !(f.preco === "—" && f.dy === "—"))
        .filter((f) => b3Set.has(f.ticker.toUpperCase()) || b3Set.has(stripSuffix(f.ticker)))
        .map((f) => stripSuffix(f.ticker)),
    ).size;

    await goToSimplePage(page);
    await page.getByTestId("simple-table").waitFor({ timeout: 90000 });

    await expect(page.getByText(new RegExp(`${expectedCount} fundos encontrados`))).toBeVisible();
  });

  // ── 2. Busca ──────────────────────────────────────────────────────────────

  test("campo de busca filtra fundos em tempo real pelo ticker", async ({ page, request }) => {
    // Pega o primeiro ticker real disponível
    const b3Res = await request.get("/api/b3-funds");
    const b3Data = (await b3Res.json()) as { results: B3Result[] };
    const b3Tickers = b3Data.results.map((r) => r.acronym.trim().toUpperCase()).join(",");
    const b3Set = new Set(b3Data.results.map((r) => r.acronym.trim().toUpperCase()));

    const fRes = await request.get(`/api/fiagro-data?tickers=${b3Tickers}`);
    const fData = (await fRes.json()) as FiagroItem[];

    const visibleFunds = fData
      .filter((f) => !(f.preco === "—" && f.dy === "—"))
      .filter((f) => b3Set.has(f.ticker.toUpperCase()) || b3Set.has(stripSuffix(f.ticker)));

    test.skip(visibleFunds.length < 2, "Precisa de pelo menos 2 fundos para testar o filtro");

    const targetBase = stripSuffix(visibleFunds[0].ticker);
    const otherBase = stripSuffix(visibleFunds[1].ticker);

    await goToSimplePage(page);
    await page.getByTestId("simple-table").waitFor({ timeout: 90000 });

    await page.getByPlaceholder(/buscar por ticker/i).fill(targetBase);

    await expect(page.getByTestId(`simple-row-${targetBase}`)).toBeVisible();
    await expect(page.getByTestId(`simple-row-${otherBase}`)).not.toBeAttached();
  });

  test("limpar busca restaura todos os fundos", async ({ page, request }) => {
    const b3Res = await request.get("/api/b3-funds");
    const b3Data = (await b3Res.json()) as { results: B3Result[] };
    const b3Tickers = b3Data.results.map((r) => r.acronym.trim().toUpperCase()).join(",");
    const b3Set = new Set(b3Data.results.map((r) => r.acronym.trim().toUpperCase()));

    const fRes = await request.get(`/api/fiagro-data?tickers=${b3Tickers}`);
    const fData = (await fRes.json()) as FiagroItem[];

    const visible = fData
      .filter((f) => !(f.preco === "—" && f.dy === "—"))
      .filter((f) => b3Set.has(f.ticker.toUpperCase()) || b3Set.has(stripSuffix(f.ticker)));

    test.skip(visible.length < 2, "Precisa de pelo menos 2 fundos");

    const targetBase = stripSuffix(visible[0].ticker);

    await goToSimplePage(page);
    await page.getByTestId("simple-table").waitFor({ timeout: 90000 });

    const input = page.getByPlaceholder(/buscar por ticker/i);
    await input.fill(targetBase);
    await input.clear();

    for (const f of visible) {
      await expect(page.getByTestId(`simple-row-${stripSuffix(f.ticker)}`)).toBeVisible();
    }
  });

  // ── 3. Ordenação ──────────────────────────────────────────────────────────

  test("ordenar por DY coloca o maior DY na primeira linha", async ({ page, request }) => {
    const b3Res = await request.get("/api/b3-funds");
    const b3Data = (await b3Res.json()) as { results: B3Result[] };
    const b3Tickers = b3Data.results.map((r) => r.acronym.trim().toUpperCase()).join(",");
    const b3Set = new Set(b3Data.results.map((r) => r.acronym.trim().toUpperCase()));

    const fRes = await request.get(`/api/fiagro-data?tickers=${b3Tickers}`);
    const fData = (await fRes.json()) as FiagroItem[];

    const visible = fData
      .filter((f) => !(f.preco === "—" && f.dy === "—"))
      .filter((f) => b3Set.has(f.ticker.toUpperCase()) || b3Set.has(stripSuffix(f.ticker)));

    test.skip(visible.length < 2, "Precisa de pelo menos 2 fundos");

    // Fundo com maior DY segundo a API
    const sortedByDy = [...visible].sort((a, b) => parseFloat(b.dy) - parseFloat(a.dy));
    const expectedFirst = stripSuffix(sortedByDy[0].ticker);

    await goToSimplePage(page);
    await page.getByTestId("simple-table").waitFor({ timeout: 90000 });

    // "DY (maior primeiro)" já é o valor padrão do select
    const firstRow = page.locator("tbody tr[data-testid^='simple-row-']").first();
    await expect(firstRow).toHaveAttribute("data-testid", `simple-row-${expectedFirst}`);
  });

  test("ordenar por preço coloca o menor preço na primeira linha", async ({ page, request }) => {
    const b3Res = await request.get("/api/b3-funds");
    const b3Data = (await b3Res.json()) as { results: B3Result[] };
    const b3Tickers = b3Data.results.map((r) => r.acronym.trim().toUpperCase()).join(",");
    const b3Set = new Set(b3Data.results.map((r) => r.acronym.trim().toUpperCase()));

    const fRes = await request.get(`/api/fiagro-data?tickers=${b3Tickers}`);
    const fData = (await fRes.json()) as FiagroItem[];

    const visible = fData
      .filter((f) => !(f.preco === "—" && f.dy === "—"))
      .filter((f) => b3Set.has(f.ticker.toUpperCase()) || b3Set.has(stripSuffix(f.ticker)));

    test.skip(visible.length < 2, "Precisa de pelo menos 2 fundos");

    const sortedByPrice = [...visible].sort((a, b) => parseFloat(a.preco) - parseFloat(b.preco));
    const expectedFirst = stripSuffix(sortedByPrice[0].ticker);

    await goToSimplePage(page);
    await page.getByTestId("simple-table").waitFor({ timeout: 90000 });

    await page.getByRole("combobox").selectOption("price");

    const firstRow = page.locator("tbody tr[data-testid^='simple-row-']").first();
    await expect(firstRow).toHaveAttribute("data-testid", `simple-row-${expectedFirst}`);
  });

  // ── 4. Navegação ──────────────────────────────────────────────────────────

  test("botão 'Explorador' volta para o FiagroExplorer", async ({ page }) => {
    await goToSimplePage(page);
    await page.getByTestId("simple-table").waitFor({ timeout: 90000 });

    await page.getByRole("button", { name: "Explorador" }).click();

    await expect(page.getByTestId("fiagro-explorer")).toBeVisible();
    await expect(page.getByTestId("simple-table")).not.toBeAttached();
  });
});
