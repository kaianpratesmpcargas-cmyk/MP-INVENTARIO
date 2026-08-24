// ==========================================
// MP CARGAS - Contexto de Autenticação e RBAC
// ==========================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, UserStatus, PermissionCode } from '../types';
import { INITIAL_USERS } from '../mock/initialData';
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

const STORAGE_USERS_KEY = 'mp_cargas_users_v1';
const STORAGE_CURRENT_USER_KEY = 'mp_cargas_current_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      return saved ? JSON.parse(saved) : INITIAL_USERS[0]; // Inicia com o Admin Kaian por padrão para demonstração imediata
    } catch {
      return INITIAL_USERS[0];
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

  // Conta usuários pendentes
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
      return false; // É o último administrador ativo!
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
            // Busca profile no Supabase
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
          console.warn('Fallback para autenticação local devido a:', sbErr);
        }
      }

      // 2. Autenticação Local / Offline Engine
      const foundUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

      if (!foundUser) {
        return { success: false, message: 'E-mail ou senha incorretos.' };
      }

      if (foundUser.status === 'PENDENTE') {
        return { success: false, message: 'Seu acesso ainda está PENDENTE de aprovação pelo Administrador.' };
      }

      if (foundUser.status === 'BLOQUEADO') {
        return { success: false, message: 'Este usuário está BLOQUEADO. Entre em contato com a TI/Administração.' };
      }

      if (foundUser.status === 'RECUSADO') {
        return { success: false, message: 'A solicitação de acesso deste e-mail foi RECUSADA pela administração.' };
      }

      const updatedUser = {
        ...foundUser,
        last_login: new Date().toISOString(),
      };

      setUsers(prev => prev.map(u => u.id === foundUser.id ? updatedUser : u));
      setCurrentUser(updatedUser);

      return { success: true, message: `Bem-vindo de volta, ${updatedUser.full_name}!` };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Solicitação de Acesso (Novo Cadastro com status PENDENTE)
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
            options: {
              data: { full_name: fullName, department }
            }
          });
        } catch (e) {
          console.warn('Erro no signUp Supabase (usando local):', e);
        }
      }

      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        email: emailClean,
        full_name: fullName.trim(),
        role: 'CONSULTA',
        status: 'PENDENTE',
        department: department || 'Geral',
        created_at: new Date().toISOString(),
      };

      setUsers(prev => [newUser, ...prev]);

      return {
        success: true,
        message: 'Solicitação de acesso enviada com sucesso! Aguarde a aprovação de um Administrador.'
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
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    setCurrentUser(null);
  };

  /**
   * Verificador de Permissões
   */
  const hasPermission = (code: PermissionCode): boolean => {
    if (!currentUser) return false;
    if (currentUser.status !== 'ATIVO') return false;

    // Administrador tem acesso total irrestrito
    if (currentUser.role === 'ADMINISTRADOR') return true;

    // Permissões customizadas explícitas
    if (currentUser.custom_permissions && currentUser.custom_permissions.includes(code)) {
      return true;
    }

    // Permissões padrão baseadas no Role
    switch (currentUser.role) {
      case 'CONFERENTE':
        return [
          'view_inventory',
          'scan_barcode',
          'conduct_conference',
          'transfer_equipment',
          'generate_labels',
          'print_labels',
          'view_reports'
        ].includes(code);

      case 'MANUTENÇÃO':
        return [
          'view_inventory',
          'scan_barcode',
          'open_maintenance',
          'finish_maintenance',
          'transfer_equipment',
          'view_reports'
        ].includes(code);

      case 'CONSULTA':
      default:
        return [
          'view_inventory',
          'scan_barcode',
          'view_reports'
        ].includes(code);
    }
  };

  /**
   * Aprovar Usuário Pendente
   */
  const approveUser = async (userId: string, role: UserRole, customPermissions?: PermissionCode[]) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'ATIVO',
          role,
          custom_permissions: customPermissions || [],
          updated_at: new Date().toISOString()
        };
      }
      return u;
    }));
  };

  /**
   * Recusar Usuário Pendente
   */
  const rejectUser = async (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'RECUSADO',
          updated_at: new Date().toISOString()
        };
      }
      return u;
    }));
  };

  /**
   * Bloquear Usuário Ativo
   */
  const blockUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    if (!canModifyAdmin(userId)) {
      return { success: false, message: 'Ação bloqueada: Não é permitido desativar ou bloquear o último Administrador ativo do sistema.' };
    }

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'BLOQUEADO',
          updated_at: new Date().toISOString()
        };
      }
      return u;
    }));

    return { success: true };
  };

  /**
   * Desbloquear Usuário
   */
  const unblockUser = async (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'ATIVO',
          updated_at: new Date().toISOString()
        };
      }
      return u;
    }));
  };

  /**
   * Atualizar Perfil e Permissões Customizadas
   */
  const updateUserRoleAndPermissions = async (
    userId: string,
    role: UserRole,
    customPermissions?: PermissionCode[]
  ): Promise<{ success: boolean; message?: string }> => {
    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, message: 'Usuário não encontrado.' };

    if (target.role === 'ADMINISTRADOR' && role !== 'ADMINISTRADOR') {
      if (!canModifyAdmin(userId)) {
        return { success: false, message: 'Ação bloqueada: Não é permitido rebaixar o único Administrador ativo.' };
      }
    }

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = {
          ...u,
          role,
          custom_permissions: customPermissions || u.custom_permissions || [],
          updated_at: new Date().toISOString()
        };
        // Se for o próprio usuário logado, atualiza o estado
        if (currentUser && currentUser.id === userId) {
          setCurrentUser(updated);
        }
        return updated;
      }
      return u;
    }));

    return { success: true };
  };

  /**
   * Atualizar Perfil Pessoal do Usuário Logado
   */
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
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
