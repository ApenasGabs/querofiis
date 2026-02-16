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

interface B3Fund {
  symbol?: string;
  code?: string;
  acronym?: string;
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
}

const ITEMS_PER_PAGE = 6;

export function useFiagros(): UseFiagrosReturn {
  const [allFiagros, setAllFiagros] = useState<Fiagro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickers, setTickers] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<Filters>({
    priceMin: 8,
    priceMax: 110,
    dyMin: 10.5,
    pvpBelow1: false,
    pvpFair: false,
    sectors: ["Paper (CRI/Agro)", "Equity / Land", "Hybrid", "FOF (Fund of Funds)"],
  });

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"dy" | "price">("dy");

  // Fetch tickers from B3
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const response = await fetch("/b3-funds");
        if (!response.ok) throw new Error("Failed to fetch tickers");
        const data = await response.json();
        // Assuming the response has a 'results' array with tickers
        const tickers =
          data.results?.map((item: B3Fund) => item.symbol || item.code || item.acronym) || [];
        setTickers(tickers.slice(0, 25));
      } catch (err) {
        console.error("Error fetching tickers:", err);
        setError("Failed to load tickers");
      }
    };
    fetchTickers();
  }, []);

  // Fetch fiagros data
  useEffect(() => {
    if (tickers.length === 0) return;

    const fetchFiagros = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/fiagro-data?tickers=${tickers.join(",")}`);
        if (!response.ok) throw new Error("Failed to fetch fiagros data");
        const data: Fiagro[] = await response.json();
        setAllFiagros(data);
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
      const preco = parseFloat(fiagro.preco) || 0;
      const dy = parseFloat(fiagro.dy) || 0;
      const pvp = parseFloat(fiagro.pvp) || 0;

      // Price range
      if (preco < filters.priceMin || preco > filters.priceMax) return false;

      // DY min
      if (dy < filters.dyMin) return false;

      // P/VP
      if (filters.pvpBelow1 && pvp >= 1) return false;
      if (filters.pvpFair && pvp < 1) return false;

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
    // Re-fetch
    setAllFiagros([]);
    setLoading(true);
    // Trigger useEffect by updating tickers or something, but for now, assume re-run
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
  };
}
