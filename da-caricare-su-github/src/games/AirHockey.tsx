import { useEffect, useRef, useState } from 'react';
import { buzz, HEX, type Side } from '../lib/store';
import type { GameProps } from './types';

const TARGET = 5; // gol per vincere

type Vec = { x: number; y: number };

export default function AirHockey({ onEnd }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const scoreRef = useRef<[number, number]>([0, 0]);
  const overRef = useRef(false);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let W = 0;
    let H = 0;
    let dpr = 1;

    // stato fisico
    const puck = { p: { x: 0, y: 0 }, v: { x: 0, y: 0 } };
    const mallets: { p: Vec; prev: Vec; target: Vec; v: Vec }[] = [0, 1].map(() => ({
      p: { x: 0, y: 0 },
      prev: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      v: { x: 0, y: 0 },
    }));
    const pointers = new Map<number, Side>();
    let pauseUntil = 0;
    let flash: { side: Side; until: number } | null = null;

    const R = () => W * 0.085; // racchetta
    const r = () => W * 0.045; // disco
    const goalW = () => W * 0.42;

    function resetPositions(serveTo: Side | null) {
      mallets[0].p = { x: W / 2, y: H * 0.85 };
      mallets[1].p = { x: W / 2, y: H * 0.15 };
      for (const m of mallets) {
        m.prev = { ...m.p };
        m.target = { ...m.p };
        m.v = { x: 0, y: 0 };
      }
      puck.p = { x: W / 2, y: serveTo === null ? H / 2 : serveTo === 0 ? H * 0.62 : H * 0.38 };
      puck.v = { x: 0, y: 0 };
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const oldW = W;
      const oldH = H;
      dpr = window.devicePixelRatio || 1;
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (!oldW) resetPositions(null);
      else {
        const sx = W / oldW;
        const sy = H / oldH;
        for (const o of [puck.p, ...mallets.flatMap((m) => [m.p, m.prev, m.target])]) {
          o.x *= sx;
          o.y *= sy;
        }
      }
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function clampMallet(side: Side, t: Vec): Vec {
      const rad = R();
      const x = Math.max(rad, Math.min(W - rad, t.x));
      const y =
        side === 0
          ? Math.max(H / 2 + rad * 0.2, Math.min(H - rad, t.y))
          : Math.max(rad, Math.min(H / 2 - rad * 0.2, t.y));
      return { x, y };
    }

    function local(e: PointerEvent): Vec {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function down(e: PointerEvent) {
      e.preventDefault();
      const pt = local(e);
      const side: Side = pt.y > H / 2 ? 0 : 1;
      for (const [id, s] of pointers) if (s === side) pointers.delete(id);
      pointers.set(e.pointerId, side);
      canvas.setPointerCapture?.(e.pointerId);
      mallets[side].target = pt;
    }
    function move(e: PointerEvent) {
      const side = pointers.get(e.pointerId);
      if (side === undefined) return;
      mallets[side].target = local(e);
    }
    function up(e: PointerEvent) {
      pointers.delete(e.pointerId);
    }
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    function goal(scorer: Side) {
      const s = [...scoreRef.current] as [number, number];
      s[scorer]++;
      scoreRef.current = s;
      setScore(s);
      buzz([40, 40, 80]);
      flash = { side: scorer, until: performance.now() + 900 };
      pauseUntil = performance.now() + 900;
      resetPositions(scorer === 0 ? 1 : 0); // batte chi ha subito
      if (s[scorer] >= TARGET) {
        overRef.current = true;
        onEndRef.current(scorer);
      }
    }

    function step(dt: number, frac0: number, frac1: number) {
      const rr = r();
      const RR = R();
      // racchette interpolate verso il bersaglio (niente "teletrasporti" attraverso il disco)
      mallets.forEach((m, i) => {
        const goalPos = clampMallet(i as Side, m.target);
        const f = i === 0 ? frac0 : frac1;
        const nx = m.prev.x + (goalPos.x - m.prev.x) * f;
        const ny = m.prev.y + (goalPos.y - m.prev.y) * f;
        m.v = { x: (nx - m.p.x) / dt, y: (ny - m.p.y) / dt };
        m.p = { x: nx, y: ny };
      });

      puck.p.x += puck.v.x * dt;
      puck.p.y += puck.v.y * dt;

      // urti con le racchette
      for (const m of mallets) {
        const dx = puck.p.x - m.p.x;
        const dy = puck.p.y - m.p.y;
        const d = Math.hypot(dx, dy);
        if (d < rr + RR && d > 0.0001) {
          const nx = dx / d;
          const ny = dy / d;
          puck.p.x = m.p.x + nx * (rr + RR);
          puck.p.y = m.p.y + ny * (rr + RR);
          const rvx = puck.v.x - m.v.x;
          const rvy = puck.v.y - m.v.y;
          const dot = rvx * nx + rvy * ny;
          if (dot < 0) {
            puck.v.x -= 1.9 * dot * nx;
            puck.v.y -= 1.9 * dot * ny;
            if (Math.abs(dot) > W * 0.6) buzz(8);
          }
        }
      }

      // velocità massima
      const max = W * 4.2;
      const sp = Math.hypot(puck.v.x, puck.v.y);
      if (sp > max) {
        puck.v.x *= max / sp;
        puck.v.y *= max / sp;
      }

      // sponde laterali
      if (puck.p.x < rr) {
        puck.p.x = rr;
        puck.v.x = Math.abs(puck.v.x) * 0.92;
      } else if (puck.p.x > W - rr) {
        puck.p.x = W - rr;
        puck.v.x = -Math.abs(puck.v.x) * 0.92;
      }
      // fondo campo e porte
      const inMouth = Math.abs(puck.p.x - W / 2) < goalW() / 2 - rr * 0.3;
      if (puck.p.y < rr && !inMouth) {
        puck.p.y = rr;
        puck.v.y = Math.abs(puck.v.y) * 0.92;
      } else if (puck.p.y > H - rr && !inMouth) {
        puck.p.y = H - rr;
        puck.v.y = -Math.abs(puck.v.y) * 0.92;
      }
      if (puck.p.y < -rr) goal(0);
      else if (puck.p.y > H + rr) goal(1);
    }

    function draw(now: number) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#17171f';
      ctx.fillRect(0, 0, W, H);
      // metà campo colorate
      ctx.fillStyle = 'rgba(56,189,248,0.07)';
      ctx.fillRect(0, 0, W, H / 2);
      ctx.fillStyle = 'rgba(251,113,133,0.07)';
      ctx.fillRect(0, H / 2, W, H / 2);
      if (flash && now < flash.until) {
        const a = ((flash.until - now) / 900) * 0.35;
        ctx.fillStyle = flash.side === 0 ? `rgba(251,113,133,${a})` : `rgba(56,189,248,${a})`;
        ctx.fillRect(0, 0, W, H);
      }
      // linee
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, W * 0.16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, 0, goalW() / 2, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H, goalW() / 2, Math.PI, Math.PI * 2);
      ctx.stroke();
      // porte
      ctx.lineCap = 'round';
      ctx.lineWidth = 8;
      ctx.strokeStyle = HEX[1];
      ctx.beginPath();
      ctx.moveTo(W / 2 - goalW() / 2, 2);
      ctx.lineTo(W / 2 + goalW() / 2, 2);
      ctx.stroke();
      ctx.strokeStyle = HEX[0];
      ctx.beginPath();
      ctx.moveTo(W / 2 - goalW() / 2, H - 2);
      ctx.lineTo(W / 2 + goalW() / 2, H - 2);
      ctx.stroke();
      // punteggio
      ctx.font = `800 ${W * 0.22}px "Bricolage Grotesque", Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillText(String(scoreRef.current[0]), W / 2, H * 0.75);
      ctx.save();
      ctx.translate(W / 2, H * 0.25);
      ctx.rotate(Math.PI);
      ctx.fillText(String(scoreRef.current[1]), 0, 0);
      ctx.restore();
      // disco
      ctx.fillStyle = '#ececf2';
      ctx.beginPath();
      ctx.arc(puck.p.x, puck.p.y, r(), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(puck.p.x, puck.p.y, r() * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // racchette
      mallets.forEach((m, i) => {
        ctx.fillStyle = HEX[i];
        ctx.beginPath();
        ctx.arc(m.p.x, m.p.y, R(), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.arc(m.p.x, m.p.y, R() * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = HEX[i];
        ctx.beginPath();
        ctx.arc(m.p.x, m.p.y, R() * 0.42, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    let raf = 0;
    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!overRef.current && now >= pauseUntil && W > 0) {
        const SUB = 8;
        for (const m of mallets) m.prev = { ...m.p };
        for (let k = 1; k <= SUB; k++) step(dt / SUB, k / SUB, k / SUB);
        const fr = Math.pow(0.6, dt); // attrito leggero
        puck.v.x *= fr;
        puck.v.y *= fr;
      }
      draw(now);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-ink-900">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label={`Air hockey ${score[0]} a ${score[1]}`}
      />
    </div>
  );
}
