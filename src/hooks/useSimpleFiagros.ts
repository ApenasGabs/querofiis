import { useState, useEffect, useMemo } from "react";

export interface SimpleFiagro {
  /** Ticker sem o sufixo "11" (ex: "FGAA" em vez de "FGAA11") */
  ticker: string;
  /** Ticker original completo (ex: "FGAA11") */
  tickerFull: string;
  preco: string;
  dy: string;
  pvp: string;
  setor: string;
  last_div: string;
  nome: string;
}

interface B3ListResponse {
  results: Array<{
    acronym: string;
    fundName: string;
    tradingName: string;
  }>;
}

interface FiagroDataItem {
  ticker: string;
  preco: string;
  dy: string;
  pvp: string;
  pl: string;
  setor: string;
  last_div: string;
  nome: string;
}

/** Remove o sufixo "11" (ou "11B", "12"…) usado em fundos de investimento no Brasil */
const stripSuffix = (ticker: string) => ticker.replace(/\d{2}[A-Z]?$/i, "").toUpperCase();

export interface UseSimpleFiagrosReturn {
  fiagros: SimpleFiagro[];
  /** true enquanto a lista da B3 ainda não chegou (nada para mostrar) */
  loading: boolean;
  /** true enquanto os preços/DY do scraper ainda estão carregando (tabela já visível) */
  loadingPrices: boolean;
  error: string | null;
  search: string;
  setSearch: (v: string) => void;
  sortBy: "dy" | "price" | "ticker";
  setSortBy: (v: "dy" | "price" | "ticker") => void;
}

export const useSimpleFiagros = (): UseSimpleFiagrosReturn => {
  const [fiagros, setFiagros] = useState<SimpleFiagro[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPrices] = useState(false); // sempre false — mantido na interface por compat.
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"dy" | "price" | "ticker">("dy");

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        // Passo 1 — B3 (rápido, ~1s): descobre quais tickers existem
        const b3Res = await fetch("/api/b3-funds");
        if (!b3Res.ok) throw new Error("Falha ao buscar lista da B3");
        const b3Data = (await b3Res.json()) as B3ListResponse;
        if (cancelled) return;

        // Monta set de tickers válidos (com e sem sufixo) para filtro posterior
        const b3Set = new Set<string>();
        const b3Tickers: string[] = [];
        for (const item of b3Data.results) {
          const t = item.acronym?.trim().toUpperCase();
          if (!t) continue;
          b3Set.add(t);
          b3Set.add(stripSuffix(t));
          // Manda sempre com e sem "11" para maximizar matches no scraper
          b3Tickers.push(t);
          if (!t.endsWith("11")) b3Tickers.push(`${t}11`);
        }

        // Passo 2 — fiagro.com.br (pode ser lento na 1ª chamada, cached depois)
        // Envia todos os tickers da B3 de uma vez; o endpoint lida com isso
        const fRes = await fetch(`/api/fiagro-data?tickers=${b3Tickers.join(",")}`);
        if (!fRes.ok) throw new Error("Falha ao buscar dados do Fiagro");
        const fData = (await fRes.json()) as FiagroDataItem[];
        if (cancelled) return;

        // Mapeia: só inclui fundos que a B3 confirmou E têm dados reais (sem "—")
        const seen = new Set<string>();
        const mapped: SimpleFiagro[] = [];

        for (const f of Array.isArray(fData) ? fData : []) {
          const fullTicker = f.ticker.toUpperCase();
          const base = stripSuffix(fullTicker);
          if (seen.has(base)) continue;

          // Descarta se a B3 não reconhece
          if (!b3Set.has(fullTicker) && !b3Set.has(base)) continue;

          // Descarta linhas sem preço E sem DY (dado realmente vazio)
          if (f.preco === "—" && f.dy === "—") continue;

          seen.add(base);
          mapped.push({
            ticker: base,
            tickerFull: fullTicker,
            preco: f.preco,
            dy: f.dy,
            pvp: f.pvp,
            setor: f.setor,
            last_div: f.last_div,
            nome: f.nome,
          });
        }

        setFiagros(mapped);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = fiagros.filter((f) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return f.ticker.toLowerCase().includes(q) || f.nome.toLowerCase().includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "dy") return (parseFloat(b.dy) || 0) - (parseFloat(a.dy) || 0);
      if (sortBy === "price") return (parseFloat(a.preco) || 0) - (parseFloat(b.preco) || 0);
      return a.ticker.localeCompare(b.ticker);
    });

    return list;
  }, [fiagros, search, sortBy]);

  return { fiagros: filtered, loading, loadingPrices, error, search, setSearch, sortBy, setSortBy };
};
