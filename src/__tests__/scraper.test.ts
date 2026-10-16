// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ScraperService } from '../../services/scraper.service.js';

describe('ScraperService', () => {
  const service = new ScraperService();

  it('deve instanciar o serviço corretamente', () => {
    expect(service).toBeDefined();
    expect(typeof service.findLatestReports).toBe('function');
    expect(typeof service.downloadAndDeduplicate).toBe('function');
    expect(typeof service.extractFilteredText).toBe('function');
  });

  it('deve listar relatórios armazenados localmente na camada Bronze', async () => {
    const files = await service.listStoredPdfs();
    expect(Array.isArray(files)).toBe(true);
    // Já temos pelo menos VGIA11 e RZAG11 baixados
    expect(files.length).toBeGreaterThanOrEqual(2);
    const tickers = files.map((f) => f.ticker);
    expect(tickers).toContain('VGIA11');
    expect(tickers).toContain('RZAG11');
  });
});
