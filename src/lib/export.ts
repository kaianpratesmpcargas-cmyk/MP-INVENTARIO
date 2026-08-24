// ==========================================
// MP CARGAS - Exportador Excel (XLSX) e CSV
// ==========================================

import * as XLSX from 'xlsx';
import { Equipamento, Movimentacao, Manutencao, Conferencia } from '../types';

/**
 * Exporta lista de equipamentos para arquivo Excel (.xlsx)
 */
export function exportEquipmentsToExcel(equipamentos: Equipamento[], filename: string = 'inventario_mp_cargas.xlsx') {
  const data = equipamentos.map(eq => ({
    'Código Patrimonial': eq.codigo_patrimonial,
    'Código de Barras': eq.codigo_barras,
    'Equipamento': eq.nome,
    'Categoria': eq.categoria_nome || '',
    'Marca': eq.marca || '',
    'Modelo': eq.modelo || '',
    'Número de Série': eq.numero_serie || '',
    'Setor': eq.setor_nome || '',
    'Local': eq.local_nome || '',
    'Responsável': eq.responsavel || '',
    'Status': eq.status,
    'Data de Aquisição': eq.data_aquisicao || '',
    'Valor (R$)': eq.valor_aquisicao || 0,
    'Fornecedor': eq.fornecedor || '',
    'Garantia (Meses)': eq.garantia_meses || '',
    'Observações': eq.observacoes || '',
    'Data de Cadastro': new Date(eq.created_at).toLocaleDateString('pt-BR'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventário');

  // Ajusta largura automática das colunas
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 15),
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, filename);
}

/**
 * Exporta dados para CSV
 */
export function exportToCSV(data: any[], filename: string = 'export_mp_cargas.csv') {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta Movimentações para Excel
 */
export function exportMovementsToExcel(movimentacoes: Movimentacao[], filename: string = 'movimentacoes_mp_cargas.xlsx') {
  const data = movimentacoes.map(m => ({
    'Data/Hora': new Date(m.created_at).toLocaleString('pt-BR'),
    'Código': m.equipamento_codigo,
    'Equipamento': m.equipamento_nome,
    'Tipo': m.tipo,
    'Setor Origem': m.origem_setor_nome || '-',
    'Local Origem': m.origem_local_nome || '-',
    'Resp. Origem': m.origem_responsavel || '-',
    'Setor Destino': m.destino_setor_nome || '-',
    'Local Destino': m.destino_local_nome || '-',
    'Resp. Destino': m.destino_responsavel || '-',
    'Usuário': m.usuario_nome,
    'Motivo': m.motivo || '',
    'Observações': m.observacoes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimentações');
  XLSX.writeFile(workbook, filename);
}
