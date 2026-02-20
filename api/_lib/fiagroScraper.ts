/**
 * api/_lib/fiagroScraper.ts
 *
 * Camada de serviço responsável por todo o scraping do fiagro.com.br.
 * Fica em `_lib/` porque o Vercel ignora pastas com prefixo `_` —
 * ou seja, este arquivo NÃO vira um endpoint HTTP, apenas uma biblioteca
 * importada pelos handlers reais.
 *
 * Os endpoints (fiagro-data.ts, fiagro-detail.ts) importam daqui em vez
 * de ter lógica de scraping inline.
 *
 * Separar dessa forma tem duas vantagens principais:
 *   1. Os endpoints ficam simples (só HTTP / cache / validação)
 *   2. As funções de parsing podem ser testadas diretamente com HTML
 *      de fixture, sem precisar subir servidor ou chamar a rede:
 *
 *        yarn vitest run api/__tests__/fiagroScraper.test.ts
 */

import axios from "axios";
import * as cheerio from "cheerio";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface FiagroData {
  ticker: string; // Ex: "FGAA11"
  preco: string; // Preço atual em R$, ex: "9.85", ou "—" se indisponível
  dy: string; // Dividend Yield 12m em %, ex: "14.20", ou "—"
  pvp: string; // Preço / Valor Patrimonial, ou "—"
  pl: string; // Patrimônio Líquido, ou "—"
  setor: string; // Sempre "Fiagro" nesta versão
  last_div: string; // Último rendimento em R$, ou "—"
  nome: string; // Nome de negociação do fundo
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

export const PLACEHOLDER = "—";

const BASE_URL = "https://fiagro.com.br/";

const SCRAPING_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza um href para sempre ser pathname relativo.
 *   "https://fiagro.com.br/fgaa11/" → "/fgaa11/"
 *   "/fgaa11/"                       → "/fgaa11/" (sem mudança)
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// Parsing — funções puras (recebem HTML string, não fazem requisição)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrai a lista de FIAGROs a partir do HTML da homepage do fiagro.com.br.
 *
 * ESTRATÉGIA DE SELEÇÃO DE ELEMENTOS:
 * ─────────────────────────────────────
 * O HTML do fiagro.com.br tem duas estruturas possíveis:
 *
 * Estrutura 1 — via data-attribute (preferida, mais estável):
 *
 *   <div data-element="filter-list-wrapper">
 *     <a href="/fgaa11/" data-element="fund-card">
 *       <span data-element="fund-ticker">FGAA11</span>
 *       <span data-element="fund-price">R$ 9,85</span>
 *       <span data-element="fund-dy">DY 14,20%</span>
 *     </a>
 *   </div>
 *
 * Estrutura 2 — via classes CSS (fallback, pode mudar com redesign):
 *
 *   <div class="card-fundo">
 *     <a href="/fgaa11/">FGAA11 Fiagro Agro R$ 9,85 DY 14,20%</a>
 *   </div>
 *
 * Para usar data-attributes, substitua o seletor 'a[href*="/"]' por
 * 'a[data-element="fund-card"]' e ajuste os sub-seletores conforme abaixo.
 *
 * A abordagem atual usa links (<a>) + regex por ser mais tolerante a
 * variações de markup. Use os testes em `api/__tests__/fiagroScraper.test.ts`
 * para validar ambas as abordagens com HTML de fixture sem precisar da rede.
 * (não precisa nem de servidor local — os fixtures são strings hardcoded)
 *
 * @param html - HTML completo da homepage
 */
export function parseListFromHomepage(html: string): FiagroData[] {
  const $ = cheerio.load(html);
  const results: FiagroData[] = [];
  const seen = new Set<string>();

  /**
   * OPÇÃO A — data-attributes (descomente se o site usar essa estrutura):
   *
   *   $('a[data-element="fund-card"]').each((_, el) => {
   *     const ticker = $(el).find('[data-element="fund-ticker"]').text().trim().toUpperCase();
   *     const preco  = $(el).find('[data-element="fund-price"]').text().replace(/[^0-9,]/g, "").replace(",", ".");
   *     const dy     = $(el).find('[data-element="fund-dy"]').text().replace(/[^0-9,]/g, "").replace(",", ".");
   *     ...
   *   });
   *
   * OPÇÃO B — links + regex (estratégia atual):
   */
  $('a[href*="/"]').each((_, el) => {
    const href = normalizeHref($(el).attr("href") ?? "");

    /**
     * Regex de ticker: /^\/([a-z0-9]+11)\/?$/i
     * Aceita: "/fgaa11/"  "/snag11"  — Rejeita: "/"  "/sobre"  "/fgaa11/relatorios"
     */
    const match = href.match(/^\/([a-z0-9]+11)\/?$/i);
    if (!match) return;

    const ticker = match[1].toUpperCase();
    if (seen.has(ticker)) return;
    seen.add(ticker);

    const $el = $(el);

    /*
     * Sobe na árvore até um <div> com classe para pegar o "card" do fundo.
     * O preço e DY geralmente ficam fora do <a>, dentro do card pai.
     */
    const card = $el.closest("div[class]").length ? $el.closest("div[class]") : $el.parent();
    const text = card.text();

    const priceMatch = text.match(/R\$\s*([\d,]+)/);
    const dyMatch = text.match(/DY\s*([\d,]+)\s*%/);

    const preco = priceMatch ? priceMatch[1].replace(",", ".") : PLACEHOLDER;
    const dy = dyMatch ? dyMatch[1].replace(",", ".") : PLACEHOLDER;

    /*
     * Nome: pega o texto do <a>, colapsa whitespace excessivo (tabs/newlines
     * do markup), remove o ticker, remove preço e DY que podem vazar do DOM.
     */
    const rawName = $el
      .text()
      .replace(/\s+/g, " ") // colapsa \n \t em espaço simples
      .trim()
      .replace(new RegExp(ticker, "i"), "")
      .replace(/DY\s*[\d,]+\s*%?.*/i, "") // remove "DY 1,16% ..."
      .replace(/R\$\s*[\d,]+.*/i, "") // remove "R$ 9,85 ..."
      .replace(/\s+/g, " ")
      .trim();
    const nome = rawName || ticker;

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

/**
 * Extrai dados detalhados de um fundo a partir do HTML da sua página individual.
 * (usado por /api/fiagro-detail)
 *
 * @param html   - HTML da página do fundo (ex: fiagro.com.br/fgaa11/)
 * @param ticker - Ticker do fundo (usado como fallback para o nome)
 */
export function parseDetailPage(html: string, ticker: string): FiagroData {
  const $ = cheerio.load(html);
  const bodyText = $("body").text();

  const precoMatch = bodyText.match(/Cota.{2}o atual[\s\S]*?R\$\s*([\d,]+)/);
  const dyMatch = bodyText.match(/Dividend Yield 12 Meses\s*(\d+[,.]?\d*)\s*%/);
  const pvpMatch = bodyText.match(/Preço\s*\/\s*Valor Patrimonial\s*\(P\/VP\)\s*(\d+[,.]?\d*)/);
  const plMatch = bodyText.match(/Patrimônio Líquido\s*R\$\s*([\d.,]+)/);
  const lastDivMatch = bodyText.match(/Último Rendimento\s*R\$\s*([\d,]+)/);

  return {
    ticker: ticker.toUpperCase(),
    preco: precoMatch ? precoMatch[1].replace(",", ".") : PLACEHOLDER,
    dy: dyMatch ? dyMatch[1].replace(",", ".") : PLACEHOLDER,
    pvp: pvpMatch ? pvpMatch[1].replace(",", ".") : PLACEHOLDER,
    pl: plMatch ? plMatch[1].replace(",", ".") : PLACEHOLDER,
    last_div: lastDivMatch ? lastDivMatch[1].replace(",", ".") : PLACEHOLDER,
    setor: "Fiagro",
    nome: $("h1").first().text().trim() || ticker.toUpperCase(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de filtro
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converte ticker para o slug usado na URL do fiagro.com.br.
 *   "FGAA"   → "fgaa11"
 *   "FGAA11" → "fgaa11"
 */
export function toFiagroSlug(ticker: string): string {
  const t = ticker.trim().toLowerCase();
  if (t.endsWith("11")) return t;
  if (/^[a-z]{4}$/.test(t)) return `${t}11`;
  return t;
}

/**
 * Filtra a lista de FIAGROs para retornar apenas os tickers solicitados.
 * Aceita tickers com ou sem o sufixo "11".
 *
 * Ex: filterFiagrosByTickers(list, ["FGAA", "SNAG11"])
 *   → retorna itens cujo ticker é FGAA11 ou SNAG11
 */
export function filterFiagrosByTickers(
  list: FiagroData[],
  tickers: Iterable<string>,
): FiagroData[] {
  // Expande cada ticker para ter ambas as formas: "FGAA" e "FGAA11"
  const expanded = new Set<string>();
  for (const raw of tickers) {
    const t = raw.trim().toUpperCase();
    if (!t) continue;
    expanded.add(t);
    expanded.add(t.endsWith("11") ? t.replace(/11$/, "") : `${t}11`);
  }

  return list.filter(
    (item) => expanded.has(item.ticker) || expanded.has(item.ticker.replace(/11$/, "")),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Network — funções que realmente chamam a internet (não testadas em unit tests)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca o HTML da homepage e retorna a lista parseada.
 * Use nos testes de integração / E2E, não nos testes unitários.
 */
export async function fetchFiagroList(): Promise<FiagroData[]> {
  const response = await axios.get<string>(BASE_URL, {
    timeout: 15000,
    responseType: "text",
    headers: SCRAPING_HEADERS,
  });

  if (!response.data || response.data.length < 1000) {
    throw new Error("Fiagro homepage unavailable");
  }

  return parseListFromHomepage(response.data);
}

/**
 * Busca o HTML da página individual e retorna os dados do fundo.
 * Use nos testes de integração / E2E, não nos testes unitários.
 */
export async function fetchFiagroDetail(ticker: string): Promise<FiagroData> {
  const slug = toFiagroSlug(ticker);
  const response = await axios.get<string>(`${BASE_URL}${slug}/`, {
    timeout: 10000,
    responseType: "text",
    headers: SCRAPING_HEADERS,
  });

  if (!response.data || response.data.length < 500) {
    throw new Error("Fund page not found");
  }

  return parseDetailPage(response.data, ticker);
}
