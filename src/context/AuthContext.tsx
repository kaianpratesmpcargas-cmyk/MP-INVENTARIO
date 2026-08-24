// ==========================================
// MP CARGAS - Contexto de Autenticação e RBAC (com Sincronização Supabase Direta e Resiliente)
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

function ensureCleanStorage() {
  try {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== DATA_VERSION) {
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

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (!saved) return null;
      const parsed: UserProfile = JSON.parse(saved);
      return parsed ?? null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Carrega perfis do Supabase na inicialização
  useEffect(() => {
    const fetchCloudProfiles = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (!error && data && data.length > 0) {
          setUsers(data as UserProfile[]);
        }
      } catch (err) {
        console.warn('Erro ao carregar perfis do Supabase:', err);
      }
    };

    fetchCloudProfiles();
  }, []);

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
   * Login do Usuário (Multi-Dispositivo)
   */
  const login = async (email: string, password?: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    const emailClean = email.trim().toLowerCase();

    try {
      const supabase = getSupabaseClient();

      // 1. Tenta autenticação nativa do Supabase Auth se ativo
      if (supabase && password) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: emailClean,
            password,
          });

          if (!authError && authData.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .maybeSingle();

            if (profile) {
              const userProfile = profile as UserProfile;
              if (userProfile.status === 'PENDENTE') {
                return { success: false, message: 'Seu cadastro está aguardando aprovação do administrador.' };
              }
              if (userProfile.status === 'BLOQUEADO' || userProfile.status === 'RECUSADO') {
                return { success: false, message: 'Seu acesso está bloqueado ou foi recusado pela administração.' };
              }

              setCurrentUser(userProfile);
              setUsers(prev => prev.some(u => u.id === userProfile.id) ? prev : [userProfile, ...prev]);
              return { success: true, message: `Bem-vindo, ${userProfile.full_name}!` };
            }
          }
        } catch (sbErr) {
          console.warn('Supabase Auth error:', sbErr);
        }
      }

      // 2. Consulta direta na tabela public.profiles do Supabase
      if (supabase) {
        try {
          const { data: dbProfile, error: dbErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', emailClean)
            .maybeSingle();

          if (!dbErr && dbProfile) {
            const userProfile = dbProfile as UserProfile;

            // Se tem senha cadastrada no perfil, valida
            if (userProfile.password && password && userProfile.password !== password) {
              return { success: false, message: 'Senha incorreta. Tente novamente.' };
            }

            if (userProfile.status === 'PENDENTE') {
              return { success: false, message: 'Seu cadastro está aguardando aprovação do Administrador.' };
            }
            if (userProfile.status === 'BLOQUEADO' || userProfile.status === 'RECUSADO') {
              return { success: false, message: 'Seu acesso está bloqueado ou recusado.' };
            }

            // Atualiza last_login
            const updatedProfile = { ...userProfile, last_login: new Date().toISOString() };
            supabase.from('profiles').update({ last_login: updatedProfile.last_login }).eq('id', userProfile.id).then(() => {});

            setCurrentUser(updatedProfile);
            setUsers(prev => prev.map(u => u.id === userProfile.id ? updatedProfile : u));
            return { success: true, message: `Bem-vindo, ${userProfile.full_name}!` };
          }
        } catch (err) {
          console.warn('Erro ao consultar profiles no Supabase:', err);
        }
      }

      // 3. Fallback para banco local (caso esteja offline)
      const foundUser = users.find(u => u.email.toLowerCase() === emailClean);
      if (foundUser) {
        if (foundUser.password && password && foundUser.password !== password) {
          return { success: false, message: 'Senha incorreta. Tente novamente.' };
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
      }

      // 4. Se não há nenhum usuário cadastrado no sistema (Primeiro Acesso):
      // Cria a conta de Administrador automaticamente com o e-mail digitado!
      if (users.length === 0) {
        if (password && password.length >= 6) {
          const autoName = emailClean.split('@')[0].replace(/[._-]/g, ' ').toUpperCase() || 'Administrador';
          return await requestAccess(autoName, emailClean, password, 'Administração');
        } else {
          return {
            success: false,
            message: 'Primeiro acesso detectado! A senha para criar sua conta de Administrador deve ter no mínimo 6 caracteres.',
          };
        }
      }

      return { success: false, message: 'E-mail ou senha incorretos. Verifique suas credenciais ou clique em Solicitar Cadastro.' };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Registro / Criação de Conta (Sincronizado na Nuvem)
   */
  const requestAccess = async (
    fullName: string,
    email: string,
    password: string,
    department?: string
  ): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    const emailClean = email.trim().toLowerCase();

    try {
      const supabase = getSupabaseClient();
      const isFirstUser = users.length === 0;

      // Gera UUID único para compatibilidade PostgreSQL
      let newUserId = '00000000-0000-0000-0000-' + Date.now().toString().slice(-12).padStart(12, '0');
      try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          newUserId = crypto.randomUUID();
        }
      } catch {}

      // Tenta registrar no Supabase Auth
      if (supabase) {
        try {
          const { data: authData } = await supabase.auth.signUp({
            email: emailClean,
            password,
            options: {
              data: { full_name: fullName.trim(), department: department || '' },
            },
          });
          if (authData?.user?.id) {
            newUserId = authData.user.id;
          }
        } catch (e) {
          console.warn('Supabase auth.signUp:', e);
        }
      }

      const newUser: UserProfile = {
        id: newUserId,
        email: emailClean,
        password: password, // Guarda para autenticação direta resiliente
        full_name: fullName.trim(),
        role: isFirstUser ? 'ADMINISTRADOR' : 'CONSULTA',
        status: isFirstUser ? 'ATIVO' : 'PENDENTE',
        department: department || '',
        created_at: new Date().toISOString(),
      };

      // Salva diretamente na tabela profiles do Supabase
      if (supabase) {
        try {
          await supabase.from('profiles').upsert(newUser);
        } catch (err) {
          console.warn('Erro ao inserir perfil no Supabase:', err);
        }
      }

      setUsers(prev => [newUser, ...prev]);

      if (isFirstUser) {
        setCurrentUser(newUser);
        return {
          success: true,
          message: 'Conta de Administrador criada com sucesso! Você já está conectado.',
        };
      }

      return {
        success: true,
        message: 'Solicitação enviada com sucesso! Aguarde a aprovação de um Administrador.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const supabase = getSupabaseClient();
    if (supabase) supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
  };

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
    const updatedUsers = users.map(u =>
      u.id === userId
        ? { ...u, status: 'ATIVO' as const, role, custom_permissions: customPermissions || [], updated_at: new Date().toISOString() }
        : u
    );
    setUsers(updatedUsers);

    const supabase = getSupabaseClient();
    if (supabase) {
      const target = updatedUsers.find(u => u.id === userId);
      if (target) await supabase.from('profiles').upsert(target);
    }
  };

  const rejectUser = async (userId: string) => {
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, status: 'RECUSADO' as const, updated_at: new Date().toISOString() } : u
    );
    setUsers(updatedUsers);

    const supabase = getSupabaseClient();
    if (supabase) {
      const target = updatedUsers.find(u => u.id === userId);
      if (target) await supabase.from('profiles').upsert(target);
    }
  };

  const blockUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    if (!canModifyAdmin(userId)) {
      return { success: false, message: 'Não é permitido bloquear o único Administrador ativo do sistema.' };
    }
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, status: 'BLOQUEADO' as const, updated_at: new Date().toISOString() } : u
    );
    setUsers(updatedUsers);

    const supabase = getSupabaseClient();
    if (supabase) {
      const target = updatedUsers.find(u => u.id === userId);
      if (target) await supabase.from('profiles').upsert(target);
    }
    return { success: true };
  };

  const unblockUser = async (userId: string) => {
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, status: 'ATIVO' as const, updated_at: new Date().toISOString() } : u
    );
    setUsers(updatedUsers);

    const supabase = getSupabaseClient();
    if (supabase) {
      const target = updatedUsers.find(u => u.id === userId);
      if (target) await supabase.from('profiles').upsert(target);
    }
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

    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const updated = { ...u, role, custom_permissions: customPermissions || u.custom_permissions || [], updated_at: new Date().toISOString() };
        if (currentUser && currentUser.id === userId) setCurrentUser(updated);
        return updated;
      }
      return u;
    });

    setUsers(updatedUsers);

    const supabase = getSupabaseClient();
    if (supabase) {
      const updated = updatedUsers.find(u => u.id === userId);
      if (updated) await supabase.from('profiles').upsert(updated);
    }

    return { success: true };
  };

  const updateCurrentUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data, updated_at: new Date().toISOString() };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('profiles').upsert(updated);
    }
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
