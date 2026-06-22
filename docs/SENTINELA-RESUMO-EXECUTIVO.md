# SENTINELA — RESUMO EXECUTIVO
*Plataforma de inteligência antecipatória de contratações públicas · jun/2026*

---

## 1. O que é
O Sentinela é uma plataforma de **inteligência comercial, jurídica e operacional para empresas que vendem (ou querem vender) ao governo**. Em vez de só "entregar editais" como os concorrentes, ele encontra a oportunidade, lê todo o processo com IA, cruza com a realidade da empresa do cliente e entrega uma **decisão executiva**: vale participar? está apto? onde está o risco? quem ganhou antes e por quanto? qual o plano até o contrato?

> **Frase-âncora:** "Enquanto os outros entregam o edital, o Sentinela entrega o dossiê, o veredito e o plano de ação."

## 2. A tese (o diferencial defensável)
O concorrente vive do **edital publicado** (reage). O Sentinela vive do **pré-edital** (antecipa). O órgão deixa rastro obrigatório antes de comprar — PCA, contrato vencendo, recorrência, fracassos/republicações. Monitorar essa esteira é ver a contratação se formar **meses antes**. Quatro pilares:
1. **Antecipação** — sinais pré-edital (o que ninguém entrega).
2. **Pasta Inteligente da Licitação** — resumo executivo + veredito calibrado + cruzamento empresa × edital + prontidão.
3. **CRM da venda ao governo** — perfil do órgão, histórico, concorrência e (roadmap) decisores institucionais.
4. **Consultor jurídico de licitação** — reuso do motor do MeuJurídico (produto irmão), com corpus da Lei 14.133 + jurisprudência.

## 3. Mercado e concorrência
Líder de referência: **ConLicitação / linha Effecti** — suíte madura pós-edital (busca, resumo IA, gestão, robô de lance, chat). Engenharia reversa feita: eles têm IA de resumo, perguntas estratégicas, peças (Dr. Licita), CAPAG, sinais de "deserta/baixa concorrência". **Não competimos no terreno deles** (robô de lance / chat de sessão = operação, risco legal/ToS). Vencemos na **antecipação + veredito + fit empresa×edital + inteligência de mercado**, com UI mais limpa (sem o excesso de marketing/upsell deles).

## 4. Arquitetura
- **DataLake próprio:** o harvester coleta do **PNCP** para o nosso Supabase (não consulta a API instável em tempo real). Coleta **on-demand por célula** (cidade × nicho): o servidor nasce vazio, enche quando há cliente, e o dado é **reusado** entre clientes da mesma célula (economia de margem).
- **Stack:** Next.js 16 + Supabase (Postgres/RLS multi-tenant) + worker Python (harvester/backfill) + IA **BYOK** (o cliente liga o provedor/modelo que quiser — Anthropic/OpenAI/Google — custo dele, lock-in zero).
- **Resumo pré-computado + cacheado:** determinístico onde dá (payload do PNCP, CAPAG do Tesouro), IA só na camada interpretativa, gerado **1x por edital** e reusado — rápido e barato.

## 5. Estado atual (honesto)
**Construído e provado (dado real, não mock):**
- Base no Supabase: **raw_editais 53.433 · raw_pca 17.357 · orgao 321**; cidade real de Santos coletada (3.944 editais).
- **Mock morto** (verificado): São Luís de mentira removido; todas as telas puxam do banco real.
- **Telas funcionais:** Onboarding por CNPJ (BrasilAPI), Minha Empresa (Raio-X + Vigia de certidões + prontidão), Radar (sinais reais + urgência), **Pasta Inteligente** (resumo determinístico + veredito calibrado com disclaimer), Kanban, Configurações (BYOK), Dashboard.
- **Integração back↔front provada:** 8/8 conexões reais, ações gravam no registro/rota certos, RLS isola tenant (autoteste de integração 12/12).

**Pendente (mapeado, sem maquiagem):**
- **Suíte de testes:** o teste de integração passa; testes antigos estavam dando falso-negativo (selecionavam botão errado) — correção em andamento (auditoria cruzada Codex confirmada).
- **Sinais data-gated:** contrato vencendo (endpoint PNCP a destravar), baixa concorrência, decisores, concorrência, análise de mercado — marcados "em ingestão", não forjados.
- **Forma:** visual ainda mais limpo que rico — falta portar o alvo command-center.

## 6. Riscos e réguas inegociáveis
- **Probabilidade, nunca promessa** — veredito calibrado + disclaimer, jamais "vitória garantida".
- **LGPD** — só dado público institucional (nome+cargo+canal), nunca CPF/pessoal.
- **Não virar Effecti** — sem robô de lance / chat de sessão no núcleo (terreno operacional, risco legal).
- **Peça processual travada** — impugnação/recurso só com disclaimer + validação jurídica.
- **Anti-dispersão** — produto enxuto; cada ideia é classificada núcleo/roadmap/risco/corte.
- **Cresce por célula** — o limite de células por plano protege a margem.

## 7. Roadmap
- **Fase 0–1 (feito):** DataLake + ingestão + os 2 pilares (Licitação do Dia + Antecipação) sobre dado real + Pasta + Minha Empresa + BYOK.
- **Fase 2:** destravar contratos (sinal "contrato vencendo"), inteligência de mercado, concorrentes, decisores (2ª fonte), visual rico, Gerenciar Licitações.
- **Fase 3:** aquisição (SEO/free tools), planos/billing, escala por célula.

## 8. Modelo de negócio
Planos por nº de células (setor × região) monitoradas: **Radar R$297 · Inteligência R$697 · Sala de Guerra R$1.800**. KPI-chave de margem: **custo de backfill por célula ÷ nº de assinantes da célula**. Monetização futura: seguro-garantia (parceria), consultoria, peças jurídicas premium.

## 9. Veredito estratégico
O produto **não está longe tecnicamente** — a fundação (dado real, integração provada, IA configurável) está de pé e validada. Está longe na **embalagem operacional**: falta forma rica e os módulos de inteligência que dependem de mais dado. O diferencial — **antecipar + decidir, não só achar** — é real e defensável, e o dado que o sustenta (17k PCA, histórico, recorrência) **já está no banco**. O caminho não é refazer; é **ligar o que já existe e empacotar como serviço.**
