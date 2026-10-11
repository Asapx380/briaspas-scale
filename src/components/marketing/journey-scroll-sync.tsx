"use client";

import { useEffect } from "react";

const STEP_SELECTOR = "[data-journey-step]";
const ROOT_SELECTOR = "[data-journey-root]";
const PANEL_SELECTOR = "[data-journey-panel]";

export function JourneyScrollSync() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
    if (!root) return;

    const steps = Array.from(root.querySelectorAll<HTMLElement>(STEP_SELECTOR));
    const panels = Array.from(root.querySelectorAll<HTMLElement>(PANEL_SELECTOR));

    if (steps.length === 0 || panels.length === 0) return;

    const setActive = (index: number) => {
      const safeIndex = Math.max(0, Math.min(index, steps.length - 1));
      root.dataset.activeStep = String(safeIndex);
      steps.forEach((step, i) => {
        step.dataset.active = i === safeIndex ? "true" : "false";
        if (i === safeIndex) {
          step.setAttribute("aria-current", "step");
        } else {
          step.removeAttribute("aria-current");
        }
      });
      panels.forEach((panel, i) => {
        panel.dataset.active = i === safeIndex ? "true" : "false";
      });
    };

    const media = window.matchMedia("(min-width: 1024px)");
    const isDesktop = () => media.matches;

    const applyMode = () => {
      if (!isDesktop()) {
        root.removeAttribute("data-journey-enhanced");
        steps.forEach((step) => {
          step.removeAttribute("aria-current");
          step.dataset.active = "false";
        });
        panels.forEach((panel) => {
          panel.removeAttribute("data-active");
        });
        return;
      }

      root.dataset.journeyEnhanced = "true";
      setActive(Number(root.dataset.activeStep ?? "0"));
    };

    if (!("IntersectionObserver" in window)) {
      root.removeAttribute("data-journey-enhanced");
      return;
    }

    applyMode();

    const ratios = new Map<Element, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        if (!isDesktop()) return;
        entries.forEach((entry) => {
          ratios.set(entry.target, entry.intersectionRatio);
        });

        let bestIndex = 0;
        let bestRatio = -1;
        steps.forEach((step, index) => {
          const ratio = ratios.get(step) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = index;
          }
        });
        if (bestRatio > 0) setActive(bestIndex);
      },
      {
        root: null,
        threshold: [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1],
        rootMargin: "-20% 0px -35% 0px",
      },
    );

    const onMediaChange = () => {
      applyMode();
      if (isDesktop()) {
        steps.forEach((step) => observer.observe(step));
      } else {
        observer.disconnect();
        ratios.clear();
      }
    };

    if (isDesktop()) {
      steps.forEach((step) => observer.observe(step));
    }

    media.addEventListener("change", onMediaChange);

    return () => {
      media.removeEventListener("change", onMediaChange);
      observer.disconnect();
      root.removeAttribute("data-journey-enhanced");
    };
  }, []);

  return null;
}
