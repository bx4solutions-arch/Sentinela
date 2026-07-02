# Engenharia reversa — CLEATUS (cleat.ai)

**Analista:** Claude Sonnet 4.6 (extensão Chrome) · **Data:** 30/06/2026 · **Conta:** plano DATA (bx4) · investigação só com dados visíveis na sessão + páginas públicas (llms.txt, pricing, security, API docs). Nenhum dado de outro tenant acessado.

> Uso: base para o roadmap da Sentinela. Inspiração de modelo/fluxo é lícita; não copiar conteúdo/código/layout proprietário.

---

## Mapa de telas (resumo)
Agente (chat = entry point universal) · Gasoduto/Pipeline (Triagem, Todas as atividades [Kanban/Lista/Calendário], Relatórios) · Contratos (Procurar, Recomendado, Alertas personalizados, Importados) · Inteligência de Mercado (Agências 8.968, Agentes de Contratação/COs 212.996, Empreiteiros 800k+, Veículos/IDV-GWAC, NAICS) · Propostas (RAG, bloqueado no DATA) · Central de Documentos (RAG) · Perfil de Captura (import via UEI/SAM) · Automação/Workflows · Configurações (Integrações: MCP Claude/ChatGPT, API Keys, eBuy, SeaPort, Zapier, Slack; Audit log).

## Features de IA
Agent multi-passo (tool-calling); Smart Matching (score 0–100 + badge Excelente/Bom, filtro padrão ≥80); **Prós & Contras por oportunidade**; AI Professional Profile do CO; import de capacidade via PDF; Proposal Writer (Shipley, matriz compliance L/M); Document Hub (RAG/chunking); busca web autônoma; **pré-previsão de recompetes 12–18 meses**; PWIN score; AI Workflows (no-code, 26+ templates); geração de planilhas/CSV.

## Camada AI-native (o ponto-chave)
- **MCP (Claude.ai + ChatGPT):** expõe **33–34 tools** (busca, pipeline read/write, propostas, Document Hub, market intel, tarefas, workflows). OAuth 2.1 + PKCE. **"Confirm-before-change"** documentado para escrita + audit log. A partir do plano DATA+IA.
- **REST API (api.cleat.ai):** OpenAPI3 em /api/openapi.json, Swagger em /api/docs. X-Api-Key ou OAuth Bearer. Grupos: oportunidades, recomendações, mercado, pipeline, tarefas, pesquisas salvas, documentos, workflows, equipes, perfil/notificações. Rate limit é cota única compartilhada entre API + MCP Claude + MCP ChatGPT. Só no plano DATA+IA+Automações.

## Dado / moat
SAM.gov, 40k+ SLED, DIBBS/DLA, SBIR/STTR, GSA eBuy, SeaPort NxG, Grants.gov, previsões GSA/DHS/NASA/Tesouro + AI pre-forecasting. **800k+ empreiteiros** (teaming) · **212.996 COs com email/telefone direto** (moat mais diferenciado) · **8.968 agências** com hierarquia e gastos 12m.

## Planos
DADOS $39/usuário/mês (1 user, SEM IA) · DADOS+IA $78/mês (até 5, 50 créditos, MCP Claude/ChatGPT, Document Hub 100MB, CRM) · DADOS+IA+Automações (vendas; Proposal Writer, Workflows, API REST) · GovCloud (FedRAMP, CMMC L2, SSO/SCIM, on-prem). Trial 7 dias. Segurança: AES-256, "no AI training", infra EUA, single-tenant opcional.

## UX que funciona
Agent como home com sugestões categorizadas (anti blank-page); Prós/Contras AI (não só score); botões Aceitar/Liberar = bid/no-bid em 1 clique; score com label qualitativo + filtro ≥80 pré-curado; perfil via UEI/SAM em 1 campo; painel de contexto (agente) na sidebar em qualquer tela; MCP com confirm-before-change + audit; hierarquia de agências expansível inline.

## Fraquezas da CLEATUS (oportunidade da Sentinela)
1. **Zero contexto financeiro do fornecedor** (capital de giro, balanço vs exigência de PL). 2. Market Intelligence read-only (sem alerta de "novo entrante venceu na agência que você atende"). 3. Sem impugnação/recurso (fase estrutural no BR). 4. Sem integração ERP/execução pós-adjudicação. 5. Plano de entrada sem IA (posicionamento errado p/ SMB). 6. Resumo de edital sem alerta de "armadilhas"/cláusulas restritivas. 7. i18n PT-BR ruim ("Gasoduto" = pipeline).

---

## INSIGHTS PARA A SENTINELA

### Replicáveis no BR (prioridade)
1. **Score de adequação com PRÓS/CONTRAS** — fit CNAE×objeto×UF×porte + bullets do porquê. CONTRA automático no BR = certidão vencida p/ aquele órgão / penalidade prévia.
2. **Perfil com auto-import via CNPJ** → SICAF + Transparência + TCU: CNAEs, certidões, contratos ganhos, penalidades, capital social. Onboarding de minutos.
3. **Banco de compradores (pregoeiros/agentes)** com órgão, e-mail (Transparência), histórico por modalidade, CNAE mais comprado, valor médio, % ME/EPP. = nosso "Contatos Estratégicos" + histórico por modalidade.
4. **Agente conversacional como entry point** sobre o PNCP ("pregões de TI no RS < R$200k abertos esta semana").
5. **Pré-previsão de recompra 12–18 meses** (contrato vencendo → pré-bid). = reforça nosso "Contratos vencendo".

### NÃO faz sentido no BR (adaptar)
- Proposal Writer narrativo → no BR vira **gerador de planilha de preços/composição+BDI** e **verificador de exigências do edital** (pregão é por preço).
- Compliance Matrix L/M → **checklist de habilitação** (jurídica/fiscal/econômica/técnica + amostras).
- Set-asides (8(a)/HUBZone) → **cota/preferência ME/EPP (LC 123)**.
- GWAC/Vehicles → **Atas de Registro de Preço (adesão)**.
- Teaming 800k → **subcontratação** (consórcio é raro no BR).

### Onde a Sentinela supera por design
Contexto financeiro do fornecedor + Raio-X financeiro/político do órgão (SICONFI/emendas/padrinho) + análise de impugnação com jurisprudência TCU + vocabulário nativo BR + IA desde o plano de entrada.

---
Relatório completo (tabelas, prints, endpoints) preservado pelo Bione em 30/06/2026. Ver [[sentinela-cobertura-licinexus]] e [[sentinela-progresso]].
