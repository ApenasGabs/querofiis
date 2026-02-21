import { useState } from "react";
import { Footer } from "./components/Footer/Footer";
import { Navbar } from "./components/Navbar/Navbar";
import ThemeSelector from "./components/ThemeSelector/ThemeSelector";
import { FiagroExplorer } from "./components/FiagroExplorer/FiagroExplorer";
import { SimpleFiagroPage } from "./components/SimpleFiagroPage/SimpleFiagroPage";

type Page = "explorer" | "simple";

const App = () => {
  const [page, setPage] = useState<Page>("explorer");

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <Navbar title="Quero FIIS">
        <nav style={{ display: "flex", gap: "0.5rem", marginRight: "0.75rem" }}>
          <button
            onClick={() => setPage("explorer")}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: 4,
              border: "1px solid currentColor",
              background: page === "explorer" ? "rgba(255,255,255,0.15)" : "transparent",
              cursor: "pointer",
              fontSize: "0.8rem",
              color: "inherit",
            }}
          >
            Explorador
          </button>
          <button
            onClick={() => setPage("simple")}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: 4,
              border: "1px solid currentColor",
              background: page === "simple" ? "rgba(255,255,255,0.15)" : "transparent",
              cursor: "pointer",
              fontSize: "0.8rem",
              color: "inherit",
            }}
          >
            Tabela Simples
          </button>
        </nav>
        <ThemeSelector />
      </Navbar>
      {page === "explorer" ? <FiagroExplorer /> : <SimpleFiagroPage />}
      <Footer />
    </div>
  );
};

export default App;
