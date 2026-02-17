import { useFiagros, type Fiagro } from "../../hooks/useFiagros";

export const FiagroExplorer = () => {
  const {
    fiagros,
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
  } = useFiagros();

  const marketAvgDY =
    fiagros.length > 0
      ? (fiagros.reduce((sum, f) => sum + parseFloat(f.dy), 0) / fiagros.length).toFixed(2)
      : "0.00";

  const topPerformer = fiagros.reduce(
    (prev, curr) => (parseFloat(curr.dy) > parseFloat(prev.dy) ? curr : prev),
    fiagros[0] || null,
  );

  const calculateMagicNumber = (dy: string) => {
    const dyNum = parseFloat(dy) / 100;
    return ((1000 * dyNum) / 12).toFixed(2);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-white/10 bg-background-dark/50 backdrop-blur-sm overflow-y-auto h-[calc(100vh-64px)] p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            Advanced Filters
          </h2>
          <button
            className="text-xs text-primary hover:text-primary-hover font-semibold transition-colors"
            onClick={() =>
              setFilters({
                priceMin: 8,
                priceMax: 110,
                dyMin: 0,
                pvpBelow1: false,
                pvpFair: false,
                sectors: ["Paper (CRI/Agro)", "Equity / Land", "Hybrid", "FOF (Fund of Funds)"],
              })
            }
          >
            Reset
          </button>
        </div>
        <div className="space-y-8">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4">
              <span className="material-symbols-outlined text-primary text-lg">payments</span>
              Price Range
            </label>
            <div className="space-y-4">
              <div className="flex justify-between text-xs text-gray-400">
                <span>R$ 0</span>
                <span>R$ 200</span>
              </div>
              <input
                className="w-full"
                max="200"
                min="0"
                type="range"
                value={filters.priceMax}
                onChange={(e) => setFilters({ ...filters, priceMax: parseFloat(e.target.value) })}
              />
              <div className="flex gap-2">
                <input
                  className="w-full bg-surface-dark border border-white/10 rounded-md py-1.5 px-3 text-xs text-gray-300 focus:ring-primary focus:border-primary"
                  type="text"
                  value={`R$ ${filters.priceMin.toFixed(2)}`}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      priceMin: parseFloat(e.target.value.replace("R$ ", "")),
                    })
                  }
                />
                <input
                  className="w-full bg-surface-dark border border-white/10 rounded-md py-1.5 px-3 text-xs text-gray-300 focus:ring-primary focus:border-primary"
                  type="text"
                  value={`R$ ${filters.priceMax.toFixed(2)}`}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      priceMax: parseFloat(e.target.value.replace("R$ ", "")),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4">
              <span className="material-symbols-outlined text-primary text-lg">percent</span>
              Dividend Yield (12m)
            </label>
            <div className="space-y-4">
              <div className="flex justify-between text-xs text-gray-400">
                <span>0%</span>
                <span>20%+</span>
              </div>
              <input
                className="w-full"
                max="25"
                min="0"
                type="range"
                value={filters.dyMin}
                onChange={(e) => setFilters({ ...filters, dyMin: parseFloat(e.target.value) })}
              />
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-xs text-gray-500 italic">Minimum:</span>
                <span className="font-bold text-primary">{filters.dyMin}%</span>
              </div>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4">
              <span className="material-symbols-outlined text-primary text-lg">balance</span>
              P/VP Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="relative group cursor-pointer">
                <input
                  checked={filters.pvpBelow1}
                  className="peer sr-only"
                  type="checkbox"
                  onChange={(e) => setFilters({ ...filters, pvpBelow1: e.target.checked })}
                />
                <div className="w-full py-2 px-3 text-center border border-white/10 rounded-lg bg-surface-dark text-xs text-gray-400 peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:text-primary transition-all">
                  Below 1.00
                </div>
              </label>
              <label className="relative group cursor-pointer">
                <input
                  checked={filters.pvpFair}
                  className="peer sr-only"
                  type="checkbox"
                  onChange={(e) => setFilters({ ...filters, pvpFair: e.target.checked })}
                />
                <div className="w-full py-2 px-3 text-center border border-white/10 rounded-lg bg-surface-dark text-xs text-gray-400 peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:text-primary transition-all">
                  Fair Value
                </div>
              </label>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4">
              <span className="material-symbols-outlined text-primary text-lg">category</span>
              Sector / Type
            </label>
            <div className="space-y-2">
              {["Paper (CRI/Agro)", "Equity / Land", "Hybrid", "FOF (Fund of Funds)"].map(
                (sector) => (
                  <label key={sector} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      checked={filters.sectors.includes(sector)}
                      className="w-4 h-4 rounded border-white/10 bg-surface-dark text-primary focus:ring-primary focus:ring-offset-background-dark"
                      type="checkbox"
                      onChange={(e) => {
                        const newSectors = e.target.checked
                          ? [...filters.sectors, sector]
                          : filters.sectors.filter((s) => s !== sector);
                        setFilters({ ...filters, sectors: newSectors });
                      }}
                    />
                    <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                      {sector}
                    </span>
                  </label>
                ),
              )}
            </div>
          </div>
        </div>
        <div className="mt-12">
          <button
            className="w-full py-3 bg-primary hover:bg-primary-hover text-background-dark font-bold rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            onClick={refresh}
          >
            <span className="material-icons text-sm">refresh</span>
            Apply Filters
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background-light dark:bg-background-dark">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-white/5 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Market Avg DY
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {marketAvgDY}%
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background-dark transition-all">
              <span className="material-icons">show_chart</span>
            </div>
          </div>
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-white/5 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Assets Tracked
              </p>
              <p
                className="text-2xl font-bold text-gray-900 dark:text-white mt-1"
                data-testid="assets-tracked"
              >
                {fiagros.length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background-dark transition-all">
              <span className="material-icons">inventory_2</span>
            </div>
          </div>
          <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-white/5 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-colors">
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Top Performer
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded text-sm">
                  {topPerformer?.ticker || "N/A"}
                </span>
                <span className="text-primary text-sm font-bold">+{topPerformer?.dy || "0"}%</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background-dark transition-all">
              <span className="material-icons">trending_up</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-surface-dark to-primary/20 rounded-xl p-4 border border-primary/20 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <span className="material-icons text-6xl text-primary">ac_unit</span>
            </div>
            <p className="text-[10px] font-medium text-primary uppercase tracking-wider mb-1">
              Your Snowball Goal
            </p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-white">R$ 145.20</p>
              <span className="text-[10px] text-gray-400 mb-1">/ mo passive income</span>
            </div>
            <div className="w-full bg-black/20 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: "35%" }}></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">Active Fiagros</h3>
            <span className="bg-white/5 text-gray-400 text-xs px-2 py-1 rounded-full border border-white/10">
              {fiagros.length} results
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-icons text-gray-400 group-focus-within:text-primary transition-colors">
                  search
                </span>
              </div>
              <input
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg leading-5 bg-white dark:bg-surface-dark placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-all shadow-sm"
                placeholder="Search by Ticker (e.g., SNAG11, FGAA11)..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative group">
              <button className="flex items-center gap-2 text-xs font-semibold text-gray-300 bg-surface-dark hover:bg-surface-darker border border-white/10 px-4 py-2 rounded-lg transition-all">
                <span className="material-icons text-sm text-primary">sort</span>
                Sort: {sortBy === "dy" ? "Dividend Yield" : "Price"}
                <span className="material-icons text-xs text-gray-500">expand_more</span>
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "dy" | "price")}
                className="absolute inset-0 opacity-0 cursor-pointer"
              >
                <option value="dy">Dividend Yield</option>
                <option value="price">Price</option>
              </select>
            </div>
            <div className="h-8 w-[1px] bg-white/10 mx-1"></div>
            <div className="flex bg-surface-dark rounded-lg p-1 border border-white/10">
              <button className="p-1.5 rounded-md bg-primary text-background-dark shadow-sm">
                <span className="material-icons text-sm">grid_view</span>
              </button>
              <button className="p-1.5 rounded-md text-gray-500 hover:text-gray-300">
                <span className="material-icons text-sm">view_list</span>
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div data-testid="fiagro-loading">Loading...</div>
        )}
        {error && (
          <div data-testid="fiagro-error" className="text-red-500">
            {error}
          </div>
        )}

        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          data-testid="fiagro-list"
        >
          {fiagros.map((fiagro: Fiagro) => {
            const detail = detailByTicker[fiagro.ticker];
            const display: Fiagro = detail ? { ...fiagro, ...detail } : fiagro;
            const isLoadingDetail = loadingDetailTicker === fiagro.ticker;
            const hasDetail = Boolean(detail);
            return (
              <article
                key={fiagro.ticker}
                data-testid={`fiagro-card-${fiagro.ticker}`}
                className="group bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 relative cursor-pointer"
                onClick={() => fetchDetail(fiagro.ticker)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fetchDetail(fiagro.ticker);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-white/10">
                        <span className="font-bold text-white text-xs">
                          {display.ticker.slice(0, 4)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-none">
                          {display.ticker}
                        </h3>
                        <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {display.setor}
                        </span>
                      </div>
                    </div>
                    <button
                      className="text-gray-400 hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="material-icons">bookmark_border</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-5">
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                        Current Price
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        R$ {display.preco}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                        DY (12m)
                      </p>
                      <p className="text-base font-bold text-primary">{display.dy}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                        P/VP
                      </p>
                      <p className="text-base font-medium text-gray-300">
                        {isLoadingDetail ? "Carregando…" : display.pvp}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                        Last Div.
                      </p>
                      <p className="text-base font-medium text-gray-300">
                        {isLoadingDetail ? "…" : `R$ ${display.last_div}`}
                      </p>
                    </div>
                  </div>
                  {!hasDetail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Clique para carregar P/VP e último dividendo
                    </p>
                  )}
                  <div className="bg-surface-darker rounded-lg p-3 border border-white/5 group-hover:border-primary/20 transition-colors relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1 bg-primary"></div>
                    <div className="flex justify-between items-end relative z-10">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="material-icons text-primary text-xs">ac_unit</span>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            Magic Number
                          </p>
                        </div>
                        <p className="text-xl font-bold text-white">
                          R$ {calculateMagicNumber(display.dy)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500">
                          ~
                          {Number.isNaN(parseFloat(display.preco))
                            ? "—"
                            : Math.round(1000 / parseFloat(display.preco))}{" "}
                          shares
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-12 mb-8">
            <button
              className="group flex flex-col items-center gap-2 text-gray-500 hover:text-primary transition-colors"
              onClick={loadMore}
            >
              <span className="text-xs font-semibold uppercase tracking-widest">
                Load More Assets
              </span>
              <span className="material-icons text-2xl animate-bounce group-hover:text-primary">
                expand_more
              </span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default FiagroExplorer;
