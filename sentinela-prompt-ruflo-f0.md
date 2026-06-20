# COMANDO RUFLO — GATE F0 (Sprint 2) · célula controle-de-pragas × São Luís/MA

> Cole o bloco abaixo no Claude Code **depois de reiniciar a sessão** (com o MCP `ruflo` conectado — confirme em `/mcp`).
> Régua herdada de `sentinela-prompt-ruflo.md`: trabalhe em PT, status binário 🟢/🔴, **sem heredoc**, **PARE no gate**.

---

@ruflo Execute o **Gate F0 do Projeto Sentinela** em paralelo. Célula de referência: **controle de pragas × São Luís/MA**.

Antes de tudo, leia como autoridade: `docs/sentinela-prd-blueprint.md` (§6 Dossiê, §7 Índices, §12 Métricas, §13 Riscos) e `docs/sentinela-f0-gate-protocol.md` (os cortes G1–G4 e a matriz de veredito). O coletor de matéria-prima já existe em `worker/f0_pull.py` (somente leitura de API pública PNCP, sem token). Reuse-o; não reescreva conector que já temos.

Suba **4 agentes simultâneos**, cada um numa frente. Cada agente entrega números + evidência (amostra `n`, fonte por campo), nunca prosa solta:

- **AGENTE 1 — G1 Granularidade do PCA.** Medir % de itens do PCA da célula com descrição utilizável (item + CATMAT/CATSER + valor estimado + janela). Piso proposto **≥ 70%**. Reportar % e exemplos de itens "serviços diversos" que falham.

- **AGENTE 2 — G2 Esteira quente (o teste da tese).** Dos editais que a célula gerou na janela, em quantos havia **ETP ou IRP rastreável publicado ANTES** do edital com lead time > 0. Piso proposto **≥ 50%**. Quebrar por estágio: % precedido de DFD / de ETP / de IRP e o **lead time mediano** de cada. Ao lado (informacional, não reprova): conversão PCA→edital e DFD→edital.

- **AGENTE 3 — G3 Dossiê + G4 Matching.** G3: % dos campos do Dossiê (§6) preenchíveis com dado público + fonte (**piso PRD > 80%**). G4: acerto do mapeamento item→célula→cliente (**piso PRD > 80%**, gate duro). Para cada um, listar os campos/itens que falham e a causa (fonte não tem o dado vs. parser não pega).

- **AGENTE 4 — Validação técnica + amostra.** Rodar/auditar `worker/f0_pull.py`: paginação, dedupe entre sinônimos (`OBJETO_QUERIES`), tempo de backfill (informacional, meta < 10 min), e o **n** da amostra (editais/contratos da célula). Alertar se n < 30–50 (veredito provisório por ruído amostral).

**Síntese:** consolidar os quatro resultados em `docs/f0-materia-prima.md` com a tabela dos gates (G1–G4 + n + métricas informacionais) e aplicar a **matriz §2** do protocolo → cenário **A (segue) / B (conserta) / C (dado limpo)**.

**STOP no gate.** Não modele a entidade `demand` nem conecte Compras.gov (Sprint 3). Ao terminar, reporte:
1. tabela G1–G4 com 🟢/🔴 por gate,
2. o `n` da amostra e se o veredito é firme ou provisório,
3. o cenário (A/B/C) com o plano §3 correspondente,
e **aguarde minha decisão** sobre os dois pisos de calibração (granularidade ≥70%? esteira quente ≥50%?) antes de qualquer próximo passo.
