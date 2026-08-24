// ==========================================
// MP CARGAS - Exportador Excel (.xlsx / .csv) Nativo Seguro
// ==========================================

import { Equipamento, Movimentacao } from '../types';

/**
 * Escapa células para formato CSV com delimitador ponto e vírgula (padrão Brasil/Excel)
 */
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Faz download de um blob no navegador
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta lista de equipamentos para arquivo Excel CSV compatível com Microsoft Excel
 */
export function exportEquipmentsToExcel(equipamentos: Equipamento[], filename: string = 'inventario_mp_cargas.csv') {
  const headers = [
    'Código Patrimonial',
    'Código de Barras',
    'Equipamento',
    'Categoria',
    'Marca',
    'Modelo',
    'Número de Série',
    'Setor',
    'Local',
    'Responsável',
    'Status',
    'Data de Aquisição',
    'Valor (R$)',
    'Fornecedor',
    'Garantia (Meses)',
    'Observações',
    'Data de Cadastro',
  ];

  const rows = equipamentos.map(eq => [
    escapeCSV(eq.codigo_patrimonial),
    escapeCSV(eq.codigo_barras),
    escapeCSV(eq.nome),
    escapeCSV(eq.categoria_nome || ''),
    escapeCSV(eq.marca || ''),
    escapeCSV(eq.modelo || ''),
    escapeCSV(eq.numero_serie || ''),
    escapeCSV(eq.setor_nome || ''),
    escapeCSV(eq.local_nome || ''),
    escapeCSV(eq.responsavel || ''),
    escapeCSV(eq.status),
    escapeCSV(eq.data_aquisicao || ''),
    escapeCSV(Number(eq.valor_aquisicao || 0).toFixed(2)),
    escapeCSV(eq.fornecedor || ''),
    escapeCSV(eq.garantia_meses || 0),
    escapeCSV(eq.observacoes || ''),
    escapeCSV(new Date(eq.created_at).toLocaleDateString('pt-BR')),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename.replace(/\.xlsx$/, '')}.csv`);
}

/**
 * Exporta dados genéricos para CSV
 */
export function exportToCSV(data: any[], filename: string = 'export_mp_cargas.csv') {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(h => escapeCSV(item[h])));

  const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Exporta Movimentações para Excel CSV
 */
export function exportMovementsToExcel(movimentacoes: Movimentacao[], filename: string = 'movimentacoes_mp_cargas.csv') {
  const headers = [
    'Data/Hora',
    'Código',
    'Equipamento',
    'Tipo',
    'Setor Origem',
    'Local Origem',
    'Resp. Origem',
    'Setor Destino',
    'Local Destino',
    'Resp. Destino',
    'Usuário',
    'Motivo',
    'Observações',
  ];

  const rows = movimentacoes.map(m => [
    escapeCSV(new Date(m.created_at).toLocaleString('pt-BR')),
    escapeCSV(m.equipamento_codigo),
    escapeCSV(m.equipamento_nome),
    escapeCSV(m.tipo),
    escapeCSV(m.origem_setor_nome || '-'),
    escapeCSV(m.origem_local_nome || '-'),
    escapeCSV(m.origem_responsavel || '-'),
    escapeCSV(m.destino_setor_nome || '-'),
    escapeCSV(m.destino_local_nome || '-'),
    escapeCSV(m.destino_responsavel || '-'),
    escapeCSV(m.usuario_nome),
    escapeCSV(m.motivo || ''),
    escapeCSV(m.observacoes || ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename.replace(/\.xlsx$/, '')}.csv`);
}
