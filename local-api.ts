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

interface Cache {
  data: FiagroData[];
  timestamp: number;
}

const app = express();
const port = 3001;

let cache: Cache | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

app.get("/api/fiagro-data", async (req: express.Request, res: express.Response) => {
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

        // Extract indicators section
        const indicatorsText = $('h2:contains("Indicadores")').nextUntil("h2").text();

        const precoMatch = indicatorsText.match(/Cotação atual.*?R\$\s*([\d,]+)/);
        const preco = precoMatch ? precoMatch[1].replace(",", ".") : "N/A";

        const dyMatch = indicatorsText.match(/Dividend Yield 12 Meses.*?(\d+,\d+)%/);
        const dy = dyMatch ? dyMatch[1].replace(",", ".") : "N/A";

        const pvpMatch = indicatorsText.match(/Preço \/ Valor Patrimonial.*?(\d+,\d+)/);
        const pvp = pvpMatch ? pvpMatch[1].replace(",", ".") : "N/A";

        const plMatch = indicatorsText.match(/Patrimônio Líquido.*?R\$\s*([\d.,]+)/);
        const pl = plMatch ? plMatch[1] : "N/A";

        const setor = "Fiagro"; // Default

        // Last div from dividends table
        const dividendsTable = $('h2:contains("Dividendos")').next("table");
        const lastDivText = dividendsTable
          .find("tbody tr:first-child td:nth-child(4)")
          .text()
          .trim();
        const last_div = lastDivText.match(/R\$\s*([\d,]+)/)?.[1]?.replace(",", ".") || "N/A";

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
});

app.listen(port, () => {
  console.log(`Local API server running at http://localhost:${port}`);
});
