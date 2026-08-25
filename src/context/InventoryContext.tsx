// ==========================================
// MP CARGAS - Contexto de Inventário e Operações (Sincronização Nuvem 100% à Prova de Falhas)
// ==========================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Equipamento,
  Categoria,
  Setor,
  Local,
  Movimentacao,
  Manutencao,
  Conferencia,
  ConferenciaItem,
  AuditoriaLog,
  ConfiguracoesSistema,
  EquipmentStatus,
  DecommissionReason,
  HistoricoEvento,
} from '../types';
import {
  INITIAL_CONFIG,
  INITIAL_CATEGORIAS,
  INITIAL_SETORES,
  INITIAL_LOCAIS,
  INITIAL_EQUIPAMENTOS,
  INITIAL_MOVIMENTACOES,
  INITIAL_MANUTENCOES,
  INITIAL_AUDITORIA,
} from '../mock/initialData';
import { formatPatrimonioCode, sanitizeBarcodeValue } from '../lib/barcode';
import { soundService } from '../lib/sound';
import { getSupabaseClient } from '../lib/supabase';
import { generateValidUUID, isValidUUID } from '../lib/uuid';
import { useAuth } from './AuthContext';

interface InventoryContextType {
  equipamentos: Equipamento[];
  categorias: Categoria[];
  setores: Setor[];
  locais: Local[];
  movimentacoes: Movimentacao[];
  manutencoes: Manutencao[];
  conferencias: Conferencia[];
  auditoria: AuditoriaLog[];
  configuracoes: ConfiguracoesSistema;
  isCloudConnected: boolean;
  isSyncing: boolean;
  syncWithCloud: () => Promise<void>;
  
  // Equipamentos
  createEquipamento: (data: Partial<Equipamento>) => Promise<Equipamento>;
  updateEquipamento: (id: string, data: Partial<Equipamento>) => Promise<void>;
  transferEquipamento: (equipamentoId: string, newSetorId: string, newLocalId: string, newResponsavel: string, motivo?: string) => Promise<void>;
  sendToMaintenance: (equipamentoId: string, problema: string, descricao: string, tecnico?: string, previsaoRetorno?: string, custoEstimado?: number) => Promise<void>;
  finishMaintenance: (manutencaoId: string, servicoRealizado: string, pecasUtilizadas: string, custoReal: number, dataSaida: string, novoStatus: EquipmentStatus, observacoes?: string) => Promise<void>;
  decommissionEquipamento: (equipamentoId: string, motivo: DecommissionReason, observacao?: string) => Promise<void>;
  changeEquipmentStatus: (equipamentoId: string, newStatus: EquipmentStatus, motivo?: string) => Promise<void>;
  findEquipmentByCode: (code: string) => Equipamento | null;
  getEquipmentHistory: (equipamentoId: string) => HistoricoEvento[];
  getNextCodePreview: () => string;

  // Conferência
  createConferencia: (titulo: string, setorId?: string, localId?: string, categoriaId?: string, observacoes?: string) => Promise<Conferencia>;
  beepConferenciaItem: (conferenciaId: string, code: string) => Promise<{ success: boolean; message: string; item?: ConferenciaItem; isNew?: boolean }>;
  finishConferencia: (conferenciaId: string, observacoes?: string) => Promise<void>;
  cancelConferencia: (conferenciaId: string) => Promise<void>;

  // Cadastros de Apoio
  createCategoria: (nome: string, descricao?: string) => Promise<Categoria>;
  createSetor: (nome: string, responsavel?: string, descricao?: string) => Promise<Setor>;
  createLocal: (setorId: string, nome: string, descricao?: string) => Promise<Local>;
  deleteCategoria: (id: string) => Promise<void>;
  deleteSetor: (id: string) => Promise<void>;
  deleteLocal: (id: string) => Promise<void>;

  // Configurações
  updateConfiguracoes: (newConfig: Partial<ConfiguracoesSistema>) => Promise<void>;
  toggleSound: () => void;

  // Alertas Rápidos
  alertsCount: {
    overdueMaintenance: number;
    noResponsible: number;
    noLocation: number;
    awaitingDiscard: number;
    total: number;
  };
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'mp_cargas_data_v4_';

function ensureUUID<T extends { id: string }>(item: T): T {
  if (!isValidUUID(item.id)) {
    return { ...item, id: generateValidUUID() };
  }
  return item;
}

function sanitizeForSupabase(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = { ...obj };
  const uuidFields = ['categoria_id', 'setor_id', 'local_id', 'equipamento_id', 'usuario_id', 'conferencia_id', 'created_by'];
  for (const field of uuidFields) {
    if (field in clean) {
      if (!clean[field] || !isValidUUID(clean[field])) {
        clean[field] = null;
      }
    }
  }
  return clean;
}

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesSistema>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}config`);
      return saved ? JSON.parse(saved) : INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });

  const [categorias, setCategorias] = useState<Categoria[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}categorias`);
      return saved ? JSON.parse(saved).map(ensureUUID) : INITIAL_CATEGORIAS.map(ensureUUID);
    } catch {
      return INITIAL_CATEGORIAS.map(ensureUUID);
    }
  });

  const [setores, setSetores] = useState<Setor[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}setores`);
      return saved ? JSON.parse(saved).map(ensureUUID) : INITIAL_SETORES.map(ensureUUID);
    } catch {
      return INITIAL_SETORES.map(ensureUUID);
    }
  });

  const [locais, setLocais] = useState<Local[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}locais`);
      return saved ? JSON.parse(saved).map(ensureUUID) : INITIAL_LOCAIS.map(ensureUUID);
    } catch {
      return INITIAL_LOCAIS.map(ensureUUID);
    }
  });

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}equipamentos`);
      return saved ? JSON.parse(saved).map(ensureUUID) : INITIAL_EQUIPAMENTOS.map(ensureUUID);
    } catch {
      return INITIAL_EQUIPAMENTOS.map(ensureUUID);
    }
  });

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}movimentacoes`);
      return saved ? JSON.parse(saved).map(ensureUUID) : INITIAL_MOVIMENTACOES.map(ensureUUID);
    } catch {
      return INITIAL_MOVIMENTACOES.map(ensureUUID);
    }
  });

  const [manutencoes, setManutencoes] = useState<Manutencao[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}manutencoes`);
      return saved ? JSON.parse(saved).map(ensureUUID) : INITIAL_MANUTENCOES.map(ensureUUID);
    } catch {
      return INITIAL_MANUTENCOES.map(ensureUUID);
    }
  });

  const [conferencias, setConferencias] = useState<Conferencia[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}conferencias`);
      return saved ? JSON.parse(saved).map(ensureUUID) : [];
    } catch {
      return [];
    }
  });

  const [auditoria, setAuditoria] = useState<AuditoriaLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}auditoria`);
      return saved ? JSON.parse(saved).map(ensureUUID) : INITIAL_AUDITORIA.map(ensureUUID);
    } catch {
      return INITIAL_AUDITORIA.map(ensureUUID);
    }
  });

  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef(false);

  // Atualiza som global
  useEffect(() => {
    soundService.setEnabled(configuracoes.som_ativo);
    soundService.setVolume(configuracoes.volume_som);
  }, [configuracoes.som_ativo, configuracoes.volume_som]);

  // Persistência em LocalStorage
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY_PREFIX}config`, JSON.stringify(configuracoes)); }, [configuracoes]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY_PREFIX}categorias`, JSON.stringify(categorias)); }, [categorias]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY_PREFIX}setores`, JSON.stringify(setores)); }, [setores]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY_PREFIX}locais`, JSON.stringify(locais)); }, [locais]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY_PREFIX}equipamentos`, JSON.stringify(equipamentos)); }, [equipamentos]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY_PREFIX}movimentacoes`, JSON.stringify(movimentacoes)); }, [movimentacoes]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY_PREFIX}manutencoes`, JSON.stringify(manutencoes)); }, [manutencoes]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY_PREFIX}conferencias`, JSON.stringify(conferencias)); }, [conferencias]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY_PREFIX}auditoria`, JSON.stringify(auditoria)); }, [auditoria]);

  // =========================================================================
  // Sincronização em Nuvem (Sem Re-criação de Conexão)
  // =========================================================================
  const fetchCloudData = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);

      const [
        { data: sbCat },
        { data: sbSet },
        { data: sbLoc },
        { data: sbEq },
        { data: sbMov },
        { data: sbMan },
        { data: sbConf },
        { data: sbAud },
        { data: sbCfg },
      ] = await Promise.all([
        supabase.from('categorias').select('*').order('nome'),
        supabase.from('setores').select('*').order('nome'),
        supabase.from('locais').select('*').order('nome'),
        supabase.from('equipamentos').select('*').order('created_at', { ascending: false }),
        supabase.from('movimentacoes').select('*').order('created_at', { ascending: false }),
        supabase.from('manutencoes').select('*').order('created_at', { ascending: false }),
        supabase.from('conferencias').select('*').order('created_at', { ascending: false }),
        supabase.from('auditoria').select('*').order('created_at', { ascending: false }),
        supabase.from('configuracoes').select('*').maybeSingle(),
      ]);

      if (sbCat && sbCat.length > 0) setCategorias(sbCat as Categoria[]);
      if (sbSet && sbSet.length > 0) setSetores(sbSet as Setor[]);
      if (sbLoc && sbLoc.length > 0) setLocais(sbLoc as Local[]);

      if (sbEq && sbEq.length > 0) {
        const activeSets = sbSet || [];
        const activeCats = sbCat || [];
        const activeLocs = sbLoc || [];

        const enriched = sbEq.map((e: any) => ({
          ...e,
          setor_nome: e.setor_nome || activeSets.find((s: any) => s.id === e.setor_id)?.nome || 'Almoxarifado Geral',
          categoria_nome: e.categoria_nome || activeCats.find((c: any) => c.id === e.categoria_id)?.nome || 'Geral',
          local_nome: e.local_nome || activeLocs.find((l: any) => l.id === e.local_id)?.nome || '',
        }));
        setEquipamentos(enriched as Equipamento[]);
      }

      if (sbMov && sbMov.length > 0) setMovimentacoes(sbMov as Movimentacao[]);
      if (sbMan && sbMan.length > 0) setManutencoes(sbMan as Manutencao[]);
      if (sbConf && sbConf.length > 0) setConferencias(sbConf as Conferencia[]);
      if (sbAud && sbAud.length > 0) setAuditoria(sbAud as AuditoriaLog[]);
      if (sbCfg) setConfiguracoes(sbCfg as ConfiguracoesSistema);

      setIsCloudConnected(true);
    } catch (err) {
      console.warn('Erro ao carregar dados do Supabase:', err);
      setIsCloudConnected(false);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Inicialização, Escuta em Tempo Real e Polling de Garantia
  useEffect(() => {
    fetchCloudData();

    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Escuta em tempo real permanente
    const channel = supabase
      .channel('realtime:all_inventory_master')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchCloudData();
      })
      .subscribe();

    // Polling de garantia a cada 4 segundos (para celulares com tela bloqueada/background)
    const interval = setInterval(() => {
      fetchCloudData();
    }, 4000);

    // Sincroniza imediatamente quando a janela/aba ganhar foco
    const handleFocus = () => {
      fetchCloudData();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchCloudData]);

  const syncWithCloud = async () => {
    await fetchCloudData();
  };

  const logAuditoria = (
    acao: string,
    entidade: 'equipamentos' | 'usuarios' | 'manutencoes' | 'conferencias' | 'configuracoes' | 'permissoes',
    registroId: string,
    registroCodigo: string | undefined,
    detalhes: string,
    dadosAnteriores?: any,
    dadosNovos?: any
  ) => {
    const newLog: AuditoriaLog = {
      id: generateValidUUID(),
      usuario_id: currentUser?.id || undefined,
      usuario_nome: currentUser?.full_name || 'Sistema',
      usuario_email: currentUser?.email || 'sistema@mpcargas.com.br',
      acao,
      entidade,
      registro_id: registroId,
      registro_codigo: registroCodigo,
      detalhes,
      dados_anteriores: dadosAnteriores,
      dados_novos: dadosNovos,
      created_at: new Date().toISOString(),
    };
    setAuditoria(prev => [newLog, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('auditoria').insert(sanitizeForSupabase(newLog)).then(() => {});
    }
  };

  const getNextCodePreview = (): string => {
    let nextSeq = configuracoes.sequencial_atual + 1;
    let testCode = formatPatrimonioCode(configuracoes.prefixo_patrimonio, nextSeq, configuracoes.digitos_sequencial);

    while (equipamentos.some(e => e.codigo_patrimonial === testCode)) {
      nextSeq++;
      testCode = formatPatrimonioCode(configuracoes.prefixo_patrimonio, nextSeq, configuracoes.digitos_sequencial);
    }

    return testCode;
  };

  /**
   * Cadastrar Equipamento (Gravação Direta no Supabase)
   */
  const createEquipamento = async (data: Partial<Equipamento>): Promise<Equipamento> => {
    let seq = configuracoes.sequencial_atual + 1;
    let codigo = data.codigo_patrimonial || formatPatrimonioCode(configuracoes.prefixo_patrimonio, seq, configuracoes.digitos_sequencial);

    while (equipamentos.some(e => e.codigo_patrimonial === codigo && e.id !== data.id)) {
      seq++;
      codigo = formatPatrimonioCode(configuracoes.prefixo_patrimonio, seq, configuracoes.digitos_sequencial);
    }

    const setor = setores.find(s => s.id === data.setor_id);
    const local = locais.find(l => l.id === data.local_id);
    const categoria = categorias.find(c => c.id === data.categoria_id);

    const newEquipamento: Equipamento = {
      id: generateValidUUID(),
      codigo_patrimonial: codigo,
      codigo_barras: data.codigo_barras || codigo,
      nome: data.nome || 'Equipamento sem nome',
      categoria_id: categoria?.id || '',
      categoria_nome: categoria?.nome || '',
      marca: data.marca || '',
      modelo: data.modelo || '',
      numero_serie: data.numero_serie || '',
      setor_id: setor?.id || '',
      setor_nome: setor?.nome || '',
      local_id: local?.id || '',
      local_nome: local?.nome || '',
      responsavel: data.responsavel || setor?.responsavel_padrao || 'Almoxarifado',
      status: data.status || 'EM ESTOQUE',
      data_aquisicao: data.data_aquisicao || new Date().toISOString().split('T')[0],
      valor_aquisicao: data.valor_aquisicao || 0,
      fornecedor: data.fornecedor || '',
      garantia_meses: data.garantia_meses || 0,
      observacoes: data.observacoes || '',
      created_by: currentUser?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setConfiguracoes(prev => ({ ...prev, sequencial_atual: seq }));
    setEquipamentos(prev => [newEquipamento, ...prev]);

    const newMov: Movimentacao = {
      id: generateValidUUID(),
      equipamento_id: newEquipamento.id,
      equipamento_codigo: newEquipamento.codigo_patrimonial,
      equipamento_nome: newEquipamento.nome,
      tipo: 'CADASTRO',
      destino_setor_id: newEquipamento.setor_id,
      destino_setor_nome: newEquipamento.setor_nome,
      destino_local_id: newEquipamento.local_id,
      destino_local_nome: newEquipamento.local_nome,
      destino_responsavel: newEquipamento.responsavel,
      status_novo: newEquipamento.status,
      usuario_id: currentUser?.id,
      usuario_nome: currentUser?.full_name || 'Sistema',
      motivo: 'Cadastro inicial de equipamento',
      created_at: new Date().toISOString(),
    };
    setMovimentacoes(prev => [newMov, ...prev]);

    logAuditoria(
      'CADASTRO_EQUIPAMENTO',
      'equipamentos',
      newEquipamento.id,
      newEquipamento.codigo_patrimonial,
      `Cadastrou ${newEquipamento.nome} (${newEquipamento.codigo_patrimonial}) no setor ${newEquipamento.setor_nome}`,
      undefined,
      newEquipamento
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('equipamentos').insert(sanitizeForSupabase(newEquipamento));
      await supabase.from('movimentacoes').insert(sanitizeForSupabase(newMov));
      await fetchCloudData();
    }

    return newEquipamento;
  };

  /**
   * Atualizar dados de um Equipamento
   */
  const updateEquipamento = async (id: string, data: Partial<Equipamento>) => {
    const prevEq = equipamentos.find(e => e.id === id || e.codigo_patrimonial === id);
    if (!prevEq) return;

    const setor = data.setor_id ? setores.find(s => s.id === data.setor_id) : undefined;
    const local = data.local_id ? locais.find(l => l.id === data.local_id) : undefined;
    const categoria = data.categoria_id ? categorias.find(c => c.id === data.categoria_id) : undefined;

    const nowIso = new Date().toISOString();
    const updated: Equipamento = {
      ...prevEq,
      ...data,
      categoria_nome: categoria ? categoria.nome : (data.categoria_nome || prevEq.categoria_nome),
      setor_nome: setor ? setor.nome : (data.setor_nome || prevEq.setor_nome),
      local_nome: local ? local.nome : (data.local_nome || prevEq.local_nome),
      updated_at: nowIso,
    };

    setEquipamentos(prev => prev.map(e => (e.id === prevEq.id || e.codigo_patrimonial === prevEq.codigo_patrimonial) ? updated : e));

    logAuditoria(
      'EDICAO_EQUIPAMENTO',
      'equipamentos',
      prevEq.id,
      updated.codigo_patrimonial,
      `Editou dados cadastrais do equipamento ${updated.nome} (${updated.codigo_patrimonial})`,
      prevEq,
      updated
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('equipamentos').update(sanitizeForSupabase(updated)).eq('id', prevEq.id);
      await fetchCloudData();
    }
  };

  /**
   * Transferir Equipamento (Gravação Imediata no Supabase)
   */
  const transferEquipamento = async (
    equipamentoId: string,
    newSetorId: string,
    newLocalId: string,
    newResponsavel: string,
    motivo?: string
  ) => {
    const eq = equipamentos.find(e => e.id === equipamentoId || e.codigo_patrimonial === equipamentoId);
    if (!eq) return;

    const newSetor = setores.find(s => s.id === newSetorId);
    const newLocal = locais.find(l => l.id === newLocalId);
    const nowIso = new Date().toISOString();

    const prevSetorNome = eq.setor_nome;
    const prevLocalNome = eq.local_nome;
    const prevResp = eq.responsavel;

    const updated: Equipamento = {
      ...eq,
      setor_id: newSetorId,
      setor_nome: newSetor?.nome || '',
      local_id: newLocalId || '',
      local_nome: newLocal?.nome || '',
      responsavel: newResponsavel.trim(),
      updated_at: nowIso,
    };

    setEquipamentos(prev => prev.map(e => (e.id === eq.id || e.codigo_patrimonial === eq.codigo_patrimonial) ? updated : e));

    const newMov: Movimentacao = {
      id: generateValidUUID(),
      equipamento_id: eq.id,
      equipamento_codigo: eq.codigo_patrimonial,
      equipamento_nome: eq.nome,
      tipo: 'TRANSFERENCIA',
      origem_setor_id: eq.setor_id,
      origem_setor_nome: prevSetorNome,
      origem_local_id: eq.local_id,
      origem_local_nome: prevLocalNome,
      origem_responsavel: prevResp,
      destino_setor_id: newSetorId,
      destino_setor_nome: newSetor?.nome || '',
      destino_local_id: newLocalId || '',
      destino_local_nome: newLocal?.nome || '',
      destino_responsavel: newResponsavel.trim(),
      status_anterior: eq.status,
      status_novo: eq.status,
      usuario_id: currentUser?.id,
      usuario_nome: currentUser?.full_name || 'Sistema',
      motivo: motivo || 'Transferência operacional de localização/responsável',
      created_at: nowIso,
    };

    setMovimentacoes(prev => [newMov, ...prev]);

    logAuditoria(
      'TRANSFERENCIA_EQUIPAMENTO',
      'equipamentos',
      eq.id,
      eq.codigo_patrimonial,
      `Transferiu ${eq.codigo_patrimonial} de [${prevSetorNome} / ${prevLocalNome} / ${prevResp}] para [${newSetor?.nome} / ${newLocal?.nome} / ${newResponsavel}]`,
      { setor: prevSetorNome, local: prevLocalNome, responsavel: prevResp },
      { setor: newSetor?.nome, local: newLocal?.nome, responsavel: newResponsavel }
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('equipamentos').update({
        setor_id: newSetorId,
        local_id: isValidUUID(newLocalId) ? newLocalId : null,
        responsavel: newResponsavel.trim(),
        updated_at: nowIso,
      }).eq('id', eq.id);

      await supabase.from('movimentacoes').insert(sanitizeForSupabase(newMov));
      await fetchCloudData();
    }
  };

  /**
   * Enviar Equipamento para Manutenção
   */
  const sendToMaintenance = async (
    equipamentoId: string,
    problema: string,
    descricao: string,
    tecnico?: string,
    previsaoRetorno?: string,
    custoEstimado?: number
  ) => {
    const eq = equipamentos.find(e => e.id === equipamentoId || e.codigo_patrimonial === equipamentoId);
    if (!eq) return;

    const previousStatus = eq.status;
    const nowIso = new Date().toISOString();

    const updatedEq: Equipamento = {
      ...eq,
      status: 'EM MANUTENÇÃO',
      data_envio_manutencao: nowIso,
      dias_em_manutencao: 0,
      updated_at: nowIso,
    };

    setEquipamentos(prev => prev.map(e => (e.id === eq.id || e.codigo_patrimonial === eq.codigo_patrimonial) ? updatedEq : e));

    const newTicket: Manutencao = {
      id: generateValidUUID(),
      equipamento_id: eq.id,
      equipamento_codigo: eq.codigo_patrimonial,
      equipamento_nome: eq.nome,
      problema,
      descricao,
      responsavel_abertura: currentUser?.full_name || 'Operador',
      tecnico_responsavel: tecnico || 'Oficina Interna',
      data_entrada: nowIso,
      previsao_retorno: previsaoRetorno,
      custo_estimado: custoEstimado || 0,
      concluida: false,
      usuario_id: currentUser?.id,
      usuario_nome: currentUser?.full_name || 'Sistema',
      created_at: nowIso,
      updated_at: nowIso,
    };

    setManutencoes(prev => [newTicket, ...prev]);

    const newMov: Movimentacao = {
      id: generateValidUUID(),
      equipamento_id: eq.id,
      equipamento_codigo: eq.codigo_patrimonial,
      equipamento_nome: eq.nome,
      tipo: 'ENVIO_MANUTENCAO',
      origem_setor_id: eq.setor_id,
      origem_setor_nome: eq.setor_nome,
      origem_local_id: eq.local_id,
      origem_local_nome: eq.local_nome,
      origem_responsavel: eq.responsavel,
      status_anterior: previousStatus,
      status_novo: 'EM MANUTENÇÃO',
      usuario_id: currentUser?.id,
      usuario_nome: currentUser?.full_name || 'Sistema',
      motivo: `Abertura de manutenção: ${problema}`,
      observacoes: descricao,
      created_at: nowIso,
    };

    setMovimentacoes(prev => [newMov, ...prev]);

    logAuditoria(
      'ABERTURA_MANUTENCAO',
      'manutencoes',
      newTicket.id,
      eq.codigo_patrimonial,
      `Abriu chamado de manutenção para ${eq.codigo_patrimonial}: ${problema}`,
      { status: previousStatus },
      { status: 'EM MANUTENÇÃO', problema }
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('equipamentos').update({ status: 'EM MANUTENÇÃO', data_envio_manutencao: nowIso, updated_at: nowIso }).eq('id', eq.id);
      await supabase.from('manutencoes').insert(sanitizeForSupabase(newTicket));
      await supabase.from('movimentacoes').insert(sanitizeForSupabase(newMov));
      await fetchCloudData();
    }
  };

  /**
   * Finalizar Manutenção
   */
  const finishMaintenance = async (
    manutencaoId: string,
    servicoRealizado: string,
    pecasUtilizadas: string,
    custoReal: number,
    dataSaida: string,
    novoStatus: EquipmentStatus,
    observacoes?: string
  ) => {
    const ticket = manutencoes.find(m => m.id === manutencaoId);
    if (!ticket) return;

    const nowIso = new Date().toISOString();

    const updatedTicket: Manutencao = {
      ...ticket,
      servico_realizado: servicoRealizado,
      pecas_utilizadas: pecasUtilizadas,
      custo_real: custoReal,
      data_saida: dataSaida || nowIso,
      status_retorno: novoStatus,
      observacoes,
      concluida: true,
      updated_at: nowIso,
    };

    setManutencoes(prev => prev.map(m => m.id === manutencaoId ? updatedTicket : m));

    const eq = equipamentos.find(e => e.id === ticket.equipamento_id || e.codigo_patrimonial === ticket.equipamento_codigo);
    if (eq) {
      const updatedEq: Equipamento = {
        ...eq,
        status: novoStatus,
        data_envio_manutencao: undefined,
        dias_em_manutencao: undefined,
        updated_at: nowIso,
      };

      setEquipamentos(prev => prev.map(e => (e.id === eq.id || e.codigo_patrimonial === eq.codigo_patrimonial) ? updatedEq : e));

      const newMov: Movimentacao = {
        id: generateValidUUID(),
        equipamento_id: eq.id,
        equipamento_codigo: eq.codigo_patrimonial,
        equipamento_nome: eq.nome,
        tipo: 'RETORNO_MANUTENCAO',
        status_anterior: 'EM MANUTENÇÃO',
        status_novo: novoStatus,
        usuario_id: currentUser?.id,
        usuario_nome: currentUser?.full_name || 'Sistema',
        motivo: `Finalização de manutenção: ${servicoRealizado}`,
        observacoes: `Peças: ${pecasUtilizadas || 'Nenhuma'} | Custo R$ ${custoReal.toFixed(2)}`,
        created_at: nowIso,
      };

      setMovimentacoes(prev => [newMov, ...prev]);

      logAuditoria(
        'FINALIZACAO_MANUTENCAO',
        'manutencoes',
        manutencaoId,
        eq.codigo_patrimonial,
        `Finalizou manutenção de ${eq.codigo_patrimonial} com novo status ${novoStatus}. Custo: R$ ${custoReal.toFixed(2)}`,
        { status: 'EM MANUTENÇÃO' },
        { status: novoStatus, servicoRealizado, custoReal }
      );

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('equipamentos').update({ status: novoStatus, data_envio_manutencao: null, updated_at: nowIso }).eq('id', eq.id);
        await supabase.from('manutencoes').update(sanitizeForSupabase(updatedTicket)).eq('id', ticket.id);
        await supabase.from('movimentacoes').insert(sanitizeForSupabase(newMov));
        await fetchCloudData();
      }
    }
  };

  /**
   * Dar Baixa no Equipamento
   */
  const decommissionEquipamento = async (
    equipamentoId: string,
    motivo: DecommissionReason,
    observacao?: string
  ) => {
    const eq = equipamentos.find(e => e.id === equipamentoId || e.codigo_patrimonial === equipamentoId);
    if (!eq) return;

    const previousStatus = eq.status;
    const nowIso = new Date().toISOString();

    const updated: Equipamento = {
      ...eq,
      status: 'BAIXADO',
      motivo_baixa: motivo,
      data_baixa: nowIso,
      observacao_baixa: observacao,
      updated_at: nowIso,
    };

    setEquipamentos(prev => prev.map(e => (e.id === eq.id || e.codigo_patrimonial === eq.codigo_patrimonial) ? updated : e));

    const newMov: Movimentacao = {
      id: generateValidUUID(),
      equipamento_id: eq.id,
      equipamento_codigo: eq.codigo_patrimonial,
      equipamento_nome: eq.nome,
      tipo: 'BAIXA',
      status_anterior: previousStatus,
      status_novo: 'BAIXADO',
      usuario_id: currentUser?.id,
      usuario_nome: currentUser?.full_name || 'Sistema',
      motivo: `Baixa patrimonial por: ${motivo}`,
      observacoes: observacao,
      created_at: nowIso,
    };

    setMovimentacoes(prev => [newMov, ...prev]);

    logAuditoria(
      'BAIXA_PATRIMONIAL',
      'equipamentos',
      eq.id,
      eq.codigo_patrimonial,
      `Deu baixa patrimonial em ${eq.codigo_patrimonial} por motivo: ${motivo}`,
      { status: previousStatus },
      { status: 'BAIXADO', motivo, observacao }
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('equipamentos').update({
        status: 'BAIXADO',
        motivo_baixa: motivo,
        data_baixa: nowIso,
        observacao_baixa: observacao || null,
        updated_at: nowIso,
      }).eq('id', eq.id);

      await supabase.from('movimentacoes').insert(sanitizeForSupabase(newMov));
      await fetchCloudData();
    }
  };

  /**
   * Alterar Status do Equipamento (Direto e Imediato no Supabase)
   */
  const changeEquipmentStatus = async (
    equipamentoId: string,
    newStatus: EquipmentStatus,
    motivo?: string
  ) => {
    const eq = equipamentos.find(e => e.id === equipamentoId || e.codigo_patrimonial === equipamentoId);
    if (!eq) return;

    const previousStatus = eq.status;
    const nowIso = new Date().toISOString();

    const updated: Equipamento = {
      ...eq,
      status: newStatus,
      updated_at: nowIso,
    };

    setEquipamentos(prev => prev.map(e => (e.id === eq.id || e.codigo_patrimonial === eq.codigo_patrimonial) ? updated : e));

    const newMov: Movimentacao = {
      id: generateValidUUID(),
      equipamento_id: eq.id,
      equipamento_codigo: eq.codigo_patrimonial,
      equipamento_nome: eq.nome,
      tipo: 'ALTERACAO_STATUS',
      status_anterior: previousStatus,
      status_novo: newStatus,
      usuario_id: currentUser?.id,
      usuario_nome: currentUser?.full_name || 'Sistema',
      motivo: motivo || `Status alterado de ${previousStatus} para ${newStatus}`,
      created_at: nowIso,
    };

    setMovimentacoes(prev => [newMov, ...prev]);

    logAuditoria(
      'ALTERACAO_STATUS',
      'equipamentos',
      eq.id,
      eq.codigo_patrimonial,
      `Alterou status de ${eq.codigo_patrimonial} de ${previousStatus} para ${newStatus}`,
      { status: previousStatus },
      { status: newStatus }
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('equipamentos').update({ status: newStatus, updated_at: nowIso }).eq('id', eq.id);
        await supabase.from('movimentacoes').insert(sanitizeForSupabase(newMov));
        await fetchCloudData();
      } catch (err) {
        console.warn('Erro ao atualizar status no Supabase:', err);
      }
    }
  };

  const findEquipmentByCode = (code: string): Equipamento | null => {
    const clean = sanitizeBarcodeValue(code).toUpperCase();
    if (!clean) return null;

    return equipamentos.find(e => 
      e.codigo_patrimonial.toUpperCase() === clean ||
      e.codigo_barras.toUpperCase() === clean ||
      (e.numero_serie && e.numero_serie.toUpperCase() === clean)
    ) || null;
  };

  const getEquipmentHistory = (equipamentoId: string): HistoricoEvento[] => {
    const eq = equipamentos.find(e => e.id === equipamentoId || e.codigo_patrimonial === equipamentoId);
    if (!eq) return [];

    const eqMovs = movimentacoes.filter(m => m.equipamento_id === eq.id || m.equipamento_codigo === eq.codigo_patrimonial);
    
    return eqMovs.map(m => {
      let titulo = 'Movimentação';
      let descricao = m.motivo || '';

      switch (m.tipo) {
        case 'CADASTRO':
          titulo = 'Equipamento Cadastrado';
          descricao = `Cadastrado no setor ${m.destino_setor_nome || 'Geral'} por ${m.usuario_nome}`;
          break;
        case 'TRANSFERENCIA':
          titulo = 'Transferência de Localização';
          descricao = `Transferido de [${m.origem_setor_nome || '-'}] para [${m.destino_setor_nome || '-'}] (Responsável: ${m.destino_responsavel})`;
          break;
        case 'ENVIO_MANUTENCAO':
          titulo = 'Enviado para Manutenção';
          descricao = m.motivo || 'Entrada na oficina mecânica/técnica';
          break;
        case 'RETORNO_MANUTENCAO':
          titulo = 'Manutenção Finalizada';
          descricao = `Retornou para status ${m.status_novo}. ${m.motivo || ''}`;
          break;
        case 'ALTERACAO_STATUS':
          titulo = `Status Alterado para ${m.status_novo}`;
          descricao = m.motivo || `De ${m.status_anterior} para ${m.status_novo}`;
          break;
        case 'BAIXA':
          titulo = 'Baixa Patrimonial';
          descricao = m.motivo || 'Equipamento baixado do ativo';
          break;
        case 'CONFERENCIA':
          titulo = 'Auditado em Conferência';
          descricao = m.motivo || 'Item conferido com sucesso';
          break;
      }

      return {
        id: m.id,
        equipamento_id: eq.id,
        titulo,
        descricao,
        tipo: m.tipo,
        usuario_nome: m.usuario_nome,
        data_hora: m.created_at,
      };
    }).sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
  };

  /**
   * Conferências
   */
  const createConferencia = async (
    titulo: string,
    setorId?: string,
    localId?: string,
    categoriaId?: string,
    observacoes?: string
  ): Promise<Conferencia> => {
    let filtered = equipamentos.filter(e => e.status !== 'BAIXADO');

    if (setorId) filtered = filtered.filter(e => e.setor_id === setorId);
    if (localId) filtered = filtered.filter(e => e.local_id === localId);
    if (categoriaId) filtered = filtered.filter(e => e.categoria_id === categoriaId);

    const setor = setorId ? setores.find(s => s.id === setorId) : undefined;
    const local = localId ? locais.find(l => l.id === localId) : undefined;
    const categoria = categoriaId ? categorias.find(c => c.id === categoriaId) : undefined;

    const itens: ConferenciaItem[] = filtered.map(e => ({
      id: generateValidUUID(),
      conferencia_id: '',
      equipamento_id: e.id,
      equipamento_codigo: e.codigo_patrimonial,
      equipamento_nome: e.nome,
      setor_nome: e.setor_nome || '-',
      local_nome: e.local_nome || '-',
      responsavel: e.responsavel || '-',
      status_equipamento: e.status,
      encontrado: false,
    }));

    const newConf: Conferencia = {
      id: generateValidUUID(),
      titulo,
      setor_id: setorId,
      setor_nome: setor?.nome,
      local_id: localId,
      local_nome: local?.nome,
      categoria_id: categoriaId,
      categoria_nome: categoria?.nome,
      total_esperados: itens.length,
      total_encontrados: 0,
      total_pendentes: itens.length,
      itens,
      status: 'EM_ANDAMENTO',
      usuario_id: currentUser?.id,
      usuario_nome: currentUser?.full_name || 'Sistema',
      data_inicio: new Date().toISOString(),
      observacoes,
      created_at: new Date().toISOString(),
    };

    newConf.itens.forEach(i => i.conferencia_id = newConf.id);
    setConferencias(prev => [newConf, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('conferencias').insert(sanitizeForSupabase(newConf));
      await fetchCloudData();
    }

    return newConf;
  };

  const beepConferenciaItem = async (conferenciaId: string, code: string) => {
    const conf = conferencias.find(c => c.id === conferenciaId);
    if (!conf || conf.status !== 'EM_ANDAMENTO') {
      return { success: false, message: 'Conferência não encontrada ou já finalizada.' };
    }

    const cleanCode = sanitizeBarcodeValue(code).toUpperCase();
    const existingIndex = conf.itens.findIndex(i => i.equipamento_codigo.toUpperCase() === cleanCode);

    if (existingIndex >= 0) {
      const item = conf.itens[existingIndex];
      if (item.encontrado) {
        soundService.playWarning();
        return { success: false, message: `Equipamento ${item.equipamento_codigo} já foi conferido nesta sessão.`, item };
      }

      const updatedItens = [...conf.itens];
      updatedItens[existingIndex] = {
        ...item,
        encontrado: true,
        data_bipagem: new Date().toISOString(),
        bipado_por: currentUser?.full_name || 'Conferente',
      };

      const totalEncontrados = updatedItens.filter(i => i.encontrado).length;
      const totalPendentes = updatedItens.filter(i => !i.encontrado && !i.divergente).length;

      const updatedConf: Conferencia = {
        ...conf,
        itens: updatedItens,
        total_encontrados: totalEncontrados,
        total_pendentes: totalPendentes,
      };

      setConferencias(prev => prev.map(c => c.id === conferenciaId ? updatedConf : c));
      soundService.playSuccess();

      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('conferencias').update(sanitizeForSupabase(updatedConf)).eq('id', conf.id);
      }

      return { success: true, message: `Equipamento ${item.equipamento_codigo} conferido com sucesso!`, item: updatedItens[existingIndex] };
    }

    // Divergente
    const eq = findEquipmentByCode(cleanCode);
    const divergentItem: ConferenciaItem = {
      id: generateValidUUID(),
      conferencia_id: conferenciaId,
      equipamento_id: eq?.id || 'avulso',
      equipamento_codigo: cleanCode,
      equipamento_nome: eq?.nome || 'Equipamento Não Cadastrado / Fora de Escopo',
      setor_nome: eq?.setor_nome || 'Divergente',
      local_nome: eq?.local_nome || 'Divergente',
      responsavel: eq?.responsavel || '-',
      status_equipamento: eq?.status || 'EM ESTOQUE',
      encontrado: true,
      data_bipagem: new Date().toISOString(),
      bipado_por: currentUser?.full_name || 'Conferente',
      divergente: true,
    };

    const updatedConf: Conferencia = {
      ...conf,
      itens: [divergentItem, ...conf.itens],
      total_encontrados: conf.total_encontrados + 1,
    };

    setConferencias(prev => prev.map(c => c.id === conferenciaId ? updatedConf : c));
    soundService.playWarning();

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('conferencias').update(sanitizeForSupabase(updatedConf)).eq('id', conf.id);
    }

    return { success: true, message: `Equipamento DIVERGENTE ${cleanCode} registrado na conferência!`, item: divergentItem, isNew: true };
  };

  const finishConferencia = async (conferenciaId: string, observacoes?: string) => {
    const conf = conferencias.find(c => c.id === conferenciaId);
    if (!conf) return;

    const updated: Conferencia = {
      ...conf,
      status: 'FINALIZADA',
      data_fim: new Date().toISOString(),
      observacoes: observacoes ? `${conf.observacoes || ''}\n${observacoes}`.trim() : conf.observacoes,
    };

    setConferencias(prev => prev.map(c => c.id === conferenciaId ? updated : c));

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('conferencias').update(sanitizeForSupabase(updated)).eq('id', conf.id);
      await fetchCloudData();
    }
  };

  const cancelConferencia = async (conferenciaId: string) => {
    const updated = conferencias.map(c => c.id === conferenciaId ? { ...c, status: 'CANCELADA' as const, data_fim: new Date().toISOString() } : c);
    setConferencias(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      const target = updated.find(c => c.id === conferenciaId);
      if (target) {
        await supabase.from('conferencias').update(sanitizeForSupabase(target)).eq('id', conferenciaId);
        await fetchCloudData();
      }
    }
  };

  /**
   * Categorias, Setores, Locais (Gravação Imediata e Reativa)
   */
  const createCategoria = async (nome: string, descricao?: string): Promise<Categoria> => {
    const newCat: Categoria = {
      id: generateValidUUID(),
      nome: nome.trim(),
      descricao: descricao?.trim(),
      created_at: new Date().toISOString(),
    };
    setCategorias(prev => [...prev, newCat]);

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('categorias').insert(sanitizeForSupabase(newCat));
      await fetchCloudData();
    }

    return newCat;
  };

  const deleteCategoria = async (id: string) => {
    setCategorias(prev => prev.filter(c => c.id !== id));
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('categorias').delete().eq('id', id);
      await fetchCloudData();
    }
  };

  const createSetor = async (nome: string, responsavel?: string, descricao?: string): Promise<Setor> => {
    const newSetor: Setor = {
      id: generateValidUUID(),
      nome: nome.trim(),
      responsavel_padrao: responsavel?.trim(),
      descricao: descricao?.trim(),
      created_at: new Date().toISOString(),
    };
    setSetores(prev => [...prev, newSetor]);

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('setores').insert(sanitizeForSupabase(newSetor));
      await fetchCloudData();
    }

    return newSetor;
  };

  const deleteSetor = async (id: string) => {
    setSetores(prev => prev.filter(s => s.id !== id));
    setLocais(prev => prev.filter(l => l.setor_id !== id));

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('setores').delete().eq('id', id);
      await supabase.from('locais').delete().eq('setor_id', id);
      await fetchCloudData();
    }
  };

  const createLocal = async (setorId: string, nome: string, descricao?: string): Promise<Local> => {
    const setor = setores.find(s => s.id === setorId);
    const newLocal: Local = {
      id: generateValidUUID(),
      setor_id: setorId,
      setor_nome: setor?.nome,
      nome: nome.trim(),
      descricao: descricao?.trim(),
      created_at: new Date().toISOString(),
    };
    setLocais(prev => [...prev, newLocal]);

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('locais').insert(sanitizeForSupabase(newLocal));
      await fetchCloudData();
    }

    return newLocal;
  };

  const deleteLocal = async (id: string) => {
    setLocais(prev => prev.filter(l => l.id !== id));
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('locais').delete().eq('id', id);
      await fetchCloudData();
    }
  };

  const updateConfiguracoes = async (newConfig: Partial<ConfiguracoesSistema>) => {
    const updated = { ...configuracoes, ...newConfig, updated_at: new Date().toISOString() };
    setConfiguracoes(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      const configUUID = '00000000-0000-0000-0000-000000000001';
      await supabase.from('configuracoes').upsert({ id: configUUID, ...updated });
      await fetchCloudData();
    }
  };

  const toggleSound = () => {
    const newValue = !configuracoes.som_ativo;
    updateConfiguracoes({ som_ativo: newValue });
    soundService.setEnabled(newValue);
    if (newValue) soundService.playSuccess();
  };

  // Alertas
  const now = new Date();
  const overdueMaintenance = manutencoes.filter(m => {
    if (m.concluida || !m.previsao_retorno) return false;
    return new Date(m.previsao_retorno) < now;
  }).length;

  const noResponsible = equipamentos.filter(e => !e.responsavel || e.responsavel.trim() === '').length;
  const noLocation = equipamentos.filter(e => !e.local_id || e.local_id === '').length;
  const awaitingDiscard = equipamentos.filter(e => e.status === 'AGUARDANDO DESCARTE').length;

  const alertsCount = {
    overdueMaintenance,
    noResponsible,
    noLocation,
    awaitingDiscard,
    total: overdueMaintenance + noResponsible + noLocation + awaitingDiscard,
  };

  return (
    <InventoryContext.Provider
      value={{
        equipamentos,
        categorias,
        setores,
        locais,
        movimentacoes,
        manutencoes,
        conferencias,
        auditoria,
        configuracoes,
        isCloudConnected,
        isSyncing,
        syncWithCloud,
        createEquipamento,
        updateEquipamento,
        transferEquipamento,
        sendToMaintenance,
        finishMaintenance,
        decommissionEquipamento,
        changeEquipmentStatus,
        findEquipmentByCode,
        getEquipmentHistory,
        getNextCodePreview,
        createConferencia,
        beepConferenciaItem,
        finishConferencia,
        cancelConferencia,
        createCategoria,
        createSetor,
        createLocal,
        deleteCategoria,
        deleteSetor,
        deleteLocal,
        updateConfiguracoes,
        toggleSound,
        alertsCount,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory deve ser utilizado dentro de um InventoryProvider');
  }
  return context;
};
