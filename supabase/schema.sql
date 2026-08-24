-- ====================================================================
-- MP CARGAS — Schema Completo do Banco de Dados Supabase (PostgreSQL)
-- Sistema de Controle de Inventário e Patrimônio por Código de Barras
-- ====================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMINISTRADOR', 'CONFERENTE', 'MANUTENÇÃO', 'CONSULTA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('PENDENTE', 'ATIVO', 'BLOQUEADO', 'RECUSADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE equipment_status AS ENUM (
        'EM USO',
        'EM ESTOQUE',
        'EM MANUTENÇÃO',
        'DANIFICADO',
        'AGUARDANDO DESCARTE',
        'BAIXADO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM (
        'CADASTRO',
        'TRANSFERENCIA',
        'ENVIO_MANUTENCAO',
        'RETORNO_MANUTENCAO',
        'ALTERACAO_STATUS',
        'BAIXA',
        'CONFERENCIA'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABELA DE PERFIS DE USUÁRIO (profiles)
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

-- 4. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    icone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABELA DE SETORES
CREATE TABLE IF NOT EXISTS public.setores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    responsavel_padrao TEXT,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABELA DE LOCAIS
CREATE TABLE IF NOT EXISTS public.locais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE RESTRICT,
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(setor_id, nome)
);

-- 7. TABELA DE CONFIGURAÇÕES DO SISTEMA E SEQUENCIAL PATRIMONIAL
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

-- 8. TABELA DE EQUIPAMENTOS (PATRIMÔNIO)
CREATE TABLE IF NOT EXISTS public.equipamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_patrimonial TEXT NOT NULL UNIQUE, -- Ex: PAT-000001
    codigo_barras TEXT NOT NULL UNIQUE,      -- Code 128
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

-- Índices de busca de alta velocidade
CREATE INDEX IF NOT EXISTS idx_equipamentos_codigo_patrimonial ON public.equipamentos(codigo_patrimonial);
CREATE INDEX IF NOT EXISTS idx_equipamentos_codigo_barras ON public.equipamentos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_equipamentos_numero_serie ON public.equipamentos(numero_serie);
CREATE INDEX IF NOT EXISTS idx_equipamentos_status ON public.equipamentos(status);
CREATE INDEX IF NOT EXISTS idx_equipamentos_setor ON public.equipamentos(setor_id);

-- 9. TABELA DE MOVIMENTAÇÕES
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

-- 10. TABELA DE MANUTENÇÕES
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

-- 11. TABELA DE CONFERÊNCIAS DE INVENTÁRIO
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

-- 12. TABELA DE ITENS DA CONFERÊNCIA
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

-- 13. TABELA DE HISTÓRICO VISUAL
CREATE TABLE IF NOT EXISTS public.historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    tipo movement_type NOT NULL,
    usuario_nome TEXT NOT NULL,
    data_hora TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. TABELA DE AUDITORIA IMUTÁVEL
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

-- ====================================================================
-- FUNÇÕES ESPECIAIS & STORED PROCEDURES
-- ====================================================================

-- Função atômica para geração do próximo código patrimonial (PAT-000001)
CREATE OR REPLACE FUNCTION public.fn_proximo_codigo_patrimonial()
RETURNS TEXT AS $$
DECLARE
    v_prefixo TEXT;
    v_digitos INT;
    v_seq BIGINT;
    v_codigo TEXT;
    v_exists BOOLEAN;
BEGIN
    -- Busca parâmetros da configuração
    SELECT prefixo_patrimonio, digitos_sequencial, sequencial_atual
    INTO v_prefixo, v_digitos, v_seq
    FROM public.configuracoes
    LIMIT 1;

    IF v_prefixo IS NULL THEN
        v_prefixo := 'PAT';
        v_digitos := 6;
        v_seq := 1;
    END IF;

    -- Loop até garantir código único e não reutilizado
    LOOP
        v_seq := v_seq + 1;
        v_codigo := v_prefixo || '-' || LPAD(v_seq::TEXT, v_digitos, '0');
        
        SELECT EXISTS (
            SELECT 1 FROM public.equipamentos WHERE codigo_patrimonial = v_codigo
        ) INTO v_exists;

        IF NOT v_exists THEN
            -- Atualiza sequencial na tabela de configuração
            UPDATE public.configuracoes SET sequencial_atual = v_seq;
            EXIT;
        END IF;
    END LOOP;

    RETURN v_codigo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_equipamentos_updated_at BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_manutencoes_updated_at BEFORE UPDATE ON public.manutencoes FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Trigger para criar perfil automaticamente no SignUp via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_is_first_user BOOLEAN;
BEGIN
    -- Se for o primeiro usuário registrado no sistema, concede perfil ADMINISTRADOR e status ATIVO
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO v_is_first_user;

    IF v_is_first_user THEN
        INSERT INTO public.profiles (id, email, full_name, role, status)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Administrador MP CARGAS'),
            'ADMINISTRADOR',
            'ATIVO'
        );
    ELSE
        -- Usuários subsequentes iniciam como PENDENTE e CONSULTA
        INSERT INTO public.profiles (id, email, full_name, role, status)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'CONSULTA',
            'PENDENTE'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

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

-- Regras Profiles
CREATE POLICY "Permitir leitura de profiles por autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuário pode atualizar o próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin pode atualizar qualquer perfil" ON public.profiles FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMINISTRADOR')
);

-- Regras Gerais de Leitura para Usuários Ativos
CREATE POLICY "Leitura de Categorias por Ativos" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de Setores por Ativos" ON public.setores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de Locais por Ativos" ON public.locais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de Equipamentos por Ativos" ON public.equipamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de Movimentações por Ativos" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de Manutenções por Ativos" ON public.manutencoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de Conferências por Ativos" ON public.conferencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de Itens por Ativos" ON public.conferencia_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de Histórico por Ativos" ON public.historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de Auditoria por Admins" ON public.auditoria FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMINISTRADOR')
);
CREATE POLICY "Leitura de Configurações por Ativos" ON public.configuracoes FOR SELECT TO authenticated USING (true);

-- Modificações permitidas a usuários autenticados com status ATIVO
CREATE POLICY "Escrita Equipamentos" ON public.equipamentos FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'ATIVO')
);
CREATE POLICY "Escrita Movimentações" ON public.movimentacoes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'ATIVO')
);
CREATE POLICY "Escrita Manutenções" ON public.manutencoes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'ATIVO')
);
CREATE POLICY "Escrita Conferências" ON public.conferencias FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'ATIVO')
);
CREATE POLICY "Escrita Auditoria" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);

-- ====================================================================
-- DADOS INICIAIS DE APOIO (SEEDS)
-- ====================================================================

INSERT INTO public.configuracoes (empresa_nome, prefixo_patrimonio, sequencial_atual, som_ativo)
VALUES ('MP CARGAS', 'PAT', 100, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.categorias (nome, descricao, icone) VALUES
('Equipamentos de TI', 'Notebooks, Desktops, Monitores, Servidores e Switches', 'Laptop'),
('Coletores de Dados', 'Terminais portáteis e Coletores de código de barras', 'Barcode'),
('Rádios & Comunicação', 'Rádios comunicadores VHF/UHF e Fones', 'Radio'),
('Ferramentas & Oficinas', 'Furadeiras, Parafusadeiras, Chaves e Equipamentos mecânicos', 'Wrench'),
('Equipamentos de Carga', 'Paleteiras manuais, Empilhadeiras e Carros hidráulicos', 'Truck'),
('Mobiliário & Escritório', 'Mesas, Cadeiras ergonômicas, Gaveteiros e Cofres', 'Building')
ON CONFLICT DO NOTHING;

INSERT INTO public.setores (nome, responsavel_padrao, descricao) VALUES
('Operações & Galpão', 'Carlos Mendes', 'Setor de movimentação e triagem de cargas'),
('TI & Automação', 'Kaian', 'Tecnologia da Informação e Infraestrutura'),
('Logística & Expedição', 'Marcos Silva', 'Controle de rotas, frotas e conferência'),
('Manutenção Geral', 'Roberto Pereira', 'Oficina mecânica e elétrica'),
('Administrativo / Financeiro', 'Ana Paula', 'Escritório central e controladoria')
ON CONFLICT DO NOTHING;

-- Locais vinculados aos setores
DO $$
DECLARE
    v_setor_op UUID;
    v_setor_ti UUID;
    v_setor_log UUID;
    v_setor_man UUID;
    v_setor_adm UUID;
BEGIN
    SELECT id INTO v_setor_op FROM public.setores WHERE nome = 'Operações & Galpão' LIMIT 1;
    SELECT id INTO v_setor_ti FROM public.setores WHERE nome = 'TI & Automação' LIMIT 1;
    SELECT id INTO v_setor_log FROM public.setores WHERE nome = 'Logística & Expedição' LIMIT 1;
    SELECT id INTO v_setor_man FROM public.setores WHERE nome = 'Manutenção Geral' LIMIT 1;
    SELECT id INTO v_setor_adm FROM public.setores WHERE nome = 'Administrativo / Financeiro' LIMIT 1;

    IF v_setor_op IS NOT NULL THEN
        INSERT INTO public.locais (setor_id, nome, descricao) VALUES
        (v_setor_op, 'Doca 01 - Recebimento', 'Área de descarga'),
        (v_setor_op, 'Doca 02 - Carregamento', 'Área de saída de carretas'),
        (v_setor_op, 'Galpão Principal - Bloco A', 'Armazenagem pesada')
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_setor_ti IS NOT NULL THEN
        INSERT INTO public.locais (setor_id, nome, descricao) VALUES
        (v_setor_ti, 'Sala de Servidores (CPD)', 'Rack principal climatizado'),
        (v_setor_ti, 'Bancada de Suporte TI', 'Manutenção interna de coletores e PCs'),
        (v_setor_ti, 'Almoxarifado TI', 'Estoque de periféricos')
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_setor_log IS NOT NULL THEN
        INSERT INTO public.locais (setor_id, nome, descricao) VALUES
        (v_setor_log, 'Cabine de Expedição', 'Emissão de manifestos e CTEs'),
        (v_setor_log, 'Pátio de Carretas', 'Vagas de manobra')
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_setor_man IS NOT NULL THEN
        INSERT INTO public.locais (setor_id, nome, descricao) VALUES
        (v_setor_man, 'Oficina Mecânica', 'Manutenção preventiva'),
        (v_setor_man, 'Box de Carga de Baterias', 'Recarga de empilhadeiras e baterias')
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_setor_adm IS NOT NULL THEN
        INSERT INTO public.locais (setor_id, nome, descricao) VALUES
        (v_setor_adm, 'Recepção Principal', 'Entrada de visitantes'),
        (v_setor_adm, 'Diretoria / Sala de Reunião', 'Piso superior'),
        (v_setor_adm, 'Financeiro / Sala 03', 'Contabilidade e RH')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
