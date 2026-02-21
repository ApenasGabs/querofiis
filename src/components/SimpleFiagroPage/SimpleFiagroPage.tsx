import { useSimpleFiagros } from "../../hooks/useSimpleFiagros";

/**
 * Versão simples do explorador de FIAGROs.
 * CSS mínimo — sem gradientes, sem animações.
 * Tickers exibidos sem o sufixo numérico (ex: "FGAA" em vez de "FGAA11").
 * A B3 é usada apenas como filtro: só aparecem fundos que ela lista.
 * Tabela só aparece quando todos os dados reais estiverem prontos — sem "—".
 */
export const SimpleFiagroPage = () => {
  const { fiagros, loading, error, search, setSearch, sortBy, setSortBy } = useSimpleFiagros();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>FIAGROs</h1>
      <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        {loading ? "Buscando dados…" : `${fiagros.length} fundos encontrados`}
        {" · "}Fonte: fiagro.com.br · Filtro: B3
      </p>

      {/* Controles */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Buscar por ticker ou nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px",
            padding: "0.4rem 0.75rem",
            border: "1px solid #ccc",
            borderRadius: 4,
            fontSize: "0.875rem",
          }}
        />
        <label
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" }}
        >
          Ordenar por:
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "dy" | "price" | "ticker")}
            style={{ padding: "0.4rem 0.5rem", border: "1px solid #ccc", borderRadius: 4 }}
          >
            <option value="dy">DY (maior primeiro)</option>
            <option value="price">Preço (menor primeiro)</option>
            <option value="ticker">Ticker (A→Z)</option>
          </select>
        </label>
      </div>

      {/* Estados */}
      {error && (
        <p data-testid="simple-error" style={{ color: "red", margin: "1rem 0" }}>
          Erro: {error}
        </p>
      )}

      {loading && !error && (
        <p data-testid="simple-loading" style={{ color: "#888" }}>
          Aguardando dados do fiagro.com.br… (pode levar alguns segundos na primeira vez)
        </p>
      )}

      {/* Tabela — só aparece quando loading terminou e sem erro */}
      {!loading && !error && (
        <table
          data-testid="simple-table"
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
              <th style={{ padding: "0.5rem 0.75rem" }}>Ticker</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Nome</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Setor</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Preço</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>DY 12m</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>P/VP</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Último Div.</th>
            </tr>
          </thead>
          <tbody>
            {fiagros.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "1rem 0.75rem", color: "#888" }}>
                  Nenhum fundo encontrado.
                </td>
              </tr>
            )}
            {fiagros.map((f, i) => {
              const dy = parseFloat(f.dy);
              const pvp = parseFloat(f.pvp);
              return (
                <tr
                  key={f.ticker}
                  data-testid={`simple-row-${f.ticker}`}
                  style={{
                    background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{f.ticker}</td>
                  <td
                    style={{
                      padding: "0.5rem 0.75rem",
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={f.nome}
                  >
                    {f.nome}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "#555" }}>{f.setor}</td>
                  <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                    {f.preco !== "—" ? `R$ ${f.preco}` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem 0.75rem",
                      textAlign: "right",
                      color: !isNaN(dy) && dy >= 10 ? "green" : "inherit",
                      fontWeight: !isNaN(dy) && dy >= 10 ? 600 : "normal",
                    }}
                  >
                    {f.dy !== "—" ? `${f.dy}%` : "—"}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem 0.75rem",
                      textAlign: "right",
                      color: !isNaN(pvp) && pvp < 1 ? "green" : "inherit",
                    }}
                  >
                    {f.pvp}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                    {f.last_div !== "—" ? `R$ ${f.last_div}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#aaa" }}>
        Dados com fins informativos. Não constitui recomendação de investimento.
      </p>
    </div>
  );
};

export default SimpleFiagroPage;
