import { describe, expect, it } from 'vitest';
import { decryptJson, encryptJson, isEncrypted } from './crypto';

const backup = { format: 'controle-aportes-backup', data: { buckets: [{ id: 'b1', name: 'Caixa', saldo: 1234.56 }] } };

describe('backup com senha', () => {
  it('criptografa e abre de volta com a senha certa', async () => {
    const file = await encryptJson(backup, 'senha-forte-123');
    expect(isEncrypted(file)).toBe(true);
    expect(JSON.stringify(file)).not.toContain('Caixa');
    expect(await decryptJson(file, 'senha-forte-123')).toEqual(backup);
  });
  it('senha errada não abre', async () => {
    const file = await encryptJson(backup, 'senha-forte-123');
    await expect(decryptJson(file, 'senha-errada-00')).rejects.toThrow('Senha incorreta');
  });
  it('arquivo alterado não abre (AES-GCM detecta)', async () => {
    const file = await encryptJson(backup, 'senha-forte-123');
    const bytes = atob(file.data).split('');
    bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 1);
    await expect(decryptJson({ ...file, data: btoa(bytes.join('')) }, 'senha-forte-123')).rejects.toThrow();
  });
  it('recusa senha curta', async () => {
    await expect(encryptJson(backup, '1234567')).rejects.toThrow('8 caracteres');
  });
  it('mesma senha gera arquivos diferentes (sal e IV aleatórios)', async () => {
    const [a, b] = await Promise.all([encryptJson(backup, 'senha-forte-123'), encryptJson(backup, 'senha-forte-123')]);
    expect(a.data).not.toBe(b.data);
  });
  it('usa 600 mil repetições nos backups novos', async () => {
    const file = await encryptJson(backup, 'senha-forte-123');
    expect(file.kdf.iterations).toBe(600000);
  });
  it('continua abrindo backup antigo (310 mil repetições)', async () => {
    const file = await encryptJson(backup, 'senha-forte-123');
    // Simula um arquivo antigo refazendo a criptografia com 310 mil.
    const salt = Uint8Array.from(atob(file.kdf.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(file.cipher.iv), c => c.charCodeAt(0));
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode('senha-forte-123'), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt'
    ]);
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(backup))));
    let bin = '';
    for (const b of data) bin += String.fromCharCode(b);
    const old = { ...file, kdf: { ...file.kdf, iterations: 310000 }, data: btoa(bin) };
    expect(await decryptJson(old, 'senha-forte-123')).toEqual(backup);
  });
  it('recusa arquivo adulterado que pede poucas ou repetições demais', async () => {
    const file = await encryptJson(backup, 'senha-forte-123');
    await expect(decryptJson({ ...file, kdf: { ...file.kdf, iterations: 1 } }, 'senha-forte-123')).rejects.toThrow('adulterado');
    await expect(decryptJson({ ...file, kdf: { ...file.kdf, iterations: 1e12 } }, 'senha-forte-123')).rejects.toThrow('adulterado');
  });
});
