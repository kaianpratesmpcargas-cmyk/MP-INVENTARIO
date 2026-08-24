-- ====================================================================
-- MP CARGAS — Schema Definitivo com Suporte a Tempo Real (Supabase)
-- Copie e cole no SQL Editor do seu Dashboard Supabase e clique em RUN
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Remove tabelas antigas para recriar com tipos corretos
DROP TABLE IF EXISTS public.conferencia_itens CASCADE;
DROP TABLE IF EXISTS public.conferencias CASCADE;
DROP TABLE IF EXISTS public.manutencoes CASCADE;
DROP TABLE IF EXISTS public.movimentacoes CASCADE;
DROP TABLE IF EXISTS public.historico CASCADE;
DROP TABLE IF EXISTS public.auditoria CASCADE;
DROP TABLE IF EXISTS public.equipamentos CASCADE;
DROP TABLE IF EXISTS public.locais CASCADE;
DROP TABLE IF EXISTS public.setores CASCADE;
DROP TABLE IF EXISTS public.categorias CASCADE;
DROP TABLE IF EXISTS public.configuracoes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Criação dos Tipos ENUM
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMINISTRADOR', 'CONFERENTE', 'MANUTENÇÃO', 'CONSULTA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('PENDENTE', 'ATIVO', 'BLOQUEADO', 'RECUSADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE equipment_status AS ENUM ('EM USO', 'EM ESTOQUE', 'EM MANUTENÇÃO', 'DANIFICADO', 'AGUARDANDO DESCARTE', 'BAIXADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('CADASTRO', 'TRANSFERENCIA', 'ENVIO_MANUTENCAO', 'RETORNO_MANUTENCAO', 'ALTERACAO_STATUS', 'BAIXA', 'CONFERENCIA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. PROFILES (Usuários)
CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'CONSULTA',
    status user_status NOT NULL DEFAULT 'PENDENTE',
    avatar_url TEXT,
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    department TEXT,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. CATEGORIAS
CREATE TABLE public.categorias (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    icone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. SETORES
CREATE TABLE public.setores (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    responsavel_padrao TEXT,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. LOCAIS
CREATE TABLE public.locais (
    id TEXT PRIMARY KEY,
    setor_id TEXT,
    setor_nome TEXT,
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. CONFIGURAÇÕES
CREATE TABLE public.configuracoes (
    id TEXT PRIMARY KEY DEFAULT 'config-main',
    empresa_nome TEXT NOT NULL DEFAULT 'MP CARGAS',
    empresa_cnpj TEXT DEFAULT '00.000.000/0001-00',
    prefixo_patrimonio TEXT NOT NULL DEFAULT 'PAT',
    sequencial_atual BIGINT NOT NULL DEFAULT 100,
    digitos_sequencial INT NOT NULL DEFAULT 6,
    som_ativo BOOLEAN NOT NULL DEFAULT true,
    volume_som NUMERIC(3,2) NOT NULL DEFAULT 0.5,
    auto_limpar_scanner_segundos INT NOT NULL DEFAULT 4,
    modelo_etiqueta_padrao TEXT NOT NULL DEFAULT 'PADRAO_50X30',
    onboarding_completo BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. EQUIPAMENTOS
CREATE TABLE public.equipamentos (
    id TEXT PRIMARY KEY,
    codigo_patrimonial TEXT NOT NULL UNIQUE,
    codigo_barras TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    categoria_id TEXT,
    categoria_nome TEXT,
    marca TEXT,
    modelo TEXT,
    numero_serie TEXT,
    setor_id TEXT,
    setor_nome TEXT,
    local_id TEXT,
    local_nome TEXT,
    responsavel TEXT NOT NULL,
    status equipment_status NOT NULL DEFAULT 'EM ESTOQUE',
    data_aquisicao DATE,
    valor_aquisicao NUMERIC(12,2) DEFAULT 0.00,
    fornecedor TEXT,
    garantia_meses INT DEFAULT 0,
    garantia_fim DATE,
    observacoes TEXT,
    imagem_url TEXT,
    dias_em_manutencao INT DEFAULT 0,
    data_envio_manutencao TIMESTAMPTZ,
    motivo_baixa TEXT,
    data_baixa TIMESTAMPTZ,
    observacao_baixa TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. MOVIMENTAÇÕES
CREATE TABLE public.movimentacoes (
    id TEXT PRIMARY KEY,
    equipamento_id TEXT NOT NULL,
    equipamento_codigo TEXT NOT NULL,
    equipamento_nome TEXT NOT NULL,
    tipo movement_type NOT NULL,
    origem_setor_id TEXT,
    origem_setor_nome TEXT,
    origem_local_id TEXT,
    origem_local_nome TEXT,
    origem_responsavel TEXT,
    destino_setor_id TEXT,
    destino_setor_nome TEXT,
    destino_local_id TEXT,
    destino_local_nome TEXT,
    destino_responsavel TEXT,
    status_anterior equipment_status,
    status_novo equipment_status,
    usuario_id TEXT,
    usuario_nome TEXT NOT NULL,
    motivo TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. MANUTENÇÕES
CREATE TABLE public.manutencoes (
    id TEXT PRIMARY KEY,
    equipamento_id TEXT NOT NULL,
    equipamento_codigo TEXT NOT NULL,
    equipamento_nome TEXT NOT NULL,
    problema TEXT NOT NULL,
    descricao TEXT NOT NULL,
    responsavel_abertura TEXT NOT NULL,
    tecnico_responsavel TEXT,
    data_entrada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    previsao_retorno DATE,
    custo_estimado NUMERIC(10,2) DEFAULT 0.00,
    data_saida TIMESTAMPTZ,
    servico_realizado TEXT,
    pecas_utilizadas TEXT,
    custo_real NUMERIC(10,2) DEFAULT 0.00,
    status_retorno equipment_status,
    observacoes TEXT,
    concluida BOOLEAN NOT NULL DEFAULT false,
    usuario_id TEXT,
    usuario_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. CONFERÊNCIAS
CREATE TABLE public.conferencias (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    setor_id TEXT,
    setor_nome TEXT,
    local_id TEXT,
    local_nome TEXT,
    categoria_id TEXT,
    categoria_nome TEXT,
    total_esperados INT NOT NULL DEFAULT 0,
    total_encontrados INT NOT NULL DEFAULT 0,
    total_pendentes INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
    usuario_id TEXT,
    usuario_nome TEXT NOT NULL,
    observacoes TEXT,
    data_inicio TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    data_fim TIMESTAMPTZ,
    itens JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. CONFERÊNCIA ITENS
CREATE TABLE public.conferencia_itens (
    id TEXT PRIMARY KEY,
    conferencia_id TEXT NOT NULL,
    equipamento_id TEXT NOT NULL,
    equipamento_codigo TEXT NOT NULL,
    equipamento_nome TEXT NOT NULL,
    setor_nome TEXT NOT NULL,
    local_nome TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    status_equipamento equipment_status NOT NULL,
    encontrado BOOLEAN NOT NULL DEFAULT false,
    data_bipagem TIMESTAMPTZ,
    bipado_por TEXT,
    divergente BOOLEAN NOT NULL DEFAULT false
);

-- 11. HISTÓRICO
CREATE TABLE public.historico (
    id TEXT PRIMARY KEY,
    equipamento_id TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    tipo movement_type NOT NULL,
    usuario_nome TEXT NOT NULL,
    data_hora TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. AUDITORIA
CREATE TABLE public.auditoria (
    id TEXT PRIMARY KEY,
    usuario_id TEXT,
    usuario_nome TEXT NOT NULL,
    usuario_email TEXT NOT NULL,
    acao TEXT NOT NULL,
    entidade TEXT NOT NULL,
    registro_id TEXT NOT NULL,
    registro_codigo TEXT,
    detalhes TEXT NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilita RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferencia_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total
CREATE POLICY "Permitir profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir setores" ON public.setores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir locais" ON public.locais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir equipamentos" ON public.equipamentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir movimentacoes" ON public.movimentacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir manutencoes" ON public.manutencoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir conferencias" ON public.conferencias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir conferencia_itens" ON public.conferencia_itens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir historico" ON public.historico FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir auditoria" ON public.auditoria FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir configuracoes" ON public.configuracoes FOR ALL USING (true) WITH CHECK (true);

-- Habilita Publicação em Tempo Real (Supabase Realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles, public.categorias, public.setores, public.locais, public.equipamentos, public.movimentacoes, public.manutencoes, public.conferencias, public.configuracoes;
