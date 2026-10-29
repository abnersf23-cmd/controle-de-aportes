// Backup com senha, usando a Web Crypto API (já vem no navegador, sem biblioteca).
//
// Como funciona:
// 1. PBKDF2 transforma a senha numa chave de 256 bits. Ele repete o cálculo 310 mil vezes
//    (de propósito): para quem tenta adivinhar a senha, cada tentativa fica cara.
//    O "sal" (salt) aleatório faz a mesma senha gerar chaves diferentes em cada arquivo.
// 2. AES-GCM criptografa o backup com essa chave. O GCM também detecta se o arquivo foi
//    alterado: com senha errada ou arquivo corrompido, a abertura falha em vez de trazer lixo.
// A senha não é guardada em lugar nenhum: se você esquecer, o arquivo não abre.
export const ENCRYPTED_FORMAT = 'controle-aportes-backup-criptografado';
export const MIN_PASSWORD = 8;
const ITERATIONS = 310000;
const enc = new TextEncoder(), dec = new TextDecoder();

const toB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

async function deriveKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export const isEncrypted = json => json?.format === ENCRYPTED_FORMAT;

export async function encryptJson(value, password) {
  if (String(password || '').length < MIN_PASSWORD) throw new Error(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value))));
  return { format: ENCRYPTED_FORMAT, version: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: toB64(salt) }, cipher: { name: 'AES-GCM', iv: toB64(iv) }, data: toB64(data) };
}

export async function decryptJson(file, password) {
  if (!isEncrypted(file)) throw new Error('Este arquivo não é um backup com senha.');
  try {
    const key = await deriveKey(password, fromB64(file.kdf.salt), Number(file.kdf.iterations));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(file.cipher.iv) }, key, fromB64(file.data));
    return JSON.parse(dec.decode(plain));
  } catch {
    throw new Error('Senha incorreta ou arquivo corrompido.');
  }
}
