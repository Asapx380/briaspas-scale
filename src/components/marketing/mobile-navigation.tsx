"use client";

import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="marketing-ghost-cta marketing-touch-target inline-flex rounded-full"
        aria-label={open ? "Fechar navegação" : "Abrir navegação"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={21} aria-hidden /> : <List size={21} aria-hidden />}
      </button>
      <nav id={panelId} hidden={!open} aria-label="Navegação mobile" className="marketing-mobile-nav">
        {[
          ["#como-funciona", "Como funciona"],
          ["#recursos", "Recursos"],
          ["#seguranca", "Segurança"],
          ["/demonstracao", "Demonstração"],
          ["/login", "Entrar"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="marketing-nav-link rounded-xl px-4 py-3 text-sm font-semibold" onClick={() => setOpen(false)}>{label}</Link>
        ))}
      </nav>
    </div>
  );
}
