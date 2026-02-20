import axios from "axios";
import * as cheerio from "cheerio";

const URL = "https://fiagro.com.br/";

interface FiagroListItem {
  ticker: string;
  nome: string;
  preco: string;
  dy: string;
}

function parseListFromHomepage(html: string): FiagroListItem[] {
  const $ = cheerio.load(html);
  const results: FiagroListItem[] = [];
  const seen = new Set<string>();

  // Links para /TICKER11/ são os fundos
  $('a[href*="/"]').each((_, el) => {
    const rawHref = $(el).attr("href") ?? "";
    const normalizedHref = (() => {
      if (!rawHref) return "";
      if (rawHref.startsWith("http")) {
        try {
          return new URL(rawHref).pathname;
        } catch {
          return "";
        }
      }
      return rawHref;
    })();
    const match = normalizedHref.match(/^\/([a-z0-9]+11)\/?$/i);
    if (!match) return;
    const ticker = match[1].toUpperCase();
    if (seen.has(ticker)) return;
    seen.add(ticker);

    const card = $(el).closest("div[class]").length ? $(el).closest("div[class]") : $(el).parent();
    const text = card.text();
    const priceMatch = text.match(/R\$\s*([\d,]+)/);
    const dyMatch = text.match(/DY\s*([\d,]+)\s*%/);
    const preco = priceMatch ? priceMatch[1].replace(",", ".") : "—";
    const dy = dyMatch ? dyMatch[1].replace(",", ".") : "—";
    const nome =
      $(el)
        .text()
        .trim()
        .replace(ticker, "")
        .replace(/R\$\s*[\d,]+.*/, "")
        .trim() || ticker;
    results.push({ ticker, nome: nome.slice(0, 80), preco, dy });
  });

  if (results.length > 0) return results;

  // Fallback: regex no texto (formato "TICKER11 Name R$ X,XX ... DY X,XX%")
  const bodyText = $("body").text();
  const re = /([A-Z]{4}11)\s+([^\n]+?)\s+R\$\s*([\d,]+)\s+[\d,\-\.]+%\s*DY\s*([\d,]+)%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyText)) !== null) {
    const ticker = m[1];
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    results.push({
      ticker,
      nome: m[2].trim().slice(0, 80),
      preco: m[3].replace(",", "."),
      dy: m[4].replace(",", "."),
    });
  }

  return results;
}

async function main(): Promise<void> {
  const r = await axios.get<string>(URL, {
    timeout: 10000,
    responseType: "text",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  const list = parseListFromHomepage(r.data);
  console.log("Total:", list.length);
  console.log(JSON.stringify(list.slice(0, 5), null, 2));
}

main().catch((e) => console.error(e));
