# RELATÓRIO DE SESSÃO — 2026-06-21 (autônomo): Pasta-rainha + sinais reais + zero botão fake

Régua de autoteste: cada item provado pelo RESULTADO (mudou estado? salvou? navegou?), não pela presença.
Aditivo, **sem push**, sem segredo, IA paga só via BYOK. graphify usado para navegar; `graphify update .` após editar.

## T1 — Pasta Inteligente = tela-rainha, dado REAL (MATA O MOCK) ✅
- A Pasta (`app/(shell)/licitacao/[id]`) **não importa `mock.ts`** — carrega a licitação real do banco.
- **Resumo Executivo DETERMINÍSTICO do `payload` jsonb** (sem IA): Identificação, Órgão (poder/esfera/UF),
  Datas/Prazos (abertura/encerramento), Modalidade/Modo de Disputa/SRP, Valores, Situação, Amparo Legal,
  Fontes Orçamentárias. **Cacheado** em `licitacao.resumo_json` (migration 0011, abre instantâneo).
- **Empresa × Edital** e **Veredito calibrado** DETERMINÍSTICOS (cruza checklist Lei 14.133 × documentos da
  empresa → apto/ressalvas/não apto + % pronto; disclaimer probabilístico). IA **enriquece**, não substitui.
- Seções que exigem o texto do edital (habilitação específica, garantias, penalidades, análise crítica) =
  **"em ingestão"** (Camada 2 / IA) — não forjadas. CAPAG idem.
- Autoteste `e2e/autotest-pasta.mjs`: **9/9** (resumo determinístico, dado real não-mock, empresa×edital,
  veredito, `resumo_json` cacheado, console limpo). Screenshot `e2e/shots/PASTA-resumo.png`.

## T2 — Radar/card com sinais REAIS + urgência ✅
- Card lidera com badges de sinal (só os com dado): **prazo apertado** (`data_encerramento`), **órgão
  recorrente** (histórico homologado no nicho), **suspensa** (pode republicar). Banner **"certidão
  impeditiva"** (obrigatória vencida da empresa). Sem dado (deserta/contrato-vencendo/baixa-concorrência) =
  **não renderiza** (em ingestão).
- Ações reais: **Analisar → cria workspace** (Pasta), **Monitorar → Kanban**, **Descartar + motivo** (salva
  `oportunidade.motivo`). Autoteste `e2e/autotest-sinais.mjs`: **4/4**.

## T3 — Visual sem verde ✅ (substância > forma)
- Paleta global **navy `#0B2D89` · azul `#3C83F6` · âmbar `#F59F0A` · vermelho `#DC2626` — ZERO verde**
  (aplicada na sessão anterior; mantida). Card com urgência em destaque.

## T4 — Coletar contratos 🔇 BLOQUEADO
- PNCP `/contratos` retorna **400** para os órgãos (ver `BLOQUEIOS.md`). Sinal "contrato vencendo" segue
  "em ingestão". Pulei conforme a régua.

## DoD #2 — Inventário de botões (✅ real / 🔇 desabilitado "em breve" / ❌ removido)
| Tela | Botão | Estado |
|---|---|---|
| Pasta | Monitorar · Imprimir (window.print) · Excluir · Edital no PNCP · Add/Remover doc · Tabs | ✅ |
| Pasta | Analisar com IA | ✅ com BYOK / vira link "Ligar IA" sem chave |
| Pasta | .docx · E-mail | 🔇 desabilitado "em breve" |
| Radar | Monitorar · Descartar+motivo · Adicionar à análise · Monitorar cidade · CityPicker | ✅ |
| Dashboard | KPIs (links) · Atacar hoje Monitorar/Analisar · Ver Radar | ✅ |
| Kanban | Mover ←/→ · Descartar | ✅ |
| Minha Empresa | Atualizar · Trocar empresa (modal) · Add/Remover doc · "Outro…" | ✅ |
| Configurações | Provedor/Modelo/Chave + Salvar | ✅ |
**Nenhum botão clicável-e-morto.**

## Gates respeitados
Migrations só aditivas (0011) · **sem git push** (commits locais) · sem mexer em `.secrets`/`.env` · IA paga
só BYOK. Commits: `23a26f9` (T1) · `82e6f2c` (T2).
