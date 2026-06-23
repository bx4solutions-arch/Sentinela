// Gerente de Participação (Bloco 6) — gerador SECCIONADO de proposta. Só dado real.
// Cada seção é pré-preenchida (empresa + edital + motor de preço) e CONFIRMÁVEL; ao confirmar,
// entra no documento. Preço: a EMPRESA define (motor sugere). Declarações com disclaimer.
// Peça processual (impugnação/recurso) NÃO é gerada (gate jurídico). FORA: planilha de custos.
import type { FaixaPreco } from "@/lib/preco";

export type SecaoProposta = {
  id: string; titulo: string; conteudo: string;
  precoEditavel?: boolean;   // "Condições comerciais": a empresa define o valor
  obrigatoria?: boolean;     // declarações exigidas
};

export type DadosEmpresa = { razao: string | null; cnpj: string | null; municipio: string | null; uf: string | null };
export type DadosEdital = { numero: string; objeto: string | null; orgao: string | null; modalidade: string | null; numeroCompra: string | null };

const fmtBRL = (n: number | null | undefined) => n ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n) : "—";

/** Declarações típicas da Lei 14.133 (as ESPECÍFICAS do edital entram com o texto baixado). */
export const DECLARACOES_TIPICAS: { id: string; titulo: string; texto: string }[] = [
  { id: "idoneidade", titulo: "Declaração de inexistência de fato impeditivo", texto: "Declaramos, sob as penas da lei, a inexistência de fato superveniente impeditivo da habilitação, ciente da obrigatoriedade de declarar ocorrências posteriores." },
  { id: "menor", titulo: "Declaração de cumprimento do art. 7º, XXXIII, da CF", texto: "Declaramos que não empregamos menor de 18 anos em trabalho noturno, perigoso ou insalubre, nem menor de 16 anos, salvo na condição de aprendiz a partir dos 14 anos." },
  { id: "requisitos", titulo: "Declaração de cumprimento dos requisitos de habilitação", texto: "Declaramos que cumprimos plenamente os requisitos de habilitação exigidos no edital, conforme art. 63 da Lei 14.133/2021." },
  { id: "meepp", titulo: "Declaração de enquadramento como ME/EPP (se aplicável)", texto: "Declaramos, para os fins da LC 123/2006, o enquadramento como Microempresa/Empresa de Pequeno Porte, fazendo jus ao tratamento favorecido." },
];

export function montarSecoes(emp: DadosEmpresa, ed: DadosEdital, faixa: FaixaPreco | null): SecaoProposta[] {
  const enderecamento = `${emp.razao ?? "—"} — CNPJ ${emp.cnpj ?? "—"}${emp.municipio ? `, ${emp.municipio}/${emp.uf ?? ""}` : ""}`;
  const sugestao = faixa && faixa.confiavel
    ? `Referência de mercado (motor de preço): vencedora ${fmtBRL(faixa.vencedora)} · segura ${fmtBRL(faixa.segura)} · piso de inexequibilidade ${fmtBRL(faixa.pisoInexequivel)}. A EMPRESA define o valor final.`
    : "Defina o valor da proposta. (Sem faixa confiável de referência no momento — confira o estimado do edital.)";
  return [
    { id: "cabecalho", titulo: "Cabeçalho e endereçamento", conteudo: `PROPOSTA COMERCIAL\n\nÀ ${ed.orgao ?? "—"}\nReferente ao processo ${ed.numeroCompra ?? ed.numero}.\n\nProponente: ${enderecamento}` },
    { id: "licitacao", titulo: "Dados da licitação / órgão", conteudo: `Órgão: ${ed.orgao ?? "—"}\nModalidade: ${ed.modalidade ?? "—"}\nNº controle PNCP: ${ed.numero}\nNº da compra: ${ed.numeroCompra ?? "—"}` },
    { id: "objeto", titulo: "Objeto", conteudo: ed.objeto ?? "—" },
    { id: "comerciais", titulo: "Condições comerciais (preço)", conteudo: sugestao, precoEditavel: true },
    { id: "tecnicas", titulo: "Condições técnicas", conteudo: "Declaramos atendimento integral às especificações técnicas do Termo de Referência/Projeto Básico, com fornecimento conforme prazos e quantidades do edital. (Detalhe conforme o TR ao baixar o documento.)" },
  ];
}
