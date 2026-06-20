# SENTINELA — REMODELAGEM UI/UX (modelada no ConLicitação)
### Decisão do Bione: clonar de perto a estrutura/visual do ConLicitação · arquitetura primeiro, mockups depois.
### 2 não-negociáveis: (1) nossos diferenciais (antecipação/veredito/prontidão) em destaque; (2) sem a poluição deles (banners/pop-ups de marketing).

---

## 1. LINGUAGEM VISUAL (clonada — mas SEM VERDE)
- **Top bar escura** (navy `#0F1729`/`#1a2b4a` — nossa cor-assinatura `#0B2D89`).
- **ZERO VERDE** (regra do Bione). Paleta: **primário navy `#0B2D89`** · **ação/botões azul `#3C83F6`** · **alerta âmbar `#F59F0A`** · **URGENTE/perigo/penalidade vermelho `#DC2626`** · neutros slate.
- **Área de conteúdo branca**, cards com borda leve, densos.
- **Badges de status:** NOVA (azul), URGENTE (vermelho), BETA (navy escuro), Novo (azul) — nada verde.
- **Botões de ação** em linha **azul/navy** (sem verde/teal), com ícone "IA" nas ferramentas de IA.
- Tipografia limpa (Inter). Ícones lineares.

## 2. NAVEGAÇÃO GLOBAL (clonada, podada pro nosso escopo)
**Top bar:** `[logo Sentinela] Dashboard · Ferramentas(▾ mega-menu)` ···· `[Assinar/Plano] [Consultor Jurídico (IA)] [💬] [🔔] [Ajuda] [avatar]`

**Mega-menu "Ferramentas"** (espelha as categorias deles, cortando o que é turf/serviço):
| Categoria | Nossas ferramentas |
|---|---|
| **Inteligência Artificial** | Consultor Jurídico · Resumo do Edital · Pergunte ao Edital · *(Peças — travado/roadmap)* |
| **Oportunidades** | Radar (Encontrar Licitações) · **Antecipação (pré-edital)** ← nosso · Licitações Estratégicas · Boletins |
| **Gestão** | Kanban (Gerenciar Licitações) · Minha Empresa · Gerenciar Documentos |
| **Análise Estratégica** | Análise de Mercado · Concorrentes · Ata de Registro de Preços · Contratos *(roadmap: dados)* |
| **Configurações** | Conta · **IA (BYOK: provedor+modelo+chave)** · Plano |
| ~~Automação~~ | ❌ Robô de Lance / Monitorar Chat — fora (régua #3) |
| ~~Assessoria/Treino~~ | ❌ serviço humano — fora |

## 3. INVENTÁRIO DE TELAS (estrutura deles × nosso conteúdo)

### A. Dashboard (home)
Modelo deles: grid de ferramentas + KPIs + Oportunidades + mapa. Nosso conteúdo:
- **Atalhos de ferramentas** (grid por categoria).
- **KPIs** (cards): Editais abertos no nicho · **Antecedência média** ← nosso · Quentes · **Iminência de deserta** · **Baixa concorrência** · Contratos vencendo · Prontidão · Ações urgentes.
- **Atacar Hoje** (cards com anel de score + motivo).
- **Linha do Tempo de Sinais Oficiais** ← nosso diferencial (PCA→edital).
- **Licitações por estado + mapa** (clonado).
- Pipeline por estágio.

### B. Radar / Encontrar Licitações
Modelo deles: **rail de filtros à esquerda** + cards de resultado à direita.
- Filtros: Objeto, Busca exata, **Estado/Região/Raio de atuação**, Cidade, Nº edital, Modalidade, Salvar pesquisa.
- **2 pilares** (abas): Licitação do Dia (ao vivo) · **Antecipação** (pré-edital).
- Cards = padrão de licitação (ver C).

### C. CARD DE LICITAÇÃO (o padrão central — clonado + nosso)
Header: status (NOVA/…), ⭐ favoritar, 👁 acompanhar · **+ anel de score / chip de veredito** ← nosso.
Corpo: **Objeto** · grid (Datas/Prazo · Órgão+CAPAG · Cidade · Valor estimado · Edital) · "Ver mais informações".
**Ações (linha de botões):** Ver itens · Baixar Edital · **Resumo do Edital (IA)** · **Pergunte ao Edital (IA)** · **Adicionar à análise / Acessar** · ▾ (Adicionar Tarefa · Adicionar Andamento · Remover do Gerenciamento).
**Anotações** (campo). Rodapé: Nº · Atualizada em.
**Nossos chips por cima:** Iminência · Chance · Prontidão · motivo do sinal.

### D. Resumo do Edital / Pasta Inteligente (modal/tela)
As **16 seções padrão-ouro** (já no `04-PASTA`) — cards de topo + accordion (Identificação, Órgão+CAPAG, Detalhes, Garantias, Prazos, Habilitação, Penalidades, Análise crítica…).
**Pré-computado e cacheado** (abre instantâneo). Ações: Baixar Edital · Enviar e-mail · Word (.docx) · Imprimir · Salvar.
**Nossas abas a mais:** Empresa×Edital · Veredito · Prontidão · Consultor (com Perguntas Estratégicas) · Plano de Ação · Documentos (checklist do PNCP).

### E. Minha Empresa
Ficha completa do CNPJ + Vigia de certidões (grupos: Jurídica/Fiscal/Técnica/Econômica) + gerador de declarações + prontidão.

### F. Configurações → IA
Seletor BYOK: provedor + modelo + modelo customizado + chave (criptografada).

## 4. ONDE DIVERGIMOS (inserir nossos diferenciais — em destaque, não enterrados)
- **Antecipação (pré-edital):** pilar próprio no Radar + KPI "antecedência média" + Linha do Tempo de Sinais. ELES NÃO TÊM.
- **Veredito + Empresa×Edital + Prontidão:** abas no topo da Pasta. ELES NÃO TÊM.
- **Decisores** (pregoeiro/fiscal do edital) na ficha do órgão.
- **Consultor unificado** (edital + lei + teses dinâmicas) vs os 3 separados deles.

## 5. SEQUÊNCIA DOS MOCKUPS (alvo-pixel — próxima etapa, após aprovar esta arquitetura)
1. **Card de licitação + Resumo/Pasta** (o coração — o que mais impressiona).
2. **Radar** (filtro + cards + 2 pilares).
3. **Dashboard** (grid + KPIs + mapa + sinais).
4. **Minha Empresa · Configurações(IA) · Kanban**.
Cada mockup HTML = alvo-pixel; o terminal porta 1:1 (contrato de design já vigente).
