# TEARDOWN — ConLicitação (concorrente maduro) → o que modelar no Sentinela
### Engenharia reversa a partir das telas que o Bione capturou (jun/2026). Pasta: `docs/concorrentes/conlicitacao/`.

> ConLicitação é um incumbente linha Effecti: suíte completa **pós-edital + ferramentas**. Muita coisa que estamos construindo, eles já têm. O risco aqui é **pânico de "precisamos de tudo isso"** (dispersão). A leitura certa: **adotar as ideias baratas e diferenciadoras, manter nosso fosso (antecipação), ignorar a operação de sessão deles.**

---

## 1. O que eles têm (inventário das telas)

**Onboarding (Cadastre-se):** dados de contato (nome, cargo, celular, telefone) · conta (e-mail, CNPJ, senha) · **escopo** (Atividades de interesse + Estados) · **qualificação** (como conheceu, nº de funcionários, quantas licitações/mês, faturamento anual com licitações, como pretende usar). 15 dias grátis. → onboarding rico + **dados de segmentação/venda**.

**Escopo "abrangência de interesse":** Nacional / por Região / por Estado (checkbox). → vão até **estado**; nós vamos a **UF→cidade→raio** (mais granular = vantagem).

**Dashboard "Nossas Ferramentas":**
- *Oportunidades de Negócio:* Boletins, Encontrar Licitações, Licitações Estratégicas, Encontrar Acompanhamentos.
- *Inteligência Artificial:* **Dr. Licita**, **Consultor Jurídico**, **Resumo do Edital**, **Pergunte ao Edital**.
- *Gestão:* Gerenciar Licitações / Documentos / Portais.
- *Automação:* **Monitorar Chat**, **Robô de Lance Inteligente**.
- KPIs: Novas oportunidades do dia · **Iminência de deserta (9)** · Vigentes (2904) · **Baixa concorrência (13)** · **Licitações por estado** (SP 418, MG 353…) + mapa do Brasil.
- Novidades: "Elabore **impugnações, recursos e contrarrazões** em minutos (Dr Licita)", Assistente Jurídico IA 2.0, autenticar documentos.

**Busca/Edital:** filtro por **Estado / Região / Raio de atuação** · no card do edital: órgão, cidade, **CAPAG A+** (selo), prazo · ações: **Resumo do Edital (IA, BETA)**, **Pergunte ao Edital (IA)**, Gerenciar, Ativar monitoramento de chat.

**Resumo do Edital (modal):** 3 cards (Valor Estimado · Modalidade · Data da Sessão "em 13 dias") · Identificação (objeto, número, UASG, portal, contratação, **Responsável: "Clarissa Leite Guimarães Macêdo"**) · Sessão Pública (data, modo de disputa) · botões **Baixar Edital Completo · Enviar Checklist por E-mail · Gerar Checklist .docx · Imprimir Checklist**.

**Acesso:** após o cadastro, **"em validação e otimização — você será avisado quando liberar"** (ativação manual). Têm também **evento/comunidade** (CON Licitantes).

---

## 1.5 — CATÁLOGO COMPLETO de ferramentas (menu "Ferramentas") → classificação
Legenda: ✅ já temos · 🔨 construindo (núcleo) · ⭐ adotar (alto valor) · 🟡 avaliar depois · 🛑 não clonar (turf/serviço)

| Categoria | Ferramenta | O que é | Para nós |
|---|---|---|---|
| **Oportunidades** | Boletins de Licitações | digest diário de editais do perfil | 🔨 = Alertas/Radar |
| | Encontrar Licitações | busca de editais | 🔨 = Radar/Consulta (núcleo) |
| | Licitações Estratégicas | curadoria das melhores (score) | ⭐ = "Atacar Hoje"/score — reforçar |
| | Encontrar Acompanhamentos | achar atas/contratos p/ acompanhar | 🔨 = antecipação por contrato vencendo |
| **IA** | Dr. Licita | gera impugnação/recurso/contrarrazões | 🛑 peça processual — **trava jurídica** |
| | Consultor Jurídico | chat jurídico | 🔨 = nosso Consultor (núcleo) |
| | Resumo do Edital | IA resume o edital | 🔨 = Pasta/Resumo Executivo |
| | Pergunte ao Edital | chat sobre o edital | 🔨 = Consultor na pasta |
| **Gestão** | Gerenciar Licitações | kanban de acompanhamento | 🔨 = nosso Kanban |
| | Gerenciar Documentos | cofre de documentos | 🔨 = Minha Empresa/Vigia + workspace |
| | Gerenciar Portais | credenciais nos portais (Comprasnet…) | 🟡 útil, mas sensível — depois |
| **Automação** | Monitorar Chat | monitora chat do pregão | 🛑 turf Effecti (régua #3) |
| | Robô de Lance Inteligente | lance automático | 🛑 parking lot/jurídico |
| **Análise Estratégica** | Análise de Mercado | panorama do mercado público | ⭐ **adotar** — barato sobre nosso DataLake, diferencia |
| | Concorrentes | mapa de concorrentes | 🟡 roadmap (data-gated: atas/contratos+sanções) |
| | Ata de Registro de Preços | consultar ARPs (preço + carona) | ⭐ **adotar** — preço praticado + oportunidade de carona |
| | Contratos | histórico/vigência/vencimento | 🔨⭐ central à tese (antecipação por contrato vencendo) |
| | Meu histórico | histórico do usuário | 🟡 depois |
| **Assessoria** | Assessoria Cadastral | serviço humano de cadastro | 🟡 serviço premium (não software) |
| | Jurídico Fácil / Artigos Jurídicos | conteúdo jurídico | 🟡 conteúdo/SEO (liga no OmniSeen) |
| | Envie sua dúvida | suporte | 🟡 suporte |
| | ConLicitaSeg | seguro-garantia p/ licitantes | 🟡 **monetização futura** (parceria seguro — exigência comum em edital) |
| **Treinamento** | ConLicita Go / Cursos in Company | educação/treinamento | 🟡 conteúdo/serviço |
| **Outras** | Assinatura Digital | assinar documentos | 🟡 integração no fluxo de proposta |
| | API ConLicitação | API de integração | 🟡 depois (sermos API-first) |
| | Bolsa de empregos · Clipping PF · Status | emprego / notícias / statuspage | 🛑 fora de escopo |

**Leitura do catálogo (sócio crítico):** são ~25 ferramentas em 7 categorias. **Não igualamos esse catálogo** — isso é a armadilha de dispersão/comoditização. Boa parte é **serviço** (assessoria, cursos, seguro) ou **turf de operação** (robô/chat), não nosso software-núcleo. O que realmente interessa puxar: ⭐ **Análise de Mercado**, ⭐ **Ata de Registro de Preços (preço/carona)**, ⭐ **Licitações Estratégicas (score)** — e o resto (🔨) a gente já está construindo melhor, com a **antecipação** que eles não têm.

---

## 2. Mapa para o Sentinela

### ✅ ADOTAR (barato, alto valor, diferencia ou é table-stakes)
1. **CAPAG do órgão** — o selo "CAPAG A+" é a nota de **capacidade de pagamento** (Tesouro Nacional, pública e gratuita). É exatamente o "perfil de pagamento do órgão" que queríamos. **Puxar a CAPAG por ente e exibir no Dossiê/Radar.** Forte e fácil.
2. **Sinais de oportunidade: "baixa concorrência" e "iminência de deserta"** — computáveis do histórico (poucos participantes, republicada, prazo curto, fracassada). Vira chip no Radar e KPI no Dashboard. Diferencial real.
3. **Raio de atuação** — opção de escopo por **km ao redor da cidade** da empresa, além de UF→cidade. Some ao nosso onboarding de escopo.
4. **Resumo do Edital — UX de referência:** 3 cards no topo (valor/modalidade/data com "em X dias") + seções colapsáveis + gerar **checklist em docx/e-mail/print**. É o layout-alvo da nossa **Pasta Inteligente / Resumo Executivo**. (Eles já fazem — então isso é table-stakes, não diferencial.)
5. **Responsável/decisor no resumo** — eles extraem o nome do responsável do **texto do edital**. Confirma que **decisores são parseáveis do documento** (não do metadado PNCP). LGPD institucional. Alimenta nosso CRM de decisores.
6. **Onboarding com qualificação** (nº funcionários, licitações/mês, faturamento, intenção de uso) — para segmentação, calibrar planos e vendas. Adotar no nosso onboarding.
7. **Licitações por estado + mapa** — visão macro no Dashboard.

### 🛑 NÃO clonar (turf deles + nossas réguas)
- **Robô de Lance · Monitorar Chat** — operação de sessão (Effecti turf, régua #3). Fica no parking lot/jurídico, como já decidido.
- **Peça processual "em minutos" (Dr Licita: impugnação/recurso/contrarrazões)** — eles fazem; nós **mantemos a TRAVA** (disclaimer + validação profissional). Não correr para igualar sem cuidado jurídico.
- **Ativação manual de conta** — adiciona fricção. No máximo usar como toque de vendas no plano alto; não copiar por padrão.

---

## 3. Leitura estratégica (sócio crítico)
ConLicitação, como a Effecti, é **pós-edital + ferramentas**: mesmo com toda a IA, eles **reagem ao edital publicado**. Nosso fosso continua sendo o que eles **não** têm: **antecipação** (PCA / contrato vencendo / recorrência), o **cruzamento profundo empresa × edital**, o **CRM de decisores** e o **workspace por licitação**.

**Conclusão:** igualamos o table-stakes deles (resumo do edital + checklist) porque o cliente espera isso — mas **vencemos no "te avisei antes" e no "essa é a sua chance, e aqui está o porquê e o quem".** Não viramos clone da suíte; pegamos as 7 ideias acima e mantemos o foco.

---

## 4. "Modelada" — backlog concreto (o que remodelar no nosso)
- [ ] **CAPAG por ente** (fonte Tesouro) → Dossiê + Radar.
- [ ] **Chips de sinal:** "baixa concorrência", "pode ficar deserta", "republicada".
- [ ] **Escopo com raio de atuação** (km) no onboarding.
- [ ] **Resumo Executivo** com o layout-alvo (3 cards + seções) + **gerar checklist docx/e-mail/print** (liga no Bloco 3).
- [ ] **Decisor do edital** extraído do documento → CRM de decisores.
- [ ] **Onboarding com qualificação** (funcionários, licitações/mês, faturamento, intenção).
- [ ] **Dashboard:** licitações por estado + mapa.

> Régua mantida: adotar não é inflar. Cada item acima entra como **roadmap priorizado**, não tudo de uma vez — e nada que nos empurre para a operação de sessão.
