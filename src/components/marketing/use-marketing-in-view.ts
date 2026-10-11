"use client";

import { useEffect, useState, type RefObject } from "react";

export function useMarketingInView(ref: RefObject<HTMLElement | null>, amount: number) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    // Unsupported browsers retain the static server-rendered demonstration.
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting && entry.intersectionRatio >= amount);
    }, { threshold: [0, amount] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, amount]);

  return inView;
}
