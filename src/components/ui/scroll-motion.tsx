"use client";

import { useEffect } from "react";

export function ScrollMotion() {
  useEffect(() => {
    const elements = new Set<HTMLElement>();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = "IntersectionObserver" in window ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-visible", "true");
          observer?.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0 },
    ) : null;

    const register = (element: HTMLElement) => {
      if (elements.has(element)) return;
      elements.add(element);
      const rect = element.getBoundingClientRect();
      // Keep hash targets and content already on screen visible during hydration.
      if (media.matches || !observer || (rect.top < window.innerHeight && rect.bottom > 0)) {
        element.dataset.visible = "true";
      }
      element.dataset.motionReady = "true";
      if (element.dataset.visible !== "true") observer?.observe(element);
    };
    const registerTree = (node: Element) => {
      if (node instanceof HTMLElement && node.matches("[data-reveal]")) register(node);
      node.querySelectorAll<HTMLElement>("[data-reveal]").forEach(register);
    };
    registerTree(document.body);

    // Dynamically loaded marketing sections also participate in reveals.
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => {
        record.removedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          elements.forEach((element) => {
            if (node === element || node.contains(element)) {
              observer?.unobserve(element);
              elements.delete(element);
            }
          });
        });
        record.addedNodes.forEach((node) => { if (node instanceof Element) registerTree(node); });
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    const revealAll = () => {
      if (!media.matches) return;
      observer?.disconnect();
      elements.forEach((element) => { element.dataset.visible = "true"; });
    };
    const revealFocused = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      let element = event.target.closest<HTMLElement>("[data-reveal]");
      while (element) {
        element.dataset.visible = "true";
        observer?.unobserve(element);
        element = element.parentElement?.closest<HTMLElement>("[data-reveal]") ?? null;
      }
    };
    media.addEventListener("change", revealAll);
    document.addEventListener("focusin", revealFocused);

    return () => {
      mutations.disconnect();
      observer?.disconnect();
      media.removeEventListener("change", revealAll);
      document.removeEventListener("focusin", revealFocused);
      elements.forEach((element) => {
        element.removeAttribute("data-motion-ready");
        element.removeAttribute("data-visible");
      });
    };
  }, []);

  return null;
}
