import { useLayoutEffect, useState } from 'react';

/**
 * Misura il contenitore e restituisce la dimensione massima di un rettangolo
 * con il rapporto larghezza/altezza indicato che ci sta dentro (w, h),
 * oltre alla dimensione del contenitore stesso (cw, ch).
 * `ref` è un callback ref: funziona anche se il contenitore compare dopo (es. dopo un caricamento).
 */
export function useFit<T extends HTMLElement = HTMLDivElement>(ratio: number) {
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0, cw: 0, ch: 0 });

  useLayoutEffect(() => {
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const w = Math.min(width, height * ratio);
      setSize({ w: Math.floor(w), h: Math.floor(w / ratio), cw: width, ch: height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, ratio]);

  return { ref: setEl, ...size };
}
