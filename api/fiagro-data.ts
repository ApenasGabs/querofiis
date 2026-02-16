import axios from "axios";
import * as cheerio from "cheerio";
import { IncomingMessage, ServerResponse } from "http";

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

// Simple in-memory cache
let cache: { data: FiagroData[]; timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export default async function handler(
  req: IncomingMessage & { query: Record<string, string | string[]> },
  res: ServerResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tickers } = req.query;
  if (!tickers || typeof tickers !== "string") {
    return res.status(400).json({ error: "Tickers parameter required" });
  }

  const tickerList = tickers.split(",").slice(0, 25); // Limit to 25

  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return res.status(200).json(cache.data.filter((item) => tickerList.includes(item.ticker)));
  }

  try {
    const data: FiagroData[] = [];

    for (const ticker of tickerList) {
      try {
        const url = `https://fiagro.com.br/${ticker.toLowerCase()}/`;
        const response = await axios.get(url, { timeout: 10000 });
        const $ = cheerio.load(response.data);

        const preco = $(".preco strong").text().trim().replace(",", ".");
        const dy = $(".dy").text().trim().replace("%", "").replace(",", ".");
        const pvp = $('table.stats td:contains("P/VP")').next().text().trim() || "N/A";
        const pl = $('table.stats td:contains("PL")').next().text().trim() || "N/A";
        const setor = $('table.stats td:contains("Setor")').next().text().trim() || "N/A";
        const last_div =
          $('table.stats td:contains("Último Dividendo")').next().text().trim() || "N/A";
        const nome = $("h1").text().trim() || ticker;

        data.push({
          ticker: ticker.toUpperCase(),
          preco,
          dy,
          pvp,
          pl,
          setor,
          last_div,
          nome,
        });

        // Delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error scraping ${ticker}:`, error);
        // Skip this ticker
      }
    }

    // Update cache
    cache = { data, timestamp: Date.now() };

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
