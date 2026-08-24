import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Equipamento, LabelTemplate, LabelPrintOptions } from '../../types';
import { Barcode } from '../common/Barcode';
import { Modal } from '../common/Modal';
import { generateLabelsPDF } from '../../lib/pdf';
import { generateBatchZPL, downloadZPLFile, copyZPLToClipboard } from '../../lib/zpl';
import {
  Tags,
  Printer,
  FileDown,
  CheckSquare,
  Square,
  Search,
  Filter,
  Grid,
  Sparkles,
  Layers,
  Layout,
  Code,
  Copy,
  QrCode,
} from 'lucide-react';

interface LabelsViewProps {
  initialSelectedIds?: string[];
}

export const LabelsView: React.FC<LabelsViewProps> = ({ initialSelectedIds = [] }) => {
  const { equipamentos, setores, categorias, configuracoes } = useInventory();

  // Seleções
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [template, setTemplate] = useState<LabelTemplate>(configuracoes.modelo_etiqueta_padrao || 'PADRAO_50X30');
  const [copiesPerItem, setCopiesPerItem] = useState<number>(1);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetor, setSelectedSetor] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Opções do Modelo
  const [includeCompany, setIncludeCompany] = useState(true);
  const [includeName, setIncludeName] = useState(true);
  const [includeCode, setIncludeCode] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includeSector, setIncludeSector] = useState(true);
  const [includeSerial, setIncludeSerial] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isZPLModalOpen, setIsZPLModalOpen] = useState(false);
  const [zplCopied, setZplCopied] = useState(false);

  // Filtra equipamentos
  const filteredEquipamentos = useMemo(() => {
    return equipamentos.filter(eq => {
      if (eq.status === 'BAIXADO') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesCode = eq.codigo_patrimonial.toLowerCase().includes(q);
        const matchesName = eq.nome.toLowerCase().includes(q);
        if (!matchesCode && !matchesName) return false;
      }

      if (selectedSetor && eq.setor_id !== selectedSetor) return false;
      if (selectedCategoria && eq.categoria_id !== selectedCategoria) return false;
      if (selectedStatus && eq.status !== selectedStatus) return false;

      return true;
    });
  }, [equipamentos, searchTerm, selectedSetor, selectedCategoria, selectedStatus]);

  // Itens selecionados para impressão
  const itemsToPrint = useMemo(() => {
    if (selectedIds.length === 0) return [];
    return equipamentos.filter(e => selectedIds.includes(e.id));
  }, [equipamentos, selectedIds]);

  // Toggle de seleção
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredEquipamentos.map(e => e.id);
    const isAllSelected = allFilteredIds.every(id => selectedIds.includes(id));

    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const printOptions: LabelPrintOptions = {
    template,
    includeCompany,
    includeName,
    includeCode,
    includeBarcode,
    includeSector,
    includeSerial,
    copiesPerItem,
  };

  // Gerar e Imprimir PDF
  const handlePrint = async () => {
    if (itemsToPrint.length === 0) return;
    setIsGenerating(true);
    try {
      const doc = await generateLabelsPDF(itemsToPrint, printOptions, configuracoes.empresa_nome);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Baixar PDF
  const handleDownloadPDF = async () => {
    if (itemsToPrint.length === 0) return;
    setIsGenerating(true);
    try {
      const doc = await generateLabelsPDF(itemsToPrint, printOptions, configuracoes.empresa_nome);
      doc.save(`etiquetas_mp_cargas_${itemsToPrint.length}_itens.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Exemplo para preview
  const sampleEquipment = itemsToPrint.length > 0 ? itemsToPrint[0] : (equipamentos[0] || null);

  const zplOutput = useMemo(() => {
    const list = itemsToPrint.length > 0 ? itemsToPrint : (sampleEquipment ? [sampleEquipment] : []);
    return generateBatchZPL(list, configuracoes.empresa_nome, template, copiesPerItem);
  }, [itemsToPrint, sampleEquipment, configuracoes.empresa_nome, template, copiesPerItem]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <Tags className="w-6 h-6 text-yellow-500" />
            <span>Gerador & Impressão de Etiquetas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gere etiquetas industriais em padrão <strong>Code 128 + QR Code Híbrido</strong> para impressoras térmicas P&B (PDF ou ZPL direto) ou folhas A4.
          </p>
        </div>

        {/* Botões de Ação Superior */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsZPLModalOpen(true)}
            disabled={itemsToPrint.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-yellow-400 font-mono font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
            title="Exportar comandos nativos para impressoras Zebra"
          >
            <Code className="w-4 h-4" />
            <span>EXPORTAR ZPL ({itemsToPrint.length})</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={itemsToPrint.length === 0 || isGenerating}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            <FileDown className="w-4 h-4 text-yellow-400" />
            <span>BAIXAR PDF ({itemsToPrint.length * copiesPerItem})</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={itemsToPrint.length === 0 || isGenerating}
            className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-yellow-glow transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            <span>IMPRIMIR ETIQUETAS</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Seleção de Modelos & Configuração (Esq) + Preview Visual (Dir) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 e 2: Seleção e Opções */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Seleção do Modelo de Etiqueta */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                <Layout className="w-4 h-4 text-yellow-500" />
                <span>1. Formato & Modelo da Etiqueta</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Padrão Térmico P&B / Zebra</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Modelo 1: Padrão 50x30 */}
              <div
                onClick={() => setTemplate('PADRAO_50X30')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all text-center ${
                  template === 'PADRAO_50X30'
                    ? 'border-yellow-400 bg-amber-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-zinc-900 mb-1">Padrão MP (Code 128)</div>
                <div className="text-[10px] text-slate-500 font-mono">50 x 30 mm</div>
                <div className="text-[9px] text-yellow-700 font-semibold mt-1">Térmica / Rolo</div>
              </div>

              {/* Modelo 2: Híbrida 70x40 (Code 128 + QR Code) */}
              <div
                onClick={() => setTemplate('HIBRIDA_70X40')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all text-center ${
                  template === 'HIBRIDA_70X40'
                    ? 'border-yellow-400 bg-amber-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-zinc-900 mb-1 flex items-center justify-center gap-1">
                  <QrCode className="w-3 h-3 text-yellow-600" />
                  <span>Híbrida 70x40</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">70 x 40 mm</div>
                <div className="text-[9px] text-emerald-600 font-semibold mt-1">Barras + QR Code</div>
              </div>

              {/* Modelo 3: Híbrida 50x30 */}
              <div
                onClick={() => setTemplate('HIBRIDA_50X30')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all text-center ${
                  template === 'HIBRIDA_50X30'
                    ? 'border-yellow-400 bg-amber-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-zinc-900 mb-1 flex items-center justify-center gap-1">
                  <QrCode className="w-3 h-3 text-yellow-600" />
                  <span>Híbrida 50x30</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">50 x 30 mm</div>
                <div className="text-[9px] text-emerald-600 font-semibold mt-1">Barras + Mini QR</div>
              </div>

              {/* Modelo 4: Detalhada 70x40 */}
              <div
                onClick={() => setTemplate('COMPLETA_70X40')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all text-center ${
                  template === 'COMPLETA_70X40'
                    ? 'border-yellow-400 bg-amber-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-zinc-900 mb-1">Detalhada S/N</div>
                <div className="text-[10px] text-slate-500 font-mono">70 x 40 mm</div>
                <div className="text-[9px] text-slate-500 mt-1">Com S/N e Setor</div>
              </div>

              {/* Modelo 5: Compacta 40x20 */}
              <div
                onClick={() => setTemplate('COMPACTA_40X20')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all text-center ${
                  template === 'COMPACTA_40X20'
                    ? 'border-yellow-400 bg-amber-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-zinc-900 mb-1">Compacta</div>
                <div className="text-[10px] text-slate-500 font-mono">40 x 20 mm</div>
                <div className="text-[9px] text-slate-500 mt-1">Mini Ativos</div>
              </div>

              {/* Modelo 6: Folha A4 Grade */}
              <div
                onClick={() => setTemplate('FOLHA_A4_GRADE')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all text-center ${
                  template === 'FOLHA_A4_GRADE'
                    ? 'border-yellow-400 bg-amber-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-zinc-900 mb-1">Folha A4 (Grade)</div>
                <div className="text-[10px] text-slate-500 font-mono">Grade 24 un</div>
                <div className="text-[9px] text-blue-600 font-semibold mt-1">Pimaco / Laser</div>
              </div>
            </div>

            {/* Cópias por item */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="font-semibold text-zinc-700">Cópias por equipamento:</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setCopiesPerItem(num)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-colors ${
                      copiesPerItem === num
                        ? 'bg-zinc-900 text-yellow-400'
                        : 'bg-slate-100 text-zinc-600 hover:bg-slate-200'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Seleção de Equipamentos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  2. Selecionar Patrimônios para Impressão ({itemsToPrint.length} selecionados)
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-zinc-700 transition-colors"
                >
                  {filteredEquipamentos.every(e => selectedIds.includes(e.id)) && filteredEquipamentos.length > 0
                    ? 'Desmarcar Todos'
                    : 'Selecionar Filtrados'}
                </button>
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-red-600 hover:underline font-medium"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Filtros Rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-yellow-400"
                />
              </div>

              <select
                value={selectedSetor}
                onChange={e => setSelectedSetor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-400"
              >
                <option value="">Todos os Setores</option>
                {setores.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>

              <select
                value={selectedCategoria}
                onChange={e => setSelectedCategoria(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-400"
              >
                <option value="">Todas as Categorias</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {/* Lista com Checkbox */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {filteredEquipamentos.map(eq => {
                const isChecked = selectedIds.includes(eq.id);
                return (
                  <div
                    key={eq.id}
                    onClick={() => handleToggleSelect(eq.id)}
                    className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                      isChecked ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 truncate">
                          <span className="font-mono text-yellow-600 mr-2">{eq.codigo_patrimonial}</span>
                          <span>{eq.nome}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {eq.setor_nome || 'Geral'} • {eq.responsavel || '-'}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 flex-shrink-0">
                      {eq.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna 3: Pré-Visualização Visual da Etiqueta */}
        <div className="space-y-4">
          <div className="bg-zinc-900 text-white p-5 rounded-2xl border border-zinc-800 shadow-lg sticky top-20">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Prévia Térmica P&B</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">{template}</span>
            </div>

            {sampleEquipment ? (
              <div className="flex flex-col items-center">
                {/* Mock Visual da Etiqueta Monocromática */}
                <div className="w-full max-w-[280px] bg-white text-black rounded-xl p-3.5 shadow-2xl border-2 border-dashed border-zinc-400 text-center transition-all animate-fadeIn">
                  {/* Topo Preto Sólido */}
                  <div className="bg-black text-white py-1 px-2 rounded-md font-black text-xs uppercase tracking-wider mb-1.5 shadow-xs">
                    {configuracoes.empresa_nome}
                  </div>

                  {/* Nome do Equipamento */}
                  <div className="font-bold text-xs text-black truncate mb-1">
                    {sampleEquipment.nome}
                  </div>

                  {/* Renderização Híbrida ou Padrão */}
                  {template.startsWith('HIBRIDA') ? (
                    <div className="flex items-center justify-between gap-1 py-1 bg-white">
                      <div className="flex-1 overflow-hidden">
                        <Barcode
                          value={sampleEquipment.codigo_patrimonial}
                          width={1.5}
                          height={40}
                          fontSize={10}
                          lineColor="#000000"
                        />
                      </div>
                      <div className="w-12 h-12 border border-black rounded p-1 flex flex-col items-center justify-center font-mono text-[7px] text-black">
                        <QrCode className="w-6 h-6 text-black" />
                        <span>QR-2D</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-1 bg-white flex justify-center overflow-hidden">
                      <Barcode
                        value={sampleEquipment.codigo_patrimonial}
                        width={1.8}
                        height={45}
                        fontSize={11}
                        lineColor="#000000"
                      />
                    </div>
                  )}

                  {/* Rodapé em Preto Puro */}
                  <div className="text-[9px] font-semibold text-black pt-1.5 border-t border-zinc-300 mt-1 font-sans flex items-center justify-between">
                    <span className="truncate max-w-[130px]">{sampleEquipment.setor_nome || 'MP CARGAS'}</span>
                    <span className="font-mono text-[8px] bg-zinc-100 px-1 py-0.5 rounded text-zinc-800">P&B Térmica</span>
                  </div>
                </div>

                <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] text-center font-medium">
                  ✓ Alto Contraste & Quiet Zone (100% Leitor/Bipador)
                </div>

                <div className="mt-4 text-center text-xs text-zinc-400">
                  Total de etiquetas a emitir:{' '}
                  <strong className="text-yellow-400 font-mono text-sm">
                    {itemsToPrint.length * copiesPerItem}
                  </strong>
                </div>

                <div className="w-full space-y-2 pt-4 mt-4 border-t border-zinc-800">
                  <button
                    onClick={handlePrint}
                    disabled={itemsToPrint.length === 0 || isGenerating}
                    className="w-full py-2.5 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider shadow-yellow-glow flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-40"
                  >
                    <Printer className="w-4 h-4" />
                    <span>IMPRIMIR AGORA</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadPDF}
                      disabled={itemsToPrint.length === 0 || isGenerating}
                      className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <FileDown className="w-3.5 h-3.5 text-yellow-400" />
                      <span>PDF</span>
                    </button>

                    <button
                      onClick={() => setIsZPLModalOpen(true)}
                      disabled={itemsToPrint.length === 0}
                      className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-yellow-400 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>ZPL ZEBRA</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-500">
                Nenhum equipamento selecionado para visualização.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Código ZPL */}
      <Modal
        isOpen={isZPLModalOpen}
        onClose={() => setIsZPLModalOpen(false)}
        title={`Comandos ZPL (Zebra) - ${itemsToPrint.length} Ativo(s)`}
        maxWidth="lg"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-500">
            Comandos ZPL nativos prontos para impressão industrial em alta velocidade em impressoras Zebra ZT230, ZD220, ZD420, Argox e Elgin.
          </p>

          <div className="relative bg-zinc-950 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] max-h-72 overflow-y-auto border border-zinc-800 shadow-inner">
            <pre className="whitespace-pre-wrap">{zplOutput}</pre>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={async () => {
                const ok = await copyZPLToClipboard(zplOutput);
                if (ok) {
                  setZplCopied(true);
                  setTimeout(() => setZplCopied(false), 2500);
                }
              }}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-yellow-400" />
              <span>{zplCopied ? 'COPIADO!' : 'COPIAR CÓDIGO ZPL'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                downloadZPLFile(`etiquetas_mp_cargas_${itemsToPrint.length}_itens.zpl`, zplOutput);
              }}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold flex items-center gap-1.5 shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>BAIXAR ARQUIVO .ZPL</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
