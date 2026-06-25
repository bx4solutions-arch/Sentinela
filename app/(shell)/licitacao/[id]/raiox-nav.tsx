"use client";

import { useEffect, useState } from "react";

// Barra de navegação do Raio-X no visual v2 (.tabs/.tab). NÃO esconde conteúdo:
// o Space é um relatório ROLÁVEL (decisão de produto — matou o "pandemônio das 12 abas").
// A aba só destaca (scroll-spy) a seção atualmente visível e leva até ela.
export function RaioxNav({ nav }: { nav: [string, string][] }) {
  const [ativo, setAtivo] = useState(nav[0]?.[0] ?? "");

  useEffect(() => {
    const secoes = nav
      .map(([anchor]) => document.getElementById(anchor))
      .filter((el): el is HTMLElement => !!el);
    if (secoes.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visivel = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visivel?.target?.id) setAtivo(visivel.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    secoes.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [nav]);

  return (
    <nav
      className="v2 sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:rounded-lg md:border md:px-3"
      data-testid="raiox-nav"
    >
      <div className="tabs" style={{ border: 0, padding: 0, margin: 0 }}>
        {nav.map(([anchor, label]) => (
          <a
            key={anchor}
            href={`#${anchor}`}
            className={`tab${ativo === anchor ? " active" : ""}`}
            aria-current={ativo === anchor ? "true" : undefined}
            data-testid={`raiox-tab-${anchor}`}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
