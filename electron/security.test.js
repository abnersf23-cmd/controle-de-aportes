import { describe, expect, it } from 'vitest';
import { ALLOWED_PERMISSIONS, CSP } from './security.js';

const directive = name => CSP.split('; ').find(d => d.startsWith(name + ' '));

describe('CSP do app desktop', () => {
  it('só deixa rodar scripts do próprio app (sem inline, sem eval, sem outros sites)', () => {
    expect(directive('script-src')).toBe("script-src 'self'");
  });
  it('não deixa a página mandar dados para outros sites', () => {
    expect(directive('connect-src')).toBe("connect-src 'self'");
    expect(directive('form-action')).toBe("form-action 'none'");
  });
  it('bloqueia plugins, <base> e ser aberta dentro de outra página', () => {
    expect(directive('object-src')).toBe("object-src 'none'");
    expect(directive('base-uri')).toBe("base-uri 'none'");
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
  });
});

describe('permissões', () => {
  it('nega câmera, microfone, localização, notificações e leitura da área de transferência', () => {
    for (const p of ['media', 'geolocation', 'notifications', 'clipboard-read', 'display-capture', 'openExternal'])
      expect(ALLOWED_PERMISSIONS.has(p)).toBe(false);
  });
  it('mantém a pasta do backup automático funcionando', () => {
    expect(ALLOWED_PERMISSIONS.has('fileSystem')).toBe(true);
  });
});
