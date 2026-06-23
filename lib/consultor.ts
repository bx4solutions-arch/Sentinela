// Consultor (Bloco 5) — versão DETERMINÍSTICA + BYOK, citando a Lei 14.133/2021.
// Responde "posso participar / o que me inabilita / exigência restritiva" a partir do checklist de
// habilitação típica (lib/habilitacao) + metadado do edital. SEMPRE cita a fonte (artigo) + disclaimer.
// RAG completo sobre a lei inteira + jurisprudência fica para quando o corpus do MeuJurídico entrar.
// Peça processual (impugnação/recurso) fica TRAVADA (gate jurídico).

export type ItemHab = { key: string; label: string; orgao: string; st: string };
export type RespostaConsultor = { pergunta: string; resposta: string; fonte: string; tom: "ok" | "alerta" | "info" };

const A = (n: string) => `Lei 14.133/2021, ${n}`;

export function consultarLicitacao(opts: {
  itens: ItemHab[]; faltam: ItemHab[]; pct: number; statusEmp: "apto" | "ressalvas" | "nao_apto";
  valorEstimado: number | null; modalidade: string | null; srp: boolean | null;
}): RespostaConsultor[] {
  const { faltam, pct, statusEmp, valorEstimado, modalidade, srp } = opts;
  const out: RespostaConsultor[] = [];

  // 1) Posso participar?
  out.push({
    pergunta: "Posso participar deste certame?",
    resposta: statusEmp === "apto"
      ? `Sim, em tese: você atende à habilitação típica deste tipo de objeto (${pct}% pronto). Confirme as exigências específicas no edital antes de enviar a proposta.`
      : statusEmp === "ressalvas"
        ? `Com ressalvas: você atende parte da habilitação típica (${pct}% pronto). Resolva os ${faltam.length} documento(s) pendente(s) antes da sessão.`
        : `Hoje não — sua habilitação típica está incompleta (${pct}% pronto). Regularize os documentos antes de disputar para não ser inabilitado.`,
    fonte: A("arts. 62 a 70 (habilitação)"),
    tom: statusEmp === "apto" ? "ok" : statusEmp === "nao_apto" ? "alerta" : "info",
  });

  // 2) O que me inabilita hoje?
  out.push({
    pergunta: "O que pode me inabilitar hoje?",
    resposta: faltam.length === 0
      ? "Nenhum documento da habilitação típica está ausente ou vencido na sua ficha. Mantenha as certidões válidas até a data da sessão."
      : `Documento(s) ausente(s) ou vencido(s): ${faltam.map((f) => f.label).join(", ")}. A falta de qualquer um pode levar à inabilitação. Regularize em Minha Empresa.`,
    fonte: A("art. 63 (habilitação fiscal, social e trabalhista) e art. 68 (documentação)"),
    tom: faltam.length === 0 ? "ok" : "alerta",
  });

  // 3) Exigência restritiva? (metadado — análise profunda exige o texto do edital)
  out.push({
    pergunta: "Há exigência possivelmente restritiva?",
    resposta: `A vedação a cláusulas que restrinjam a competição é geral (${A("art. 9º")}). A checagem fina (atestados desproporcionais, marca, prazos exíguos) exige o TEXTO do edital — baixe o documento e use "Analisar com IA" (BYOK). Pelo metadado: ${modalidade ?? "modalidade não informada"}${srp ? ", com registro de preços (SRP)" : ""}.`,
    fonte: A("art. 9º (vedações) e art. 37 (julgamento objetivo)"),
    tom: "info",
  });

  // 4) ME/EPP tem benefício?
  out.push({
    pergunta: "Sou ME/EPP — tenho algum benefício?",
    resposta: "Se for ME/EPP, há tratamento favorecido: empate ficto (preferência de contratação até 5%/10% acima do menor lance) e prazo para regularização fiscal posterior. Declare a condição na proposta.",
    fonte: "LC 123/2006, arts. 42 a 45 (regularização fiscal e empate ficto)",
    tom: "info",
  });

  // 5) Risco de inexequibilidade (liga com o motor de preço)
  out.push({
    pergunta: "Até onde posso baixar o preço?",
    resposta: `Preço muito baixo pode ser desclassificado por inexequibilidade. Use o Motor de Preço (aba Inteligência) para a faixa praticada e o piso de referência${valorEstimado ? ` (estimado do edital: R$ ${valorEstimado.toLocaleString("pt-BR")})` : ""}. A empresa decide o preço.`,
    fonte: A("art. 59, §§ 3º e 4º (inexequibilidade)"),
    tom: "info",
  });

  return out;
}
