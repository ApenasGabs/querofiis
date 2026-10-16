import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export const CraItemSchema = z.object({
  nome: z.string().describe('Nome ou identificador do ativo CRA'),
  devedor: z.string().describe('Nome do produtor rural, empresa ou grupo devedor'),
  cnpj: z.string().optional().describe('CNPJ do devedor se citado'),
  setor: z.string().describe('Segmento agro (ex: Soja, Milho, Açúcar e Álcool, Pecuária, Insumos)'),
  taxa: z.string().describe('Taxa contratual acordada (ex: CDI + 4,00%, IPCA + 8,50%)'),
  percentualPl: z.number().optional().describe('Percentual do Patrimônio Líquido alocado neste ativo (0 a 100)'),
  garantias: z.array(z.string()).optional().describe('Garantias associadas (ex: Alienação fiduciária de terras, penhor de grãos, aval)'),
  observacoesRisco: z.string().optional().describe('Menção a renegociações, prorrogações, carência ou disputas jurídicas'),
});

export const FiagroExtractionResultSchema = z.object({
  ticker: z.string().describe('Ticker do Fiagro (ex: RZAG11, VGIA11)'),
  mesReferencia: z.string().optional().describe('Mês e ano de referência do relatório'),
  patrimonioLiquido: z.string().optional().describe('Patrimônio líquido do fundo se informado'),
  cras: z.array(CraItemSchema).describe('Lista de CRAs identificados na carteira'),
  resumoRiscoGestor: z.string().optional().describe('Síntese dos comentários do gestor sobre o risco da carteira'),
});

export type FiagroExtractionResult = z.infer<typeof FiagroExtractionResultSchema>;

export interface ExtractionResponse {
  success: boolean;
  data?: FiagroExtractionResult;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    estimatedCostBrl: number;
  };
  error?: string;
  source: 'DEEPSEEK_V4_FLASH' | 'MOCK_SIMULATION';
}

export class LlmExtractorService {
  private readonly gatewayUrl = process.env.VERCEL_AI_GATEWAY_URL || 'https://gateway.ai.vercel.com/v1';
  private readonly apiKey = process.env.VERCEL_AI_GATEWAY_API_KEY || '';
  private readonly modelName = process.env.DEEPSEEK_MODEL || 'deepseek/deepseek-chat';

  // System Prompt estático para maximizar o Prefix Caching do DeepSeek
  private readonly SYSTEM_PROMPT = `
Você é o motor de inteligência de crédito do Fiagro Risk Engine (FRE).
Sua missão é ler excertos de relatórios gerenciais da CVM e B3 e extrair com precisão cirúrgica a carteira de Certificados de Recebíveis do Agronegócio (CRAs).
Diretrizes:
1. Extraia apenas dados expressos no documento; não invente CNPJ ou taxas não citadas.
2. Extraia o maior número possível de CRAs e devedores identificados.
3. Se um percentual do PL for citado (ex: "4,5%"), converta para número flutuante 4.5.
4. Mantenha os nomes dos setores padronizados (ex: Soja, Milho, Café, Pecuária, Sucroalcooleiro, Revenda/Insumos).
`.trim();

  /**
   * Executa a extração estruturada de dados usando DeepSeek V4 Flash via Vercel AI Gateway
   */
  async extractCraData(ticker: string, filteredText: string): Promise<ExtractionResponse> {
    if (!this.apiKey) {
      console.warn('[LlmExtractorService] VERCEL_AI_GATEWAY_API_KEY não definida no ambiente. Retornando simulação para testes.');
      return this.generateMockResponse(ticker);
    }

    try {
      const client = createOpenAI({
        baseURL: this.gatewayUrl,
        apiKey: this.apiKey,
      });

      const model = client(this.modelName);

      const prompt = `Analise o texto a seguir do relatório do Fiagro ${ticker} e extraia os ativos de crédito:\n\n${filteredText}`;

      const { object, usage } = await generateObject({
        model,
        schema: FiagroExtractionResultSchema,
        system: this.SYSTEM_PROMPT,
        prompt,
        temperature: 0.0,
      });

      const promptTokens = usage.promptTokens || 0;
      const completionTokens = usage.completionTokens || 0;
      const totalTokens = promptTokens + completionTokens;

      // Custos DeepSeek V4 Flash via Vercel Gateway: $0.08 input / $0.18 output por 1M tokens
      const estimatedCostUsd = (promptTokens * 0.08) / 1_000_000 + (completionTokens * 0.18) / 1_000_000;
      const estimatedCostBrl = estimatedCostUsd * 5.2;

      return {
        success: true,
        data: object,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUsd,
          estimatedCostBrl,
        },
        source: 'DEEPSEEK_V4_FLASH',
      };
    } catch (err: any) {
      console.error('[LlmExtractorService] Erro na chamada do DeepSeek:', err);
      return {
        success: false,
        error: err.message || 'Erro desconhecido na chamada da LLM',
        source: 'DEEPSEEK_V4_FLASH',
      };
    }
  }

  /**
   * Resposta de fallback mock para desenvolvimento local quando a chave ainda não foi inserida
   */
  private generateMockResponse(ticker: string): ExtractionResponse {
    const isVgia = ticker.toUpperCase() === 'VGIA11';
    return {
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        mesReferencia: 'Relatório Recente',
        patrimonioLiquido: isVgia ? 'R$ 850.000.000,00' : 'R$ 620.000.000,00',
        resumoRiscoGestor: 'Portfólio com foco em originação de CRAs pulverizados e garantias de alienação fiduciária.',
        cras: isVgia
          ? [
              {
                nome: 'CRA Grupo Laranjeiras',
                devedor: 'Agropecuária Laranjeiras Ltda',
                setor: 'Soja / Milho',
                taxa: 'CDI + 4.25%',
                percentualPl: 6.8,
                garantias: ['Alienação fiduciária de imóveis rurais', 'Penhor de safra futura'],
              },
              {
                nome: 'CRA Usina Santa Fé',
                devedor: 'Bioenergia Santa Fé S/A',
                setor: 'Sucroalcooleiro',
                taxa: 'CDI + 3.90%',
                percentualPl: 5.2,
                garantias: ['Aval dos sócios', 'Cessão fiduciária de recebíveis de etanol'],
              },
            ]
          : [
              {
                nome: 'CRA Riza Terra Verde',
                devedor: 'Agrícola Terra Verde S/A',
                setor: 'Grãos (Soja)',
                taxa: 'CDI + 4.50%',
                percentualPl: 7.4,
                garantias: ['Alienação fiduciária de terras no MT', 'Penhor agrícola'],
              },
              {
                nome: 'CRA Cooperativa Regional Agro',
                devedor: 'Cooperativa Agro Norte',
                setor: 'Insumos / Fertilizantes',
                taxa: 'IPCA + 8.20%',
                percentualPl: 4.1,
                garantias: ['Fiança bancária', 'Cessão de duplicatas'],
              },
            ],
      },
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        estimatedCostBrl: 0,
      },
      source: 'MOCK_SIMULATION',
    };
  }
}
