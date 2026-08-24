import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole, UserStatus, PermissionCode } from '../../types';
import { ALL_SYSTEM_PERMISSIONS } from '../../mock/initialData';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Edit,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const {
    users,
    currentUser,
    approveUser,
    rejectUser,
    blockUser,
    unblockUser,
    updateUserRoleAndPermissions,
    canModifyAdmin,
  } = useAuth();

  // Abas de Filtro
  const [tab, setTab] = useState<'TODOS' | 'PENDENTES' | 'ATIVOS' | 'BLOQUEADOS' | 'ADMINISTRADORES'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Aprovação
  const [approvingUser, setApprovingUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('CONFERENTE');

  // Modal de Permissões Granulares
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<UserProfile | null>(null);
  const [tempRole, setTempRole] = useState<UserRole>('CONFERENTE');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionCode[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtra lista de usuários
  const filteredUsers = users.filter(u => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = u.full_name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchDept = (u.department || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchDept) return false;
    }

    if (tab === 'PENDENTES' && u.status !== 'PENDENTE') return false;
    if (tab === 'ATIVOS' && u.status !== 'ATIVO') return false;
    if (tab === 'BLOQUEADOS' && u.status !== 'BLOQUEADO' && u.status !== 'RECUSADO') return false;
    if (tab === 'ADMINISTRADORES' && u.role !== 'ADMINISTRADOR') return false;

    return true;
  });

  const pendingCount = users.filter(u => u.status === 'PENDENTE').length;

  // Abertura do Modal de Aprovação
  const handleOpenApprove = (u: UserProfile) => {
    setApprovingUser(u);
    setSelectedRole(u.role === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'CONFERENTE');
  };

  const handleConfirmApprove = async () => {
    if (!approvingUser) return;
    await approveUser(approvingUser.id, selectedRole);
    setApprovingUser(null);
  };

  const handleReject = async (u: UserProfile) => {
    if (window.confirm(`Deseja recusar a solicitação de acesso de ${u.full_name}?`)) {
      await rejectUser(u.id);
    }
  };

  // Abertura do Modal de Permissões
  const handleOpenPermissions = (u: UserProfile) => {
    setEditingPermissionsUser(u);
    setTempRole(u.role);
    setErrorMessage(null);

    // Carrega permissões atuais ou padrões do papel
    if (u.custom_permissions && u.custom_permissions.length > 0) {
      setSelectedPermissions(u.custom_permissions);
    } else {
      setSelectedPermissions(ALL_SYSTEM_PERMISSIONS.map(p => p.code));
    }
  };

  const handleTogglePermission = (code: PermissionCode) => {
    setSelectedPermissions(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSavePermissions = async () => {
    if (!editingPermissionsUser) return;

    const res = await updateUserRoleAndPermissions(
      editingPermissionsUser.id,
      tempRole,
      selectedPermissions
    );

    if (res.success) {
      setEditingPermissionsUser(null);
      setErrorMessage(null);
    } else {
      setErrorMessage(res.message || 'Erro ao atualizar usuário.');
    }
  };

  const handleToggleBlock = async (u: UserProfile) => {
    if (u.status === 'ATIVO') {
      if (!canModifyAdmin(u.id)) {
        alert('Ação bloqueada: Não é permitido desativar ou bloquear o último Administrador ativo do sistema.');
        return;
      }
      if (window.confirm(`Deseja bloquear o acesso de ${u.full_name}?`)) {
        await blockUser(u.id);
      }
    } else {
      await unblockUser(u.id);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-yellow-500" />
            <span>Administração de Usuários & Acessos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aprovação de cadastros, definição de papéis e matriz de permissões operacionais granulares.
          </p>
        </div>
      </div>

      {/* Alerta de Solicitações Pendentes */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-black font-bold">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-extrabold text-xs sm:text-sm text-zinc-900">
                {pendingCount} {pendingCount === 1 ? 'Solicitação de Acesso Aguardando Análise' : 'Solicitações de Acesso Aguardando Análise'}
              </div>
              <p className="text-xs text-slate-600">
                Novos funcionários enviaram solicitação. Defina o perfil para liberar o login.
              </p>
            </div>
          </div>

          <button
            onClick={() => setTab('PENDENTES')}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-yellow-400 font-bold text-xs shadow-sm transition-colors whitespace-nowrap"
          >
            VER SOLICITAÇÕES
          </button>
        </div>
      )}

      {/* Abas e Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Abas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
            <button
              onClick={() => setTab('TODOS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'TODOS' ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setTab('PENDENTES')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                tab === 'PENDENTES' ? 'bg-amber-500 text-black font-extrabold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Pendentes</span>
              {pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-black text-yellow-400 font-mono text-[10px] flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('ATIVOS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'ATIVOS' ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setTab('ADMINISTRADORES')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'ADMINISTRADORES' ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Administradores
            </button>
            <button
              onClick={() => setTab('BLOQUEADOS')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === 'BLOQUEADOS' ? 'bg-zinc-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bloqueados / Recusados
            </button>
          </div>

          {/* Busca */}
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail ou setor..."
              className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-1.5 text-xs focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {/* Tabela de Usuários */}
        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 pl-4">Colaborador / E-mail</th>
                  <th className="p-3.5">Departamento</th>
                  <th className="p-3.5">Perfil (Role)</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Último Acesso</th>
                  <th className="p-3.5 text-right pr-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => {
                  const isPending = u.status === 'PENDENTE';
                  const isBlocked = u.status === 'BLOQUEADO' || u.status === 'RECUSADO';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Avatar e Nome */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-900 text-yellow-400 font-bold text-xs flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              u.full_name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 text-xs">{u.full_name}</div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Departamento */}
                      <td className="p-3.5 text-slate-600 font-medium">
                        {u.department || 'Geral'}
                      </td>

                      {/* Perfil */}
                      <td className="p-3.5">
                        <StatusBadge role={u.role} size="sm" />
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <StatusBadge status={u.status} size="sm" />
                      </td>

                      {/* Último Acesso */}
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {u.last_login ? new Date(u.last_login).toLocaleString('pt-BR') : 'Nunca acessou'}
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right pr-4">
                        <div className="inline-flex items-center gap-1.5">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleOpenApprove(u)}
                                className="px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs shadow-xs transition-colors"
                              >
                                APROVAR
                              </button>
                              <button
                                onClick={() => handleReject(u)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 text-red-600 font-bold text-xs transition-colors"
                              >
                                RECUSAR
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Alterar Permissões */}
                              <button
                                onClick={() => handleOpenPermissions(u)}
                                title="Editar Perfil e Permissões Granulares"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100 transition-colors"
                              >
                                <Sliders className="w-4 h-4" />
                              </button>

                              {/* Bloquear / Desbloquear */}
                              <button
                                onClick={() => handleToggleBlock(u)}
                                title={isBlocked ? 'Desbloquear Usuário' : 'Bloquear Acesso'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isBlocked
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                }`}
                              >
                                {isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </button>
                            </>
                          )}
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
            icon={<Users className="w-8 h-8 text-slate-400" />}
            title="Nenhum usuário encontrado"
            description="Nenhum usuário corresponde aos critérios selecionados."
          />
        )}
      </div>

      {/* Modal de Aprovação de Solicitação de Acesso */}
      {approvingUser && (
        <Modal
          isOpen={true}
          onClose={() => setApprovingUser(null)}
          title="Aprovar Solicitação de Acesso"
          subtitle={`Defina o perfil de acesso para ${approvingUser.full_name}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div>Nome: <strong className="text-zinc-900">{approvingUser.full_name}</strong></div>
              <div>E-mail: <strong className="text-zinc-900">{approvingUser.email}</strong></div>
              <div>Departamento: <strong className="text-zinc-900">{approvingUser.department || 'Geral'}</strong></div>
              <div className="text-[11px] text-slate-400">
                Data da solicitação: {new Date(approvingUser.created_at).toLocaleString('pt-BR')}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1.5">
                Selecione o Perfil (Role) a ser Concedido *
              </label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-yellow-400"
              >
                <option value="CONFERENTE">CONFERENTE (Bipagem, Conferência, Transferências)</option>
                <option value="MANUTENÇÃO">MANUTENÇÃO (Abertura e Conclusão de Reparos)</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR (Acesso Total e Gestão)</option>
                <option value="CONSULTA">CONSULTA (Apenas Leitura e Relatórios)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovingUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold shadow-sm transition-all"
              >
                APROVAR ACESSO AGORA
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Edição de Permissões Granulares (Requirement #11) */}
      {editingPermissionsUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditingPermissionsUser(null)}
          title="Permissões e Perfil de Acesso"
          subtitle={`Configurando privilégios para ${editingPermissionsUser.full_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Seleção do Papel */}
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">
                Papel Principal (Role)
              </label>
              <select
                value={tempRole}
                onChange={e => setTempRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-200 text-zinc-900 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-yellow-400"
              >
                <option value="ADMINISTRADOR">ADMINISTRADOR (Acesso Total Irrestrito)</option>
                <option value="CONFERENTE">CONFERENTE</option>
                <option value="MANUTENÇÃO">MANUTENÇÃO</option>
                <option value="CONSULTA">CONSULTA</option>
              </select>
            </div>

            {/* Matriz de Permissões Individuais com Checkbox (Requirement #11) */}
            <div>
              <label className="block font-semibold text-zinc-700 mb-2">
                Permissões Individuais Granulares
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
                {ALL_SYSTEM_PERMISSIONS.map(perm => {
                  const isChecked = tempRole === 'ADMINISTRADOR' || selectedPermissions.includes(perm.code);
                  const isDisabled = tempRole === 'ADMINISTRADOR';

                  return (
                    <label
                      key={perm.id}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-50/50 border-amber-300'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      } ${isDisabled ? 'opacity-80 cursor-default' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => handleTogglePermission(perm.code)}
                        className="mt-0.5 rounded text-yellow-500 focus:ring-yellow-400"
                      />
                      <div>
                        <div className="font-bold text-zinc-900 text-xs">{perm.name}</div>
                        <div className="text-[10px] text-slate-500">{perm.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPermissionsUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold shadow-sm transition-all"
              >
                SALVAR PERMISSÕES
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
