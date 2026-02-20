/**
 * fiagroScraper.test.ts
 *
 * Testa as funções de parsing puras (parseListFromHomepage, parseDetailPage)
 * usando HTML de fixture — sem nenhuma chamada de rede.
 *
 * Para rodar SOMENTE este arquivo:
 *
 *   yarn vitest run api/__tests__/fiagroScraper.test.ts
 *
 * Para rodar em watch (re-executa a cada salvo):
 *
 *   yarn vitest api/__tests__/fiagroScraper.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  parseListFromHomepage,
  parseDetailPage,
  toFiagroSlug,
  filterFiagrosByTickers,
  PLACEHOLDER,
} from "../_lib/fiagroScraper.js";

// ─────────────────────────────────────────────────────────────────────────────
// HTML de fixture — simula o HTML real do fiagro.com.br
// ─────────────────────────────────────────────────────────────────────────────
//
// Se o site mudar a estrutura e o scraping parar de funcionar, abra o DevTools
// (F12 → Elements), copie o HTML do card de um fundo e cole aqui para depurar.
//
// DICA: Para testar a abordagem por data-attributes, crie um fixture com:
//   <a href="/fgaa11/" data-element="fund-card">
//     <span data-element="fund-ticker">FGAA11</span>
//     <span data-element="fund-price">R$ 9,85</span>
//     <span data-element="fund-dy">DY 14,20%</span>
//   </a>
// e ajuste o seletor em parseListFromHomepage para 'a[data-element="fund-card"]'.

/** Fixture que usa a estrutura atual (link nua + texto misto no card) */
const makeHomepageHtml = (funds: { ticker: string; preco: string; dy: string; nome: string }[]) => {
  const cards = funds
    .map(
      ({ ticker, preco, dy, nome }) => `
      <div class="card-fundo">
        <a href="/${ticker.toLowerCase()}/">
          ${ticker} ${nome} R$ ${preco} DY ${dy}%
        </a>
      </div>
    `,
    )
    .join("\n");

  return `<!DOCTYPE html><html><body>${cards}</body></html>`;
};

/** Fixture para data-attributes — use quando quiser testar a outra abordagem */
const makeDataAttrHtml = (funds: { ticker: string; preco: string; dy: string; nome: string }[]) => {
  const cards = funds
    .map(
      ({ ticker, preco, dy, nome }) => `
      <div data-element="filter-list-wrapper">
        <a href="/${ticker.toLowerCase()}/" data-element="fund-card">
          <span data-element="fund-ticker">${ticker}</span>
          <span data-element="fund-name">${nome}</span>
          <span data-element="fund-price">R$ ${preco}</span>
          <span data-element="fund-dy">DY ${dy}%</span>
        </a>
      </div>
    `,
    )
    .join("\n");

  return `<!DOCTYPE html><html><body>${cards}</body></html>`;
};

/** Fixture da página de detalhe de um fundo */
const makeDetailHtml = (data: {
  nome: string;
  preco: string;
  dy: string;
  pvp: string;
  pl: string;
  last_div: string;
}) => `
  <!DOCTYPE html>
  <html>
  <body>
    <h1>${data.nome}</h1>
    <p>Cotação atual R$ ${data.preco}</p>
    <p>Dividend Yield 12 Meses ${data.dy}%</p>
    <p>Preço / Valor Patrimonial (P/VP) ${data.pvp}</p>
    <p>Patrimônio Líquido R$ ${data.pl}</p>
    <p>Último Rendimento R$ ${data.last_div}</p>
  </body>
  </html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// Testes de parseListFromHomepage
// ─────────────────────────────────────────────────────────────────────────────

describe("parseListFromHomepage", () => {
  it("extrai ticker, preço e DY de um card simples", () => {
    const html = makeHomepageHtml([
      { ticker: "FGAA11", preco: "9,85", dy: "14,20", nome: "Fiagro Agro" },
    ]);

    const result = parseListFromHomepage(html);

    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("FGAA11");
    expect(result[0].preco).toBe("9.85"); // vírgula → ponto
    expect(result[0].dy).toBe("14.20");
    expect(result[0].setor).toBe("Fiagro");
  });

  it("extrai múltiplos fundos", () => {
    const html = makeHomepageHtml([
      { ticker: "FGAA11", preco: "9,85", dy: "14,20", nome: "Fiagro Agro" },
      { ticker: "SNAG11", preco: "8,50", dy: "12,30", nome: "Suno Agro" },
    ]);

    const result = parseListFromHomepage(html);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.ticker)).toEqual(["FGAA11", "SNAG11"]);
  });

  it("normaliza ticker para maiúsculas", () => {
    const html = makeHomepageHtml([
      { ticker: "fgaa11", preco: "9,85", dy: "14,20", nome: "Fiagro Agro" },
    ]);

    const result = parseListFromHomepage(html);

    expect(result[0].ticker).toBe("FGAA11");
  });

  it("retorna PLACEHOLDER quando preço não encontrado", () => {
    const html = `
      <html><body>
        <div class="card">
          <a href="/fgaa11/">FGAA11 Fiagro Agro DY 14,20%</a>
        </div>
      </body></html>
    `;

    const result = parseListFromHomepage(html);

    expect(result[0].preco).toBe(PLACEHOLDER);
    expect(result[0].dy).toBe("14.20"); // dy ainda funciona
  });

  it("retorna PLACEHOLDER quando DY não encontrado", () => {
    const html = `
      <html><body>
        <div class="card">
          <a href="/fgaa11/">FGAA11 Fiagro Agro R$ 9,85</a>
        </div>
      </body></html>
    `;

    const result = parseListFromHomepage(html);

    expect(result[0].dy).toBe(PLACEHOLDER);
    expect(result[0].preco).toBe("9.85"); // preço ainda funciona
  });

  it("ignora links que não são tickers de FIAGRO", () => {
    const html = `
      <html><body>
        <a href="/">Home</a>
        <a href="/sobre">Sobre</a>
        <a href="https://google.com">Google</a>
        <div class="card">
          <a href="/fgaa11/">FGAA11 R$ 9,85 DY 14,20%</a>
        </div>
      </body></html>
    `;

    const result = parseListFromHomepage(html);

    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("FGAA11");
  });

  it("ignora links de subpáginas do mesmo fundo", () => {
    const html = `
      <html><body>
        <div class="card">
          <a href="/fgaa11/">FGAA11 R$ 9,85 DY 14,20%</a>
          <a href="/fgaa11/relatorios">Relatórios</a>
          <a href="/fgaa11/documentos">Documentos</a>
        </div>
      </body></html>
    `;

    const result = parseListFromHomepage(html);

    // Apenas o link raiz deve ser capturado
    expect(result).toHaveLength(1);
  });

  it("não duplica o mesmo ticker", () => {
    const html = `
      <html><body>
        <div class="card">
          <a href="/fgaa11/">FGAA11 R$ 9,85 DY 14,20%</a>
        </div>
        <div class="card">
          <a href="/fgaa11/">FGAA11 R$ 9,85 DY 14,20%</a>
        </div>
      </body></html>
    `;

    const result = parseListFromHomepage(html);

    expect(result).toHaveLength(1);
  });

  it("retorna lista vazia para HTML sem fundos", () => {
    const html = `<html><body><p>Sem fundos</p></body></html>`;

    const result = parseListFromHomepage(html);

    expect(result).toHaveLength(0);
  });

  /**
   * TESTE DA ABORDAGEM POR DATA-ATTRIBUTES
   *
   * Se você quiser mudar para a abordagem mais estável usando data-attributes,
   * descomente este teste e ajuste o seletor em parseListFromHomepage.
   */
  it.skip("extrai dados via data-attributes (abordagem alternativa)", () => {
    const html = makeDataAttrHtml([
      { ticker: "FGAA11", preco: "9,85", dy: "14,20", nome: "Fiagro Agro" },
    ]);

    // Para passar nesse teste, altere o seletor em parseListFromHomepage:
    //   $('a[data-element="fund-card"]').each(...)
    //   const preco = $(el).find('[data-element="fund-price"]').text()...
    const result = parseListFromHomepage(html);

    expect(result[0].ticker).toBe("FGAA11");
    expect(result[0].preco).toBe("9.85");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes de parseDetailPage
// ─────────────────────────────────────────────────────────────────────────────

describe("parseDetailPage", () => {
  it("extrai todos os campos da página de detalhe", () => {
    const html = makeDetailHtml({
      nome: "Fiagro Agro",
      preco: "9,85",
      dy: "14,20",
      pvp: "0,95",
      pl: "250.000.000",
      last_div: "0,12",
    });

    const result = parseDetailPage(html, "FGAA");

    expect(result.ticker).toBe("FGAA");
    expect(result.nome).toBe("Fiagro Agro");
    expect(result.preco).toBe("9.85");
    expect(result.dy).toBe("14.20");
    expect(result.pvp).toBe("0.95");
    expect(result.pl).toBe("250.000.000");
    expect(result.last_div).toBe("0.12");
  });

  it("usa ticker como nome quando h1 está vazio", () => {
    const html = `<html><body><h1></h1></body></html>`;

    const result = parseDetailPage(html, "FGAA11");

    expect(result.nome).toBe("FGAA11");
  });

  it("retorna PLACEHOLDER para campos ausentes", () => {
    const html = `<html><body><h1>Fiagro Agro</h1></body></html>`;

    const result = parseDetailPage(html, "FGAA");

    expect(result.preco).toBe(PLACEHOLDER);
    expect(result.dy).toBe(PLACEHOLDER);
    expect(result.pvp).toBe(PLACEHOLDER);
    expect(result.pl).toBe(PLACEHOLDER);
    expect(result.last_div).toBe(PLACEHOLDER);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes de toFiagroSlug
// ─────────────────────────────────────────────────────────────────────────────

describe("toFiagroSlug", () => {
  it("mantém ticker com 11 em lowercase", () => {
    expect(toFiagroSlug("FGAA11")).toBe("fgaa11");
    expect(toFiagroSlug("fgaa11")).toBe("fgaa11");
  });

  it("adiciona 11 quando ticker de 4 letras", () => {
    expect(toFiagroSlug("FGAA")).toBe("fgaa11");
    expect(toFiagroSlug("fgaa")).toBe("fgaa11");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Testes de filterFiagrosByTickers
// ─────────────────────────────────────────────────────────────────────────────

describe("filterFiagrosByTickers", () => {
  const list = [
    {
      ticker: "FGAA11",
      nome: "Fiagro Agro",
      preco: "9.85",
      dy: "14.20",
      pvp: "—",
      pl: "—",
      setor: "Fiagro",
      last_div: "—",
    },
    {
      ticker: "SNAG11",
      nome: "Suno Agro",
      preco: "8.50",
      dy: "12.30",
      pvp: "—",
      pl: "—",
      setor: "Fiagro",
      last_div: "—",
    },
    {
      ticker: "RZAG11",
      nome: "RBR Agro",
      preco: "7.00",
      dy: "10.00",
      pvp: "—",
      pl: "—",
      setor: "Fiagro",
      last_div: "—",
    },
  ];

  it("filtra por acrônimo (sem 11)", () => {
    const result = filterFiagrosByTickers(list, ["FGAA", "SNAG"]);

    expect(result.map((r) => r.ticker)).toEqual(["FGAA11", "SNAG11"]);
  });

  it("filtra por ticker completo (com 11)", () => {
    const result = filterFiagrosByTickers(list, ["FGAA11"]);

    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("FGAA11");
  });

  it("mistura formatos com e sem 11", () => {
    const result = filterFiagrosByTickers(list, ["FGAA", "SNAG11"]);

    expect(result.map((r) => r.ticker)).toEqual(["FGAA11", "SNAG11"]);
  });

  it("retorna vazio quando nenhum ticker bate", () => {
    const result = filterFiagrosByTickers(list, ["XPTO"]);

    expect(result).toHaveLength(0);
  });
});
