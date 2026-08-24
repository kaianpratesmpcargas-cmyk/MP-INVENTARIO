-- ====================================================================
-- MP CARGAS — Schema Completo do Banco de Dados Supabase (PostgreSQL)
-- Copie e cole no SQL Editor do seu Dashboard Supabase
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    icone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.setores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    responsavel_padrao TEXT,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.locais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE RESTRICT,
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(setor_id, nome)
);

CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE TABLE IF NOT EXISTS public.equipamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_patrimonial TEXT NOT NULL UNIQUE,
    codigo_barras TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    marca TEXT,
    modelo TEXT,
    numero_serie TEXT,
    setor_id UUID REFERENCES public.setores(id) ON DELETE RESTRICT,
    local_id UUID REFERENCES public.locais(id) ON DELETE RESTRICT,
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
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.movimentacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
    equipamento_codigo TEXT NOT NULL,
    equipamento_nome TEXT NOT NULL,
    tipo movement_type NOT NULL,
    origem_setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
    origem_setor_nome TEXT,
    origem_local_id UUID REFERENCES public.locais(id) ON DELETE SET NULL,
    origem_local_nome TEXT,
    origem_responsavel TEXT,
    destino_setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
    destino_setor_nome TEXT,
    destino_local_id UUID REFERENCES public.locais(id) ON DELETE SET NULL,
    destino_local_nome TEXT,
    destino_responsavel TEXT,
    status_anterior equipment_status,
    status_novo equipment_status,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usuario_nome TEXT NOT NULL,
    motivo TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.manutencoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
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
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usuario_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conferencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
    setor_nome TEXT,
    local_id UUID REFERENCES public.locais(id) ON DELETE SET NULL,
    local_nome TEXT,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    categoria_nome TEXT,
    total_esperados INT NOT NULL DEFAULT 0,
    total_encontrados INT NOT NULL DEFAULT 0,
    total_pendentes INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usuario_nome TEXT NOT NULL,
    observacoes TEXT,
    data_inicio TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    data_fim TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conferencia_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conferencia_id UUID NOT NULL REFERENCES public.conferencias(id) ON DELETE CASCADE,
    equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    tipo movement_type NOT NULL,
    usuario_nome TEXT NOT NULL,
    data_hora TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

-- Habilita RLS
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

-- Políticas de Acesso RLS
DROP POLICY IF EXISTS "Permitir tudo em profiles" ON public.profiles;
CREATE POLICY "Permitir tudo em profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em categorias" ON public.categorias;
CREATE POLICY "Permitir tudo em categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em setores" ON public.setores;
CREATE POLICY "Permitir tudo em setores" ON public.setores FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em locais" ON public.locais;
CREATE POLICY "Permitir tudo em locais" ON public.locais FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em equipamentos" ON public.equipamentos;
CREATE POLICY "Permitir tudo em equipamentos" ON public.equipamentos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em movimentacoes" ON public.movimentacoes;
CREATE POLICY "Permitir tudo em movimentacoes" ON public.movimentacoes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em manutencoes" ON public.manutencoes;
CREATE POLICY "Permitir tudo em manutencoes" ON public.manutencoes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em conferencias" ON public.conferencias;
CREATE POLICY "Permitir tudo em conferencias" ON public.conferencias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em conferencia_itens" ON public.conferencia_itens;
CREATE POLICY "Permitir tudo em conferencia_itens" ON public.conferencia_itens FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em historico" ON public.historico;
CREATE POLICY "Permitir tudo em historico" ON public.historico FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em auditoria" ON public.auditoria;
CREATE POLICY "Permitir tudo em auditoria" ON public.auditoria FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em configuracoes" ON public.configuracoes;
CREATE POLICY "Permitir tudo em configuracoes" ON public.configuracoes FOR ALL USING (true) WITH CHECK (true);

-- Trigger para criar perfil automaticamente no SignUp do Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status, department)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'ADMINISTRADOR',
    'ATIVO',
    COALESCE(new.raw_user_meta_data->>'department', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
