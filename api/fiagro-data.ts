import axios from "axios";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  parseListFromHomepage,
  filterFiagrosByTickers,
  type FiagroData,
} from "./_lib/fiagroScraper.js";

export type { FiagroData };

/** Cache simples em memória com TTL de 15 minutos */
let listCache: { data: FiagroData[]; timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000;

const LIST_URL = "https://fiagro.com.br/";

/**
 * Handler Vercel — GET /api/fiagro-data?tickers=FGAA,SNAG
 *
 * Toda a lógica de parsing está em _lib/fiagroScraper.ts (função parseListFromHomepage).
 * Isso permite testar o parsing com HTML de fixture sem precisar chamar a rede:
 *
 *   yarn vitest run api/__tests__/fiagroScraper.test.ts
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { tickers } = req.query;
  if (!tickers || typeof tickers !== "string") {
    res.status(400).json({ error: "Tickers parameter required" });
    return;
  }

  const tickerList = tickers
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Serve do cache se ainda dentro do TTL
  if (listCache && Date.now() - listCache.timestamp < CACHE_DURATION) {
    res.status(200).json(filterFiagrosByTickers(listCache.data, tickerList));
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
      res.status(502).json({ error: "Fiagro homepage unavailable" });
      return;
    }

    const fullList = parseListFromHomepage(response.data);
    listCache = { data: fullList, timestamp: Date.now() };

    res.status(200).json(filterFiagrosByTickers(fullList, tickerList));
  } catch (err) {
    console.error("Error fetching fiagro list:", err);
    res.status(500).json({ error: "Failed to fetch fiagro list" });
  }
}
