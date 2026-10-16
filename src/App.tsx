import { useState } from "react";
import { Footer } from "./components/Footer/Footer";
import { Navbar } from "./components/Navbar/Navbar";
import ThemeSelector from "./components/ThemeSelector/ThemeSelector";
import { FiagroExplorer } from "./components/FiagroExplorer/FiagroExplorer";
import { FiagroDashboard } from "./components/FiagroDashboard/FiagroDashboard";
import { AccountConfigModal } from "./components/AccountConfigModal/AccountConfigModal";
import type { AgentConfig } from "./types/dashboard";

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  provider: "antigravity",
  model: "gemini-3.8-flash-low",
  accountEmail: "homelab@antigravity.local",
  profilePath: "~/.gemini/antigravity-cli",
  isConnected: true,
  availableModels: [
    "gemini-3.8-flash-low",
    "gemini-3.8-flash-high",
    "gemini-4-argon-medium",
    "claude-sonnet-5-5-medium",
  ],
  autoExtractOnDownload: true,
};

const App = () => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'dashboard'>('dashboard');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(() => {
    const saved = localStorage.getItem('querofiis_agent_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_AGENT_CONFIG;
  });

  const handleSaveAgentConfig = (newConfig: AgentConfig) => {
    setAgentConfig(newConfig);
    localStorage.setItem('querofiis_agent_config', JSON.stringify(newConfig));
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <Navbar
        title="Quero FIIs"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenConfigModal={() => setIsAccountModalOpen(true)}
      >
        <ThemeSelector />
      </Navbar>

      <main className="flex-1 flex flex-col">
        {activeTab === 'explorer' ? (
          <FiagroExplorer />
        ) : (
          <FiagroDashboard
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
            agentConfig={agentConfig}
          />
        )}
      </main>

      <Footer />

      <AccountConfigModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        config={agentConfig}
        onSaveConfig={handleSaveAgentConfig}
      />
    </div>
  );
};

export default App;
