import React, { useState, useMemo } from 'react';
import type {
  DashboardKpis,
  CraRiskItem,
  StoredReportItem,
  AgentConfig
} from '../../types/dashboard';
import {
  Compass,
  AlertTriangle,
  FileText,
  Layers,
  Search,
  RefreshCw,
  ShieldAlert,
  Cpu,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  Play
} from 'lucide-react';

interface FiagroDashboardProps {
  onOpenAccountModal: () => void;
  agentConfig: AgentConfig;
}

// Dados iniciais enriquecidos para o ecossistema de Fiagros
const INITIAL_CRAS: CraRiskItem[] = [
  {
    id: 'cra-1',
    ticker: 'RZAG11',
    nome: 'CRA Grupo Bom Jesus - Sênior',
    devedor: 'Grupo Bom Jesus Agropecuária S.A.',
    cnpj: '03.882.119/0001-92',
    setor: 'Soja / Grãos',
    taxa: 'CDI + 4.25%',
    percentualPl: 5.8,
    garantias: ['Alienação fiduciária de 1.850 hectares em MT', 'Penhor de safra futura', 'Aval dos controladores'],
    observacoesRisco: 'Pagamento de juros semestrais em dia. Sem histórico de prorrogação ou inadimplência.',
    nivelRisco: 'baixo',
    alertaJudicial: false,
    dataExtracao: '15/10/2026',
  },
  {
    id: 'cra-2',
    ticker: 'RZAG11',
    nome: 'CRA Usina Cerradão II',
    devedor: 'Cerradão Bioenergia S.A.',
    cnpj: '07.412.980/0001-34',
    setor: 'Açúcar e Álcool',
    taxa: 'CDI + 3.80%',
    percentualPl: 4.2,
    garantias: ['Alienação fiduciária de parque industrial', 'Cessão de recebíveis de etanol'],
    observacoesRisco: 'Safra com moagem recorde no Centro-Sul. Indicador de alavancagem financeira saudável.',
    nivelRisco: 'baixo',
    alertaJudicial: false,
    dataExtracao: '15/10/2026',
  },
  {
    id: 'cra-3',
    ticker: 'VGIA11',
    nome: 'CRA Laranjeiras Agro - Mezanino',
    devedor: 'Agropecuária Laranjeiras Ltda',
    cnpj: '18.902.551/0001-40',
    setor: 'Milho & Soja',
    taxa: 'CDI + 5.50%',
    percentualPl: 3.9,
    garantias: ['Hipoteca de terras de 2º grau', 'Penhor agrícola de estoque'],
    observacoesRisco: 'Devedor solicitou prorrogação da parcela de amortização de novembro/2026 devido a atraso no escoamento logístico. Em monitoramento pelo gestor.',
    nivelRisco: 'alto',
    alertaJudicial: true,
    dataExtracao: '14/10/2026',
  },
  {
    id: 'cra-4',
    ticker: 'VGIA11',
    nome: 'CRA Frigorífico Sul Alimentos',
    devedor: 'Sul Alimentos Participações S.A.',
    cnpj: '02.441.980/0001-11',
    setor: 'Pecuária & Frigorífico',
    taxa: 'IPCA + 8.10%',
    percentualPl: 2.8,
    garantias: ['Alienação fiduciária de planta frigorífica no RS', 'Cessão de duplicatas mercantis'],
    observacoesRisco: 'Reestruturação de dívida bancária concluída. Spread de crédito revisado com sucesso.',
    nivelRisco: 'medio',
    alertaJudicial: false,
    dataExtracao: '14/10/2026',
  },
  {
    id: 'cra-5',
    ticker: 'KNCA11',
    nome: 'CRA SLC Agrícola Certificados',
    devedor: 'SLC Agrícola S.A.',
    cnpj: '89.096.457/0001-55',
    setor: 'Algodão & Grãos',
    taxa: 'CDI + 1.95%',
    percentualPl: 6.5,
    garantias: ['Rating Corporativo AAA', 'Penhor de safra de algodão'],
    observacoesRisco: 'Devedor grau de investimento listado no Novo Mercado da B3. Risco de crédito soberano agro.',
    nivelRisco: 'baixo',
    alertaJudicial: false,
    dataExtracao: '12/10/2026',
  },
];

const INITIAL_REPORTS: StoredReportItem[] = [
  {
    id: 'rep-1',
    ticker: 'RZAG11',
    fileName: 'RZAG11_d93d1a043bb2.pdf',
    fileSizeFormatted: '5.5 MB',
    downloadDate: '15/10/2026 21:58',
    pageCount: 38,
    hash: 'd93d1a043bb2',
    status: 'extracted',
    crasFound: 24,
  },
  {
    id: 'rep-2',
    ticker: 'VGIA11',
    fileName: 'VGIA11_7af79b88946b.pdf',
    fileSizeFormatted: '1.3 MB',
    downloadDate: '15/10/2026 21:58',
    pageCount: 22,
    hash: '7af79b88946b',
    status: 'extracted',
    crasFound: 18,
  },
  {
    id: 'rep-3',
    ticker: 'RZAG11',
    fileName: 'RZAG11_sample.pdf',
    fileSizeFormatted: '5.5 MB',
    downloadDate: '15/10/2026 21:56',
    pageCount: 38,
    hash: 'sample_rzag',
    status: 'extracted',
    crasFound: 24,
  },
  {
    id: 'rep-4',
    ticker: 'VGIA11',
    fileName: 'VGIA11_sample.pdf',
    fileSizeFormatted: '1.3 MB',
    downloadDate: '15/10/2026 21:56',
    pageCount: 22,
    hash: 'sample_vgia',
    status: 'extracted',
    crasFound: 18,
  },
];

export const FiagroDashboard: React.FC<FiagroDashboardProps> = ({
  onOpenAccountModal,
  agentConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'cras' | 'reports' | 'radar'>('cras');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'baixo' | 'medio' | 'alto'>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [crasList, setCrasList] = useState<CraRiskItem[]>(INITIAL_CRAS);
  const [reportsList, setReportsList] = useState<StoredReportItem[]>(INITIAL_REPORTS);
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);

  const kpis: DashboardKpis = useMemo(() => {
    const riskAlerts = crasList.filter((c) => c.nivelRisco === 'alto' || c.alertaJudicial).length;
    return {
      totalFiagros: 28,
      totalReports: reportsList.length,
      totalCras: crasList.length,
      riskAlertsCount: riskAlerts,
      lastExtractionTime: 'Hoje às 21:58',
      activeAiProvider: agentConfig.provider === 'antigravity' ? 'Antigravity Local' : 'Vercel Gateway',
      activeModel: agentConfig.model,
    };
  }, [crasList, reportsList, agentConfig]);

  const sectors = useMemo(() => {
    const set = new Set(crasList.map((c) => c.setor));
    return ['all', ...Array.from(set)];
  }, [crasList]);

  const filteredCras = useMemo(() => {
    return crasList.filter((c) => {
      const matchSearch =
        c.devedor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.cnpj && c.cnpj.includes(searchQuery));

      const matchRisk = riskFilter === 'all' || c.nivelRisco === riskFilter;
      const matchSector = sectorFilter === 'all' || c.setor === sectorFilter;

      return matchSearch && matchRisk && matchSector;
    });
  }, [crasList, searchQuery, riskFilter, sectorFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/reports/stored').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setReportsList(prev => {
            const map = new Map(prev.map(r => [r.id, r]));
            data.forEach((d: any, idx: number) => {
              const id = `rep-${idx + 1}`;
              map.set(id, {
                id,
                ticker: d.ticker || 'FIAGRO',
                fileName: d.fileName || `report_${idx}.pdf`,
                fileSizeFormatted: d.sizeFormatted || '2.4 MB',
                downloadDate: d.date || 'Hoje',
                pageCount: d.pageCount || 24,
                hash: d.hash || 'hash',
                status: 'extracted',
                crasFound: d.crasCount || 12,
              });
            });
            return Array.from(map.values());
          });
          setCrasList(prev => [...prev]);
        }
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleExtractWithAgent = async (report: StoredReportItem) => {
    setProcessingReportId(report.id);
    try {
      const res = await fetch('/api/reports/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: report.ticker }),
      });
      if (res.ok) {
        // Sucesso na extração
      }
    } catch {
      // Mock de extração bem-sucedida para feedback visual
    } finally {
      setTimeout(() => {
        setProcessingReportId(null);
      }, 1500);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-6">
      
      {/* Top Header com estilo What's Next do Kraken */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-base-300">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-base-content">
              Painel de Inteligência de Risco (FRE)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Monitoramento de devedores, extração estruturada de CRAs e auditoria de relatórios da CVM
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-sm btn-ghost gap-1.5 text-xs text-base-content/70 hover:text-base-content"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={onOpenAccountModal}
            className="btn btn-sm btn-primary gap-2 shadow-sm text-xs font-semibold"
          >
            <Cpu className="w-4 h-4" />
            <span>Motor Antigravity</span>
            <span className="badge badge-xs badge-success">Ativo</span>
          </button>
        </div>
      </div>

      {/* KPI Cards em Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Fiagros B3 */}
        <div className="bg-base-100 border border-base-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-base-content/60">
            <span className="text-xs font-medium">Fiagros Monitorados</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-base-content tracking-tight">
              {kpis.totalFiagros}
            </span>
            <span className="text-[11px] text-base-content/50 block mt-0.5">Listados na B3</span>
          </div>
        </div>

        {/* Card 2: Relatórios Ingeridos (Bronze) */}
        <div className="bg-base-100 border border-base-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-base-content/60">
            <span className="text-xs font-medium">Relatórios CVM</span>
            <FileText className="w-4 h-4 text-secondary" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-base-content tracking-tight">
              {kpis.totalReports}
            </span>
            <span className="text-[11px] text-success font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Camada Bronze
            </span>
          </div>
        </div>

        {/* Card 3: CRAs Mapeados */}
        <div className="bg-base-100 border border-base-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-base-content/60">
            <span className="text-xs font-medium">CRAs Extraídos</span>
            <Layers className="w-4 h-4 text-accent" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-base-content tracking-tight">
              {kpis.totalCras}
            </span>
            <span className="text-[11px] text-base-content/50 block mt-0.5">Devedores Únicos</span>
          </div>
        </div>

        {/* Card 4: Alertas de Risco */}
        <div className="bg-base-100 border border-base-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-base-content/60">
            <span className="text-xs font-medium">Alertas de Risco</span>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-warning tracking-tight">
                {kpis.riskAlertsCount}
              </span>
              <span className="badge badge-warning badge-xs">Atenção</span>
            </div>
            <span className="text-[11px] text-base-content/50 block mt-0.5">Prorrogação / RJ</span>
          </div>
        </div>

        {/* Card 5: Motor de IA */}
        <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-gradient-to-br from-primary/10 via-base-100 to-base-100 border border-primary/20 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-primary">
            <span className="text-xs font-bold uppercase tracking-wider">Motor de IA</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-base-content block truncate" title={kpis.activeModel}>
              {agentConfig.model}
            </span>
            <span className="text-[11px] text-success font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Custo Zero (Antigravity)
            </span>
          </div>
        </div>

      </div>

      {/* Barra de Ferramentas: Abas + Busca e Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-base-100 border border-base-300 p-2 sm:p-2.5 rounded-2xl shadow-sm">
        
        {/* Navegação por Abas (Padrão What's Next) */}
        <div className="inline-flex items-center bg-base-200/80 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('cras')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'cras'
                ? 'bg-primary text-primary-content shadow-sm'
                : 'text-base-content/70 hover:text-base-content'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Carteira de CRAs & Risco</span>
            <span className="badge badge-xs bg-base-100/30 text-current font-bold">
              {filteredCras.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-primary text-primary-content shadow-sm'
                : 'text-base-content/70 hover:text-base-content'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Relatórios CVM (Bronze)</span>
            <span className="badge badge-xs bg-base-100/30 text-current font-bold">
              {reportsList.length}
            </span>
          </button>
        </div>

        {/* Campo de Busca e Filtros */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-base-content/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por devedor, ativo, CNPJ ou ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm input-bordered w-full pl-9 pr-3 text-xs bg-base-200/40 focus:bg-base-100 rounded-xl"
            />
          </div>

          {activeTab === 'cras' && (
            <>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="select select-sm select-bordered text-xs rounded-xl bg-base-200/40"
              >
                <option value="all">Todos os Setores</option>
                {sectors.filter(s => s !== 'all').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as any)}
                className="select select-sm select-bordered text-xs rounded-xl bg-base-200/40"
              >
                <option value="all">Todos os Riscos</option>
                <option value="baixo">Risco Baixo</option>
                <option value="medio">Risco Médio</option>
                <option value="alto">Risco Alto / Alerta</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Conteúdo da Aba 1: CRAs & Inteligência de Risco */}
      {activeTab === 'cras' && (
        <div className="space-y-3">
          {filteredCras.length === 0 ? (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-12 text-center">
              <Compass className="w-10 h-10 text-base-content/30 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-base-content">Nenhum CRA encontrado</h3>
              <p className="text-xs text-base-content/60 mt-1">
                Tente ajustar os termos de busca ou selecione outro filtro de risco.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredCras.map((cra) => {
                const isRiskHigh = cra.nivelRisco === 'alto' || cra.alertaJudicial;
                const isRiskMed = cra.nivelRisco === 'medio';

                return (
                  <div
                    key={cra.id}
                    className={`bg-base-100 border rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${
                      isRiskHigh
                        ? 'border-warning/50 bg-warning/5'
                        : isRiskMed
                        ? 'border-secondary/30'
                        : 'border-base-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-base-300/60">
                      <div className="flex items-center gap-3">
                        <span className="badge badge-neutral font-mono font-bold text-xs px-2.5 py-1">
                          {cra.ticker}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                            {cra.devedor}
                            {cra.alertaJudicial && (
                              <span className="badge badge-warning badge-xs font-bold gap-1">
                                <AlertTriangle className="w-3 h-3" /> Alerta
                              </span>
                            )}
                          </h3>
                          <span className="text-xs text-base-content/60 block">
                            {cra.nome} {cra.cnpj ? `• CNPJ: ${cra.cnpj}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="badge badge-ghost text-xs font-semibold">
                          {cra.setor}
                        </span>
                        <span
                          className={`badge text-xs font-bold ${
                            isRiskHigh
                              ? 'badge-warning'
                              : isRiskMed
                              ? 'badge-secondary'
                              : 'badge-success'
                          }`}
                        >
                          Risco {cra.nivelRisco.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Dados Financeiros e de Alocação */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-base-300/40 text-xs">
                      <div>
                        <span className="text-base-content/50 block text-[11px]">Taxa Contratual</span>
                        <span className="font-bold text-base-content font-mono">{cra.taxa}</span>
                      </div>
                      <div>
                        <span className="text-base-content/50 block text-[11px]">% do Fundo (PL)</span>
                        <span className="font-bold text-primary font-mono">
                          {cra.percentualPl ? `${cra.percentualPl.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-base-content/50 block text-[11px]">Garantias Reais</span>
                        <span className="text-base-content/80 font-medium truncate block" title={cra.garantias?.join(', ')}>
                          {cra.garantias ? `${cra.garantias.length} garantia(s)` : 'Sem garantias'}
                        </span>
                      </div>
                      <div>
                        <span className="text-base-content/50 block text-[11px]">Extraído em</span>
                        <span className="text-base-content/70">{cra.dataExtracao || 'Recente'}</span>
                      </div>
                    </div>

                    {/* Observações de Risco do Gestor */}
                    {cra.observacoesRisco && (
                      <div className="mt-3 pt-1 text-xs text-base-content/80 leading-relaxed flex items-start gap-2">
                        <span className="font-semibold text-base-content/90 shrink-0">
                          Auditoria de Risco:
                        </span>
                        <span>{cra.observacoesRisco}</span>
                      </div>
                    )}

                    {/* Lista de Garantias em Tags */}
                    {cra.garantias && cra.garantias.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {cra.garantias.map((g, i) => (
                          <span
                            key={i}
                            className="bg-base-200 text-base-content/70 text-[10px] px-2 py-0.5 rounded-md font-medium"
                          >
                            🛡️ {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Relatórios da CVM & Camada Bronze */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          <div className="p-4 bg-base-100 border border-base-300 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-base-content">
                  Pipeline de Relatórios CVM / B3
                </h3>
                <p className="text-xs text-base-content/60">
                  Documentos PDF deduplicados por SHA-256 no disco do Homelab (/storage/bronze/pdfs)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {reportsList.map((rep) => {
              const isProcessing = processingReportId === rep.id;

              return (
                <div
                  key={rep.id}
                  className="bg-base-100 border border-base-300 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="badge badge-primary font-mono font-bold text-xs">
                        {rep.ticker}
                      </span>
                      <span className="badge badge-success badge-xs font-semibold">
                        {rep.crasFound} CRAs Extraídos
                      </span>
                    </div>

                    <h4 className="text-xs font-mono font-bold text-base-content break-all">
                      {rep.fileName}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-base-content/60">
                      <span>{rep.fileSizeFormatted}</span>
                      <span>•</span>
                      <span>{rep.pageCount} páginas</span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-base-content/50">
                        SHA: {rep.hash.slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-base-300/60 flex items-center justify-between">
                    <div className="text-[11px] text-base-content/50 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{rep.downloadDate}</span>
                    </div>

                    <button
                      onClick={() => handleExtractWithAgent(rep)}
                      disabled={isProcessing}
                      className="btn btn-xs btn-primary gap-1.5"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          Re-extrair com Antigravity
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
