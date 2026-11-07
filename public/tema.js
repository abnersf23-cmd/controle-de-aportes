// Aplica o tema escuro antes do React carregar (evita o "flash" branco ao abrir).
// Fica num arquivo separado (e não dentro do index.html) por segurança: a política de
// conteúdo (CSP) do app desktop só deixa rodar scripts que são arquivos do próprio app.
try {
  if ((localStorage.getItem('tema') || 'escuro') === 'escuro') document.documentElement.classList.add('dark');
} catch {
  document.documentElement.classList.add('dark');
}
