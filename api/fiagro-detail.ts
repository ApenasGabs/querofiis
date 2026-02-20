import axios from "axios";
import * as cheerio from "cheerio";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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

const PLACEHOLDER = "—";
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

function toSlug(ticker: string): string {
  const t = ticker.trim().toLowerCase();
  if (t.endsWith("11")) return t;
  if (/^[a-z]{4}$/.test(t)) return `${t}11`;
  return t;
}

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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { ticker } = req.query;
  if (!ticker || typeof ticker !== "string" || !ticker.trim()) {
    res.status(400).json({ error: "Ticker parameter required" });
    return;
  }

  const slug = toSlug(ticker.trim());
  const url = `https://fiagro.com.br/${slug}/`;

  try {
    const response = await axios.get<string>(url, {
      timeout: 15000,
      responseType: "text",
      headers: REQUEST_HEADERS,
    });

    if (!response.data || response.data.length < 500) {
      res.status(404).json({ error: "Fund page not found" });
      return;
    }

    const data = parseDetailPage(response.data, ticker.trim());
    res.status(200).json(data);
  } catch (err) {
    console.error("[fiagro-detail] Error fetching", ticker, err);
    res.status(500).json({ error: "Failed to fetch fund detail" });
  }
}
