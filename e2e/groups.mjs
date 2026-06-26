// Grupos da suíte e2e por domínio — fonte única de verdade do agrupamento.
// Cada teste aparece em EXATAMENTE um grupo (a união = a suíte inteira, sem duplicar).
// Rodar um grupo isolado evita o run-inteiro morrer (OOM): `node e2e/run-prod.mjs --grupo=raiox`.
export const GROUPS = {
  empresa: [ // cofre / onboarding / config / identidade / integração / funil
    "e2e/autotest.mjs",
    "e2e/autotest-frontend.mjs",
    "e2e/autotest-identidade.mjs",
    "e2e/autotest-conhecimento.mjs",
    "e2e/autotest-sinais.mjs",
    "e2e/autotest-integracao.mjs",
    "e2e/autotest-kanban.mjs",
  ],
  descoberta: [ // radar (recorte/escopo) + busca fundida (a /pesquisa foi absorvida no Radar/Space)
    "e2e/autotest-radar.mjs",
    "e2e/autotest-descoberta.mjs",
  ],
  dados: [ // coleta nacional / antecipação / contratos / backfill por célula
    "e2e/autotest-harvester.mjs",
    "e2e/autotest-antecipacao.mjs",
    "e2e/autotest-contratos.mjs",
    "e2e/autotest-backfill.mjs",
  ],
  dashboard: [ // dashboard rico + overhaul design system (desktop/mobile)
    "e2e/autotest-dashboard.mjs",
    "e2e/autotest-dashboard-ui.mjs",
  ],
  inteligencia: [ // motor de preço / sala (consultor foi absorvido no Space — prova em autotest-licitacao)
    "e2e/autotest-preco.mjs",
    "e2e/autotest-sala.mjs",
  ],
  raiox: [ // licitação (Raio-X) / exigências / siconfi / proposta / space — determinístico, leve
    "e2e/autotest-licitacao.mjs",
    "e2e/autotest-pasta.mjs",
    "e2e/autotest-space.mjs",
    "e2e/autotest-space-crm.mjs",
    "e2e/autotest-exigencias.mjs",
    "e2e/autotest-proposta.mjs",
    "e2e/autotest-siconfi.mjs",
    "e2e/autotest-gasto-orgao.mjs",
    "e2e/autotest-sala-docs.mjs",
  ],
  ia: [ // Resumo Profundo — extração REAL (PNCP PDF + OpenAI): pesado e com deps externas → isolado
    "e2e/autotest-resumo-profundo.mjs",
    "e2e/autotest-resumo-upload.mjs",
  ],
};

// Suíte inteira = todos os grupos, na ordem definida acima.
export const SUITE = Object.values(GROUPS).flat();
