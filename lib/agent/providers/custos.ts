// lib/agent/providers/custos.ts
// Estimativa básica de custo por modelo (USD por 1M tokens). Valores de
// referência — atualizar quando os preços mudarem; o valor exato cobrado
// está na fatura do fornecedor, isto alimenta a COTA (ordem de grandeza).

interface Preco {
  entradaPor1M: number;
  saidaPor1M: number;
}

// Match por prefixo (primeiro que casar vence). Mantém funcionando mesmo
// quando surge sufixo de versão novo (ex.: -20260101).
const TABELA: Array<[prefixo: string, preco: Preco]> = [
  ["claude-opus", { entradaPor1M: 15, saidaPor1M: 75 }],
  ["claude-sonnet", { entradaPor1M: 3, saidaPor1M: 15 }],
  ["claude-haiku", { entradaPor1M: 1, saidaPor1M: 5 }],
  ["gpt-5-mini", { entradaPor1M: 0.25, saidaPor1M: 2 }],
  ["gpt-5", { entradaPor1M: 1.25, saidaPor1M: 10 }],
  ["gpt-4o", { entradaPor1M: 2.5, saidaPor1M: 10 }],
  ["gemini-2.5-pro", { entradaPor1M: 1.25, saidaPor1M: 10 }],
  ["gemini-2.5-flash", { entradaPor1M: 0.3, saidaPor1M: 2.5 }],
];

const PADRAO: Preco = { entradaPor1M: 3, saidaPor1M: 15 };

export function calcularCustoUSD(modelo: string, tokensEntrada: number, tokensSaida: number): number {
  const preco = TABELA.find(([p]) => modelo.startsWith(p))?.[1] ?? PADRAO;
  const custo =
    (tokensEntrada / 1_000_000) * preco.entradaPor1M + (tokensSaida / 1_000_000) * preco.saidaPor1M;
  return Math.round(custo * 1e6) / 1e6;
}
