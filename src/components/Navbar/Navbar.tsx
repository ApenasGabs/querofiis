import type { ReactElement, ReactNode } from "react";
import { Compass, LayoutGrid, Cpu } from "lucide-react";

interface NavbarProps {
  title: string;
  activeTab?: 'explorer' | 'dashboard';
  onTabChange?: (tab: 'explorer' | 'dashboard') => void;
  onOpenConfigModal?: () => void;
  children?: ReactNode;
}

/**
 * Componente de barra de navegação moderno com abas e acesso ao motor de IA
 */
export const Navbar = ({
  title,
  activeTab = 'explorer',
  onTabChange,
  onOpenConfigModal,
  children,
}: NavbarProps): ReactElement => {
  return (
    <nav className="navbar flex items-center justify-between bg-base-100/90 backdrop-blur-md border-b border-base-300 px-4 sm:px-6 py-2.5 z-30 sticky top-0">
      
      {/* Esquerda: Logo e Título */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange?.('explorer')}>
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-content flex items-center justify-center font-extrabold text-sm shadow-sm">
            🌾
          </div>
          <div>
            <h1 className="text-base font-extrabold text-base-content tracking-tight leading-none" data-testid="navbar-title">
              {title}
            </h1>
            <span className="text-[10px] text-base-content/50 font-medium">
              Fiagro Risk Engine
            </span>
          </div>
        </div>

        {/* Abas de Navegação Centrais */}
        {onTabChange && (
          <div className="inline-flex items-center bg-base-200/80 rounded-xl p-1 ml-2 sm:ml-4 gap-1">
            <button
              onClick={() => onTabChange('explorer')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'explorer'
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Explorer</span>
            </button>

            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Painel de Risco</span>
              <span className="badge badge-xs bg-warning text-warning-content font-bold">
                Novo
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Direita: Botão de Configuração de Contas / IA + ThemeSelector */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenConfigModal && (
          <button
            onClick={onOpenConfigModal}
            className="btn btn-sm btn-ghost gap-1.5 text-xs border border-base-300 hover:border-primary/50 text-base-content/80 hover:text-base-content rounded-xl"
            title="Configurar motor de inteligência artificial e contas"
          >
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Motor Antigravity</span>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          </button>
        )}

        {children}
      </div>
    </nav>
  );
};
