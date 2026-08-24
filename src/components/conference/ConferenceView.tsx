import React, { useState, useRef, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { Conferencia, ConferenciaItem } from '../../types';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import confetti from 'canvas-confetti';
import {
  ClipboardCheck,
  Play,
  CheckCircle2,
  AlertCircle,
  Scan,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Search,
  Building,
  MapPin,
  Calendar,
  Zap,
} from 'lucide-react';

export const ConferenceView: React.FC = () => {
  const {
    conferencias,
    setores,
    locais,
    categorias,
    createConferencia,
    beepConferenciaItem,
    finishConferencia,
    cancelConferencia,
  } = useInventory();
  const { hasPermission } = useAuth();

  // Estados
  const [activeSession, setActiveSession] = useState<Conferencia | null>(() => {
    return conferencias.find(c => c.status === 'EM_ANDAMENTO') || null;
  });

  // Modal Nova Conferência
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSetorId, setNewSetorId] = useState('');
  const [newLocalId, setNewLocalId] = useState('');
  const [newCategoriaId, setNewCategoriaId] = useState('');
  const [newObs, setNewObs] = useState('');

  // Bipagem na Sessão Ativa
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastBipFeedback, setLastBipFeedback] = useState<{ success: boolean; message: string; isDivergent?: boolean } | null>(null);
  const [filterMode, setFilterMode] = useState<'TODOS' | 'ENCONTRADOS' | 'PENDENTES' | 'DIVERGENTES'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Mantém foco no input durante conferência ativa
  useEffect(() => {
    if (activeSession && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [activeSession, lastBipFeedback]);

  // Sincroniza sessão ativa com o context
  useEffect(() => {
    if (activeSession) {
      const updated = conferencias.find(c => c.id === activeSession.id);
      if (updated) {
        setActiveSession(updated);
      }
    } else {
      const ongoing = conferencias.find(c => c.status === 'EM_ANDAMENTO');
      if (ongoing) setActiveSession(ongoing);
    }
  }, [conferencias]);

  const handleStartNewConference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const conf = await createConferencia(
        newTitle.trim(),
        newSetorId || undefined,
        newLocalId || undefined,
        newCategoriaId || undefined,
        newObs.trim() || undefined
      );
      setActiveSession(conf);
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewObs('');
      setLastBipFeedback(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBarcodeInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !barcodeInput.trim()) return;

    const raw = barcodeInput.trim();
    setBarcodeInput('');

    const res = await beepConferenciaItem(activeSession.id, raw);
    setLastBipFeedback({
      success: res.success,
      message: res.message,
      isDivergent: res.item?.divergente,
    });
  };

  const handleFinish = async () => {
    if (!activeSession) return;
    if (window.confirm('Deseja realmente finalizar esta conferência de estoque?')) {
      await finishConferencia(activeSession.id);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
      setActiveSession(null);
    }
  };

  const handleCancel = async () => {
    if (!activeSession) return;
    if (window.confirm('Deseja cancelar esta sessão de conferência?')) {
      await cancelConferencia(activeSession.id);
      setActiveSession(null);
    }
  };

  // Itens filtrados da sessão ativa
  const displayedItems = (activeSession?.itens || []).filter(item => {
    if (filterMode === 'ENCONTRADOS' && !item.encontrado) return false;
    if (filterMode === 'PENDENTES' && item.encontrado) return false;
    if (filterMode === 'DIVERGENTES' && !item.divergente) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.equipamento_codigo.toLowerCase().includes(q) ||
        item.equipamento_nome.toLowerCase().includes(q) ||
        item.responsavel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const availableLocais = locais.filter(l => l.setor_id === newSetorId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
            <span>Conferência de Inventário & Auditoria Física</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Realize contagens físicas no galpão, bipagem em lote de equipamentos e detecção de divergências.
          </p>
        </div>

        {!activeSession && hasPermission('conduct_conference') && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-yellow-glow transition-all hover:scale-[1.02]"
          >
            <Play className="w-4 h-4" />
            <span>INICIAR CONFERÊNCIA</span>
          </button>
        )}
      </div>

      {/* SESSÃO ATIVA EM ANDAMENTO (Requirement #34) */}
      {activeSession ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Card Principal da Sessão com Contadores em Tempo Real */}
          <div className="bg-zinc-900 text-white p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  CONFERÊNCIA EM ANDAMENTO
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">{activeSession.titulo}</h3>
                <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-3 mt-1">
                  {activeSession.setor_nome && <span>Setor: <strong className="text-yellow-400">{activeSession.setor_nome}</strong></span>}
                  {activeSession.local_nome && <span>Local: <strong className="text-zinc-200">{activeSession.local_nome}</strong></span>}
                  <span>Iniciada por: <strong className="text-zinc-200">{activeSession.usuario_nome}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleCancel}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                >
                  Cancelar Sessão
                </button>
                <button
                  onClick={handleFinish}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-[1.02]"
                >
                  CONCLUIR AUDITORIA
                </button>
              </div>
            </div>

            {/* Contadores em Destaque */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                  ESPERADOS
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono">
                  {activeSession.total_esperados}
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-emerald-500/30">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                  ENCONTRADOS
                </span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                  {activeSession.total_encontrados}
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-amber-500/30">
                <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest block mb-1">
                  PENDENTES
                </span>
                <div className="text-3xl sm:text-4xl font-black text-yellow-400 font-mono">
                  {activeSession.total_pendentes}
                </div>
              </div>
            </div>

            {/* Grande Campo de Bipagem Contínua da Conferência */}
            <form onSubmit={handleBarcodeInputSubmit} className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400 mb-2 text-center">
                ESTAÇÃO DE BIPAGEM CONTÍNUA • LEITOR USB / CÓDIGO
              </label>

              <div className="relative max-w-xl mx-auto">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  placeholder="Bipe o código do equipamento (ex: PAT-000001)..."
                  className="w-full bg-black border-2 border-yellow-400 text-center font-mono font-black text-xl text-yellow-300 rounded-2xl py-3.5 px-6 focus:outline-none focus:ring-4 focus:ring-yellow-400/20 placeholder:text-zinc-600 placeholder:text-sm placeholder:font-sans"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase rounded-xl transition-all"
                >
                  BIPAR
                </button>
              </div>
            </form>

            {/* Feedback da Última Bipagem */}
            {lastBipFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border animate-fadeIn ${
                  lastBipFeedback.success
                    ? lastBipFeedback.isDivergent
                      ? 'bg-amber-500/20 border-amber-500 text-yellow-300'
                      : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-red-500/20 border-red-500 text-red-300'
                }`}
              >
                {lastBipFeedback.success ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                )}
                <span>{lastBipFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Tabela de Itens da Conferência */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filtros */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold w-fit">
                <button
                  onClick={() => setFilterMode('TODOS')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterMode === 'TODOS' ? 'bg-zinc-900 text-white' : 'text-slate-600 hover:text-black'
                  }`}
                >
                  Todos ({activeSession.itens?.length || 0})
                </button>
                <button
                  onClick={() => setFilterMode('ENCONTRADOS')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterMode === 'ENCONTRADOS' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-black'
                  }`}
                >
                  Encontrados ({activeSession.total_encontrados})
                </button>
                <button
                  onClick={() => setFilterMode('PENDENTES')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterMode === 'PENDENTES' ? 'bg-amber-500 text-black font-extrabold' : 'text-slate-600 hover:text-black'
                  }`}
                >
                  Pendentes ({activeSession.total_pendentes})
                </button>
              </div>

              {/* Busca na lista */}
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Filtrar item na conferência..."
                  className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {displayedItems.map(item => (
                <div
                  key={item.id}
                  className={`py-3 px-3 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors ${
                    item.encontrado
                      ? item.divergente
                        ? 'bg-amber-50/70 border border-amber-200'
                        : 'bg-emerald-50/50 border border-emerald-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${
                        item.encontrado
                          ? item.divergente
                            ? 'bg-amber-500 text-black'
                            : 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {item.encontrado ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 truncate flex items-center gap-2">
                        <span className="font-mono text-yellow-600">{item.equipamento_codigo}</span>
                        <span>{item.equipamento_nome}</span>
                        {item.divergente && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded">
                            DIVERGENTE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.setor_nome} • {item.local_nome} • Resp: {item.responsavel}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 text-[11px]">
                    {item.encontrado ? (
                      <span className="font-bold text-emerald-700">
                        Bipado em {new Date(item.data_bipagem!).toLocaleTimeString('pt-BR')}
                      </span>
                    ) : (
                      <span className="font-bold text-amber-700">Pendente de Leitura</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* HISTÓRICO DE CONFERÊNCIAS ANTERIORES */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900">Histórico de Auditorias Realizadas</h3>

          {conferencias.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {conferencias.map(conf => (
                <div key={conf.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 text-sm">{conf.titulo}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        conf.status === 'FINALIZADA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {conf.status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-1">
                      Início: {new Date(conf.data_inicio).toLocaleString('pt-BR')}
                      {conf.data_fim && ` • Fim: ${new Date(conf.data_fim).toLocaleString('pt-BR')}`}
                      {` • Auditor: ${conf.usuario_nome}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div className="font-mono">
                      <span className="text-emerald-600 font-bold">{conf.total_encontrados}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="font-bold text-zinc-900">{conf.total_esperados}</span>
                      <div className="text-[10px] text-slate-400">Encontrados / Esperados</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ClipboardCheck className="w-8 h-8 text-emerald-600" />}
              title="Nenhuma conferência realizada ainda"
              description="Inicie uma nova contagem física por setor ou global para auditar seus ativos."
              actionText="+ Iniciar Conferência"
              onAction={() => setIsNewModalOpen(true)}
            />
          )}
        </div>
      )}

      {/* Modal Nova Conferência */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Configurar Sessão de Conferência"
        subtitle="Selecione o escopo da auditoria física"
        maxWidth="lg"
      >
        <form onSubmit={handleStartNewConference} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Título da Conferência *</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Ex: Auditoria Mensal Galpão Principal, Vistoria TI..."
              required
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-yellow-400 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Filtrar por Setor (Opcional)</label>
              <select
                value={newSetorId}
                onChange={e => {
                  setNewSetorId(e.target.value);
                  setNewLocalId('');
                }}
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-yellow-400"
              >
                <option value="">Todos os Setores (Geral)</option>
                {setores.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Filtrar por Local (Opcional)</label>
              <select
                value={newLocalId}
                onChange={e => setNewLocalId(e.target.value)}
                disabled={!newSetorId}
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-yellow-400 disabled:opacity-50"
              >
                <option value="">Todas as Salas/Docas</option>
                {availableLocais.map(l => (
                  <option key={l.id} value={l.id}>{l.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Filtrar por Categoria (Opcional)</label>
            <select
              value={newCategoriaId}
              onChange={e => setNewCategoriaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-yellow-400"
            >
              <option value="">Todas as Categorias</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Observações da Auditoria</label>
            <textarea
              value={newObs}
              onChange={e => setNewObs(e.target.value)}
              rows={2}
              placeholder="Instruções para os conferentes..."
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold shadow-sm transition-all"
            >
              INICIAR CONFERÊNCIA AGORA
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
