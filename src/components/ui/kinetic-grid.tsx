"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type Ripple = { x: number; y: number; radius: number; opacity: number; born: number };

const LERP = 0.08;
const BRAND = "0,113,227";

/**
 * Soft floor-grid background (LeadSite-like): perspective lines/dots toward
 * the bottom, interactive warp near the pointer, centered copy stays readable.
 */
export default function KineticGrid({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const targetRef = useRef<Point>({ x: -9999, y: -9999 });
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const t0Ref = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    t0Ref.current = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      const w = Math.max(parent?.clientWidth || 0, 1);
      const h = Math.max(parent?.clientHeight || 0, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      if (reduced) paint(performance.now());
    };

    const project = (gx: number, gz: number, W: number, H: number, time: number) => {
      // Floor plane in normalized space; horizon ~ mid page
      const horizon = H * 0.42;
      const floorH = H - horizon;
      const depth = 0.18 + gz * 0.82; // near→far
      const bob = reduced ? 0 : Math.sin(time * 0.00035 + gx * 4) * 0.004;
      const scale = (0.55 + depth * 1.65) * (1 + bob);

      let x = W * 0.5 + (gx - 0.5) * W * scale;
      let y = horizon + depth * floorH;

      const mouse = mouseRef.current;
      if (mouse.x > -9000) {
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const dist = Math.hypot(dx, dy);
        const influence = 220;
        if (dist < influence && dist > 0) {
          const t = 1 - dist / influence;
          const amt = t * t * 18 * (0.35 + depth);
          const ang = Math.atan2(dy, dx);
          x -= Math.cos(ang) * amt;
          y -= Math.sin(ang) * amt;
        }
      }

      for (const r of ripplesRef.current) {
        const dx = x - r.x;
        const dy = y - r.y;
        const dist = Math.hypot(dx, dy);
        const band = 50;
        const diff = dist - r.radius;
        if (Math.abs(diff) < band) {
          const strength = (1 - Math.abs(diff) / band) * r.opacity * 14;
          const ang = Math.atan2(dy, dx);
          const sign = diff < 0 ? -1 : 1;
          x += Math.cos(ang) * strength * sign * -1;
          y += Math.sin(ang) * strength * sign * -1;
        }
      }

      // Fade strength: stronger near bottom, soft near horizon
      const alpha = 0.08 + depth * 0.45;
      return { x, y, alpha, depth };
    };

    const paint = (now: number) => {
      const ctx = canvas.getContext("2d");
      const { w: W, h: H } = sizeRef.current;
      if (!ctx || W <= 0 || H <= 0) return;

      // Soft white → cool blue wash (reference look)
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#ffffff");
      sky.addColorStop(0.45, "#f5f8fc");
      sky.addColorStop(1, "#e7eef8");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Soft brand glow in the upper field
      const glow = ctx.createRadialGradient(W * 0.5, H * 0.28, 0, W * 0.5, H * 0.28, W * 0.55);
      glow.addColorStop(0, "rgba(0,113,227,0.07)");
      glow.addColorStop(1, "rgba(0,113,227,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Ripple lifecycle
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const r = ripples[i];
        const age = (now - r.born) / 1000;
        r.radius = Math.max(0, age * 360);
        r.opacity = Math.max(0, 1 - age * 1.15);
        if (r.opacity <= 0) ripples.splice(i, 1);
      }

      const cols = 18;
      const rows = 14;
      const pts: { x: number; y: number; alpha: number; depth: number }[][] = [];

      for (let row = 0; row < rows; row += 1) {
        pts[row] = [];
        const gz = row / (rows - 1);
        for (let col = 0; col < cols; col += 1) {
          const gx = col / (cols - 1);
          pts[row][col] = project(gx, gz, W, H, now);
        }
      }

      // Horizontal lines
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols - 1; col += 1) {
          const a = pts[row][col];
          const b = pts[row][col + 1];
          const alpha = Math.min(a.alpha, b.alpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${BRAND},${(alpha * 0.55).toFixed(3)})`;
          ctx.lineWidth = 1 + a.depth * 0.6;
          ctx.stroke();
        }
      }

      // Vertical lines
      for (let col = 0; col < cols; col += 1) {
        for (let row = 0; row < rows - 1; row += 1) {
          const a = pts[row][col];
          const b = pts[row + 1][col];
          const alpha = Math.min(a.alpha, b.alpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${BRAND},${(alpha * 0.5).toFixed(3)})`;
          ctx.lineWidth = 1 + a.depth * 0.5;
          ctx.stroke();
        }
      }

      // Intersection dots
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const p = pts[row][col];
          const r = 1.2 + p.depth * 1.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${BRAND},${(p.alpha * 0.75).toFixed(3)})`;
          ctx.fill();
        }
      }

      // Ripple rings
      for (const r of ripples) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0, r.radius), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${BRAND},${(r.opacity * 0.35).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Top fade so copy sits on clean white
      const veil = ctx.createLinearGradient(0, 0, 0, H * 0.62);
      veil.addColorStop(0, "rgba(255,255,255,0.92)");
      veil.addColorStop(0.55, "rgba(255,255,255,0.55)");
      veil.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, W, H * 0.62);
    };

    const tick = (now: number) => {
      const m = mouseRef.current;
      const t = targetRef.current;
      m.x += (t.x - m.x) * LERP;
      m.y += (t.y - m.y) * LERP;
      paint(now);
      rafRef.current = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduced) {
      return () => window.removeEventListener("resize", resize);
    }

    // Start pointer near lower center so the floor feels alive immediately
    targetRef.current = {
      x: sizeRef.current.w * 0.5,
      y: sizeRef.current.h * 0.72,
    };
    mouseRef.current = { ...targetRef.current };

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

    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-0 overflow-hidden", className)} aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
