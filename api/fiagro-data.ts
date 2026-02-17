import axios from "axios";
import * as cheerio from "cheerio";
import { IncomingMessage, ServerResponse } from "http";

export interface FiagroData {
  ticker: string;
  preco: string;
  dy: string;
  pvp: string;
  pl: string;
  setor: string;
  last_div: string;
  nome: string;
}

const BASE_URL = "https://fiagro.com.br";
const LIST_URL = `${BASE_URL}/`;

const PLACEHOLDER = "—";

let listCache: { data: FiagroData[]; timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 min

/** Extrai lista de fiagros da homepage (uma única requisição) */
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

/** Responde JSON */
function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export default async function handler(
  req: IncomingMessage & { query: Record<string, string | string[]> },
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const { tickers } = req.query;
  if (!tickers || typeof tickers !== "string") {
    sendJson(res, 400, { error: "Tickers parameter required" });
    return;
  }

  const b3Acronyms = tickers
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const b3Set = new Set(b3Acronyms);

  if (listCache && Date.now() - listCache.timestamp < CACHE_DURATION) {
    const filtered = listCache.data.filter((item) => {
      const acronym = item.ticker.replace(/11$/, "");
      return b3Set.has(acronym) || b3Set.has(item.ticker);
    });
    sendJson(res, 200, filtered);
    return;
  }

  try {
    const response = await axios.get<string>(LIST_URL, {
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
      sendJson(res, 502, { error: "Fiagro homepage unavailable" });
      return;
    }

    const fullList = parseListFromHomepage(response.data);
    listCache = { data: fullList, timestamp: Date.now() };

    const filtered = fullList.filter((item) => {
      const acronym = item.ticker.replace(/11$/, "");
      return b3Set.has(acronym) || b3Set.has(item.ticker);
    });

    sendJson(res, 200, filtered);
  } catch (err) {
    console.error("Error fetching fiagro list:", err);
    sendJson(res, 500, { error: "Failed to fetch fiagro list" });
  }
}
