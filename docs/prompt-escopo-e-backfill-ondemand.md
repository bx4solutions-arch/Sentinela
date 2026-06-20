# PROMPT — ESCOPO NO ONBOARDING + BACKFILL ON-DEMAND POR CÉLULA

Resolve a causa-raiz do "Radar vazio": hoje o harvester rodou cidades FIXAS de teste (São Paulo, Teresina). O correto é colher a **região real do usuário**, sob demanda, do PNCP. Régua de autoteste + DoD visual valem.

---

## CONCEITO — duas camadas (não confundir)
- **Camada 1 (metadados) — automática, ao escolher o escopo:** ao marcar uma cidade no onboarding, o sistema **colhe os METADADOS das licitações** daquela cidade no PNCP (órgão, objeto, valor, modalidade, datas, situação, link). **Sem documento.** Popula o Radar.
- **Camada 2 (documentos) — sob demanda, por licitação:** documentos (edital/anexos/TR/ETP) só baixam quando o usuário abre uma licitação e clica "baixar/analisar" (checklist `/arquivos`). Já especificado no Q5.

---

## PARTE 1 — Onboarding: escolher escopo (UF → cidades)
- Novo passo no wizard: **escolher o Estado (UF)** → depois **marcar as cidades** que a empresa quer atender (busca por nome; aceita várias).
- Salvar o escopo no perfil (tabela de células monitoradas por tenant): `{uf, municipio, codigo_ibge}` por cidade.
- O nicho já vem do CNAE (mantém).

## PARTE 2 — Backfill on-demand de metadados (automático, em background)
- Ao adicionar uma cidade que **não está** no DataLake: **enfileirar um job de coleta** (worker) que roda o harvester para aquele `codigoMunicipioIbge` no PNCP → grava metadados em `raw_editais`/`orgao`.
- **Cidade já presente** no banco: **reuso imediato**, não re-coleta (economia de célula).
- **Estado da célula:** `pendente → coletando → pronta` (tabela `celula`/`cell`). UI mostra "Carregando histórico de [cidade]…" enquanto coleta; avisa quando pronta.
- Coleta **município-level** (todos os editais da cidade, todos os setores) → reusável por qualquer nicho. O **filtro por nicho/CNAE é na query do Radar** (funil de classificação), não no harvest.
- **Janela:** editais **abertos + histórico recente** (sugestão: últimos 24 meses) para alimentar histórico/recompra. Não baixar documento nesta fase.
- Rodar em **background** (não travar o onboarding). PNCP é instável → reusar retry/checkpoint/canary do harvester existente.

## PARTE 3 — Radar/licitação mostram a ficha COMPLETA (metadados)
- Card e tela da licitação exibem **toda a metadata disponível** do PNCP (órgão, unidade, objeto, valor estimado, modalidade, critério, datas de abertura/encerramento, situação, fonte + link oficial) — **mesmo sem documento baixado**.
- Botão "Adicionar à análise / Baixar documentos" leva à Camada 2 (Q5).

---

## Stopgap aceitável enquanto a célula coleta
- Filtro por **UF** como escopo-padrão (empresa de Santos pode atender SP) **é ok como default** — MAS deixar claro na tela que é "estado de SP" e que a cidade específica está sendo coletada. Não usar UF pra esconder que a cidade do usuário não foi colhida.

## Autoteste (DoD visual)
- Onboarding: escolher SP → marcar **Santos** → ver o estado "coletando" → após o backfill, **Radar popula com editais de Santos** (screenshot da tela populada).
- Reuso: marcar **São Paulo** (já no banco) → popula **na hora**, sem novo backfill.
- Licitação: card mostra ficha completa de metadados + link PNCP, sem documento baixado.
- Build/lint/typecheck verdes, console limpo.

## Não fazer
- Não baixar documentos no backfill de escopo (só metadados).
- Não colher "o Brasil inteiro" — só as células (cidade × nicho-no-DB) que o usuário pediu.
- Não forjar dado de cidade não coletada — mostrar "coletando".
