# PROMPT DE KICKOFF — INÍCIO DA CONSTRUÇÃO DO SENTINELA (terminal: Claude Code / Ruflo)

## Como trabalhar (régua inviolável)
- **Plan mode → mudança isolada → STOP para minha aprovação → commit.** Um bloco por vez.
- Sem heredoc dentro de prompt. **Nunca commitar segredo** (`.env.local` é gitignored).
- Cada bloco termina com um teste que EU consigo rodar/ver, e você PARA esperando meu OK antes do próximo.
- Documento-guia do produto: `docs/sentinela-prd-blueprint.md`. Ordem e escopo: `docs/03-ROADMAP-MODULAR.md`.

---

## BLOCO 0 — Fundação de dados (faça AGORA, em 2 passos)

### 0.1 — Higiene do repositório
Siga `docs/prompt-higiene-gitignore.md`:
- Adicionar `worker/harvester/pncp_data/` e `*.jsonl` ao `.gitignore`.
- `git rm -r --cached` no que já estiver rastreado (sem apagar do disco).
- Confirmar com `git check-ignore`.
- **STOP. Mostrar o diff do `.gitignore` para aprovação.**

### 0.2 — Ingestão no Supabase (staging cru)
Siga `docs/prompt-ingestao-supabase.md`:
- Migration das tabelas `orgao`, `raw_editais`, `raw_pca` (+ índices). **STOP para aprovar o schema antes do `db push`.**
- Loader idempotente carrega os 3 JSONL (`upsert` por PK).
- **Reportar contagens** (órgãos, editais homologados vs abertos, com/sem segmento) e tamanho do banco.

**🚦 Como testo:** abro o Supabase Studio e vejo ~310 órgãos, ~49k editais, ~16k PCA. Dou OK → Bloco 1.

---

## BLOCO 1 — Shell + Minha Empresa (Raio-X por CNPJ + Vigia de certidões)
*(só comece após meu OK do Bloco 0)*

**Escopo:**
1. **Shell:** layout com sidebar navy (#0F1729, primário #0B2D89) + topbar. Itens de menu: Dashboard, Radar, Kanban, Minha Empresa, Consultor, Configurações (telas ainda podem ser stub).
2. **Onboarding por CNPJ:** campo CNPJ → consulta **BrasilAPI** (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`, pública, sem chave) → preenche razão social, CNAE principal+secundários, porte, município/UF, situação cadastral. Salvar em tabela `company` (com RLS por tenant — esta é tabela de cliente, não catálogo).
3. **Nichos:** mapear o CNAE para os segmentos do sistema (hospitalar/expediente/pragas + genérico) e perguntar se quer adicionar outro nicho manual.
4. **Vigia de certidões:** cadastro manual de certidões (fiscal federal, FGTS, trabalhista, estadual, municipal, + licença/alvará/atestado) com data de vencimento → semáforo **ATIVO / A_RENOVAR (≤30d) / VENCIDO**. (Emissão automática é roadmap; agora é cadastro + alerta.)
5. **Prontidão:** % de certidões válidas → card de "Prontidão da empresa".

**Régua:** `company` e `certidao` são tabelas de tenant → **RLS obrigatória** (muralha de dados, isolada do MeuJurídico). BrasilAPI é leitura pública, sem segredo.

**🚦 Como testo:** digito um CNPJ real → vejo o Raio-X preenchido (razão social, CNAE, porte) + as certidões com semáforo + o % de prontidão. Você PARA para eu aprovar a tela.

---

## Depois (não construir ainda — só pra você saber a direção)
Bloco 2 Radar (Pilar A) · Bloco 3 Dossiê · Bloco 4 Kanban+Alertas · Bloco 5 Dashboard · Bloco 6 Consultor Jurídico (análise). Detalhe de cada um em `docs/03-ROADMAP-MODULAR.md`. Um bloco por vez, sempre com STOP e teste.

## NÃO fazer agora
- NÃO baixar documentos/PDF (endpoint `/arquivos`) — on-demand, bloco futuro.
- NÃO construir Decisores, Concorrência, Análise Executiva completa, emissão automática de certidão, nem geração de peça processual — são roadmap gated.
- NÃO inflar o Kanban para 10 colunas — máximo 4–5.
