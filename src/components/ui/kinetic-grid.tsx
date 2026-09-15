"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type Ripple = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  born: number;
};
type Rgba = { r: number; g: number; b: number; a: number };

const CELL = 48;
const INFLUENCE = 280;
const MAX_WARP = 28;
const LERP = 0.1;
const NODE_IDLE = 1.8;
const NODE_HOT = 3.6;

/** Light ground + brand blue lines `#0071e3` — idle must stay readable. */
const THEME = {
  bg: "#eef2f7",
  lineIdle: { r: 0, g: 113, b: 227, a: 0.32 } satisfies Rgba,
  lineHot: { r: 0, g: 113, b: 227, a: 0.95 } satisfies Rgba,
  nodeIdle: { r: 0, g: 113, b: 227, a: 0.4 } satisfies Rgba,
  nodeHot: { r: 0, g: 113, b: 227, a: 1 } satisfies Rgba,
  glow: "0,113,227",
  ripple: "0,113,227",
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mixRgba(idle: Rgba, hot: Rgba, t: number) {
  return `rgba(${Math.round(lerp(idle.r, hot.r, t))},${Math.round(lerp(idle.g, hot.g, t))},${Math.round(lerp(idle.b, hot.b, t))},${lerp(idle.a, hot.a, t).toFixed(3)})`;
}

function warpPoint(
  gx: number,
  gy: number,
  col: number,
  row: number,
  mouse: Point,
  ripples: Ripple[],
  cols: number,
  rows: number,
): { pt: Point; prox: number } {
  const margin = 1.5;
  const colPin = Math.min(col / margin, (cols - 1 - col) / margin, 1);
  const rowPin = Math.min(row / margin, (rows - 1 - row) / margin, 1);
  const pin = colPin * colPin * rowPin * rowPin;

  const dx = gx - mouse.x;
  const dy = gy - mouse.y;
  const dist = Math.hypot(dx, dy);
  const prox = Math.max(0, 1 - dist / INFLUENCE) * pin;

  let ox = 0;
  let oy = 0;
  for (const r of ripples) {
    const rdx = gx - r.x;
    const rdy = gy - r.y;
    const rdist = Math.hypot(rdx, rdy);
    const band = 55;
    const diff = rdist - r.radius;
    if (Math.abs(diff) < band) {
      const strength = (1 - Math.abs(diff) / band) * r.opacity * 18 * pin;
      const angle = Math.atan2(rdy, rdx);
      const sign = diff < 0 ? -1 : 1;
      ox += Math.cos(angle) * strength * sign * -1;
      oy += Math.sin(angle) * strength * sign * -1;
    }
  }

  if (dist > 0 && dist < INFLUENCE && pin > 0) {
    const t = dist / INFLUENCE;
    const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
    const amount = eased * MAX_WARP * pin;
    const angle = Math.atan2(dy, dx);
    return {
      pt: {
        x: gx - Math.cos(angle) * amount + ox,
        y: gy - Math.sin(angle) * amount + oy,
      },
      prox,
    };
  }

  return { pt: { x: gx + ox, y: gy + oy }, prox };
}

function paintFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  mouse: Point,
  ripples: Ripple[],
  now: number,
) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, W, H);

  for (let i = ripples.length - 1; i >= 0; i -= 1) {
    const r = ripples[i];
    const age = (now - r.born) / 1000;
    r.radius = Math.max(0, age * 400);
    r.opacity = Math.max(0, 1 - age * 1.1);
    if (r.opacity <= 0) ripples.splice(i, 1);
  }

  const cols = Math.max(2, Math.ceil(W / CELL)) + 1;
  const rows = Math.max(2, Math.ceil(H / CELL)) + 1;
  const cellW = W / (cols - 1);
  const cellH = H / (rows - 1);

  const pts: Point[][] = [];
  const prox: number[][] = [];

  for (let row = 0; row < rows; row += 1) {
    pts[row] = [];
    prox[row] = [];
    for (let col = 0; col < cols; col += 1) {
      const warped = warpPoint(
        col * cellW,
        row * cellH,
        col,
        row,
        mouse,
        ripples,
        cols,
        rows,
      );
      pts[row][col] = warped.pt;
      prox[row][col] = warped.prox;
    }
  }

  const strokeSeg = (a: Point, b: Point, pa: number, pb: number) => {
    const avg = (pa + pb) / 2;
    const t = avg * avg * (3 - 2 * avg);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = mixRgba(THEME.lineIdle, THEME.lineHot, t);
    ctx.lineWidth = lerp(1, 2, t);
    ctx.stroke();
  };

  ctx.lineCap = "round";
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      strokeSeg(pts[row][col], pts[row][col + 1], prox[row][col], prox[row][col + 1]);
    }
  }
  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows - 1; row += 1) {
      strokeSeg(pts[row][col], pts[row + 1][col], prox[row][col], prox[row + 1][col]);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const p = pts[row][col];
      const pr = prox[row][col];
      const t = pr * pr * (3 - 2 * pr);
      const radius = lerp(NODE_IDLE, NODE_HOT, t);

      if (t > 0.25) {
        const glowR = radius + lerp(0, 8, (t - 0.25) / 0.75);
        const grd = ctx.createRadialGradient(p.x, p.y, radius * 0.4, p.x, p.y, glowR);
        grd.addColorStop(0, `rgba(${THEME.glow},${(t * 0.35).toFixed(3)})`);
        grd.addColorStop(1, `rgba(${THEME.glow},0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = mixRgba(THEME.nodeIdle, THEME.nodeHot, t);
      ctx.fill();
    }
  }

  for (const r of ripples) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(0, r.radius), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${THEME.ripple},${(r.opacity * 0.4).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/** Full-bleed interactive grid background. Children sit on top, centered by parent. */
export default function KineticGrid({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const targetRef = useRef<Point>({ x: -9999, y: -9999 });
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = Math.max(parent?.clientWidth || 0, window.innerWidth);
      const h = Math.max(parent?.clientHeight || 0, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };

      if (reduced) {
        const ctx = canvas.getContext("2d");
        if (ctx) paintFrame(ctx, w, h, mouseRef.current, ripplesRef.current, performance.now());
      }
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduced) {
      return () => window.removeEventListener("resize", resize);
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      ripplesRef.current.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        radius: 0,
        opacity: 1,
        born: performance.now(),
      });
    };
    const onLeave = () => {
      targetRef.current = { x: -9999, y: -9999 };
    };

    const tick = (now: number) => {
      const m = mouseRef.current;
      const t = targetRef.current;
      m.x = lerp(m.x, t.x, LERP);
      m.y = lerp(m.y, t.y, LERP);
      const ctx = canvas.getContext("2d");
      const { w, h } = sizeRef.current;
      if (ctx && w > 0 && h > 0) {
        paintFrame(ctx, w, h, m, ripplesRef.current, now);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    window.addEventListener("mouseleave", onLeave);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[#eef2f7]", className)}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      />
      {children}
    </div>
  );
}
