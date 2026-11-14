/* Confronto tra la risposta scritta e quelle in tabellone */

const STOP = new Set([
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
  'un',
  'uno',
  'una',
  'l',
  'di',
  'del',
  'della',
  'dei',
  'delle',
  'a',
  'al',
  'alla',
  'e',
]);

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .join(' ');
}

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** singolare/plurale e piccoli errori di battitura */
function similar(a: string, b: string) {
  if (a === b) return true;
  const stem = (w: string) => (w.length > 4 ? w.slice(0, -1) : w);
  if (a.split(' ').map(stem).join(' ') === b.split(' ').map(stem).join(' ')) return true;
  const n = Math.min(a.length, b.length);
  if (n >= 5 && lev(a, b) <= (n >= 9 ? 2 : 1)) return true;
  return false;
}

/** indice della risposta indovinata, o -1 */
export function matchAnswer(guess: string, answers: (string | number)[][]): number {
  const g = normalize(guess);
  if (!g) return -1;
  const forms = answers.map((a) => [a[0] as string, ...(a.slice(2) as string[])].map(normalize));
  // 1) uguale (o quasi) a una delle forme
  for (let i = 0; i < forms.length; i++) if (forms[i].some((f) => similar(g, f))) return i;
  // 2) la risposta contiene una forma (la più lunga vince), es. "il mio cane" → "cane"
  let best = -1;
  let bestLen = 0;
  forms.forEach((fs, i) =>
    fs.forEach((f) => {
      if (f.length >= 3 && f.length > bestLen && ` ${g} `.includes(` ${f} `)) {
        best = i;
        bestLen = f.length;
      }
    }),
  );
  if (best >= 0 || g.includes(' ')) return best;
  // 3) una parola sola abbreviata o con un'altra desinenza: "mate" → matematica, "birretta" → birra, "ballo" → ballare
  let bestPrefix = 0;
  forms.forEach((fs, i) =>
    fs.forEach((f) => {
      if (f.includes(' ')) return;
      let k = 0;
      while (k < g.length && k < f.length && g[k] === f[k]) k++;
      const abbreviation = g.length >= 4 && f.startsWith(g);
      const sameRoot = k >= 4 && k >= 0.8 * Math.min(g.length, f.length);
      if ((abbreviation || sameRoot) && k > bestPrefix) {
        best = i;
        bestPrefix = k;
      }
    }),
  );
  return best;
}
