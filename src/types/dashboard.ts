export interface CraRiskItem {
  id: string;
  ticker: string;
  nome: string;
  devedor: string;
  cnpj?: string;
  setor: string;
  taxa: string;
  percentualPl?: number;
  garantias?: string[];
  observacoesRisco?: string;
  nivelRisco: 'baixo' | 'medio' | 'alto' | 'critico';
  alertaJudicial?: boolean;
  dataExtracao?: string;
}

export interface StoredReportItem {
  id: string;
  ticker: string;
  fileName: string;
  fileSizeFormatted: string;
  downloadDate: string;
  pageCount: number;
  hash: string;
  status: 'extracted' | 'pending' | 'processing' | 'failed';
  crasFound: number;
}

export interface DashboardKpis {
  totalFiagros: number;
  totalReports: number;
  totalCras: number;
  riskAlertsCount: number;
  lastExtractionTime: string;
  activeAiProvider: string;
  activeModel: string;
}

export interface AgentConfig {
  provider: 'antigravity' | 'vercel_gateway' | 'simulation';
  model: string;
  accountEmail: string;
  profilePath: string;
  isConnected: boolean;
  lastTestLatencyMs?: number;
  availableModels: string[];
  autoExtractOnDownload: boolean;
}
