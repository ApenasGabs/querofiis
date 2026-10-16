import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export interface DiscoveredReport {
  ticker: string;
  title: string;
  downloadUrl: string;
  source: string;
}

export class ScraperService {
  private readonly storageDir = path.resolve(process.cwd(), 'storage', 'bronze', 'pdfs');

  constructor() {
    // Garante que o diretório da camada Bronze existe
    fs.mkdir(this.storageDir, { recursive: true }).catch(() => {});
  }

  /**
   * Localiza os relatórios oficiais mais recentes de um Fiagro (ex: RZAG11, VGIA11)
   */
  async findLatestReports(ticker: string): Promise<DiscoveredReport[]> {
    const cleanTicker = ticker.trim().toUpperCase();
    const reports: DiscoveredReport[] = [];

    try {
      // 1. Busca no agregador oficial Fundamentus (que indexa os IDs do FNET/B3)
      const url = `https://www.fundamentus.com.br/fii_relatorios.php?papel=${cleanTicker}`;
      const res = await axios.get<string>(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 12000,
      });

      const $ = cheerio.load(res.data);
      $('table tr').each((_, tr) => {
        const downloadLink = $(tr).find('a[href*="downloadDocumento"]').attr('href');
        const title = $(tr).find('td').first().text().trim() || $(tr).text().replace(/\s+/g, ' ').trim();

        if (downloadLink) {
          const fullUrl = downloadLink.startsWith('http')
            ? downloadLink
            : `https://fnet.bmfbovespa.com.br/fnet/publico/${downloadLink}`;

          reports.push({
            ticker: cleanTicker,
            title: title.slice(0, 100),
            downloadUrl: fullUrl,
            source: 'B3/FNET via Fundamentus',
          });
        }
      });
    } catch (err: any) {
      console.warn(`[ScraperService] Erro ao buscar relatórios para ${cleanTicker}:`, err.message);
    }

    return reports;
  }

  /**
   * Baixa o relatório PDF e aplica deduplicação via SHA256 no disco
   */
  async downloadAndDeduplicate(downloadUrl: string, ticker: string): Promise<{ filePath: string; isNew: boolean; hash: string }> {
    await fs.mkdir(this.storageDir, { recursive: true });

    const res = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const buffer = Buffer.from(res.data);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileName = `${ticker.toUpperCase()}_${hash.slice(0, 12)}.pdf`;
    const filePath = path.join(this.storageDir, fileName);

    try {
      await fs.access(filePath);
      // Se o arquivo já existe no disco, não gasta requisições ou tokens adicionais
      return { filePath, isNew: false, hash };
    } catch {
      await fs.writeFile(filePath, buffer);
      return { filePath, isNew: true, hash };
    }
  }

  /**
   * Extrai e filtra o texto do PDF, mantendo apenas seções com ativos de crédito (CRAs)
   */
  async extractFilteredText(pdfPath: string): Promise<{ fullText: string; filteredText: string; pageCount: number }> {
    const buffer = await fs.readFile(pdfPath);
    const parser = new pdf.PDFParse({ data: buffer });
    const result = await parser.getText();
    const fullText: string = result.text || '';

    // Filtro heurístico: extrai apenas linhas que contenham termos da carteira de risco
    const lines = fullText.split('\n');
    const relevantLines = lines.filter((line: string) =>
      /CRA|Certificado|Devedor|Taxa|CDI|IPCA|Garantia|Vencimento|Safra|Aliena[cç][aã]o|Inadimpl|Patrim[oô]nio/i.test(line)
    );

    const filteredText = relevantLines.length > 15
      ? relevantLines.join('\n').slice(0, 18000)
      : fullText.slice(0, 18000);

    return {
      fullText,
      filteredText,
      pageCount: result.total || 0,
    };
  }

  /**
   * Lista todos os PDFs armazenados na camada Bronze
   */
  async listStoredPdfs(): Promise<Array<{ fileName: string; ticker: string; sizeBytes: number; createdAt: Date }>> {
    try {
      const files = await fs.readdir(this.storageDir);
      const details = await Promise.all(
        files
          .filter((f) => f.endsWith('.pdf'))
          .map(async (fileName) => {
            const fullPath = path.join(this.storageDir, fileName);
            const stats = await fs.stat(fullPath);
            const ticker = fileName.split('_')[0] || 'UNKNOWN';
            return {
              fileName,
              ticker,
              sizeBytes: stats.size,
              createdAt: stats.birthtime,
            };
          })
      );
      return details;
    } catch {
      return [];
    }
  }
}
