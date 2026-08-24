import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { LabelTemplate } from '../../types';
import { soundService } from '../../lib/sound';
import { testSupabaseConnection, saveStoredSupabaseConfig, getStoredSupabaseConfig } from '../../lib/supabase';
import { Modal } from '../common/Modal';
import {
  Settings,
  Building,
  Barcode,
  Volume2,
  VolumeX,
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  ShieldCheck,
  Tag,
  MapPin,
  Layers,
  Sparkles,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    configuracoes,
    updateConfiguracoes,
    categorias,
    setores,
    locais,
    createCategoria,
    createSetor,
    createLocal,
    deleteCategoria,
    deleteSetor,
    deleteLocal,
  } = useInventory();
  const { hasPermission } = useAuth();

  // Estados de formulário da empresa
  const [empresaNome, setEmpresaNome] = useState(configuracoes.empresa_nome);
  const [prefixo, setPrefixo] = useState(configuracoes.prefixo_patrimonio);
  const [somAtivo, setSomAtivo] = useState(configuracoes.som_ativo);
  const [volume, setVolume] = useState(configuracoes.volume_som);
  const [modeloPadrao, setModeloPadrao] = useState<LabelTemplate>(configuracoes.modelo_etiqueta_padrao);

  // Supabase Config
  const storedSb = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(storedSb.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(storedSb.anonKey);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Modais de Apoio
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const [isSetorModalOpen, setIsSetorModalOpen] = useState(false);
  const [setorName, setSetorName] = useState('');
  const [setorResp, setSetorResp] = useState('');
  const [setorDesc, setSetorDesc] = useState('');

  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [localSetorId, setLocalSetorId] = useState('');
  const [localName, setLocalName] = useState('');
  const [localDesc, setLocalDesc] = useState('');

  // Salvar Parâmetros
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateConfiguracoes({
      empresa_nome: empresaNome.trim(),
      prefixo_patrimonio: prefixo.trim().toUpperCase(),
      som_ativo: somAtivo,
      volume_som: volume,
      modelo_etiqueta_padrao: modeloPadrao,
    });
    alert('Configurações salvas com sucesso!');
  };

  // Testar som
  const handleTestSound = () => {
    soundService.playSuccess();
  };

  // Testar Supabase
  const handleTestSupabase = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      saveStoredSupabaseConfig(supabaseUrl, supabaseAnonKey);
      const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  // Copiar SQL
  const handleCopySchema = async () => {
    try {
      const resp = await fetch('/schema.sql');
      const text = await resp.text();
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (e) {
      alert('Não foi possível copiar o script.');
    }
  };

  // Cadastrar Categoria
  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await createCategoria(catName.trim(), catDesc.trim());
    setCatName('');
    setCatDesc('');
    setIsCatModalOpen(false);
  };

  // Cadastrar Setor
  const handleAddSetor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setorName.trim()) return;
    await createSetor(setorName.trim(), setorResp.trim(), setorDesc.trim());
    setSetorName('');
    setSetorResp('');
    setSetorDesc('');
    setIsSetorModalOpen(false);
  };

  // Cadastrar Local
  const handleAddLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim() || !localSetorId) return;
    await createLocal(localSetorId, localName.trim(), localDesc.trim());
    setLocalName('');
    setLocalDesc('');
    setIsLocalModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-yellow-500" />
          <span>Configurações & Parâmetros do Sistema</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ajuste as diretrizes da empresa, formato dos códigos de barras, áudio e integração com o banco Supabase.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco 1: Parâmetros da Empresa & Patrimônio */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-sm text-zinc-900">
            <Building className="w-4 h-4 text-yellow-500" />
            <span>1. Identidade & Prefixo Patrimonial</span>
          </div>

          <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Nome da Empresa</label>
              <input
                type="text"
                value={empresaNome}
                onChange={e => setEmpresaNome(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-yellow-400 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Prefixo do Código (PAT)</label>
                <input
                  type="text"
                  value={prefixo}
                  onChange={e => setPrefixo(e.target.value.toUpperCase())}
                  required
                  placeholder="Ex: PAT"
                  className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-yellow-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Sequencial Atual</label>
                <input
                  type="text"
                  value={configuracoes.sequencial_atual}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 text-zinc-500 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold"
                />
              </div>
            </div>

            {/* Configuração de Som */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-yellow-500" />
                  <span>Feedback Sonoro (Bip do Scanner)</span>
                </span>
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="text-[10px] font-bold text-yellow-700 hover:underline"
                >
                  Testar Bip
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={somAtivo}
                    onChange={e => setSomAtivo(e.target.checked)}
                    className="rounded text-yellow-500 focus:ring-yellow-400"
                  />
                  <span>Ativar som nas leituras com sucesso e erro</span>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                SALVAR PARÂMETROS
              </button>
            </div>
          </form>
        </div>

        {/* Bloco 2: Conexão com Banco Supabase */}
        <div className="bg-zinc-900 text-white p-6 rounded-3xl border border-zinc-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 font-bold text-sm text-yellow-400">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>2. Conexão Supabase (PostgreSQL / Auth)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-mono font-bold">
              RLS + PostgreSQL
            </span>
          </div>

          <div className="space-y-3 text-xs text-zinc-300">
            <p className="text-[11px] text-zinc-400">
              O sistema possui engine integrada de persistência e suporte nativo ao <strong>Supabase Cloud</strong>.
            </p>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Supabase Project URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full bg-black border border-zinc-700 text-white rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Supabase Anon Public Key</label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={e => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-black border border-zinc-700 text-white rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-yellow-400"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-red-500/20 border-red-500 text-red-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTesting}
                className="py-2 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase transition-all shadow-yellow-glow"
              >
                {isTesting ? 'Testando...' : 'TESTAR CONEXÃO'}
              </button>

              <button
                type="button"
                onClick={handleCopySchema}
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-yellow-400" />
                <span>{copySuccess ? 'COPIADO!' : 'COPIAR SCHEMA.SQL'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bloco 3: Cadastros de Apoio (Setores, Locais e Categorias) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900">
            <Layers className="w-4 h-4 text-yellow-500" />
            <span>3. Estrutura Operacional (Setores, Locais e Categorias)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Setores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-yellow-600" />
                <span>Setores ({setores.length})</span>
              </span>
              <button
                onClick={() => setIsSetorModalOpen(true)}
                className="p-1 rounded-lg bg-yellow-400 text-black font-bold text-xs hover:bg-yellow-300"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
              {setores.map(s => (
                <div key={s.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-zinc-900">{s.nome}</div>
                    {s.responsavel_padrao && (
                      <div className="text-[10px] text-slate-400">Resp: {s.responsavel_padrao}</div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteSetor(s.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Locais */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Locais / Salas ({locais.length})</span>
              </span>
              <button
                onClick={() => setIsLocalModalOpen(true)}
                className="p-1 rounded-lg bg-yellow-400 text-black font-bold text-xs hover:bg-yellow-300"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
              {locais.map(l => (
                <div key={l.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-zinc-900">{l.nome}</div>
                    <div className="text-[10px] text-slate-400">Setor: {l.setor_nome || '-'}</div>
                  </div>
                  <button
                    onClick={() => deleteLocal(l.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Categorias */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Categorias ({categorias.length})</span>
              </span>
              <button
                onClick={() => setIsCatModalOpen(true)}
                className="p-1 rounded-lg bg-yellow-400 text-black font-bold text-xs hover:bg-yellow-300"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
              {categorias.map(c => (
                <div key={c.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-zinc-900">{c.nome}</div>
                    {c.descricao && (
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{c.descricao}</div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteCategoria(c.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modais de Cadastro de Apoio */}
      {/* Modal Categoria */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Nova Categoria de Equipamento"
        maxWidth="md"
      >
        <form onSubmit={handleAddCategoria} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Nome da Categoria *</label>
            <input
              type="text"
              value={catName}
              onChange={e => setCatName(e.target.value)}
              required
              placeholder="Ex: Coletores de Dados, Notebooks..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Descrição</label>
            <input
              type="text"
              value={catDesc}
              onChange={e => setCatDesc(e.target.value)}
              placeholder="Descrição breve..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCatModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold"
            >
              Cadastrar Categoria
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Setor */}
      <Modal
        isOpen={isSetorModalOpen}
        onClose={() => setIsSetorModalOpen(false)}
        title="Novo Setor Operacional"
        maxWidth="md"
      >
        <form onSubmit={handleAddSetor} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Nome do Setor *</label>
            <input
              type="text"
              value={setorName}
              onChange={e => setSetorName(e.target.value)}
              required
              placeholder="Ex: Operações & Galpão, TI, Expedição..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Responsável Padrão</label>
            <input
              type="text"
              value={setorResp}
              onChange={e => setSetorResp(e.target.value)}
              placeholder="Ex: Carlos Mendes"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSetorModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold"
            >
              Cadastrar Setor
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Local */}
      <Modal
        isOpen={isLocalModalOpen}
        onClose={() => setIsLocalModalOpen(false)}
        title="Novo Local Físico / Sala"
        maxWidth="md"
      >
        <form onSubmit={handleAddLocal} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Setor Pai *</label>
            <select
              value={localSetorId}
              onChange={e => setLocalSetorId(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
            >
              <option value="">Selecione o setor...</option>
              {setores.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Nome do Local *</label>
            <input
              type="text"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              required
              placeholder="Ex: Doca 01, Sala de Servidores, Box Baterias..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLocalModalOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold"
            >
              Cadastrar Local
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
