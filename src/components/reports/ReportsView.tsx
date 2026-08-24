import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Equipamento } from '../../types';
import { exportEquipmentsToExcel, exportToCSV } from '../../lib/export';
import { generateInventoryReportPDF } from '../../lib/pdf';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Printer,
  Boxes,
  Building,
  Activity,
  Wrench,
  Trash2,
  ArrowLeftRight,
  ClipboardCheck,
  UserX,
  MapPinOff,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { equipamentos, setores, categorias, movimentacoes, conferencias, manutencoes } = useInventory();

  const reportPresets = [
    {
      id: 'full',
      title: 'Inventário Geral Completo',
      description: 'Todos os equipamentos ativos e cadastrados no sistema com ficha completa.',
      count: equipamentos.filter(e => e.status !== 'BAIXADO').length,
      icon: Boxes,
      getItems: () => equipamentos.filter(e => e.status !== 'BAIXADO'),
    },
    {
      id: 'maintenance',
      title: 'Equipamentos em Manutenção',
      description: 'Itens na oficina técnica ou aguardando peças de reposição.',
      count: equipamentos.filter(e => e.status === 'EM MANUTENÇÃO').length,
      icon: Wrench,
      getItems: () => equipamentos.filter(e => e.status === 'EM MANUTENÇÃO'),
    },
    {
      id: 'in_use',
      title: 'Equipamentos em Operação (Em Uso)',
      description: 'Ativos alocados em setores operacionais com responsáveis definidos.',
      count: equipamentos.filter(e => e.status === 'EM USO').length,
      icon: Activity,
      getItems: () => equipamentos.filter(e => e.status === 'EM USO'),
    },
    {
      id: 'decommissioned',
      title: 'Patrimônios Baixados / Descartados',
      description: 'Histórico contábil de itens baixados por obsolescência, quebra ou perda.',
      count: equipamentos.filter(e => e.status === 'BAIXADO').length,
      icon: Trash2,
      getItems: () => equipamentos.filter(e => e.status === 'BAIXADO'),
    },
    {
      id: 'no_responsible',
      title: 'Alertas: Sem Responsável Definido',
      description: 'Equipamentos sem colaborador custodiante registrado.',
      count: equipamentos.filter(e => e.status !== 'BAIXADO' && (!e.responsavel || e.responsavel.trim() === '')).length,
      icon: UserX,
      getItems: () => equipamentos.filter(e => e.status !== 'BAIXADO' && (!e.responsavel || e.responsavel.trim() === '')),
    },
    {
      id: 'no_location',
      title: 'Alertas: Sem Localização Física',
      description: 'Equipamentos sem sala ou doca associada.',
      count: equipamentos.filter(e => e.status !== 'BAIXADO' && (!e.local_id || e.local_id.trim() === '')).length,
      icon: MapPinOff,
      getItems: () => equipamentos.filter(e => e.status !== 'BAIXADO' && (!e.local_id || e.local_id.trim() === '')),
    },
  ];

  const handleExportExcel = (title: string, items: Equipamento[]) => {
    exportEquipmentsToExcel(items, `${title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
  };

  const handleExportCSV = (title: string, items: Equipamento[]) => {
    const data = items.map(e => ({
      Codigo: e.codigo_patrimonial,
      Nome: e.nome,
      Categoria: e.categoria_nome,
      Marca: e.marca,
      Modelo: e.modelo,
      Serie: e.numero_serie,
      Setor: e.setor_nome,
      Local: e.local_nome,
      Responsavel: e.responsavel,
      Status: e.status,
      Valor: e.valor_aquisicao,
    }));
    exportToCSV(data, `${title.toLowerCase().replace(/\s+/g, '_')}.csv`);
  };

  const handleExportPDF = (title: string, items: Equipamento[]) => {
    const doc = generateInventoryReportPDF(items, title);
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-yellow-500" />
          <span>Central de Relatórios & Exportação</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Gere relatórios gerenciais e planilhas contábeis prontas para auditoria e controle patrimonial.
        </p>
      </div>

      {/* Grid de Relatórios Pré-Configurados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportPresets.map(preset => {
          const items = preset.getItems();

          return (
            <div
              key={preset.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-yellow-600">
                    <preset.icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono font-bold text-base text-zinc-900">
                    {preset.count} itens
                  </span>
                </div>

                <h3 className="font-bold text-sm text-zinc-900 mb-1">{preset.title}</h3>
                <p className="text-xs text-slate-500">{preset.description}</p>
              </div>

              {/* Botões de Exportação */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => handleExportExcel(preset.title, items)}
                  disabled={items.length === 0}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>

                <button
                  onClick={() => handleExportCSV(preset.title, items)}
                  disabled={items.length === 0}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={() => handleExportPDF(preset.title, items)}
                  disabled={items.length === 0}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-black text-yellow-400 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
