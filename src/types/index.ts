// ==========================================
// MP CARGAS - Tipos e Interfaces do Sistema
// ==========================================

export type UserRole = 'ADMINISTRADOR' | 'CONFERENTE' | 'MANUTENÇÃO' | 'CONSULTA';

export type UserStatus = 'PENDENTE' | 'ATIVO' | 'BLOQUEADO' | 'RECUSADO';

export type EquipmentStatus = 
  | 'EM USO'
  | 'EM ESTOQUE'
  | 'EM MANUTENÇÃO'
  | 'DANIFICADO'
  | 'AGUARDANDO DESCARTE'
  | 'BAIXADO';

export type MovementType = 
  | 'CADASTRO'
  | 'TRANSFERENCIA'
  | 'ENVIO_MANUTENCAO'
  | 'RETORNO_MANUTENCAO'
  | 'ALTERACAO_STATUS'
  | 'BAIXA'
  | 'CONFERENCIA';

export type DecommissionReason = 
  | 'Quebra'
  | 'Obsolescência'
  | 'Descarte'
  | 'Venda'
  | 'Furto/Extravio'
  | 'Outro';

export interface UserPermission {
  id: string;
  name: string;
  description: string;
  code: PermissionCode;
}

export type PermissionCode = 
  | 'view_inventory'
  | 'scan_barcode'
  | 'create_equipment'
  | 'edit_equipment'
  | 'generate_labels'
  | 'print_labels'
  | 'transfer_equipment'
  | 'open_maintenance'
  | 'finish_maintenance'
  | 'decommission_equipment'
  | 'conduct_conference'
  | 'view_reports'
  | 'manage_users'
  | 'change_permissions';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  custom_permissions?: PermissionCode[];
  department?: string;
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  icone?: string;
  created_at: string;
}

export interface Setor {
  id: string;
  nome: string;
  responsavel_padrao?: string;
  descricao?: string;
  created_at: string;
}

export interface Local {
  id: string;
  setor_id: string;
  setor_nome?: string;
  nome: string;
  descricao?: string;
  created_at: string;
}

export interface Equipamento {
  id: string;
  codigo_patrimonial: string; // Ex: PAT-000001
  codigo_barras: string;      // Code 128 (usually same as PAT-000001 or numeric/alphanumeric)
  nome: string;               // Ex: Notebook Dell Inspiron 15
  categoria_id: string;
  categoria_nome?: string;
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  setor_id: string;
  setor_nome?: string;
  local_id: string;
  local_nome?: string;
  responsavel: string;
  status: EquipmentStatus;
  data_aquisicao?: string;
  valor_aquisicao?: number;
  fornecedor?: string;
  garantia_meses?: number;
  garantia_fim?: string;
  observacoes?: string;
  imagem_url?: string;
  qr_code?: string;
  dias_em_manutencao?: number;
  data_envio_manutencao?: string;
  motivo_baixa?: DecommissionReason;
  data_baixa?: string;
  observacao_baixa?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Movimentacao {
  id: string;
  equipamento_id: string;
  equipamento_codigo: string;
  equipamento_nome: string;
  tipo: MovementType;
  origem_setor_id?: string;
  origem_setor_nome?: string;
  origem_local_id?: string;
  origem_local_nome?: string;
  origem_responsavel?: string;
  destino_setor_id?: string;
  destino_setor_nome?: string;
  destino_local_id?: string;
  destino_local_nome?: string;
  destino_responsavel?: string;
  status_anterior?: EquipmentStatus;
  status_novo?: EquipmentStatus;
  usuario_id: string;
  usuario_nome: string;
  motivo?: string;
  observacoes?: string;
  created_at: string;
}

export interface Manutencao {
  id: string;
  equipamento_id: string;
  equipamento_codigo: string;
  equipamento_nome: string;
  problema: string;
  descricao: string;
  responsavel_abertura: string;
  tecnico_responsavel?: string;
  data_entrada: string;
  previsao_retorno?: string;
  custo_estimado?: number;
  data_saida?: string;
  servico_realizado?: string;
  pecas_utilizadas?: string;
  custo_real?: number;
  status_retorno?: EquipmentStatus;
  observacoes?: string;
  concluida: boolean;
  usuario_id: string;
  usuario_nome: string;
  created_at: string;
  updated_at: string;
}

export interface Conferencia {
  id: string;
  titulo: string;
  setor_id?: string;
  setor_nome?: string;
  local_id?: string;
  local_nome?: string;
  categoria_id?: string;
  categoria_nome?: string;
  total_esperados: number;
  total_encontrados: number;
  total_pendentes: number;
  status: 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA';
  usuario_id: string;
  usuario_nome: string;
  observacoes?: string;
  data_inicio: string;
  data_fim?: string;
  itens?: ConferenciaItem[];
  created_at: string;
}

export interface ConferenciaItem {
  id: string;
  conferencia_id: string;
  equipamento_id: string;
  equipamento_codigo: string;
  equipamento_nome: string;
  setor_nome: string;
  local_nome: string;
  responsavel: string;
  status_equipamento: EquipmentStatus;
  encontrado: boolean;
  data_bipagem?: string;
  bipado_por?: string;
  divergente?: boolean;
}

export interface HistoricoEvento {
  id: string;
  equipamento_id: string;
  titulo: string;
  descricao: string;
  tipo: MovementType;
  usuario_nome: string;
  data_hora: string;
  icone?: string;
  badge_color?: string;
}

export interface AuditoriaLog {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string;
  acao: string;
  entidade: 'equipamentos' | 'usuarios' | 'manutencoes' | 'conferencias' | 'configuracoes' | 'permissoes' | 'movimentacoes';
  registro_id: string;
  registro_codigo?: string;
  detalhes: string;
  dados_anteriores?: any;
  dados_novos?: any;
  ip?: string;
  created_at: string;
}

export interface ConfiguracoesSistema {
  id: string;
  empresa_nome: string;
  empresa_cnpj?: string;
  prefixo_patrimonio: string;
  sequencial_atual: number;
  digitos_sequencial: number; // e.g. 6 -> PAT-000001
  som_ativo: boolean;
  volume_som: number; // 0 a 1
  auto_limpar_scanner_segundos: number;
  modelo_etiqueta_padrao: LabelTemplate;
  supabase_url?: string;
  supabase_anon_key?: string;
  modo_offline_ativo: boolean;
  onboarding_completo: boolean;
  updated_at: string;
}

export type LabelTemplate = 
  | 'PADRAO_50X30' 
  | 'COMPLETA_70X40' 
  | 'HIBRIDA_70X40' 
  | 'HIBRIDA_50X30' 
  | 'COMPACTA_40X20' 
  | 'FOLHA_A4_GRADE';


export interface LabelPrintOptions {
  template: LabelTemplate;
  includeCompany: boolean;
  includeName: boolean;
  includeCode: boolean;
  includeBarcode: boolean;
  includeSector: boolean;
  includeSerial: boolean;
  copiesPerItem: number;
}
