# PROMPT — BLOCO 1: CORREÇÕES (gate reprovado pelo Bione)

O Bloco 1 foi testado e tem 4 defeitos. Corrigir os 4 antes de seguir pro Bloco 2.
Régua: plan mode → mudança isolada → STOP → aprovação. Cada correção é testável.

---

## CORREÇÃO 1 — Onboarding passo a passo (hoje vai direto pro dashboard)

Após o signup (Supabase Auth), **primeiro acesso** deve cair num **wizard guiado**, não no dashboard.
Passos:
1. **CNPJ** → busca a ficha completa na BrasilAPI → exibe pra confirmar ("É essa a sua empresa?").
2. **Nichos** → mostra os nichos detectados do CNAE + permite adicionar/remover.
3. **Certidões** → mostra a **checklist obrigatória** (ver Correção 3) com status "ausente"; usuário cadastra os vencimentos que tiver. Pode pular e fazer depois.
4. **Concluir** → salva tudo no banco (company, nichos, certidao) por tenant e vai pra Minha Empresa.

- **Usuário recorrente** pula o wizard e entra direto no app (detecta se já existe `company` do tenant).
- Tudo persistido em Postgres (RLS por tenant). Nada só em memória.

**Como testo:** crio conta nova → caio no passo 1 (CNPJ), não no dashboard → caminho os 3 passos → no fim vejo a ficha salva.

---

## CORREÇÃO 2 — Minha Empresa não reabre (perfil some depois de fechar)

A rota **Minha Empresa** deve **carregar a company do banco a cada visita** (server component lendo por tenant), não depender de estado em memória do onboarding.
- Botão "Atualizar" re-consulta a BrasilAPI e atualiza a ficha.
- **Shell:** mostrar identidade da empresa sempre visível (rodapé da sidebar ou topo): logo/iniciais + razão social + usuário logado. Hoje só aparece "TN" no canto.

**Como testo:** abro Minha Empresa, fecho, navego pra outra tela, volto em Minha Empresa → a ficha continua lá, carregada do banco.

---

## CORREÇÃO 3 — Prontidão calibrada (hoje dá 100% com 1 doc — ERRADO)

Prontidão **não** é "válidas ÷ cadastradas". É **válidas ÷ obrigatórias aplicáveis**, com ausente contando como gap.

**Checklist obrigatória (base, todo licitante — Lei 14.133 habilitação):**
1. CND Federal (Receita/PGFN unificada)
2. CRF / FGTS (Caixa)
3. CNDT (trabalhista — TST)
4. CND Estadual
5. CND Municipal
6. Falência / Recuperação Judicial (cível)

**Setoriais por nicho** (ex. controle de pragas): Licença Sanitária/Vigilância · Licença Ambiental · Responsável Técnico (CRQ/CRBio).

**Cálculo:** cada item aplicável tem status `válida` (não vencida) / `a_renovar` (≤30d, conta como válida + alerta) / `vencida` (0) / `ausente` (0).
`prontidão = itens_válidos ÷ itens_aplicáveis` (em %).

→ Com só a Licença Sanitária cadastrada e as 6 fiscais ausentes, a prontidão tem que dar **~13–15%**, nunca 100%. 100% só quando **todas** as obrigatórias aplicáveis estiverem presentes e válidas.

Mostrar na tela: o **percentual real** + a **lista das obrigatórias com semáforo** (incluindo as ausentes em vermelho "Ausente"), pra ficar claro o que falta.

**Como testo:** com 1 doc cadastrado, vejo prontidão baixa (~15%) e a lista mostrando as fiscais como "Ausente".

---

## CORREÇÃO 4 — Ficha completa da empresa (hoje vem pobre)

Renderizar **tudo** que a BrasilAPI (`/cnpj/v1/{cnpj}`) devolve. Campos obrigatórios na ficha:

**Identificação:** razão social · nome fantasia · CNPJ · matriz/filial · situação cadastral + **data da situação** (= última movimentação) · **data de início de atividade** (abertura) · natureza jurídica · porte · **capital social** · optante Simples/MEI.
**Endereço completo:** logradouro, número, complemento, bairro, município, UF, CEP.
**Contato:** telefone (ddd_telefone_1) · e-mail (se vier).
**Atividades:** CNAE principal (código + descrição) + **TODOS os CNAEs secundários** com descrição (hoje mostra só a contagem).
**Sócios (QSA):** nome do sócio + qualificação (dado público da Receita; é a própria empresa do cliente, ok exibir).
**Nichos:** derivados do CNAE (principal + secundários).

Layout sugerido: bloco "Identificação" + bloco "Endereço & contato" + bloco "Atividades (CNAEs)" + bloco "Quadro societário" + card lateral "Prontidão". Denso, command-center.

- Rotular **certo**: razão social ≠ nome fantasia (campos separados e nomeados).
- **Remover o banner "Dados ILUSTRATIVOS (mock)"** desta tela — o dado do CNPJ é real (BrasilAPI).

**Como testo:** digito um CNPJ e vejo a ficha completa — capital social, abertura, endereço, todos os CNAEs, sócios — sem campo faltando.

---

## NÃO fazer agora
- Não construir Radar/Dossiê (Bloco 2+).
- Não automatizar emissão de certidão (roadmap) — aqui é cadastro + checklist + semáforo.
- Prontidão "por oportunidade quente" (cruzar com edital) é Bloco 3 — agora é só a prontidão geral contra a checklist obrigatória.
