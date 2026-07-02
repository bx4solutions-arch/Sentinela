export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_eventos: {
        Row: {
          cnpj: string
          criado_em: string
          data_hora: string
          id: string
          licitacao_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          cnpj: string
          criado_em?: string
          data_hora: string
          id?: string
          licitacao_id?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          cnpj?: string
          criado_em?: string
          data_hora?: string
          id?: string
          licitacao_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_eventos_cnpj_fkey"
            columns: ["cnpj"]
            isOneToOne: false
            referencedRelation: "empresas_cnpj"
            referencedColumns: ["cnpj"]
          },
          {
            foreignKeyName: "agenda_eventos_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          criado_em: string
          custo_usd: number
          entrada: Json
          erro: string | null
          finalizado_em: string | null
          id: string
          modelo: string | null
          org_id: string
          passos: Json
          plano: Json | null
          proposta_write: Json | null
          provider: string | null
          resposta: Json | null
          status: string
          superficie: string
          tokens_entrada: number
          tokens_saida: number
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          custo_usd?: number
          entrada?: Json
          erro?: string | null
          finalizado_em?: string | null
          id?: string
          modelo?: string | null
          org_id: string
          passos?: Json
          plano?: Json | null
          proposta_write?: Json | null
          provider?: string | null
          resposta?: Json | null
          status?: string
          superficie?: string
          tokens_entrada?: number
          tokens_saida?: number
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          custo_usd?: number
          entrada?: Json
          erro?: string | null
          finalizado_em?: string | null
          id?: string
          modelo?: string | null
          org_id?: string
          passos?: Json
          plano?: Json | null
          proposta_write?: Json | null
          provider?: string | null
          resposta?: Json | null
          status?: string
          superficie?: string
          tokens_entrada?: number
          tokens_saida?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_integracao: {
        Row: {
          acao_sugerida: string | null
          contexto_tecnico: Json
          criado_em: string
          detalhe: string | null
          fonte: string
          id: string
          integracao: string
          payload: Json
          resolvido: boolean
          run_id: string | null
          severidade: string
          titulo: string
        }
        Insert: {
          acao_sugerida?: string | null
          contexto_tecnico?: Json
          criado_em?: string
          detalhe?: string | null
          fonte?: string
          id?: string
          integracao?: string
          payload?: Json
          resolvido?: boolean
          run_id?: string | null
          severidade: string
          titulo: string
        }
        Update: {
          acao_sugerida?: string | null
          contexto_tecnico?: Json
          criado_em?: string
          detalhe?: string | null
          fonte?: string
          id?: string
          integracao?: string
          payload?: Json
          resolvido?: boolean
          run_id?: string | null
          severidade?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_integracao_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "harvester_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      atas: {
        Row: {
          assinatura: string | null
          cnpj: string
          criado_em: string
          id: string
          numero: string | null
          orgao: string | null
          saldo: Json | null
          validade: string | null
        }
        Insert: {
          assinatura?: string | null
          cnpj: string
          criado_em?: string
          id?: string
          numero?: string | null
          orgao?: string | null
          saldo?: Json | null
          validade?: string | null
        }
        Update: {
          assinatura?: string | null
          cnpj?: string
          criado_em?: string
          id?: string
          numero?: string | null
          orgao?: string | null
          saldo?: Json | null
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atas_cnpj_fkey"
            columns: ["cnpj"]
            isOneToOne: false
            referencedRelation: "empresas_cnpj"
            referencedColumns: ["cnpj"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string | null
          ator: string | null
          criado_em: string
          entidade: string | null
          id: string
          org_id: string | null
          payload: Json | null
        }
        Insert: {
          acao?: string | null
          ator?: string | null
          criado_em?: string
          entidade?: string | null
          id?: string
          org_id?: string | null
          payload?: Json | null
        }
        Update: {
          acao?: string | null
          ator?: string | null
          criado_em?: string
          entidade?: string | null
          id?: string
          org_id?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      concorrente_consultas: {
        Row: {
          ceis_cnep: boolean | null
          cnpj_consultado: string
          consultado_em: string
          id: string
          ocorrencias_tcu: Json | null
          regular: boolean | null
        }
        Insert: {
          ceis_cnep?: boolean | null
          cnpj_consultado: string
          consultado_em?: string
          id?: string
          ocorrencias_tcu?: Json | null
          regular?: boolean | null
        }
        Update: {
          ceis_cnep?: boolean | null
          cnpj_consultado?: string
          consultado_em?: string
          id?: string
          ocorrencias_tcu?: Json | null
          regular?: boolean | null
        }
        Relationships: []
      }
      contratos: {
        Row: {
          ata_id: string | null
          cnpj: string
          criado_em: string
          id: string
          numero: string | null
          status: string | null
          valor_global: number | null
        }
        Insert: {
          ata_id?: string | null
          cnpj: string
          criado_em?: string
          id?: string
          numero?: string | null
          status?: string | null
          valor_global?: number | null
        }
        Update: {
          ata_id?: string | null
          cnpj?: string
          criado_em?: string
          id?: string
          numero?: string | null
          status?: string | null
          valor_global?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_ata_id_fkey"
            columns: ["ata_id"]
            isOneToOne: false
            referencedRelation: "atas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cnpj_fkey"
            columns: ["cnpj"]
            isOneToOne: false
            referencedRelation: "empresas_cnpj"
            referencedColumns: ["cnpj"]
          },
        ]
      }
      documentos_empresa: {
        Row: {
          arquivo_url: string | null
          cnpj: string
          criado_em: string
          id: string
          status: string
          tipo: string
          validade: string | null
        }
        Insert: {
          arquivo_url?: string | null
          cnpj: string
          criado_em?: string
          id?: string
          status?: string
          tipo: string
          validade?: string | null
        }
        Update: {
          arquivo_url?: string | null
          cnpj?: string
          criado_em?: string
          id?: string
          status?: string
          tipo?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_empresa_cnpj_fkey"
            columns: ["cnpj"]
            isOneToOne: false
            referencedRelation: "empresas_cnpj"
            referencedColumns: ["cnpj"]
          },
        ]
      }
      edital_embeddings: {
        Row: {
          chunk: string | null
          embedding: string | null
          id: string
          licitacao_id: string
        }
        Insert: {
          chunk?: string | null
          embedding?: string | null
          id?: string
          licitacao_id: string
        }
        Update: {
          chunk?: string | null
          embedding?: string | null
          id?: string
          licitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edital_embeddings_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      emendas: {
        Row: {
          ano: number | null
          atualizado_em: string
          autor_codigo: string | null
          autor_nome: string | null
          autor_partido: string | null
          autor_uf: string | null
          codigo_emenda: string | null
          criado_em: string
          funcao: string | null
          id: string
          orgao_executor: string | null
          orgao_id: string | null
          programa_governamental: string | null
          subfuncao: string | null
          tipo_emenda: string | null
          valor_empenhado: number | null
          valor_liquidado: number | null
          valor_pago: number | null
          valor_resto_cancelado: number | null
          valor_resto_inscrito: number | null
          valor_resto_pago: number | null
        }
        Insert: {
          ano?: number | null
          atualizado_em?: string
          autor_codigo?: string | null
          autor_nome?: string | null
          autor_partido?: string | null
          autor_uf?: string | null
          codigo_emenda?: string | null
          criado_em?: string
          funcao?: string | null
          id?: string
          orgao_executor?: string | null
          orgao_id?: string | null
          programa_governamental?: string | null
          subfuncao?: string | null
          tipo_emenda?: string | null
          valor_empenhado?: number | null
          valor_liquidado?: number | null
          valor_pago?: number | null
          valor_resto_cancelado?: number | null
          valor_resto_inscrito?: number | null
          valor_resto_pago?: number | null
        }
        Update: {
          ano?: number | null
          atualizado_em?: string
          autor_codigo?: string | null
          autor_nome?: string | null
          autor_partido?: string | null
          autor_uf?: string | null
          codigo_emenda?: string | null
          criado_em?: string
          funcao?: string | null
          id?: string
          orgao_executor?: string | null
          orgao_id?: string | null
          programa_governamental?: string | null
          subfuncao?: string | null
          tipo_emenda?: string | null
          valor_empenhado?: number | null
          valor_liquidado?: number | null
          valor_pago?: number | null
          valor_resto_cancelado?: number | null
          valor_resto_inscrito?: number | null
          valor_resto_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "emendas_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_cnpj: {
        Row: {
          cnpj: string
          criado_em: string
          dados_bancarios: Json | null
          endereco: Json | null
          fantasia: string | null
          inscricao_estadual: string | null
          org_id: string
          porte: string | null
          razao_social: string | null
          representante: Json | null
          status: string
          telefone: string | null
        }
        Insert: {
          cnpj: string
          criado_em?: string
          dados_bancarios?: Json | null
          endereco?: Json | null
          fantasia?: string | null
          inscricao_estadual?: string | null
          org_id: string
          porte?: string | null
          razao_social?: string | null
          representante?: Json | null
          status?: string
          telefone?: string | null
        }
        Update: {
          cnpj?: string
          criado_em?: string
          dados_bancarios?: Json | null
          endereco?: Json | null
          fantasia?: string | null
          inscricao_estadual?: string | null
          org_id?: string
          porte?: string | null
          razao_social?: string | null
          representante?: Json | null
          status?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_cnpj_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          criado_em: string
          entidade_id: string | null
          entidade_tipo: string | null
          id: number
          org_id: string | null
          payload: Json
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: never
          org_id?: string | null
          payload?: Json
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: never
          org_id?: string | null
          payload?: Json
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      harvester_config: {
        Row: {
          ativo: boolean
          codigo_municipio_ibge: string | null
          criado_em: string
          id: string
          janela_dias: number
          modalidades: number[]
          org_id: string | null
          rotulo: string
          uf: string | null
        }
        Insert: {
          ativo?: boolean
          codigo_municipio_ibge?: string | null
          criado_em?: string
          id?: string
          janela_dias?: number
          modalidades?: number[]
          org_id?: string | null
          rotulo: string
          uf?: string | null
        }
        Update: {
          ativo?: boolean
          codigo_municipio_ibge?: string | null
          criado_em?: string
          id?: string
          janela_dias?: number
          modalidades?: number[]
          org_id?: string | null
          rotulo?: string
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "harvester_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      harvester_runs: {
        Row: {
          config_id: string | null
          erros: Json
          finalizado_em: string | null
          fonte: string
          id: string
          iniciado_em: string
          integracao: string
          itens_atualizados: number
          itens_lidos: number
          itens_novos: number
          status: string
        }
        Insert: {
          config_id?: string | null
          erros?: Json
          finalizado_em?: string | null
          fonte?: string
          id?: string
          iniciado_em?: string
          integracao?: string
          itens_atualizados?: number
          itens_lidos?: number
          itens_novos?: number
          status?: string
        }
        Update: {
          config_id?: string | null
          erros?: Json
          finalizado_em?: string | null
          fonte?: string
          id?: string
          iniciado_em?: string
          integracao?: string
          itens_atualizados?: number
          itens_lidos?: number
          itens_novos?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvester_runs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "harvester_config"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_itens: {
        Row: {
          descricao: string | null
          id: string
          licitacao_id: string
          lote: string | null
          quantidade: number | null
          unidade: string | null
          valor_unit_estimado: number | null
        }
        Insert: {
          descricao?: string | null
          id?: string
          licitacao_id: string
          lote?: string | null
          quantidade?: number | null
          unidade?: string | null
          valor_unit_estimado?: number | null
        }
        Update: {
          descricao?: string | null
          id?: string
          licitacao_id?: string
          lote?: string | null
          quantidade?: number | null
          unidade?: string | null
          valor_unit_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_itens_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes: {
        Row: {
          ano_compra: number | null
          atualizado_em: string
          codigo_ibge: string | null
          criado_em: string
          data_abertura: string | null
          data_encerramento_proposta: string | null
          data_publicacao: string | null
          esfera: string | null
          id: string
          link_sistema_origem: string | null
          modalidade: string | null
          modo_disputa: string | null
          municipio: string | null
          numero_compra: string | null
          numero_controle_pncp: string | null
          objeto: string | null
          orgao_id: string | null
          orgao_nome: string | null
          portal: string | null
          registro_preco: boolean | null
          score_relevancia: number | null
          sequencial_compra: number | null
          uf: string | null
          unidade_nome: string | null
          valor_total: number | null
        }
        Insert: {
          ano_compra?: number | null
          atualizado_em?: string
          codigo_ibge?: string | null
          criado_em?: string
          data_abertura?: string | null
          data_encerramento_proposta?: string | null
          data_publicacao?: string | null
          esfera?: string | null
          id?: string
          link_sistema_origem?: string | null
          modalidade?: string | null
          modo_disputa?: string | null
          municipio?: string | null
          numero_compra?: string | null
          numero_controle_pncp?: string | null
          objeto?: string | null
          orgao_id?: string | null
          orgao_nome?: string | null
          portal?: string | null
          registro_preco?: boolean | null
          score_relevancia?: number | null
          sequencial_compra?: number | null
          uf?: string | null
          unidade_nome?: string | null
          valor_total?: number | null
        }
        Update: {
          ano_compra?: number | null
          atualizado_em?: string
          codigo_ibge?: string | null
          criado_em?: string
          data_abertura?: string | null
          data_encerramento_proposta?: string | null
          data_publicacao?: string | null
          esfera?: string | null
          id?: string
          link_sistema_origem?: string | null
          modalidade?: string | null
          modo_disputa?: string | null
          municipio?: string | null
          numero_compra?: string | null
          numero_controle_pncp?: string | null
          objeto?: string | null
          orgao_id?: string | null
          orgao_nome?: string | null
          portal?: string | null
          registro_preco?: boolean | null
          score_relevancia?: number | null
          sequencial_compra?: number | null
          uf?: string | null
          unidade_nome?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      memorias: {
        Row: {
          ativo: boolean
          atualizado_em: string
          conteudo: string
          criado_em: string
          fonte_run_id: string | null
          id: string
          org_id: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          conteudo: string
          criado_em?: string
          fonte_run_id?: string | null
          id?: string
          org_id: string
          tipo?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          conteudo?: string
          criado_em?: string
          fonte_run_id?: string | null
          id?: string
          org_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorias_fonte_run_id_fkey"
            columns: ["fonte_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorias_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          conteudo: Json | null
          criado_em: string
          id: string
          status: string
          tipo: string | null
          usuario_id: string
        }
        Insert: {
          conteudo?: Json | null
          criado_em?: string
          id?: string
          status?: string
          tipo?: string | null
          usuario_id: string
        }
        Update: {
          conteudo?: Json | null
          criado_em?: string
          id?: string
          status?: string
          tipo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacao_membros: {
        Row: {
          cargo: string
          entrou_em: string
          escopo_cnpjs: Json
          id: string
          org_id: string
          status: string
          usuario_id: string
        }
        Insert: {
          cargo?: string
          entrou_em?: string
          escopo_cnpjs?: Json
          id?: string
          org_id: string
          status?: string
          usuario_id: string
        }
        Update: {
          cargo?: string
          entrou_em?: string
          escopo_cnpjs?: Json
          id?: string
          org_id?: string
          status?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizacao_membros_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizacao_membros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacoes: {
        Row: {
          cota_mensal_ia: number
          criado_em: string
          id: string
          nome: string
          plano_status: string
          proprietario: string | null
        }
        Insert: {
          cota_mensal_ia?: number
          criado_em?: string
          id?: string
          nome: string
          plano_status?: string
          proprietario?: string | null
        }
        Update: {
          cota_mensal_ia?: number
          criado_em?: string
          id?: string
          nome?: string
          plano_status?: string
          proprietario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizacoes_proprietario_fkey"
            columns: ["proprietario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      orgao_execucao_funcao: {
        Row: {
          ano: number
          empenhado: number | null
          funcao: string
          id: string
          orcado: number | null
          orgao_id: string
          pago: number | null
          subfuncao: string | null
        }
        Insert: {
          ano: number
          empenhado?: number | null
          funcao: string
          id?: string
          orcado?: number | null
          orgao_id: string
          pago?: number | null
          subfuncao?: string | null
        }
        Update: {
          ano?: number
          empenhado?: number | null
          funcao?: string
          id?: string
          orcado?: number | null
          orgao_id?: string
          pago?: number | null
          subfuncao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orgao_execucao_funcao_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      orgao_fiscal: {
        Row: {
          ano: number
          capag: string | null
          capag_indicador_1: string | null
          capag_indicador_2: string | null
          capag_indicador_3: string | null
          capag_nota_1: string | null
          capag_nota_2: string | null
          capag_nota_3: string | null
          despesa_pessoal: number | null
          divida: number | null
          id: string
          orgao_id: string
          rcl: number | null
          receita_per_capita: number | null
        }
        Insert: {
          ano: number
          capag?: string | null
          capag_indicador_1?: string | null
          capag_indicador_2?: string | null
          capag_indicador_3?: string | null
          capag_nota_1?: string | null
          capag_nota_2?: string | null
          capag_nota_3?: string | null
          despesa_pessoal?: number | null
          divida?: number | null
          id?: string
          orgao_id: string
          rcl?: number | null
          receita_per_capita?: number | null
        }
        Update: {
          ano?: number
          capag?: string | null
          capag_indicador_1?: string | null
          capag_indicador_2?: string | null
          capag_indicador_3?: string | null
          capag_nota_1?: string | null
          capag_nota_2?: string | null
          capag_nota_3?: string | null
          despesa_pessoal?: number | null
          divida?: number | null
          id?: string
          orgao_id?: string
          rcl?: number | null
          receita_per_capita?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orgao_fiscal_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      orgao_score: {
        Row: {
          calculado_em: string
          orgao_id: string
          resumo_executivo: string | null
          score_acesso: number | null
          score_apetite: number | null
          score_capacidade: number | null
          semaforo: string | null
        }
        Insert: {
          calculado_em?: string
          orgao_id: string
          resumo_executivo?: string | null
          score_acesso?: number | null
          score_apetite?: number | null
          score_capacidade?: number | null
          semaforo?: string | null
        }
        Update: {
          calculado_em?: string
          orgao_id?: string
          resumo_executivo?: string | null
          score_acesso?: number | null
          score_apetite?: number | null
          score_capacidade?: number | null
          semaforo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orgao_score_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: true
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      orgaos: {
        Row: {
          atualizado_em: string
          cnpj: string | null
          codigo_ibge: string | null
          criado_em: string
          ente_id: string | null
          esfera: string | null
          id: string
          mandato: Json | null
          nome: string
          poder: string | null
          populacao: number | null
          prefeito: string | null
          uf: string | null
        }
        Insert: {
          atualizado_em?: string
          cnpj?: string | null
          codigo_ibge?: string | null
          criado_em?: string
          ente_id?: string | null
          esfera?: string | null
          id?: string
          mandato?: Json | null
          nome: string
          poder?: string | null
          populacao?: number | null
          prefeito?: string | null
          uf?: string | null
        }
        Update: {
          atualizado_em?: string
          cnpj?: string | null
          codigo_ibge?: string | null
          criado_em?: string
          ente_id?: string | null
          esfera?: string | null
          id?: string
          mandato?: Json | null
          nome?: string
          poder?: string | null
          populacao?: number | null
          prefeito?: string | null
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orgaos_ente_id_fkey"
            columns: ["ente_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      participacoes: {
        Row: {
          atualizado_em: string
          cnpj: string
          criado_em: string
          id: string
          licitacao_id: string | null
          motivo_desistencia: string | null
          status_interno: string
          tags: Json
        }
        Insert: {
          atualizado_em?: string
          cnpj: string
          criado_em?: string
          id?: string
          licitacao_id?: string | null
          motivo_desistencia?: string | null
          status_interno?: string
          tags?: Json
        }
        Update: {
          atualizado_em?: string
          cnpj?: string
          criado_em?: string
          id?: string
          licitacao_id?: string | null
          motivo_desistencia?: string | null
          status_interno?: string
          tags?: Json
        }
        Relationships: [
          {
            foreignKeyName: "participacoes_cnpj_fkey"
            columns: ["cnpj"]
            isOneToOne: false
            referencedRelation: "empresas_cnpj"
            referencedColumns: ["cnpj"]
          },
          {
            foreignKeyName: "participacoes_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      pca_itens: {
        Row: {
          ano: number | null
          atualizado_em: string
          categoria: string | null
          codigo_item: string | null
          criado_em: string
          data_desejada: string | null
          descricao: string | null
          esfera: string | null
          id: string
          id_pca_pncp: string | null
          numero_item: number | null
          orgao_id: string | null
          quantidade: number | null
          url_pncp: string | null
          valor_estimado: number | null
        }
        Insert: {
          ano?: number | null
          atualizado_em?: string
          categoria?: string | null
          codigo_item?: string | null
          criado_em?: string
          data_desejada?: string | null
          descricao?: string | null
          esfera?: string | null
          id?: string
          id_pca_pncp?: string | null
          numero_item?: number | null
          orgao_id?: string | null
          quantidade?: number | null
          url_pncp?: string | null
          valor_estimado?: number | null
        }
        Update: {
          ano?: number | null
          atualizado_em?: string
          categoria?: string | null
          codigo_item?: string | null
          criado_em?: string
          data_desejada?: string | null
          descricao?: string | null
          esfera?: string | null
          id?: string
          id_pca_pncp?: string | null
          numero_item?: number | null
          orgao_id?: string | null
          quantidade?: number | null
          url_pncp?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pca_itens_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      precos_homologados: {
        Row: {
          cnpj_vencedor: string | null
          data_homologacao: string | null
          descricao: string | null
          id: string
          uf: string | null
          valor_total: number | null
          valor_unit: number | null
        }
        Insert: {
          cnpj_vencedor?: string | null
          data_homologacao?: string | null
          descricao?: string | null
          id?: string
          uf?: string | null
          valor_total?: number | null
          valor_unit?: number | null
        }
        Update: {
          cnpj_vencedor?: string | null
          data_homologacao?: string | null
          descricao?: string | null
          id?: string
          uf?: string | null
          valor_total?: number | null
          valor_unit?: number | null
        }
        Relationships: []
      }
      radar_filtros: {
        Row: {
          criado_em: string
          id: string
          nome: string
          org_id: string
          parametros: Json
          total_matches: number | null
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
          org_id: string
          parametros?: Json
          total_matches?: number | null
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          org_id?: string
          parametros?: Json
          total_matches?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "radar_filtros_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias: {
        Row: {
          data: string | null
          finalidade: string | null
          fonte: string | null
          id: string
          orgao_id: string | null
          valor: number | null
        }
        Insert: {
          data?: string | null
          finalidade?: string | null
          fonte?: string | null
          id?: string
          orgao_id?: string | null
          valor?: number | null
        }
        Update: {
          data?: string | null
          finalidade?: string | null
          fonte?: string | null
          id?: string
          orgao_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      uso_ia: {
        Row: {
          atualizado_em: string
          custo_usd: number
          id: number
          interacoes: number
          org_id: string
          periodo: string
          tokens_entrada: number
          tokens_saida: number
        }
        Insert: {
          atualizado_em?: string
          custo_usd?: number
          id?: never
          interacoes?: number
          org_id: string
          periodo: string
          tokens_entrada?: number
          tokens_saida?: number
        }
        Update: {
          atualizado_em?: string
          custo_usd?: number
          id?: never
          interacoes?: number
          org_id?: string
          periodo?: string
          tokens_entrada?: number
          tokens_saida?: number
        }
        Relationships: [
          {
            foreignKeyName: "uso_ia_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          criado_em: string
          email: string | null
          id: string
          nome: string | null
        }
        Insert: {
          criado_em?: string
          email?: string | null
          id: string
          nome?: string | null
        }
        Update: {
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      incrementar_uso_ia: {
        Args: {
          p_custo: number
          p_org: string
          p_tokens_in: number
          p_tokens_out: number
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
