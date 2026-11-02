import { describe, it, expect } from 'vitest';
import { resolveProxyUrl, viteProxyConfig } from './proxyRoutes.js';

describe('resolveProxyUrl', () => {
  it('monta a URL do Banco Central (SGS) como o proxy do Vite fazia', () => {
    expect(resolveProxyUrl('/api/bcb/bcdata.sgs.432/dados/ultimos/1?formato=json').url).toBe(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'
    );
  });

  it('monta a URL do dólar e a do Yahoo (com User-Agent)', () => {
    expect(resolveProxyUrl('/api/dolar').url).toBe('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const y = resolveProxyUrl('/api/yahoo/v8/finance/chart/PETR4.SA?range=2y&interval=1mo&events=div');
    expect(y.url).toBe('https://query1.finance.yahoo.com/v8/finance/chart/PETR4.SA?range=2y&interval=1mo&events=div');
    expect(y.headers['User-Agent']).toMatch(/Mozilla/);
  });

  it('recusa caminhos desconhecidos ou parecidos', () => {
    expect(resolveProxyUrl('/api/outra/coisa')).toBeNull();
    expect(resolveProxyUrl('/api/bcbx/1')).toBeNull();
    expect(resolveProxyUrl('/assets/index.js')).toBeNull();
    expect(resolveProxyUrl('')).toBeNull();
  });

  it('não deixa o caminho escapar para outro site', () => {
    expect(resolveProxyUrl('/api/yahoo//evil.example.com/x')).toBeNull();
  });
});

describe('viteProxyConfig', () => {
  it('gera as mesmas rotas para o Vite', () => {
    const cfg = viteProxyConfig();
    expect(Object.keys(cfg)).toEqual(['/api/yahoo', '/api/dolar', '/api/bcb']);
    expect(cfg['/api/bcb'].rewrite('/api/bcb/bcdata.sgs.4389/dados/ultimos/1')).toBe('/dados/serie/bcdata.sgs.4389/dados/ultimos/1');
    expect(cfg['/api/dolar'].rewrite('/api/dolar')).toBe('/json/last/USD-BRL');
  });
});
