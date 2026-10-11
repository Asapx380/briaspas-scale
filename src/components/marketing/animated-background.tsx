"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

/** CSS does the drawing; observers only control when it needs to run. */
export function AnimatedBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const section = root?.parentElement;
    if (!root || !section) return;

    let inView = !("IntersectionObserver" in window);
    const sync = () => {
      root.dataset.running = String(inView && document.visibilityState === "visible");
    };
    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          sync();
        })
      : null;

    observer?.observe(section);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={rootRef} className="marketing-background" data-paused={paused}>
      <div className="marketing-background-art" aria-hidden="true">
        <div className="marketing-background-glow marketing-background-glow-blue" />
        <div className="marketing-background-glow marketing-background-glow-violet" />
        <div className="marketing-background-grid" />
        <div className="marketing-background-orbit marketing-background-orbit-one"><span /></div>
        <div className="marketing-background-orbit marketing-background-orbit-two"><span /></div>
      </div>
      <button
        type="button"
        className="marketing-background-control marketing-touch-target"
        aria-label={paused ? "Retomar animação de fundo" : "Pausar animação de fundo"}
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? <Play size={14} weight="fill" aria-hidden /> : <Pause size={14} weight="fill" aria-hidden />}
        <span>Fundo animado</span>
      </button>
    </div>
  );
}
