"use client";

import { useState, type ReactNode } from "react";

// Abas do Space FIÉIS à maquete (v2): clicar TROCA a tela (mostra só a aba ativa).
// Mantém todas montadas e esconde as inativas — preserva o dado real no DOM
// e o sentinela data-testid=raiox-relatorio sempre visível (página carregou).
export type SpaceTab = { key: string; label: string; verde?: boolean; node: ReactNode };

export function SpaceTabs({ items }: { items: SpaceTab[] }) {
  const [active, setActive] = useState(items[0]?.key ?? "");
  return (
    <div className="v2">
      <div className="tabs" data-testid="raiox-nav">
        {items.map((i) => {
          const on = active === i.key;
          return (
            <button
              key={i.key}
              type="button"
              onClick={() => setActive(i.key)}
              className={`tab${on ? " active" : ""}`}
              aria-current={on ? "true" : undefined}
              data-testid={`raiox-tab-${i.key}`}
              style={on && i.verde ? { background: "#ecfdf5", color: "#047857", borderColor: "#6ee7b7" } : undefined}
            >
              {i.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4" data-testid="raiox-relatorio">
        {items.map((i) => (
          <div key={i.key} hidden={active !== i.key} data-tab={i.key} className="space-y-4">
            {i.node}
          </div>
        ))}
      </div>
    </div>
  );
}
