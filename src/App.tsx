import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { Alert } from "./components/Alert/Alert";
import { Button } from "./components/Button/Button";
import { ComponentsDemo } from "./components/ComponentsDemo";
import { CounterCard } from "./components/CounterCard/CounterCard";
import { FeatureCard } from "./components/FeatureCard/FeatureCard";
import { Footer } from "./components/Footer/Footer";
import { Logo } from "./components/Logo/Logo";
import { Navbar } from "./components/Navbar/Navbar";
import ThemeSelector from "./components/ThemeSelector/ThemeSelector";
import { ToolItem } from "./components/ToolItem/ToolItem";
import { FiagroExplorer } from "./components/FiagroExplorer/FiagroExplorer";
import viteLogo from "/vite.svg";

const VERSIONS = {
  vite: "7.2.4",
  react: "19.2.0",
  typescript: "5.9.3",
  tailwind: "4.1.18",
  daisyui: "5.5.14",
  vitest: "4.0.18",
  playwright: "1.58.0",
};

const App = () => {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <Navbar title="Apenas Template">
        <ThemeSelector />
      </Navbar>

      <FiagroExplorer />

      <Footer />
    </div>
  );
};

export default App;
