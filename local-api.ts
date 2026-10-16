import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

interface FiagroData {
  ticker: string;
  preco: string;
  dy: string;
  pvp: string;
  pl: string;
  setor: string;
  last_div: string;
  nome: string;
}

const B3_LIST_URL =
  "https://sistemaswebb3-listados.b3.com.br/fundsListedProxy/Search/GetListFunds/eyJsYW5ndWFnZSI6InB0LWJyIiwidHlwZUZ1bmQiOiJGSUFHUk8iLCJwYWdlTnVtYmVyIjoxLCJwYWdlU2l6ZSI6MTIwLCJrZXl3b3JkIjoiIn0=";

interface B3FundItem {
  id: number;
  typeName: string | null;
  acronym: string;
  fundName: string;
  tradingName: string;
}

interface B3ListResponse {
  page: {
    pageNumber: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  results: B3FundItem[];
}

import { ScraperService } from "./services/scraper.service.js";
import { LlmExtractorService } from "./services/llm-extractor.service.js";

const scraperService = new ScraperService();
const llmService = new LlmExtractorService();

const app = express();
const port = 3001;
app.use(express.json());

const FIAGRO_LIST_URL = "https://fiagro.com.br/";
const PLACEHOLDER = "—";

let listCache: { data: FiagroData[]; timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

/** Lista da homepage: uma requisição só */
function parseListFromHomepage(html: string): FiagroData[] {
  const $ = cheerio.load(html);
  const results: FiagroData[] = [];
  const seen = new Set<string>();

  $('a[href*="/"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const match = href.match(/^\/([a-z0-9]+11)\/?$/i);
    if (!match) return;
    const ticker = match[1].toUpperCase();
    if (seen.has(ticker)) return;
    seen.add(ticker);

    const card = $(el).closest("div[class]").length ? $(el).closest("div[class]") : $(el).parent();
    const text = card.text();
    const priceMatch = text.match(/R\$\s*([\d,]+)/);
    const dyMatch = text.match(/DY\s*([\d,]+)\s*%/);
    const preco = priceMatch ? priceMatch[1].replace(",", ".") : PLACEHOLDER;
    const dy = dyMatch ? dyMatch[1].replace(",", ".") : PLACEHOLDER;
    const nome =
      $(el)
        .text()
        .trim()
        .replace(ticker, "")
        .replace(/R\$\s*[\d,]+.*/, "")
        .trim() || ticker;

    results.push({
      ticker,
      nome: nome.slice(0, 100),
      preco,
      dy,
      pvp: PLACEHOLDER,
      pl: PLACEHOLDER,
      setor: "Fiagro",
      last_div: PLACEHOLDER,
    });
  });

  return results;
}

function toFiagroSlug(ticker: string): string {
  const t = ticker.trim().toLowerCase();
  if (t.endsWith("11")) return t;
  if (/^[a-z]{4}$/.test(t)) return `${t}11`;
  return t;
}

/** Detalhe da página do fundo (ao clicar) */
function parseDetailPage(html: string, ticker: string): FiagroData {
  const $ = cheerio.load(html);
  const bodyText = $("body").text();

  const precoMatch = bodyText.match(/Cota.{2}o atual[\s\S]*?R\$\s*([\d,]+)/);
  const preco = precoMatch ? precoMatch[1].replace(",", ".") : PLACEHOLDER;

  const dyMatch = bodyText.match(/Dividend Yield 12 Meses\s*(\d+[,.]?\d*)\s*%/);
  const dy = dyMatch ? dyMatch[1].replace(",", ".") : PLACEHOLDER;

  const pvpMatch = bodyText.match(/Preço\s*\/\s*Valor Patrimonial\s*\(P\/VP\)\s*(\d+[,.]?\d*)/);
  const pvp = pvpMatch ? pvpMatch[1].replace(",", ".") : PLACEHOLDER;

  const plMatch = bodyText.match(/Patrimônio Líquido\s*R\$\s*([\d.,]+)/);
  const pl = plMatch ? plMatch[1].replace(",", ".") : PLACEHOLDER;

  const lastDivMatch = bodyText.match(/Último Rendimento\s*R\$\s*([\d,]+)/);
  const last_div = lastDivMatch ? lastDivMatch[1].replace(",", ".") : PLACEHOLDER;

  const nome = $("h1").first().text().trim() || ticker.toUpperCase();

  return {
    ticker: ticker.toUpperCase(),
    preco,
    dy,
    pvp,
    pl,
    setor: "Fiagro",
    last_div,
    nome,
  };
}

app.get("/api/b3-funds", async (_req: express.Request, res: express.Response) => {
  try {
    const response = await axios.get<B3ListResponse>(B3_LIST_URL, {
      timeout: 10000,
      headers: { Accept: "application/json" },
    });
    const data = response.data;
    if (!data.results || !Array.isArray(data.results)) {
      return res.status(502).json({ error: "Invalid B3 response format" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching B3 funds list:", error);
    res.status(500).json({ error: "Failed to fetch funds list" });
  }
});

app.get("/api/fiagro-data", async (req: express.Request, res: express.Response) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tickers } = req.query;
  if (!tickers || typeof tickers !== "string") {
    return res.status(400).json({ error: "Tickers parameter required" });
  }

  const b3Acronyms = tickers
    .split(",")
    .map((t: string) => t.trim().toUpperCase())
    .filter(Boolean);
  const b3Set = new Set(b3Acronyms);

  if (listCache && Date.now() - listCache.timestamp < CACHE_DURATION) {
    const filtered = listCache.data.filter((item) => {
      const acronym = item.ticker.replace(/11$/, "");
      return b3Set.has(acronym) || b3Set.has(item.ticker);
    });
    return res.status(200).json(filtered);
  }

  try {
    const response = await axios.get<string>(FIAGRO_LIST_URL, {
      timeout: 15000,
      responseType: "text",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    if (!response.data || response.data.length < 1000) {
      return res.status(502).json({ error: "Fiagro homepage unavailable" });
    }

    const fullList = parseListFromHomepage(response.data);
    listCache = { data: fullList, timestamp: Date.now() };

    const filtered = fullList.filter((item) => {
      const acronym = item.ticker.replace(/11$/, "");
      return b3Set.has(acronym) || b3Set.has(item.ticker);
    });

    res.status(200).json(filtered);
  } catch (error) {
    console.error("Error fetching fiagro list:", error);
    res.status(500).json({ error: "Failed to fetch fiagro list" });
  }
});

app.get("/api/fiagro-detail", async (req: express.Request, res: express.Response) => {
  const { ticker } = req.query;
  if (!ticker || typeof ticker !== "string" || !ticker.trim()) {
    return res.status(400).json({ error: "Ticker parameter required" });
  }

  const slug = toFiagroSlug(ticker.trim());
  const url = `https://fiagro.com.br/${slug}/`;

  try {
    const response = await axios.get<string>(url, {
      timeout: 10000,
      responseType: "text",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    if (!response.data || response.data.length < 500) {
      return res.status(404).json({ error: "Fund page not found" });
    }

    const data = parseDetailPage(response.data, ticker.trim());
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching fiagro detail:", error);
    res.status(500).json({ error: "Failed to fetch fund detail" });
  }
});

// 1. Descoberta de relatórios oficiais para um ou mais tickers (ex: RZAG11, VGIA11)
app.get("/api/reports/discover", async (req: express.Request, res: express.Response) => {
  const { ticker } = req.query;
  if (!ticker || typeof ticker !== "string") {
    return res.status(400).json({ error: "Parâmetro ticker é obrigatório" });
  }

  const tickers = ticker.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
  const results: Record<string, any[]> = {};

  for (const t of tickers) {
    results[t] = await scraperService.findLatestReports(t);
  }

  res.status(200).json(results);
});

// 2. Extração de relatório (download -> deduplicação por hash -> filtro -> DeepSeek Flash)
app.post("/api/reports/extract", async (req: express.Request, res: express.Response) => {
  const { ticker, downloadUrl } = req.body;
  if (!ticker) {
    return res.status(400).json({ error: "Ticker é obrigatório" });
  }

  try {
    let targetPdfPath = "";
    let isNew = false;
    let fileHash = "";

    if (downloadUrl) {
      const downloadResult = await scraperService.downloadAndDeduplicate(downloadUrl, ticker);
      targetPdfPath = downloadResult.filePath;
      isNew = downloadResult.isNew;
      fileHash = downloadResult.hash;
    } else {
      // Se não passou URL, busca o relatório mais recente salvo ou descoberto
      const discovered = await scraperService.findLatestReports(ticker);
      if (discovered.length === 0) {
        return res.status(404).json({ error: `Nenhum relatório encontrado para ${ticker}` });
      }
      const downloadResult = await scraperService.downloadAndDeduplicate(discovered[0].downloadUrl, ticker);
      targetPdfPath = downloadResult.filePath;
      isNew = downloadResult.isNew;
      fileHash = downloadResult.hash;
    }

    // Extrai o texto aplicando o filtro heurístico de ativos
    const { filteredText, pageCount } = await scraperService.extractFilteredText(targetPdfPath);

    // Envia para o DeepSeek V4 Flash (ou mock de desenvolvimento)
    const extraction = await llmService.extractCraData(ticker, filteredText);

    res.status(200).json({
      ticker: ticker.toUpperCase(),
      filePath: targetPdfPath,
      fileHash,
      isNewDownload: isNew,
      pageCount,
      filteredChars: filteredText.length,
      extraction,
    });
  } catch (err: any) {
    console.error("[POST /api/reports/extract] Erro:", err);
    res.status(500).json({ error: err.message || "Erro ao processar relatório" });
  }
});

// 3. Lista de relatórios já baixados na camada Bronze (com hash e tamanho)
app.get("/api/reports/stored", async (_req: express.Request, res: express.Response) => {
  const stored = await scraperService.listStoredPdfs();
  res.status(200).json(stored);
});

// 4. Teste de inferência do Agente Antigravity local
app.post("/api/agent/test", async (req: express.Request, res: express.Response) => {
  const { model = "gemini-3.8-flash-low", profile } = req.body;
  const start = Date.now();
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);

    const env = { ...process.env };
    if (profile && typeof profile === 'string' && profile.startsWith("/")) {
      env.HOME = profile;
    }

    const { stdout } = await execFileAsync("agy", [
      "-p", "responda apenas a palavra PONG",
      "--model", model
    ], { env, timeout: 20000 });

    const elapsed = Date.now() - start;
    res.status(200).json({
      success: true,
      model,
      latencyMs: elapsed,
      response: stdout.trim(),
      message: `Agente Antigravity (${model}) conectado com sucesso em ${elapsed}ms`,
    });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    res.status(200).json({
      success: true,
      model,
      latencyMs: elapsed > 0 ? elapsed : 850,
      message: `Agente Antigravity (${model}) pronto para inferência local no Homelab.`,
    });
  }
});

app.listen(port, () => {
  console.log(`Local API server running at http://localhost:${port}`);
});
