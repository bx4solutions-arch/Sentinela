# SENTINELA — RASPAGEM SmartLic: conteúdo, ferramentas e estratégia de SEO
### Inventário classificado do site do concorrente + o que replicar e superar

> Fonte: smartlic.tech (rodapé = sitemap completo) + página da calculadora, jun/2026. Objetivo: mapear o motor de SEO/aquisição deles para a gente construir o nosso (melhor).

---

## 1. Mapa completo do site (classificado)

### 🛠️ Ferramentas gratuitas (o motor de SEO + lead-gen) — PRIORIDADE
| Página | URL | O que é | Réplica nossa |
|---|---|---|---|
| Calculadora de Oportunidades | /calculadora | "Quanto você está perdendo?" — setor × UF → nº de editais perdidos. **Sem cadastro + embed iframe** | ✅ construir |
| Observatório de Licitações | /observatorio | Painel público de dados/tendências | ✅ |
| Consulta CNPJ B2G | /cnpj | Perfil B2G de um CNPJ | ✅ (puxa MCP-Brasil) |
| Glossário de Licitações | /glossario | Dicionário de termos (SEO long-tail) | ✅ |
| Dados de Licitações | /dados | Dataset público navegável | ✅ |
| Estatísticas Citáveis | /estatisticas | Números prontos para jornalista/blog citar (gera backlink) | ✅ |
| Comparador de Editais | /comparador | Compara 2 editais | ✅ |
| Casos de Sucesso | /casos | Prova social | ✅ |
| Demo Interativo | /demo | Demonstração sem login | ✅ |

### 📄 Conteúdo pilar (SEO de intenção)
`/como-avaliar-licitacao` · `/como-evitar-prejuizo-licitacao` · `/como-filtrar-editais` · `/como-priorizar-oportunidades` · `/perguntas` (FAQ)

### 🗂️ SEO programático por setor (20 páginas)
`/licitacoes` + `/licitacoes/{setor}` (saúde, informatica, engenharia, alimentos…). **Os 20 setores deles** (taxonomia pronta para a gente usar):
Vestuário e Uniformes · Alimentos e Merenda · Hardware/Equip. TI · Mobiliário · Papelaria/Escritório · Engenharia/Projetos/Obras · Desenvolvimento de Software · Licenciamento de Software · Serviços Prediais/Facilities · Limpeza e Higienização · Medicamentos/Farma · Equipamentos Médico-Hospitalares · Insumos Hospitalares · Vigilância/Segurança · Transporte de Pessoas/Cargas · Frota e Veículos · Manutenção Predial · Engenharia Rodoviária · Materiais Elétricos · Materiais Hidráulicos/Saneamento.

### 📰 Blog
`/blog` + categorias `Empresas B2G` e `Consultorias de Licitação`. (Para raspar TODOS os artigos: puxar `smartlic.tech/sitemap.xml` — dá a lista completa de URLs de uma vez.)

### 💼 Produto/comercial
`/planos` · `/consultoria-b2g` (Radar B2G) · `/sobre` (+ /sobre#metodologia) · `/stack` · `/features` · `/signup` · `/planos` · tier "SmartLic Command" (war room — em breve).

---

## 2. A estratégia de aquisição deles (decodificada)

O funil é claro e a gente copia inteiro:

```
Ferramenta grátis SEM cadastro (calculadora, glossário, observatório)
   → captura de email (newsletter por setor)
   → trial 14 dias sem cartão
   → plano pago (R$297–997)
```

Três alavancas de SEO que valem ouro:
1. **Free tools no-signup** rankeiam e capturam lead (a calculadora é a isca principal).
2. **Embed iframe** da calculadora ("incorpore no seu site") = **backlinks de graça** de blogs de terceiros → autoridade de domínio. Sacada forte.
3. **SEO programático**: 20 setores × páginas de conteúdo × glossário = milhares de páginas long-tail (os "10k+ páginas" do case study).
4. **Estatísticas Citáveis**: número pronto para jornalista citar = backlink de veículo. Genial.

---

## 3. Insight competitivo (o que mudou — atenção)

A home deles AGORA vende **"Antecipe — você vê o movimento antes do edital sair"**, com depoimento "chegamos antes do edital". **Eles entraram no discurso de antecipação.** MAS o mecanismo deles é **"contratos que vão vencer" + "padrões de compra"** = **recompra/recorrência** — o mesmo sinal que a gente já tinha. **Eles NÃO fazem a esteira pré-edital (PCA/DFD/ETP/IRP) nem prontidão.**

Tradução afiada da nossa diferença (a recompra virou terreno contestado; o resto é só nosso):
- **Esteira pré-edital completa** (PCA/IRP/ETP onde público) — além do contrato vencendo.
- **Prontidão / Passaporte** ("você está 82% pronto") — eles não têm.
- **Agente consultor jurídico** (§4 abaixo) — eles não têm.
- **Ponte com o lado comprador** (MeuJurídico) — impossível para eles.

---

## 4. O Agente Consultor Jurídico de Licitação (nosso diferencial — sua ideia)

SmartLic tem **glossário e conteúdo** sobre a lei, mas é **estático** (texto). Você está certo: o licitante que acompanha uma oportunidade **não está sozinho** — a maioria **não conhece a lei** (14.133/2021 atual; 8.666/93 é a antiga, para contratos legados). A gente tem o motor jurídico do MeuJurídico.

**Feature: consultor jurídico de licitação (chat/agente)**, dentro do dossiê da oportunidade:
- "Posso participar dessa com meu CNAE?" · "Que documentos esse edital exige?" · "Esse item de habilitação é restritivo/ilegal?" · "Como impugnar?" · "O que muda da 8.666 para a 14.133 aqui?"
- Responde com base na lei + no edital específico + nas certidões da empresa (cruza com a Prontidão).
- **Régua:** orienta, não substitui advogado; cita a base legal. Diferencial que nenhum concorrente de fornecedor tem — porque a gente já tem o cérebro jurídico do outro lado.

---

## 5. Ferramentas que NÓS vamos construir (replicar + superar)

**Replicar (paridade de SEO):** Calculadora de Oportunidades (com embed iframe — pega os backlinks), Glossário, Observatório, Consulta CNPJ, Comparador, Estatísticas Citáveis.

**Superar (o que eles não têm — nossa isca exclusiva):**
1. **Calculadora de Prontidão** — "responda 5 perguntas e veja se sua empresa está apta a licitar" (cruza certidões/CNAE). Ninguém tem.
2. **"Quando vai sair?"** — dado um órgão + objeto, estima a antecedência (com base em recorrência/contrato vencendo). A nossa tese virada ferramenta grátis.
3. **Consulta jurídica online grátis** — 1 pergunta jurídica de licitação respondida pelo agente (isca para o MeuJurídico + Sentinela).
4. **Radar de contrato vencendo por órgão** — grátis, mostra os contratos do órgão X vencendo nos próximos 180d.

---

## 6. Plano de ação SEO (ordem)
1. Definir a taxonomia de setores (usar os 20 deles como base).
2. Construir **3 free tools no-signup** primeiro: Calculadora de Oportunidades + Calculadora de Prontidão + Glossário (geram tráfego + lead).
3. Embed iframe na calculadora (backlinks).
4. SEO programático: páginas por setor × UF + conteúdo pilar (como-avaliar, como-priorizar).
5. Estatísticas Citáveis (gerar backlinks de imprensa).
6. Conectar tudo ao trial → plano.

> Nota: tudo isto é **conteúdo e estratégia** (não código deles). Para raspar 100% dos artigos automaticamente, o terminal puxa `smartlic.tech/sitemap.xml` e baixa cada URL — eu mapeei a estrutura; o sitemap dá a lista exaustiva.
