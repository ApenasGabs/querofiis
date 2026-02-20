import {
  fetchFiagroList,
  filterFiagrosByTickers,
  fetchFiagroDetail,
} from "../src/services/fiagroScraper";

async function main() {
  const list = await fetchFiagroList();
  console.log("Total encontrados:", list.length);

  const selecionados = filterFiagrosByTickers(list, ["FGAA", "SNAG"]);

  const detalhe = await fetchFiagroDetail("FGAA");

  if (!detalhe) {
    console.log("Filtrados:", selecionados);
    console.log("Detalhe FGAA:", detalhe);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
