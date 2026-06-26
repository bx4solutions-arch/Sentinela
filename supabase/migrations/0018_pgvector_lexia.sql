-- ============================================================================
-- 0018 — Base de Conhecimento jurídica (RAG): pgvector + lexia_corpus + busca
-- lexia_corpus = corpus FEDERAL COMPARTILHADO (legislação/jurisprudência de
-- licitação) — NÃO é tenant-scoped (a Lei 14.133 vale para todos). Leitura
-- liberada a qualquer usuário autenticado. Seed = 18 artigos-chave da Lei 14.133.
-- embedding começa NULL; é populado pelo backfill (gate de custo, com OK).
-- ============================================================================
create extension if not exists vector;

create table if not exists lexia_corpus (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,            -- 'lei_federal','tcu','seges','agu','cgu'
  type        text not null,            -- 'artigo','acordao','instrucao_normativa','decreto','documento'
  title       text not null,
  content     text not null,
  date        date,
  url         text,
  embedding   vector(1536),             -- OpenAI text-embedding-3-small (regerado no Sentinela)
  metadata    jsonb default '{}'::jsonb,
  criado_em   timestamptz default now(),
  unique (source, title, date)
);
create index if not exists ix_lexia_source on lexia_corpus(source);
create index if not exists ix_lexia_type   on lexia_corpus(type);
-- índice vetorial (ivfflat cosine) criado após o backfill ter dados; aqui fica o de texto.
create index if not exists ix_lexia_title_trgm on lexia_corpus using gin (title gin_trgm_ops);

alter table lexia_corpus enable row level security;
do $$ begin
  create policy lexia_read_authenticated on lexia_corpus for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- Busca semântica por cosseno (recebe o embedding da pergunta, retorna top-K)
create or replace function match_lexia(query_embedding vector(1536), match_count int default 6)
returns table (id uuid, source text, type text, title text, content text, url text, similarity float)
language sql stable as $$
  select l.id, l.source, l.type, l.title, l.content, l.url,
         1 - (l.embedding <=> query_embedding) as similarity
  from lexia_corpus l
  where l.embedding is not null
  order by l.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------- Seed: 18 artigos-chave da Lei 14.133/2021 (texto limpo) ----------------
insert into lexia_corpus (source, type, title, content, date, url) values
('lei_federal','artigo','Lei 14.133/2021 — Art. 1°: Objeto e Âmbito de Aplicação','Esta Lei estabelece normas gerais de licitação e contratação para as Administrações Públicas diretas, autárquicas e fundacionais da União, dos Estados, do Distrito Federal e dos Municípios, e abrange os órgãos dos Poderes Legislativo e Judiciário da União, dos Estados e do Distrito Federal e os órgãos do Poder Legislativo dos Municípios, quando no desempenho de função administrativa.','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Art. 6°, XXIII: Estudo Técnico Preliminar (ETP)','Estudo Técnico Preliminar: documento constitutivo da primeira etapa do planejamento de uma contratação que caracteriza o interesse público envolvido e a sua melhor solução e dá base ao anteprojeto, ao termo de referência ou ao projeto básico a serem elaborados caso se conclua pela viabilidade da contratação. (Art. 6°, XXIII)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Art. 6°, XXVI: Termo de Referência','Termo de Referência: documento necessário para a contratação de bens e serviços, que deve conter os parâmetros e elementos descritivos suficientes para caracterizar o objeto da licitação, elaborado a partir de estudos técnicos preliminares, e que possibilite a avaliação do custo pela administração diante de orçamento detalhado, considerando os preços de mercado, os métodos, a estratégia de suprimento e o prazo de execução. (Art. 6°, XXVI)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Art. 6°, XIV: Documento de Formalização da Demanda (DFD)','Documento de Formalização da Demanda: documento que formaliza e justifica a necessidade da contratação. Primeira fase do planejamento, deve indicar objeto, quantidade estimada, justificativa da necessidade e a previsão no Plano de Contratações Anual. (Art. 6°, XIV)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Art. 11: Objetivos das Licitações','O processo licitatório destina-se a: I — assegurar a seleção da proposta apta a gerar o resultado mais vantajoso, inclusive quanto ao ciclo de vida do objeto; II — assegurar tratamento isonômico e justa competição; III — evitar sobrepreço, preços inexequíveis e superfaturamento; IV — incentivar a inovação e o desenvolvimento nacional sustentável. (Art. 11)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Arts. 14-15: Condições de Participação e Vedações','É vedado participar de licitações: servidor ou empregado do órgão contratante; pessoa jurídica cujos dirigentes/sócios sejam servidor do órgão licitante; pessoa declarada inidônea ou impedida de licitar; entidade com falência decretada. Pessoas físicas e jurídicas que atendam às exigências do edital poderão participar. (Arts. 14-15)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Art. 18: ETP — Obrigatoriedade e Conteúdo','A fase preparatória é caracterizada pelo planejamento. O ETP deve demonstrar: descrição da necessidade; previsão no PCA; requisitos; estimativas de quantidades; levantamento de mercado; estimativa de valor; descrição da solução; justificativa de parcelamento; resultados pretendidos; providências prévias; impactos ambientais; e posicionamento conclusivo sobre a viabilidade. (Art. 18)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Arts. 33-40: Critérios de Julgamento','Critérios de julgamento: I — menor preço; II — maior desconto; III — melhor técnica ou conteúdo artístico; IV — técnica e preço; V — maior lance (leilão); VI — maior retorno econômico. Menor preço = menor dispêndio, atendidos os parâmetros mínimos de qualidade do edital. Técnica e preço quando a qualidade técnica for relevante. (Arts. 33-40)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Arts. 54-57: Modalidades de Licitação','Modalidades: I — pregão (obrigatório para bens e serviços comuns); II — concorrência (bens/serviços especiais e obras de engenharia); III — concurso; IV — leilão; V — diálogo competitivo (inovação, impossibilidade de especificação prévia, soluções inovadoras). (Arts. 54-57)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Art. 56: Modos de Disputa','Modos de disputa: I — aberto (lances públicos e sucessivos, crescentes ou decrescentes); II — fechado (propostas em sigilo até a divulgação); III — combinação de aberto e fechado. (Art. 56)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Art. 59: Proposta — Validade e Inexequibilidade','Validade das propostas: 60 dias, salvo prazo diferente no edital. Desclassifica-se proposta acima do valor máximo ou manifestamente inexequível. Inexequível: valor inferior a 75% do valor orçado, ou valor global inferior a 80% da média das propostas superiores a 50% do valor orçado. (Art. 59)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Arts. 62-70: Habilitação','Habilitação: jurídica, técnica, econômico-financeira, e regularidade fiscal, social e trabalhista (FGTS, INSS, tributos). Vedado exigir documentos além dos autorizados em lei. Documentos de habilitação exigidos apenas do licitante vencedor; o SICAF é registro cadastral da União. (Arts. 62-70)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Arts. 72-75: Dispensa e Inexigibilidade','Dispensa: obras/serviços de engenharia até R$100.000; outros serviços e compras até R$50.000; emergência/calamidade. Inexigibilidade (inviabilidade de competição): fornecedor exclusivo; profissional artístico; serviços técnicos especializados de natureza intelectual com notória especialização (vedada para publicidade). (Arts. 72-75)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Art. 92: Cláusulas Obrigatórias do Contrato','Cláusulas necessárias: objeto; regime de execução; preço e pagamento, reajuste; prazos; crédito orçamentário; garantias; direitos/responsabilidades e penalidades; casos de rescisão; obrigação de preposto; vinculação ao edital e à proposta; legislação aplicável; obrigações trabalhistas, previdenciárias e FGTS. (Art. 92)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Arts. 114-124: Alterações Contratuais e Reajuste','Contratos podem ser alterados por acordo (reequilíbrio) ou unilateralmente pela Administração (modificação de projeto, acréscimo/supressão). Limites unilaterais: até 25% para acréscimos/supressões; até 50% para reforma. Reajuste após 12 meses da data do orçamento/proposta, pelo índice do edital. (Arts. 114-124)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Art. 141: Pagamento — Prazo Máximo','Pagamento em prazo não superior a 30 dias da apresentação da nota fiscal atestada pelo gestor. Precedido de consulta ao SICAF. Em atraso, incidem juros moratórios e atualização monetária. (Art. 141)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Arts. 155-163: Infrações e Sanções','Sanções: I — advertência; II — multa moratória (até 0,5%/dia, por até 10 dias) e compensatória (até 10% do contrato); III — impedimento de licitar (até 3 anos); IV — inidoneidade (3-6 anos). Infrações: inexecução; documentação falsa; comportamento inidôneo; fraude. Defesa prévia 15 dias úteis; publicação no CEIS/CNEP em 15 dias úteis. (Arts. 155-163)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'),
('lei_federal','artigo','Lei 14.133/2021 — Art. 169: Gestão e Fiscalização do Contrato','Execução acompanhada e fiscalizada pelo gestor ou comissão de fiscalização. O gestor anota as ocorrências e comunica providências ao contratado. Em descumprimento, instaura-se processo sancionatório com contraditório e ampla defesa. (Art. 169)','2021-04-01','https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm')
on conflict (source, title, date) do nothing;
