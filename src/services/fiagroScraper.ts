import axios from "axios";
import * as cheerio from "cheerio";

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

const BASE_URL = "https://fiagro.com.br/";
const PLACEHOLDER = "—";
const LIST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};
const REQUEST_TIMEOUT = 15000;
const MIN_LIST_HTML_LENGTH = 1000;
const MIN_DETAIL_HTML_LENGTH = 500;

function normalizeHref(rawHref: string): string {
  if (!rawHref) return "";
  if (rawHref.startsWith("http")) {
    try {
      return new URL(rawHref).pathname;
    } catch {
      return "";
    }
  }
  return rawHref;
}

export function parseListFromHomepage(html: string): FiagroData[] {
  const $ = cheerio.load(html);
  const results: FiagroData[] = [];
  const seen = new Set<string>();

  $('a[href*="/"]').each((_, el) => {
    const normalizedHref = normalizeHref($(el).attr("href") ?? "");
    const match = normalizedHref.match(/^\/([a-z0-9]+11)\/?$/i);
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

export const toFiagroSlug = (ticker: string): string => {
  const normalized = ticker.trim().toLowerCase();
  if (normalized.endsWith("11")) return normalized;
  if (/^[a-z]{4}$/.test(normalized)) return `${normalized}11`;
  return normalized;
};

export const parseDetailPage = (html: string, ticker: string): FiagroData => {
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

export async function fetchFiagroList(): Promise<FiagroData[]> {
  const response = await axios.get<string>(BASE_URL, {
    timeout: REQUEST_TIMEOUT,
    responseType: "text",
    headers: LIST_HEADERS,
  });

  if (!response.data || response.data.length < MIN_LIST_HTML_LENGTH) {
    throw new Error("Fiagro homepage unavailable");
  }

  return parseListFromHomepage(response.data);
}

export async function fetchFiagroDetail(ticker: string): Promise<FiagroData> {
  const slug = toFiagroSlug(ticker);
  const response = await axios.get<string>(`${BASE_URL}${slug}/`, {
    timeout: REQUEST_TIMEOUT,
    responseType: "text",
    headers: LIST_HEADERS,
  });

  if (!response.data || response.data.length < MIN_DETAIL_HTML_LENGTH) {
    throw new Error("Fund page not found");
  }

  return parseDetailPage(response.data, ticker);
}

const expandTickerSet = (tickers: Iterable<string>): Set<string> => {
  const expanded = new Set<string>();
  for (const raw of tickers) {
    const normalized = raw.trim().toUpperCase();
    if (!normalized) continue;
    expanded.add(normalized);
    if (normalized.endsWith("11")) {
      expanded.add(normalized.replace(/11$/, ""));
    } else {
      expanded.add(`${normalized}11`);
    }
  }
  return expanded;
};

export const filterFiagrosByTickers = (
  list: FiagroData[],
  tickers: Iterable<string>,
): FiagroData[] => {
  const expanded = expandTickerSet(tickers);
  if (expanded.size === 0) {
    return [];
  }

  return list.filter((item) => {
    const acronym = item.ticker.replace(/11$/, "");
    return expanded.has(item.ticker) || expanded.has(acronym);
  });
};

export { PLACEHOLDER };
