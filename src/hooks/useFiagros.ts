import { useState, useEffect, useMemo } from "react";

export interface Fiagro {
  ticker: string;
  preco: string;
  dy: string;
  pvp: string;
  pl: string;
  setor: string;
  last_div: string;
  nome: string;
}

/** Resposta do endpoint B3 de listagem de fundos (usado para tipar o fetch) */
interface B3ListResponse {
  page: {
    pageNumber: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  results: Array<{
    id: number;
    typeName: string | null;
    acronym: string;
    fundName: string;
    tradingName: string;
  }>;
}

function isB3ListResponse(data: unknown): data is B3ListResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "results" in data &&
    Array.isArray((data as B3ListResponse).results)
  );
}

export interface Filters {
  priceMin: number;
  priceMax: number;
  dyMin: number;
  pvpBelow1: boolean;
  pvpFair: boolean;
  sectors: string[];
}

export interface UseFiagrosReturn {
  fiagros: Fiagro[];
  loading: boolean;
  error: string | null;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  search: string;
  setSearch: (search: string) => void;
  sortBy: "dy" | "price";
  setSortBy: (sortBy: "dy" | "price") => void;
  loadMore: () => void;
  hasMore: boolean;
  refresh: () => void;
  /** Detalhe completo (P/VP, último div etc.) quando o usuário clica no fundo */
  detailByTicker: Record<string, Fiagro>;
  /** Ticker cujo detalhe está carregando */
  loadingDetailTicker: string | null;
  /** Carrega detalhe do fundo (uma requisição por clique) */
  fetchDetail: (ticker: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 6;

export const useFiagros = (): UseFiagrosReturn => {
  const [allFiagros, setAllFiagros] = useState<Fiagro[]>([]);
  const [b3Fiagros, setB3Fiagros] = useState<Fiagro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickers, setTickers] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  console.log("b3Fiagros: ", b3Fiagros);
  const [filters, setFilters] = useState<Filters>({
    priceMin: 8,
    priceMax: 110,
    dyMin: 0,
    pvpBelow1: false,
    pvpFair: false,
    sectors: [],
  });

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"dy" | "price">("dy");
  const [detailByTicker, setDetailByTicker] = useState<Record<string, Fiagro>>({});
  const [loadingDetailTicker, setLoadingDetailTicker] = useState<string | null>(null);

  // Fetch dados da B3 e já exibe cards básicos
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const response = await fetch("/api/b3-funds");
        if (!response.ok) throw new Error("Failed to fetch tickers");
        const contentType = response.headers?.get("Content-Type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error("Server returned non-JSON response");
        }
        const data: unknown = await response.json();
        if (!isB3ListResponse(data)) {
          throw new Error("Invalid response format from B3 list");
        }
        const tickerList = data.results
          .map((item) => item.acronym?.trim())
          .filter((t): t is string => typeof t === "string" && t.length > 0);
        setTickers(tickerList.slice(0, 25));

        // Monta cards básicos imediatamente
        const mapped: Fiagro[] = data.results.map((item) => ({
          ticker: (item.acronym || "").toUpperCase(),
          preco: "—",
          dy: "—",
          pvp: "—",
          pl: "—",
          setor: "Fiagro",
          last_div: "—",
          nome: item.tradingName || item.fundName || (item.acronym || "").toUpperCase(),
        }));
        setB3Fiagros(mapped);
        console.log("mapped: ", mapped);
        setAllFiagros(mapped); // Mostra imediatamente
      } catch (err) {
        console.error("Error fetching tickers:", err);
        setError("Failed to load tickers");
      }
    };
    fetchTickers();
  }, []);

  // Fetch fiagros data detalhados (scraping) e atualiza cards
  useEffect(() => {
    if (tickers.length === 0) return;

    const fetchFiagros = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/fiagro-data?tickers=${tickers.join(",")}`);
        if (!response.ok) throw new Error("Failed to fetch fiagros data");
        const data: Fiagro[] = await response.json();
        // Atualiza apenas se vier dados válidos
        if (Array.isArray(data) && data.length > 0) {
          setAllFiagros(data);
        }
      } catch (err) {
        console.error("Error fetching fiagros:", err);
        setError("Failed to load fiagros data");
      } finally {
        setLoading(false);
      }
    };
    fetchFiagros();
  }, [tickers]);

  // Filtered and sorted fiagros
  const fiagros = useMemo(() => {
    const filtered = allFiagros.filter((fiagro) => {
      const preco = parseFloat(fiagro.preco);
      const dy = parseFloat(fiagro.dy) || 0;
      const pvp = parseFloat(fiagro.pvp) || 0;

      // Price range 
      if (!isNaN(preco) && (preco < filters.priceMin || preco > filters.priceMax)) return false;

      // DY min
      if (!isNaN(parseFloat(fiagro.dy)) && dy < filters.dyMin) return false;
      // P/VP (só aplica se tiver valor numérico; "—" = detalhe não carregado)
      if (!Number.isNaN(pvp)) {
        if (filters.pvpBelow1 && pvp >= 1) return false;
        if (filters.pvpFair && pvp < 1) return false;
      }

      // Sectors
      if (filters.sectors.length > 0 && !filters.sectors.includes(fiagro.setor)) return false;

      // Search
      if (search && !fiagro.ticker.toLowerCase().includes(search.toLowerCase())) return false;

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "dy") {
        return (parseFloat(b.dy) || 0) - (parseFloat(a.dy) || 0);
      } else {
        return (parseFloat(a.preco) || 0) - (parseFloat(b.preco) || 0);
      }
    });

    return filtered;
  }, [allFiagros, filters, search, sortBy]);

  // Paginated
  const paginatedFiagros = useMemo(() => {
    return fiagros.slice(0, page * ITEMS_PER_PAGE);
  }, [fiagros, page]);

  const hasMore = paginatedFiagros.length < fiagros.length;

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  const refresh = () => {
    setPage(1);
    setAllFiagros([]);
    setDetailByTicker({});
    setLoading(true);
  };

  const fetchDetail = async (ticker: string): Promise<void> => {
    if (detailByTicker[ticker]) return;
    setLoadingDetailTicker(ticker);
    try {
      const response = await fetch(`/api/fiagro-detail?ticker=${encodeURIComponent(ticker)}`);
      if (!response.ok) throw new Error("Failed to fetch detail");
      const data: Fiagro = await response.json();
      setDetailByTicker((prev) => ({ ...prev, [ticker]: data }));
    } catch (err) {
      console.error("Error fetching detail for", ticker, err);
    } finally {
      setLoadingDetailTicker(null);
    }
  };

  return {
    fiagros: paginatedFiagros,
    loading,
    error,
    filters,
    setFilters,
    search,
    setSearch,
    sortBy,
    setSortBy,
    loadMore,
    hasMore,
    refresh,
    detailByTicker,
    loadingDetailTicker,
    fetchDetail,
  };
};
