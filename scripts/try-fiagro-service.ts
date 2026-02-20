import {
  fetchFiagroList,
  filterFiagrosByTickers,
  fetchFiagroDetail,
} from "../api/_lib/fiagroScraper.js";

async function main() {
  const list = await fetchFiagroList();
  console.log("Total encontrados:", list.length);
  console.table(list.slice(0, 5)); // primeiros 5 como amostra

  const selecionados = filterFiagrosByTickers(list, ["FGAA", "SNAG"]);

  console.log("\nFiltrados (FGAA + SNAG):");
  console.table(selecionados);

  const detalhe = await fetchFiagroDetail("FGAA");
  console.log("\nDetalhe FGAA11:");
  console.table([detalhe]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
