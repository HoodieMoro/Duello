import Loading from '../components/Loading';
import { buzz, HEX, other, PC, playerName, type Result, type Side } from '../lib/store';
import { useCanAct, useReport, useSession, useShared } from '../online/shared';
import { useFit } from '../lib/useFit';
import type { GameProps } from './types';

const N = 5; // quadrati per lato
const U = 100; // unità SVG
const M = 24; // margine SVG

type Lines = Record<string, Side>;

const hKey = (r: number, c: number) => `h${r}-${c}`; // orizzontale: r 0..N, c 0..N-1
const vKey = (r: number, c: number) => `v${r}-${c}`; // verticale:   r 0..N-1, c 0..N

function boxDone(l: Lines, r: number, c: number) {
  return hKey(r, c) in l && hKey(r + 1, c) in l && vKey(r, c) in l && vKey(r, c + 1) in l;
}

interface State {
  lines: Lines;
  boxes: (Side | null)[];
  turn: Side;
  result: Result | null;
}

function drawLine(st: State, key: string): State {
  if (st.result !== null || key in st.lines) return st;
  const l = { ...st.lines, [key]: st.turn };
  const [r, c] = key.slice(1).split('-').map(Number);
  const around =
    key[0] === 'h'
      ? [
          [r - 1, c],
          [r, c],
        ]
      : [
          [r, c - 1],
          [r, c],
        ];
  const nb = [...st.boxes];
  let scored = false;
  for (const [br, bc] of around) {
    if (br < 0 || bc < 0 || br >= N || bc >= N) continue;
    if (nb[br * N + bc] === null && boxDone(l, br, bc)) {
      nb[br * N + bc] = st.turn;
      scored = true;
    }
  }
  if (nb.every((b) => b !== null)) {
    const a = nb.filter((b) => b === 0).length;
    const b = nb.length - a;
    return { ...st, lines: l, boxes: nb, result: a === b ? 'draw' : a > b ? 0 : 1 };
  }
  return { ...st, lines: l, boxes: nb, turn: scored ? st.turn : other(st.turn) };
}

export default function PuntiLinee({ starter, names, onTurn, onEnd }: GameProps) {
  const fit = useFit(1);
  const [s, update] = useShared<State>(() => ({
    lines: {},
    boxes: Array(N * N).fill(null),
    turn: starter,
    result: null,
  }));
  useReport(s?.turn, s?.result, onTurn, onEnd);
  const canAct = useCanAct(s?.turn ?? starter);
  const { me } = useSession();

  if (!s) return <Loading />;
  const { lines, boxes } = s;
  const over = s.result !== null || !canAct;

  function play(key: string) {
    if (over || key in lines) return;
    const scored = drawLine(s!, key).boxes.some((b, i) => b !== boxes[i]);
    buzz(scored ? [10, 40, 10] : 10);
    update((st) => drawLine(st, key));
  }

  const size = N * U + M * 2;
  const counts = [boxes.filter((b) => b === 0).length, boxes.filter((b) => b === 1).length];

  const segments: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let r = 0; r <= N; r++)
    for (let c = 0; c < N; c++)
      segments.push({ key: hKey(r, c), x1: M + c * U, y1: M + r * U, x2: M + (c + 1) * U, y2: M + r * U });
  for (let r = 0; r < N; r++)
    for (let c = 0; c <= N; c++)
      segments.push({ key: vKey(r, c), x1: M + c * U, y1: M + r * U, x2: M + c * U, y2: M + (r + 1) * U });

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <div ref={fit.ref} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} width={fit.w} height={fit.h} className="rounded-3xl bg-ink-900">
          {boxes.map((b, i) =>
            b === null ? null : (
              <g
                key={i}
                className="anim-pop"
                style={{ transformOrigin: `${M + (i % N) * U + U / 2}px ${M + Math.floor(i / N) * U + U / 2}px` }}
              >
                <rect
                  x={M + (i % N) * U + 6}
                  y={M + Math.floor(i / N) * U + 6}
                  width={U - 12}
                  height={U - 12}
                  rx="10"
                  fill={HEX[b]}
                  opacity="0.28"
                />
                <text
                  x={M + (i % N) * U + U / 2}
                  y={M + Math.floor(i / N) * U + U / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="40"
                  fontWeight="800"
                  fill={HEX[b]}
                  transform={
                    b === 1 && me === null
                      ? `rotate(180 ${M + (i % N) * U + U / 2} ${M + Math.floor(i / N) * U + U / 2})`
                      : undefined
                  }
                >
                  {playerName(names, b).charAt(0).toUpperCase()}
                </text>
              </g>
            ),
          )}
          {segments.map((s) => {
            const owner = lines[s.key];
            const horizontal = s.y1 === s.y2;
            return (
              <g
                key={s.key}
                onClick={() => play(s.key)}
                className={owner === undefined && !over ? 'cursor-pointer group' : ''}
              >
                <line
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke={owner === undefined ? 'rgba(255,255,255,0.07)' : HEX[owner]}
                  strokeWidth={owner === undefined ? 6 : 12}
                  strokeLinecap="round"
                  className={owner === undefined ? 'transition group-hover:stroke-white/30' : 'anim-draw'}
                  style={owner === undefined ? undefined : { ['--len' as string]: U }}
                />
                {owner === undefined && (
                  <rect
                    x={horizontal ? s.x1 + 14 : s.x1 - 34}
                    y={horizontal ? s.y1 - 34 : s.y1 + 14}
                    width={horizontal ? U - 28 : 68}
                    height={horizontal ? 68 : U - 28}
                    fill="transparent"
                  />
                )}
              </g>
            );
          })}
          {Array.from({ length: (N + 1) * (N + 1) }, (_, i) => (
            <circle key={i} cx={M + (i % (N + 1)) * U} cy={M + Math.floor(i / (N + 1)) * U} r="10" fill="#ececf2" />
          ))}
        </svg>
      </div>
      <p className="text-sm font-semibold tabular-nums">
        <span className={PC.text[0]}>{counts[0]}</span>
        <span className="mx-2 text-ink-500">quadrati</span>
        <span className={PC.text[1]}>{counts[1]}</span>
      </p>
    </div>
  );
}
