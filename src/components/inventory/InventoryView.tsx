import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { Equipamento, EquipmentStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { exportEquipmentsToExcel, exportToCSV } from '../../lib/export';
import { generateInventoryReportPDF, generateLabelsPDF } from '../../lib/pdf';
import {
  Search,
  Plus,
  Printer,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckSquare,
  Square,
  Eye,
  MoreVertical,
  ArrowLeftRight,
  Wrench,
  RotateCcw,
  Trash2,
  Edit3,
  Tags,
  Download,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface InventoryViewProps {
  onOpenNewEquipment: () => void;
  onViewDetails: (eq: Equipamento) => void;
  onOpenTransfer: (eq: Equipamento) => void;
  onOpenMaintenance: (eq: Equipamento) => void;
  onOpenFinishMaintenance: (eq: Equipamento) => void;
  onOpenStatusChange: (eq: Equipamento) => void;
  onOpenDecommission: (eq: Equipamento) => void;
  onOpenEdit: (eq: Equipamento) => void;
  onNavigateToLabels: (selectedIds?: string[]) => void;
  onNavigateToConference: () => void;
  initialFilter?: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  onOpenNewEquipment,
  onViewDetails,
  onOpenTransfer,
  onOpenMaintenance,
  onOpenFinishMaintenance,
  onOpenStatusChange,
  onOpenDecommission,
  onOpenEdit,
  onNavigateToLabels,
  onNavigateToConference,
  initialFilter,
}) => {
  const { equipamentos, setores, categorias, manutencoes } = useInventory();
  const { hasPermission } = useAuth();

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(() => {
    if (initialFilter && ['EM USO', 'EM ESTOQUE', 'EM MANUTENÇÃO', 'DANIFICADO', 'AGUARDANDO DESCARTE', 'BAIXADO'].includes(initialFilter)) {
      return initialFilter;
    }
    return 'TODOS';
  });
  const [selectedSetor, setSelectedSetor] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [specialFilter, setSpecialFilter] = useState<string>(() => {
    if (initialFilter && ['noResponsible', 'noLocation', 'awaitingDiscard'].includes(initialFilter)) {
      return initialFilter;
    }
    return '';
  });

  // Seleção múltipla para lote
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtragem
  const filteredEquipamentos = useMemo(() => {
    return equipamentos.filter(eq => {
      // Busca texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesCode = eq.codigo_patrimonial.toLowerCase().includes(q);
        const matchesBarcode = eq.codigo_barras.toLowerCase().includes(q);
        const matchesName = eq.nome.toLowerCase().includes(q);
        const matchesBrand = (eq.marca || '').toLowerCase().includes(q);
        const matchesModel = (eq.modelo || '').toLowerCase().includes(q);
        const matchesSerial = (eq.numero_serie || '').toLowerCase().includes(q);
        const matchesSector = (eq.setor_nome || '').toLowerCase().includes(q);
        const matchesLocation = (eq.local_nome || '').toLowerCase().includes(q);
        const matchesResp = (eq.responsavel || '').toLowerCase().includes(q);

        if (!matchesCode && !matchesBarcode && !matchesName && !matchesBrand && !matchesModel && !matchesSerial && !matchesSector && !matchesLocation && !matchesResp) {
          return false;
        }
      }

      // Filtro Status
      if (selectedStatus !== 'TODOS' && eq.status !== selectedStatus) {
        return false;
      }

      // Filtro Setor
      if (selectedSetor && eq.setor_id !== selectedSetor) {
        return false;
      }

      // Filtro Categoria
      if (selectedCategoria && eq.categoria_id !== selectedCategoria) {
        return false;
      }

      // Filtros Especiais
      if (specialFilter === 'noResponsible' && eq.responsavel && eq.responsavel.trim() !== '') {
        return false;
      }
      if (specialFilter === 'noLocation' && eq.local_id && eq.local_id.trim() !== '') {
        return false;
      }
      if (specialFilter === 'awaitingDiscard' && eq.status !== 'AGUARDANDO DESCARTE') {
        return false;
      }

      return true;
    });
  }, [equipamentos, searchTerm, selectedStatus, selectedSetor, selectedCategoria, specialFilter]);

  // Itens paginados
  const totalPages = Math.ceil(filteredEquipamentos.length / itemsPerPage) || 1;
  const paginatedEquipamentos = filteredEquipamentos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Toggle de seleção
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = () => {
    const pageIds = paginatedEquipamentos.map(e => e.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Exportações
  const handleExportExcel = () => {
    exportEquipmentsToExcel(filteredEquipamentos, 'inventario_mp_cargas.xlsx');
  };

  const handleExportCSV = () => {
    const exportData = filteredEquipamentos.map(e => ({
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
    exportToCSV(exportData, 'inventario_mp_cargas.csv');
  };

  const handleExportPDF = () => {
    const doc = generateInventoryReportPDF(
      filteredEquipamentos,
      'Relatório de Inventário e Controle Patrimonial',
      `Status: ${selectedStatus} | Setor: ${selectedSetor ? setores.find(s => s.id === selectedSetor)?.nome : 'Todos'}`
    );
    doc.save('relatorio_inventario_mp_cargas.pdf');
  };

  // Impressão rápida individual
  const handleQuickPrint = async (eq: Equipamento) => {
    try {
      const doc = await generateLabelsPDF([eq], {
        template: 'PADRAO_50X30',
        includeCompany: true,
        includeName: true,
        includeCode: true,
        includeBarcode: true,
        includeSector: true,
        includeSerial: true,
        copiesPerItem: 1,
      });
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  const statusTabs = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'EM USO', label: 'Em Uso' },
    { key: 'EM ESTOQUE', label: 'Em Estoque' },
    { key: 'EM MANUTENÇÃO', label: 'Em Manutenção' },
    { key: 'DANIFICADO', label: 'Danificados' },
    { key: 'AGUARDANDO DESCARTE', label: 'Aguardando Descarte' },
    { key: 'BAIXADO', label: 'Baixados' },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Topo: Título + Botões de Ação Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
            Inventário de Patrimônios
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie todos os equipamentos, etiquetas e movimentações da MP CARGAS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Iniciar Conferência */}
          {hasPermission('conduct_conference') && (
            <button
              onClick={onNavigateToConference}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-zinc-800 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              <span>Conferência</span>
            </button>
          )}

          {/* Gerador de Etiquetas */}
          {hasPermission('generate_labels') && (
            <button
              onClick={() => onNavigateToLabels(selectedIds.length > 0 ? selectedIds : undefined)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black text-yellow-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Tags className="w-4 h-4" />
              <span>Gerar Etiquetas {selectedIds.length > 0 && `(${selectedIds.length})`}</span>
            </button>
          )}

          {/* Menu Exportar Dropdown */}
          <div className="relative group">
            <button
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-zinc-700 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exportar</span>
            </button>
            <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 hidden group-hover:block z-30 animate-fadeIn">
              <button
                onClick={handleExportExcel}
                className="w-full text-left px-3.5 py-2 text-xs text-zinc-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Excel (.xlsx)</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-3.5 py-2 text-xs text-zinc-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full text-left px-3.5 py-2 text-xs text-zinc-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Printer className="w-4 h-4 text-red-600" />
                <span>Relatório PDF</span>
              </button>
            </div>
          </div>

          {/* Botão Novo Equipamento */}
          {hasPermission('create_equipment') && (
            <button
              onClick={onOpenNewEquipment}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-yellow-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>+ NOVO EQUIPAMENTO</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca Rápida */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        {/* Barra de Busca de Alta Velocidade */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por código (PAT-XXXXXX), equipamento, série, setor, local ou responsável..."
            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-zinc-900 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Abas de Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {statusTabs.map(tab => {
            const isSelected = selectedStatus === tab.key;
            const count = tab.key === 'TODOS'
              ? equipamentos.length
              : equipamentos.filter(e => e.status === tab.key).length;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedStatus(tab.key);
                  setSpecialFilter('');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-slate-100/70 hover:bg-slate-200/60 text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-yellow-400 text-black font-bold' : 'bg-slate-200/80 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dropdowns de Filtro Adicional */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Setor */}
          <div>
            <select
              value={selectedSetor}
              onChange={e => {
                setSelectedSetor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 focus:bg-white"
            >
              <option value="">Todos os Setores</option>
              {setores.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div>
            <select
              value={selectedCategoria}
              onChange={e => {
                setSelectedCategoria(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 focus:bg-white"
            >
              <option value="">Todas as Categorias</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Filtros Especiais / Alertas */}
          <div>
            <select
              value={specialFilter}
              onChange={e => {
                setSpecialFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 focus:bg-white font-medium"
            >
              <option value="">Filtros Especiais (Nenhum)</option>
              <option value="noResponsible">⚠ Sem Responsável Definido</option>
              <option value="noLocation">⚠ Sem Localização Física</option>
              <option value="awaitingDiscard">⚠ Aguardando Descarte</option>
            </select>
          </div>
        </div>
      </div>

      {/* Barra Flutuante de Seleção em Lote */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-zinc-900 text-white rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs animate-fadeIn border border-yellow-400/30">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center font-mono text-[10px]">
              {selectedIds.length}
            </span>
            <span className="font-bold">equipamento(s) selecionado(s) para impressão em lote</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToLabels(selectedIds)}
              className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir {selectedIds.length} Etiquetas</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
            >
              Limpar Seleção
            </button>
          </div>
        </div>
      )}

      {/* Tabela de Inventário */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {paginatedEquipamentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 pl-4 w-10 text-center">
                    <button
                      onClick={handleSelectAllOnPage}
                      className="text-slate-400 hover:text-zinc-900"
                    >
                      {paginatedEquipamentos.every(e => selectedIds.includes(e.id)) ? (
                        <CheckSquare className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5">Código PAT</th>
                  <th className="p-3.5">Equipamento</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5">Localização</th>
                  <th className="p-3.5">Responsável</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEquipamentos.map(eq => {
                  const isSelected = selectedIds.includes(eq.id);
                  const isMenuOpen = activeActionMenuId === eq.id;
                  const activeTicket = manutencoes.find(m => m.equipamento_id === eq.id && !m.concluida);

                  return (
                    <tr
                      key={eq.id}
                      className={`hover:bg-amber-50/20 transition-colors ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 pl-4 text-center">
                        <button
                          onClick={() => handleToggleSelect(eq.id)}
                          className="text-slate-400 hover:text-zinc-900"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Código PAT */}
                      <td className="p-3.5">
                        <div
                          onClick={() => onViewDetails(eq)}
                          className="font-mono font-black text-zinc-900 hover:text-yellow-600 cursor-pointer flex items-center gap-1.5"
                        >
                          <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-900">
                            {eq.codigo_patrimonial}
                          </span>
                        </div>
                        {eq.numero_serie && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            S/N: {eq.numero_serie}
                          </div>
                        )}
                      </td>

                      {/* Equipamento */}
                      <td className="p-3.5 max-w-xs">
                        <div
                          onClick={() => onViewDetails(eq)}
                          className="font-bold text-zinc-900 hover:underline cursor-pointer truncate"
                        >
                          {eq.nome}
                        </div>
                        {(eq.marca || eq.modelo) && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {eq.marca} {eq.modelo}
                          </div>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="p-3.5">
                        <span className="inline-block text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {eq.categoria_nome || '-'}
                        </span>
                      </td>

                      {/* Localização */}
                      <td className="p-3.5">
                        <div className="font-semibold text-zinc-800">{eq.setor_nome || 'Sem setor'}</div>
                        <div className="text-[11px] text-slate-400">{eq.local_nome || 'Sem local'}</div>
                      </td>

                      {/* Responsável */}
                      <td className="p-3.5">
                        {eq.responsavel ? (
                          <span className="text-zinc-800 font-medium">{eq.responsavel}</span>
                        ) : (
                          <span className="text-amber-600 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Sem responsável
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        <StatusBadge status={eq.status} size="sm" />
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right pr-4">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Imprimir Etiqueta */}
                          <button
                            onClick={() => handleQuickPrint(eq)}
                            title="Imprimir Etiqueta Code 128"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-black hover:bg-yellow-400 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Ver Detalhes */}
                          <button
                            onClick={() => onViewDetails(eq)}
                            title="Visualizar Ficha Técnica"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Ações Operacionais */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveActionMenuId(isMenuOpen ? null : eq.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100 transition-colors"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {isMenuOpen && (
                              <div
                                className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 text-left animate-fadeIn"
                                onMouseLeave={() => setActiveActionMenuId(null)}
                              >
                                {hasPermission('transfer_equipment') && eq.status !== 'BAIXADO' && (
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenTransfer(eq);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-zinc-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Transferir</span>
                                  </button>
                                )}

                                {hasPermission('open_maintenance') && eq.status !== 'EM MANUTENÇÃO' && eq.status !== 'BAIXADO' && (
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenMaintenance(eq);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-zinc-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Enviar Manutenção</span>
                                  </button>
                                )}

                                {hasPermission('finish_maintenance') && eq.status === 'EM MANUTENÇÃO' && activeTicket && (
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenFinishMaintenance(eq);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-emerald-700 font-bold hover:bg-emerald-50 flex items-center gap-2"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Finalizar Manutenção</span>
                                  </button>
                                )}

                                {hasPermission('edit_equipment') && eq.status !== 'BAIXADO' && (
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenStatusChange(eq);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-zinc-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <span>Alterar Status</span>
                                  </button>
                                )}

                                {hasPermission('edit_equipment') && (
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenEdit(eq);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-zinc-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-yellow-600" />
                                    <span>Editar Dados</span>
                                  </button>
                                )}

                                {hasPermission('decommission_equipment') && eq.status !== 'BAIXADO' && (
                                  <button
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenDecommission(eq);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                    <span>Dar Baixa</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhum equipamento encontrado"
            description={
              searchTerm || selectedStatus !== 'TODOS' || selectedSetor || selectedCategoria || specialFilter
                ? 'Nenhum equipamento corresponde aos filtros aplicados. Tente ajustar os termos da busca.'
                : 'Seu inventário ainda está vazio. Comece cadastrando seu primeiro equipamento.'
            }
            actionText={hasPermission('create_equipment') ? '+ Cadastrar Equipamento' : undefined}
            onAction={onOpenNewEquipment}
          />
        )}

        {/* Rodapé da Tabela com Paginação */}
        {filteredEquipamentos.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Mostrando <strong className="text-zinc-800">{paginatedEquipamentos.length}</strong> de <strong className="text-zinc-800">{filteredEquipamentos.length}</strong> equipamentos
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-zinc-800">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
