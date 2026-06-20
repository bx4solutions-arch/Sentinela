# SENTINELA — ROADMAP MODULAR DE CONSTRUÇÃO
### Consolida o Documento Executivo (jun/2026) com o PRD, mantendo a régua de enxutez. Cada bloco entrega UM módulo testável sobre dado real. Você testa, aprova, segue.

---

## Princípio
- **Vertical slice por bloco:** cada bloco liga ponta a ponta (dado → tela) e é demonstrável sozinho.
- **Dado antes de tela:** módulo que depende de dado inexistente não é construído antes do dado existir. O pré-requisito está explícito em cada um.
- **Régua de enxutez:** o Documento Executivo é a estrela polar (visão). Aqui ele vira backlog faseado, não tudo de uma vez.

---

## Registro de módulos (o filtro que decide o que entra quando)

| Módulo | Veredito | Pré-requisito de dado | Observação |
|---|---|---|---|
| Dashboard Executivo | 🟢 Núcleo | os outros módulos | consolida KPIs; enche conforme blocos entram |
| Radar de Oportunidades (Pilar A) | 🟢 Núcleo | staging editais (✅ temos) | licitação do dia filtrada pelo perfil |
| Minha Empresa / Prontidão | 🟢 Núcleo | CNPJ API + cadastro certidões | Raio-X por CNPJ + Vigia — trava o cliente |
| Dossiê da Oportunidade | 🟢 Núcleo | staging editais/órgão (✅) | tela-rainha, com o dado que TEMOS |
| Kanban Comercial | 🟢 Núcleo | — | **4–5 colunas, não 10** |
| Alertas e Plano de Ação | 🟢 Núcleo | — | versão simples primeiro |
| **Consultor Jurídico (análise)** | 🟢 **Núcleo** | lei/jurisprud. (dia 1) + documento baixado (full) | **resume ETP, explica edital, monta checklist. Reuso do motor MeuJurídico, tenant separado** |
| Órgão (perfil) | 🟢 Núcleo | staging órgão (✅) | volume, unidades, poder/esfera |
| Órgão → **Decisores** | 🟡 Roadmap | **2ª fonte** (ata/diário/transparência) | PNCP não traz a pessoa. LGPD: só institucional |
| Análise Executiva (pacote completo) | 🟡 Roadmap | **download on-demand** (`/arquivos`) | IA lê todo o processo; liga quando o doc baixa |
| Concorrentes / Incumbentes | 🟡 Roadmap | **atas/contratos** (hoje 0) + sanções CEIS/CNEP | quem ganhou, preço, sanção |
| Central de Certidões (emissão) | 🟡 Roadmap | — | MVP = checklist+alerta+link+upload; automação depois |
| Consultor → **peça processual** | 🔴 Trava | — | impugnação/recurso/contrarrazões: disclaimer + "valide com advogado" + parecer jurídico antes |

---

## Ordem de construção (cada bloco: objetivo · entrega · **como testar** · gate)

### BLOCO 0 — Fundação de dados  *(começa agora)*
**Objetivo:** o harvest da noite vira DataLake consultável, e o repo fica limpo.
**Entrega:** `.gitignore` cobre `pncp_data/` · staging no Supabase (`orgao`, `raw_editais`, `raw_pca`).
**Como testar:** abrir o Supabase Studio → ver 310 órgãos, ~49k editais, ~16k PCA, com índices.
**🚦 Gate:** aprovar o schema staging antes do `db push`.

### BLOCO 1 — Shell + Minha Empresa (Raio-X + Vigia)
**Objetivo:** o cliente entra com o CNPJ e a plataforma se preenche sozinha.
**Entrega:** shell (sidebar navy) · onboarding CNPJ → razão social + CNAE (BrasilAPI) → sugestão de nichos · cadastro de certidões com vencimento · semáforo de Prontidão.
**Como testar:** digitar um CNPJ real → ver Raio-X (razão social, CNAE, porte) + certidões com semáforo ATIVO/A_RENOVAR/VENCIDO.
**🚦 Gate:** revisar a tela antes de seguir.

### BLOCO 2 — Radar (Pilar A: licitação do dia, dado real)
**Objetivo:** ver as licitações do perfil, hoje, sobre o staging.
**Entrega:** Radar lê `raw_editais` filtrado por nicho/cidade · card (órgão, objeto, valor, situação, data, fonte) · ordenação por relevância · botões (descartar/monitorar/ver dossiê).
**Como testar:** com o CNPJ de material hospitalar, ver os editais reais de SP do nicho (temos 4.339).
**🚦 Gate:** revisar relevância/ordenção.

### BLOCO 3 — Dossiê da Oportunidade
**Objetivo:** a tela-rainha, com o dado que temos.
**Entrega:** ficha — resumo · linha do tempo (PCA→edital, marcando o que existe) · perfil do órgão · histórico/contrato anterior (quando houver) · preço · fontes oficiais com link. Abas vazias de Decisores/Concorrência marcadas "em breve" (gated).
**Como testar:** clicar num card do Radar → ver a ficha; conferir que **PCA-antes-do-edital** aparece quando existe (a prova da tese).
**🚦 Gate:** aprovar layout (alvo: mockup `sentinela-dossie.html`).

### BLOCO 4 — Kanban + Alertas
**Objetivo:** o CRM da venda ao governo + sistema que chama.
**Entrega:** Kanban 4–5 colunas (Nova · Monitorando · Preparação · Edital · Resultado) · promover do Radar · alerta básico (nova oportunidade, contrato/certidão vencendo).
**Como testar:** mandar uma oportunidade pro Kanban, mover de coluna, receber um alerta.
**🚦 Gate:** revisar.

### BLOCO 5 — Dashboard Executivo
**Objetivo:** a visão de comando consolidada, sobre dado real.
**Entrega:** KPIs (pipeline, quentes, editais 90d, contratos vencendo, prontidão, ações) · Atacar Hoje · linha do tempo de sinais · pipeline por estágio. (Alvo: mockup `sentinela-dashboard.html`.)
**Como testar:** abrir a home e ver os números batendo com o Radar/Kanban.
**🚦 Gate:** revisar.

### BLOCO 6 — Consultor Jurídico (camada de análise)
**Objetivo:** o copiloto jurídico de apoio — resume, explica, checklista.
**Entrega:** chat reusando o motor do MeuJurídico (tenant separado, muralha) · dia 1: lei 14.133 + jurisprudência + "o que é ETP/DFD/TR" · quando o documento for baixado: resume o ETP/edital daquela licitação, monta o checklist de habilitação, aponta pontos de atenção. **Disclaimer fixo: apoio, não substitui advogado.**
**Como testar:** perguntar "o que esse edital exige pra habilitação?" e receber checklist; pedir resumo de um ETP baixado.
**🚦 Gate:** revisar respostas + disclaimer. **Peça processual fica fora deste bloco.**

### BLOCOS 7+ — Roadmap (gated por dado/jurídico)
- **Decisores** (quando a 2ª fonte existir) · **Análise Executiva completa** (quando o download on-demand existir) · **Concorrência** (quando atas/contratos forem ingeridos + sanções) · **Certidão automação** · **Consultor → peça processual** (com trava jurídica).

---

## Réguas que travam (valem em todos os blocos)
1. **Probabilidade, nunca promessa.** "Chance de participar", não "você vai ganhar". Veredito é recomendação calibrada, não garantia.
2. **LGPD institucional.** Decisores = nome + cargo + canal institucional + ato de nomeação. Nunca CPF/celular/e-mail pessoal.
3. **Reuso + muralha.** Consultor jurídico reusa o motor do MeuJurídico, em tenant separado, sem misturar dados.
4. **Documentos on-demand.** PDF/ETP só baixa quando o licitante opta por participar — não em lote.
5. **Peça processual com trava.** Impugnação/recurso/contrarrazões só com disclaimer e recomendação de validação profissional.
6. **Régua de execução do terminal.** Plan mode → commit isolado → STOP → aprovação. Sem heredoc. Nunca commitar segredo.
