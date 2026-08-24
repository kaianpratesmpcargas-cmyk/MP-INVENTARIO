// ==========================================
// MP CARGAS - Configurações e Permissões do Sistema
// (Sem dados de demonstração — sistema real)
// ==========================================

import type {
  ConfiguracoesSistema,
  UserPermission,
} from '../types';

// DATA_VERSION: incrementar este número limpa o localStorage de versões anteriores
export const DATA_VERSION = '2.0.0';

// ──────────────────────────────────────────
// Matriz de 14 Permissões do Sistema
// ──────────────────────────────────────────
export const ALL_SYSTEM_PERMISSIONS: UserPermission[] = [
  { id: '1',  code: 'view_inventory',       name: 'Visualizar Inventário',    description: 'Consultar listagem e detalhes dos patrimônios' },
  { id: '2',  code: 'scan_barcode',         name: 'Bipar Equipamentos',        description: 'Utilizar a estação de scanner e leitor USB/câmera' },
  { id: '3',  code: 'create_equipment',     name: 'Cadastrar Equipamento',     description: 'Registrar novos equipamentos e gerar códigos' },
  { id: '4',  code: 'edit_equipment',       name: 'Editar Equipamento',        description: 'Modificar dados cadastrais do patrimônio' },
  { id: '5',  code: 'generate_labels',      name: 'Gerar Etiquetas',           description: 'Acessar o gerador de etiquetas em lote' },
  { id: '6',  code: 'print_labels',         name: 'Imprimir Etiquetas',        description: 'Exportar PDF e enviar para impressão física' },
  { id: '7',  code: 'transfer_equipment',   name: 'Transferir Equipamento',    description: 'Movimentar setor, local e responsável' },
  { id: '8',  code: 'open_maintenance',     name: 'Abrir Manutenção',          description: 'Enviar equipamento para manutenção corretiva/preventiva' },
  { id: '9',  code: 'finish_maintenance',   name: 'Finalizar Manutenção',      description: 'Registrar peças, laudo e retorno de manutenção' },
  { id: '10', code: 'decommission_equipment', name: 'Dar Baixa',              description: 'Efetuar baixa de equipamentos por descarte ou perda' },
  { id: '11', code: 'conduct_conference',   name: 'Realizar Conferência',      description: 'Criar e executar auditoria física de estoque' },
  { id: '12', code: 'view_reports',         name: 'Visualizar Relatórios',     description: 'Exportar planilhas Excel, CSV e relatórios PDF' },
  { id: '13', code: 'manage_users',         name: 'Gerenciar Usuários',        description: 'Aprovar, recusar e editar contas de funcionários' },
  { id: '14', code: 'change_permissions',   name: 'Alterar Permissões',        description: 'Definir privilégios e papéis de acesso' },
];

// ──────────────────────────────────────────
// Configurações Padrão do Sistema
// ──────────────────────────────────────────
export const INITIAL_CONFIG: ConfiguracoesSistema = {
  id: 'cfg-001',
  empresa_nome: 'MP CARGAS',
  empresa_cnpj: '',
  prefixo_patrimonio: 'PAT',
  sequencial_atual: 0,
  digitos_sequencial: 6,
  som_ativo: true,
  volume_som: 0.6,
  auto_limpar_scanner_segundos: 4,
  modelo_etiqueta_padrao: 'PADRAO_50X30',
  modo_offline_ativo: true,
  onboarding_completo: false,
  updated_at: new Date().toISOString(),
};

// ──────────────────────────────────────────
// Arrays vazios — sistema começa sem dados demo
// ──────────────────────────────────────────
export const INITIAL_USERS        = [] as const;
export const INITIAL_CATEGORIAS   = [] as const;
export const INITIAL_SETORES      = [] as const;
export const INITIAL_LOCAIS       = [] as const;
export const INITIAL_EQUIPAMENTOS = [] as const;
export const INITIAL_MOVIMENTACOES= [] as const;
export const INITIAL_MANUTENCOES  = [] as const;
export const INITIAL_AUDITORIA    = [] as const;
