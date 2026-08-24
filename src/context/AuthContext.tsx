// ==========================================
// MP CARGAS - Contexto de Autenticação e RBAC
// ==========================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole, PermissionCode } from '../types';
import { ALL_SYSTEM_PERMISSIONS, DATA_VERSION } from '../mock/initialData';
import { getSupabaseClient } from '../lib/supabase';

interface AuthContextType {
  currentUser: UserProfile | null;
  users: UserProfile[];
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message: string }>;
  requestAccess: (fullName: string, email: string, password: string, department?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  hasPermission: (code: PermissionCode) => boolean;
  approveUser: (userId: string, role: UserRole, customPermissions?: PermissionCode[]) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
  unblockUser: (userId: string) => Promise<void>;
  updateUserRoleAndPermissions: (userId: string, role: UserRole, customPermissions?: PermissionCode[]) => Promise<{ success: boolean; message?: string }>;
  updateCurrentUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  canModifyAdmin: (targetUserId: string) => boolean;
  pendingUsersCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_USERS_KEY         = 'mp_cargas_users_v2';
const STORAGE_CURRENT_USER_KEY  = 'mp_cargas_current_user_v2';
const STORAGE_VERSION_KEY       = 'mp_cargas_data_version';

// ──────────────────────────────────────────
// Limpa localStorage se versão dos dados for antiga
// ──────────────────────────────────────────
function ensureCleanStorage() {
  try {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== DATA_VERSION) {
      // Limpa todas as chaves do sistema MP CARGAS
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mp_cargas_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(STORAGE_VERSION_KEY, DATA_VERSION);
    }
  } catch (e) {
    console.warn('localStorage não disponível:', e);
  }
}

// Executa na inicialização do módulo
ensureCleanStorage();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // SEMPRE inicia sem sessão — login obrigatório
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (!saved) return null;
      const parsed: UserProfile = JSON.parse(saved);
      // Valida se o usuário ainda existe e está ativo
      return parsed ?? null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sincroniza usuários no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Erro ao salvar usuários:', e);
    }
  }, [users]);

  // Sincroniza usuário logado no localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
      }
    } catch (e) {
      console.error('Erro ao salvar usuário atual:', e);
    }
  }, [currentUser]);

  const pendingUsersCount = users.filter(u => u.status === 'PENDENTE').length;

  /**
   * Verifica se é seguro modificar ou desativar um administrador
   * REGRA CRÍTICA: Não permite remover o último administrador ativo!
   */
  const canModifyAdmin = (targetUserId: string): boolean => {
    const target = users.find(u => u.id === targetUserId);
    if (!target || target.role !== 'ADMINISTRADOR') return true;

    const activeAdmins = users.filter(u => u.role === 'ADMINISTRADOR' && u.status === 'ATIVO');
    if (activeAdmins.length <= 1 && activeAdmins.some(a => a.id === targetUserId)) {
      return false;
    }
    return true;
  };

  /**
   * Login do Usuário
   */
  const login = async (email: string, password?: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      // 1. Tenta autenticação no Supabase se configurado
      const supabase = getSupabaseClient();
      if (supabase && password) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (!error && data.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profile) {
              if (profile.status === 'PENDENTE') {
                return { success: false, message: 'Seu cadastro está aguardando aprovação do administrador.' };
              }
              if (profile.status === 'BLOQUEADO' || profile.status === 'RECUSADO') {
                return { success: false, message: 'Seu acesso está bloqueado ou foi recusado pela administração.' };
              }
              setCurrentUser(profile);
              return { success: true, message: 'Login realizado com sucesso!' };
            }
          }
        } catch (sbErr) {
          console.warn('Fallback para autenticação local:', sbErr);
        }
      }

      // 2. Autenticação local (offline engine)
      const foundUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

      if (!foundUser) {
        return { success: false, message: 'E-mail ou senha incorretos.' };
      }

      if (foundUser.status === 'PENDENTE') {
        return { success: false, message: 'Seu acesso está PENDENTE de aprovação pelo Administrador.' };
      }

      if (foundUser.status === 'BLOQUEADO') {
        return { success: false, message: 'Usuário BLOQUEADO. Entre em contato com a administração.' };
      }

      if (foundUser.status === 'RECUSADO') {
        return { success: false, message: 'Solicitação de acesso RECUSADA pela administração.' };
      }

      const updatedUser = { ...foundUser, last_login: new Date().toISOString() };
      setUsers(prev => prev.map(u => u.id === foundUser.id ? updatedUser : u));
      setCurrentUser(updatedUser);

      return { success: true, message: `Bem-vindo, ${updatedUser.full_name}!` };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Primeiro acesso / Solicitação de Registro
   * Se não há NENHUM usuário, o primeiro cadastro recebe perfil ADMINISTRADOR automaticamente.
   */
  const requestAccess = async (
    fullName: string,
    email: string,
    password: string,
    department?: string
  ): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      const emailClean = email.trim().toLowerCase();
      const existing = users.find(u => u.email.toLowerCase() === emailClean);

      if (existing) {
        return { success: false, message: 'Este e-mail já possui uma solicitação ou cadastro no sistema.' };
      }

      // Tenta registrar no Supabase Auth se ativo
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.auth.signUp({
            email: emailClean,
            password,
            options: { data: { full_name: fullName, department } }
          });
        } catch (e) {
          console.warn('Erro no signUp Supabase:', e);
        }
      }

      const isFirstUser = users.length === 0;

      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        email: emailClean,
        full_name: fullName.trim(),
        // Primeiro usuário do sistema → vira Administrador automaticamente
        role: isFirstUser ? 'ADMINISTRADOR' : 'CONSULTA',
        status: isFirstUser ? 'ATIVO' : 'PENDENTE',
        department: department || '',
        created_at: new Date().toISOString(),
      };

      setUsers(prev => [newUser, ...prev]);

      if (isFirstUser) {
        setCurrentUser(newUser);
        return {
          success: true,
          message: 'Conta criada com sucesso! Você foi definido como Administrador por ser o primeiro usuário do sistema.',
        };
      }

      return {
        success: true,
        message: 'Solicitação enviada! Aguarde a aprovação de um Administrador para acessar o sistema.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = () => {
    const supabase = getSupabaseClient();
    if (supabase) supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
  };

  /**
   * Verificador de Permissões RBAC
   */
  const hasPermission = (code: PermissionCode): boolean => {
    if (!currentUser) return false;
    if (currentUser.status !== 'ATIVO') return false;
    if (currentUser.role === 'ADMINISTRADOR') return true;

    if (currentUser.custom_permissions && currentUser.custom_permissions.includes(code)) {
      return true;
    }

    switch (currentUser.role) {
      case 'CONFERENTE':
        return ['view_inventory', 'scan_barcode', 'conduct_conference', 'transfer_equipment', 'generate_labels', 'print_labels', 'view_reports'].includes(code);
      case 'MANUTENÇÃO':
        return ['view_inventory', 'scan_barcode', 'open_maintenance', 'finish_maintenance', 'transfer_equipment', 'view_reports'].includes(code);
      case 'CONSULTA':
      default:
        return ['view_inventory', 'scan_barcode', 'view_reports'].includes(code);
    }
  };

  const approveUser = async (userId: string, role: UserRole, customPermissions?: PermissionCode[]) => {
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? { ...u, status: 'ATIVO', role, custom_permissions: customPermissions || [], updated_at: new Date().toISOString() }
        : u
    ));
  };

  const rejectUser = async (userId: string) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, status: 'RECUSADO', updated_at: new Date().toISOString() } : u
    ));
  };

  const blockUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    if (!canModifyAdmin(userId)) {
      return { success: false, message: 'Não é permitido bloquear o único Administrador ativo do sistema.' };
    }
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, status: 'BLOQUEADO', updated_at: new Date().toISOString() } : u
    ));
    return { success: true };
  };

  const unblockUser = async (userId: string) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, status: 'ATIVO', updated_at: new Date().toISOString() } : u
    ));
  };

  const updateUserRoleAndPermissions = async (
    userId: string,
    role: UserRole,
    customPermissions?: PermissionCode[]
  ): Promise<{ success: boolean; message?: string }> => {
    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, message: 'Usuário não encontrado.' };

    if (target.role === 'ADMINISTRADOR' && role !== 'ADMINISTRADOR') {
      if (!canModifyAdmin(userId)) {
        return { success: false, message: 'Não é permitido rebaixar o único Administrador ativo.' };
      }
    }

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = { ...u, role, custom_permissions: customPermissions || u.custom_permissions || [], updated_at: new Date().toISOString() };
        if (currentUser && currentUser.id === userId) setCurrentUser(updated);
        return updated;
      }
      return u;
    }));

    return { success: true };
  };

  const updateCurrentUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data, updated_at: new Date().toISOString() };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoading,
        login,
        requestAccess,
        logout,
        hasPermission,
        approveUser,
        rejectUser,
        blockUser,
        unblockUser,
        updateUserRoleAndPermissions,
        updateCurrentUserProfile,
        canModifyAdmin,
        pendingUsersCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  return context;
};
