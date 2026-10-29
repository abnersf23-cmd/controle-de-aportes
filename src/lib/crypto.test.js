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
});
