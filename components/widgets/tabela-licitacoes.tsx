// components/widgets/tabela-licitacoes.tsx
// Tabela compacta de licitações — widget NOVO (Fase A), criado para a UI
// generativa: quando o agente devolve várias licitações, este é o bloco
// denso (o LicitacaoCard é o bloco detalhado). Segue os tokens visuais
// existentes; ainda não é usado em nenhuma tela.

import React from "react";
import { formatarData, formatarMoeda } from "@/lib/formatar";

export interface LinhaLicitacao {
  id: string;
  orgaoNome: string | null;
  objeto: string | null;
  modalidade: string | null;
  valorTotal: number | null;
  dataAbertura: string | null;
  municipio: string | null;
  uf: string | null;
  linkSistemaOrigem: string | null;
}

export function TabelaLicitacoes({ linhas }: { linhas: LinhaLicitacao[] }) {
  if (linhas.length === 0) {
    return (
      <p className="rounded-xl border border-borda bg-white p-4 text-[13px] text-cinza">
        Nenhuma licitação encontrada com esses filtros.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-borda bg-white">
      <table className="w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-borda text-[11px] uppercase tracking-wide text-cinza">
            <th className="px-4 py-3 font-semibold">Órgão</th>
            <th className="px-4 py-3 font-semibold">Objeto</th>
            <th className="px-4 py-3 font-semibold">Modalidade</th>
            <th className="px-4 py-3 font-semibold">Valor estimado</th>
            <th className="px-4 py-3 font-semibold">Abertura</th>
            <th className="px-4 py-3 font-semibold">Local</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-b border-borda last:border-b-0">
              <td className="px-4 py-3 font-display font-semibold text-indigo-deep">
                {l.linkSistemaOrigem ? (
                  <a
                    href={l.linkSistemaOrigem}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-violeta"
                  >
                    {l.orgaoNome ?? "—"}
                  </a>
                ) : (
                  l.orgaoNome ?? "—"
                )}
              </td>
              <td className="max-w-[320px] px-4 py-3 text-ink">
                <span className="line-clamp-2">{l.objeto ?? "—"}</span>
              </td>
              <td className="px-4 py-3 text-cinza">{l.modalidade ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 font-display font-semibold text-indigo-deep">
                {formatarMoeda(l.valorTotal)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-cinza">
                {formatarData(l.dataAbertura)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-cinza">
                {l.municipio ? `${l.municipio}${l.uf ? `/${l.uf}` : ""}` : l.uf ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
