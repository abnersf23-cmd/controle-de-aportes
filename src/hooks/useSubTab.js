import { useEffect, useState } from 'react';

// Abas dentro de uma página, guardadas no endereço (#simuladores/aposentadoria).
// Sem aba no endereço, volta para a última que você usou nesse aparelho.
export default function useSubTab(page, options, fallback) {
  const key = `aba-${page}`;
  const read = () => {
    const [p, sub] = window.location.hash.slice(1).split('/');
    if (p === page && options.includes(sub)) return sub;
    try {
      const saved = localStorage.getItem(key);
      if (options.includes(saved)) return saved;
    } catch {
      /* sem localStorage */
    }
    return fallback;
  };
  const [sub, setSub] = useState(read);
  useEffect(() => {
    const onHash = () => setSub(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a página e as abas não mudam: liga o ouvinte uma vez só
  }, []);
  const go = next => {
    window.history.replaceState(null, '', `#${page}/${next}`);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* sem localStorage */
    }
    setSub(next);
  };
  return [sub, go];
}
