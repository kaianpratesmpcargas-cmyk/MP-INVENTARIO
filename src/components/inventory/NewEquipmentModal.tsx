import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Equipamento, EquipmentStatus } from '../../types';
import { Modal } from '../common/Modal';
import { Barcode } from '../common/Barcode';
import {
  Boxes,
  MapPin,
  FileText,
  Barcode as BarcodeIcon,
  Tag,
  DollarSign,
  Calendar,
  Building,
  ShieldAlert,
} from 'lucide-react';

interface NewEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEq: Equipamento) => void;
  initialPreFilledCode?: string;
}

export const NewEquipmentModal: React.FC<NewEquipmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPreFilledCode,
}) => {
  const {
    categorias,
    setores,
    locais,
    getNextCodePreview,
    createEquipamento,
    createCategoria,
    createSetor,
    createLocal,
  } = useInventory();

  // Preview de código PAT
  const [patCodePreview, setPatCodePreview] = useState('');

  // Form Fields
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');

  const [setorId, setSetorId] = useState('');
  const [localId, setLocalId] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('EM ESTOQUE');

  const [dataAquisicao, setDataAquisicao] = useState(new Date().toISOString().split('T')[0]);
  const [valorAquisicao, setValorAquisicao] = useState<number | ''>('');
  const [fornecedor, setFornecedor] = useState('');
  const [garantiaMeses, setGarantiaMeses] = useState<number | ''>('');
  const [observacoes, setObservacoes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Inicializa valores e preview de código
  useEffect(() => {
    if (isOpen) {
      const next = initialPreFilledCode || getNextCodePreview();
      setPatCodePreview(next);
      setErrorMsg('');

      // Auto-seleciona primeiro setor e categoria se vazios
      if (setores.length > 0 && !setorId) {
        setSetorId(setores[0].id);
        if (setores[0].responsavel_padrao) {
          setResponsavel(setores[0].responsavel_padrao);
        }
      }
      if (categorias.length > 0 && !categoriaId) {
        setCategoriaId(categorias[0].id);
      }
    }
  }, [isOpen, initialPreFilledCode, setores, categorias]);

  // Atualiza locais e responsável ao mudar setor
  useEffect(() => {
    if (setorId) {
      const filteredLocais = locais.filter(l => l.setor_id === setorId);
      if (filteredLocais.length > 0) {
        setLocalId(filteredLocais[0].id);
      } else {
        setLocalId('');
      }

      const selSetor = setores.find(s => s.id === setorId);
      if (selSetor?.responsavel_padrao && !responsavel) {
        setResponsavel(selSetor.responsavel_padrao);
      }
    }
  }, [setorId, locais, setores]);

  const availableLocais = locais.filter(l => l.setor_id === setorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nome.trim()) {
      setErrorMsg('Informe o nome do equipamento.');
      return;
    }

    if (!categoriaId) {
      setErrorMsg('Selecione uma categoria.');
      return;
    }

    if (!setorId) {
      setErrorMsg('Selecione o setor de alocação.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createEquipamento({
        nome: nome.trim(),
        categoria_id: categoriaId,
        marca: marca.trim(),
        modelo: modelo.trim(),
        numero_serie: numeroSerie.trim(),
        setor_id: setorId,
        local_id: localId,
        responsavel: responsavel.trim() || 'Almoxarifado',
        status,
        data_aquisicao: dataAquisicao,
        valor_aquisicao: valorAquisicao === '' ? 0 : Number(valorAquisicao),
        fornecedor: fornecedor.trim(),
        garantia_meses: garantiaMeses === '' ? 0 : Number(garantiaMeses),
        observacoes: observacoes.trim(),
      });

      // Limpa formulário
      setNome('');
      setMarca('');
      setModelo('');
      setNumeroSerie('');
      setObservacoes('');
      setValorAquisicao('');
      setFornecedor('');

      onClose();
      onSuccess(created);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao cadastrar equipamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-400 text-black">
            <Boxes className="w-5 h-5" />
          </div>
          <span>Cadastrar Novo Equipamento</span>
        </div>
      }
      subtitle="O sistema gerará automaticamente o código patrimonial e a etiqueta Code 128."
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. SEÇÃO PATRIMÔNIO & CÓDIGO AUTOMÁTICO */}
        <div className="p-4 bg-zinc-900 text-white rounded-2xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">
              <BarcodeIcon className="w-4 h-4" />
              <span>Código Patrimonial & Identidade Física</span>
            </div>
            <div className="text-2xl font-black font-mono text-white tracking-wider">
              {patCodePreview || 'PAT-000001'}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Geração sequencial contínua • Padrão <strong>Code 128</strong>
            </p>
          </div>

          <div className="bg-white p-2 rounded-xl border border-zinc-700 shadow-sm flex items-center justify-center">
            <Barcode
              value={patCodePreview || 'PAT-000001'}
              width={1.5}
              height={36}
              fontSize={11}
            />
          </div>
        </div>

        {/* 2. SEÇÃO IDENTIFICAÇÃO */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5 pb-1 border-b border-slate-100">
            <Tag className="w-3.5 h-3.5 text-yellow-600" />
            <span>1. Identificação do Equipamento</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Nome do Equipamento *
              </label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Notebook Dell Vostro 3520, Coletor Zebra TC21..."
                required
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Categoria *
              </label>
              <select
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
              >
                <option value="">Selecione uma categoria...</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Número de Série / Chassi
              </label>
              <input
                type="text"
                value={numeroSerie}
                onChange={e => setNumeroSerie(e.target.value)}
                placeholder="Ex: DL-8934201, SN-9901"
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Marca / Fabricante
              </label>
              <input
                type="text"
                value={marca}
                onChange={e => setMarca(e.target.value)}
                placeholder="Ex: Dell, Zebra, Toyota, Bosch"
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Modelo
              </label>
              <input
                type="text"
                value={modelo}
                onChange={e => setModelo(e.target.value)}
                placeholder="Ex: Vostro 3520 i7 16GB, TC21 Touch"
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* 3. SEÇÃO LOCALIZAÇÃO & STATUS */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5 pb-1 border-b border-slate-100">
            <MapPin className="w-3.5 h-3.5 text-yellow-600" />
            <span>2. Localização e Custódia</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Setor de Alocação *
              </label>
              <select
                value={setorId}
                onChange={e => setSetorId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
              >
                <option value="">Selecione o setor...</option>
                {setores.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Local Físico / Sala
              </label>
              <select
                value={localId}
                onChange={e => setLocalId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
              >
                <option value="">Selecione o local...</option>
                {availableLocais.map(l => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Responsável / Custodiante
              </label>
              <input
                type="text"
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
                placeholder="Ex: Carlos Mendes, João Silva"
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Status Inicial
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as EquipmentStatus)}
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white font-semibold"
              >
                <option value="EM ESTOQUE">EM ESTOQUE</option>
                <option value="EM USO">EM USO</option>
                <option value="EM MANUTENÇÃO">EM MANUTENÇÃO</option>
                <option value="DANIFICADO">DANIFICADO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Data de Aquisição
              </label>
              <input
                type="date"
                value={dataAquisicao}
                onChange={e => setDataAquisicao(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Valor de Aquisição (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={valorAquisicao}
                onChange={e => setValorAquisicao(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0,00"
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* 4. SEÇÃO DETALHES COMPLEMENTARES */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5 pb-1 border-b border-slate-100">
            <FileText className="w-3.5 h-3.5 text-yellow-600" />
            <span>3. Fornecedor e Observações</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Fornecedor / Loja
              </label>
              <input
                type="text"
                value={fornecedor}
                onChange={e => setFornecedor(e.target.value)}
                placeholder="Ex: Dell Brasil, Automação Distribuidora"
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Garantia (Meses)
              </label>
              <input
                type="number"
                value={garantiaMeses}
                onChange={e => setGarantiaMeses(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex: 12, 24, 36"
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Observações / Informações Técnicas
              </label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Detalhes adicionais, acessórios inclusos, notas fiscais..."
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-yellow-400 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Footer com Botões */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-sm uppercase tracking-wider shadow-yellow-glow transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? 'Gerando Código...' : 'CADASTRAR EQUIPAMENTO'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
