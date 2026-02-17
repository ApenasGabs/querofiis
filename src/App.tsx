import { Footer } from "./components/Footer/Footer";
import { Navbar } from "./components/Navbar/Navbar";
import ThemeSelector from "./components/ThemeSelector/ThemeSelector";
import { FiagroExplorer } from "./components/FiagroExplorer/FiagroExplorer";

const App = () => {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <Navbar title="Quero FIIS">
        <ThemeSelector />
      </Navbar>
      <FiagroExplorer />
      <Footer />
    </div>
  );
};

export default App;
