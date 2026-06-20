# PROMPT — BLOCO 1: CORREÇÕES RODADA 2 (pós-teste do Bione)

Régua: plan mode → mudança isolada → STOP → aprovação. Cada item é testável.

---

## CORREÇÃO 5 — Trocar empresa = ação deliberada e AVISADA (não "remover" casual)

**Contexto (importante):** a empresa cadastrada é um **ATIVO que acumula DNA** — CNAEs/serviços, sócios, certidões cadastradas, órgãos monitorados, histórico/kanban. A assinatura existe pra monitorar **essa** empresa. Trocar o CNPJ **orfana tudo isso** e recomeça do zero.

- **NÃO** ter botão "Remover empresa" casual. A empresa permanece e segue sendo monitorada por padrão.
- **"Trocar empresa"** existe (o usuário pode ter cadastrado o CNPJ errado), mas é **ação deliberada com aviso forte** antes de confirmar. Modal de confirmação com texto explícito:
  > "Você está trocando a empresa monitorada. Tudo que conhecemos da empresa atual — serviços, sócios, certidões cadastradas, órgãos monitorados e histórico — será **perdido**, e o monitoramento **recomeça do zero** para o novo CNPJ. Tem certeza?"
- Só **após confirmação explícita**, substitui a company do tenant.
- Botão **"Atualizar"** continua = refresh do **MESMO** CNPJ (não perde nada).

**Futuro (não agora, mas é a solução que ELIMINA a perda):** **múltiplas empresas por conta** — adicionar um novo CNPJ como empresa adicional em vez de destruir a atual. Registrar como roadmap.

**Como testo:** clico "Trocar empresa" → vejo o aviso explícito do que vou perder → confirmo → entra o novo CNPJ (de São Paulo).

---

## CORREÇÃO 6 — Tipos de documento extensíveis (não podem ser fixos)

O catálogo de tipos de certidão/documento **não pode ser enum rígido**.

- **Seed** com os tipos comuns como **exemplos/sugestões** (as 6 fiscais + setoriais por nicho).
- O campo **"Tipo"** deve ter as sugestões **+ opção "Outro…"** → o usuário digita um tipo customizado (ex.: "Atestado de capacidade técnica – dedetização escolar", "Registro CRQ", "Declaração de ME/EPP").
- **Schema:** tipo de documento como tabela/refêrencia livre por tenant (ou campo texto), **não enum**. Marcar quais são **obrigatórios** (contam na prontidão) vs **complementares** (custom do usuário).
- A prontidão (Correção 3) segue medindo só contra os **obrigatórios aplicáveis**; os custom aparecem na Vigia mas não distorcem o %.

**Como testo:** adiciono um tipo que não está na lista → salva e aparece na Vigia de documentos.

---

## CORREÇÃO 7 — Microcopy: deixar claro que certidão é cadastro (não é bug)

O usuário achou que o sistema "falhou em puxar as certidões". Não falhou — não há API única de certidão.

- Na Vigia, texto curto: *"Cadastre suas certidões e licenças. Não emitimos automaticamente ainda — emissão assistida em breve."*
- Mostrar a checklist das obrigatórias já como **"Ausente"** (vermelho) pra ficar visível o que falta.

---

## REGISTRO DE ARQUITETURA — modelo de Workspace (direção; NÃO construir agora)

Direção de produto (decisão do Bione):
- **Cada licitação acompanhada vira um WORKSPACE**: container com os documentos baixados do processo (edital/DFD/ETP/TR), a análise do consultor jurídico, a checklist de habilitação daquela licitação, tarefas e proposta.
- **Minha Empresa é o workspace-base**: o cofre de documentos da empresa (certidões, licenças, atestados), reutilizáveis nas licitações.

**Implicação no schema (fazer agora, de leve):** modelar `documento` com um **escopo** — pertence a `company` (cofre da empresa) **ou** a uma `licitacao/demand` (workspace da oportunidade). Assim, quando o Bloco 3 (Dossiê/Kanban) chegar, os documentos da empresa e os do processo convivem sem refatorar.

**NÃO construir** o workspace-por-licitação agora — é Bloco 3. Só **não fechar o schema** de um jeito que impeça (escopo no documento + tipos extensíveis já resolvem).

---

## NÃO fazer agora
- Não emissão automática de certidão (roadmap).
- Não workspace-por-licitação (Bloco 3) — só schema workspace-aware.
- Não Radar/Dossiê (Bloco 2+) até o gate do Bloco 1 passar.
