import axios from "axios";
import * as cheerio from "cheerio";

const desired = new Set(["FGAA", "SNAG", "AAGR", "AAZQ"]);

async function main() {
  const html = await axios.get("https://fiagro.com.br/", {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  const $ = cheerio.load(html.data);
  const list: string[] = [];
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
    list.push(ticker);
  });
  const unique = Array.from(new Set(list));
  console.log("Total unique", unique.length);
  console.log("Desired present", unique.filter((t) => desired.has(t.replace(/11$/, ""))));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
