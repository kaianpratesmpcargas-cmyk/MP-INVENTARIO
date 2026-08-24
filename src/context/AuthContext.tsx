// ==========================================
// MP CARGAS - Contexto de Autenticação e RBAC (Sem Duplicatas, 100% Sincronizado)
// ==========================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile, UserRole, PermissionCode } from '../types';
import { ALL_SYSTEM_PERMISSIONS, DATA_VERSION } from '../mock/initialData';
import { getSupabaseClient } from '../lib/supabase';
import { generateValidUUID, isValidUUID } from '../lib/uuid';

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

const STORAGE_USERS_KEY         = 'mp_cargas_users_v3';
const STORAGE_CURRENT_USER_KEY  = 'mp_cargas_current_user_v3';
const STORAGE_VERSION_KEY       = 'mp_cargas_data_version';

// Helper para deduplicar lista de usuários por email
function deduplicateUsers(userList: UserProfile[]): UserProfile[] {
  const map = new Map<string, UserProfile>();
  for (const u of userList) {
    if (!u || !u.email) continue;
    const cleanEmail = u.email.trim().toLowerCase();
    const existing = map.get(cleanEmail);
    if (!existing) {
      map.set(cleanEmail, { ...u, email: cleanEmail });
    } else {
      // Mescla priorizando dados mais recentes ou status ATIVO
      map.set(cleanEmail, {
        ...existing,
        ...u,
        email: cleanEmail,
        status: (existing.status === 'ATIVO' || u.status === 'ATIVO') ? 'ATIVO' : u.status,
        role: (existing.role === 'ADMINISTRADOR' || u.role === 'ADMINISTRADOR') ? 'ADMINISTRADOR' : u.role,
        updated_at: new Date().toISOString(),
      });
    }
  }
  return Array.from(map.values());
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      return saved ? deduplicateUsers(JSON.parse(saved)) : [];
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

  // Carrega e sincroniza usuários do Supabase
  const syncProfilesFromSupabase = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data && data.length > 0) {
        setUsers(prev => deduplicateUsers([...data, ...prev]));
      }
    } catch (err) {
      console.warn('Erro ao carregar perfis do Supabase:', err);
    }
  }, []);

  useEffect(() => {
    syncProfilesFromSupabase();

    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Escuta alterações de perfis em tempo real
    const channel = supabase
      .channel('realtime:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        syncProfilesFromSupabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncProfilesFromSupabase]);

  // Sincroniza usuários no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(deduplicateUsers(users)));
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
    const target = users.find(u => u.id === targetUserId || u.email.toLowerCase() === targetUserId.toLowerCase());
    if (!target || target.role !== 'ADMINISTRADOR') return true;

    const activeAdmins = users.filter(u => u.role === 'ADMINISTRADOR' && u.status === 'ATIVO');
    if (activeAdmins.length <= 1 && activeAdmins.some(a => a.id === target.id || a.email === target.email)) {
      return false;
    }
    return true;
  };

  /**
   * Login Unificado
   */
  const login = async (email: string, password?: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    const emailClean = email.trim().toLowerCase();

    try {
      const supabase = getSupabaseClient();

      // 1. Tenta autenticação via Supabase Auth
      if (supabase && password) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: emailClean,
            password,
          });

          if (!authError && authData?.user) {
            const userId = authData.user.id;
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();

            let userProfile: UserProfile;
            if (profile) {
              userProfile = profile as UserProfile;
            } else {
              userProfile = {
                id: userId,
                email: emailClean,
                full_name: authData.user.user_metadata?.full_name || emailClean.split('@')[0].toUpperCase(),
                role: 'ADMINISTRADOR',
                status: 'ATIVO',
                department: authData.user.user_metadata?.department || 'Administração',
                created_at: new Date().toISOString(),
              };
              await supabase.from('profiles').upsert(userProfile);
            }

            if (userProfile.status === 'PENDENTE') {
              return { success: false, message: 'Seu cadastro está aguardando aprovação do Administrador.' };
            }
            if (userProfile.status === 'BLOQUEADO' || userProfile.status === 'RECUSADO') {
              return { success: false, message: 'Seu acesso está bloqueado pela administração.' };
            }

            setCurrentUser(userProfile);
            setUsers(prev => deduplicateUsers([userProfile, ...prev]));
            return { success: true, message: `Bem-vindo, ${userProfile.full_name}!` };
          }
        } catch (sbErr) {
          console.warn('Supabase Auth signIn:', sbErr);
        }
      }

      // 2. Tenta autenticação direta na tabela profiles
      if (supabase) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', emailClean)
            .maybeSingle();

          if (profile) {
            const userProfile = profile as UserProfile;
            if (userProfile.password && password && userProfile.password !== password) {
              return { success: false, message: 'Senha incorreta. Tente novamente.' };
            }
            if (userProfile.status === 'PENDENTE') {
              return { success: false, message: 'Seu cadastro está aguardando aprovação do Administrador.' };
            }
            if (userProfile.status === 'BLOQUEADO' || userProfile.status === 'RECUSADO') {
              return { success: false, message: 'Seu acesso está bloqueado pela administração.' };
            }

            const updatedProfile = { ...userProfile, last_login: new Date().toISOString() };
            supabase.from('profiles').upsert(updatedProfile).then(() => {});

            setCurrentUser(updatedProfile);
            setUsers(prev => deduplicateUsers([updatedProfile, ...prev]));
            return { success: true, message: `Bem-vindo, ${updatedProfile.full_name}!` };
          }
        } catch (err) {
          console.warn('Busca direta de perfil:', err);
        }
      }

      // 3. Consulta nos perfis em memória
      const localUser = users.find(u => u.email.toLowerCase() === emailClean);
      if (localUser) {
        if (localUser.password && password && localUser.password !== password) {
          return { success: false, message: 'Senha incorreta. Tente novamente.' };
        }
        if (localUser.status === 'PENDENTE') {
          return { success: false, message: 'Seu cadastro está aguardando aprovação.' };
        }
        if (localUser.status === 'BLOQUEADO' || localUser.status === 'RECUSADO') {
          return { success: false, message: 'Seu acesso está bloqueado.' };
        }

        const updatedUser = { ...localUser, last_login: new Date().toISOString() };
        setCurrentUser(updatedUser);
        setUsers(prev => deduplicateUsers(prev.map(u => u.email.toLowerCase() === emailClean ? updatedUser : u)));
        return { success: true, message: `Bem-vindo, ${updatedUser.full_name}!` };
      }

      // 4. Se não há nenhum usuário cadastrado no sistema (Primeiro Acesso):
      // Cria a conta de Administrador automaticamente!
      if (users.length === 0) {
        if (password && password.length >= 6) {
          const autoName = emailClean.split('@')[0].replace(/[._-]/g, ' ').toUpperCase() || 'ADMINISTRADOR';
          return await requestAccess(autoName, emailClean, password, 'Administração');
        } else {
          return {
            success: false,
            message: 'Primeiro acesso detectado! A senha para criar sua conta de Administrador deve ter no mínimo 6 caracteres.',
          };
        }
      }

      return { success: false, message: 'E-mail ou senha incorretos. Verifique suas credenciais.' };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Registro / Criação de Conta
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

      let userId = generateValidUUID();

      // Registra no Supabase Auth
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
            userId = authData.user.id;
          }
        } catch (e) {
          console.warn('Supabase auth signUp:', e);
        }
      }

      const newProfile: UserProfile = {
        id: userId,
        email: emailClean,
        password: password,
        full_name: fullName.trim(),
        role: isFirstUser ? 'ADMINISTRADOR' : 'CONSULTA',
        status: isFirstUser ? 'ATIVO' : 'PENDENTE',
        department: department || '',
        created_at: new Date().toISOString(),
      };

      if (supabase) {
        try {
          await supabase.from('profiles').upsert(newProfile);
        } catch (err) {
          console.warn('Erro ao salvar profile no Supabase:', err);
        }
      }

      setUsers(prev => deduplicateUsers([newProfile, ...prev]));

      if (isFirstUser) {
        setCurrentUser(newProfile);
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
      (u.id === userId || u.email === userId)
        ? { ...u, status: 'ATIVO' as const, role, custom_permissions: customPermissions || [], updated_at: new Date().toISOString() }
        : u
    );
    setUsers(deduplicateUsers(updatedUsers));

    const supabase = getSupabaseClient();
    if (supabase) {
      const target = updatedUsers.find(u => u.id === userId || u.email === userId);
      if (target) await supabase.from('profiles').upsert(target);
    }
  };

  const rejectUser = async (userId: string) => {
    const updatedUsers = users.map(u =>
      (u.id === userId || u.email === userId) ? { ...u, status: 'RECUSADO' as const, updated_at: new Date().toISOString() } : u
    );
    setUsers(deduplicateUsers(updatedUsers));

    const supabase = getSupabaseClient();
    if (supabase) {
      const target = updatedUsers.find(u => u.id === userId || u.email === userId);
      if (target) await supabase.from('profiles').upsert(target);
    }
  };

  const blockUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    if (!canModifyAdmin(userId)) {
      return { success: false, message: 'Não é permitido bloquear o único Administrador ativo do sistema.' };
    }
    const updatedUsers = users.map(u =>
      (u.id === userId || u.email === userId) ? { ...u, status: 'BLOQUEADO' as const, updated_at: new Date().toISOString() } : u
    );
    setUsers(deduplicateUsers(updatedUsers));

    const supabase = getSupabaseClient();
    if (supabase) {
      const target = updatedUsers.find(u => u.id === userId || u.email === userId);
      if (target) await supabase.from('profiles').upsert(target);
    }
    return { success: true };
  };

  const unblockUser = async (userId: string) => {
    const updatedUsers = users.map(u =>
      (u.id === userId || u.email === userId) ? { ...u, status: 'ATIVO' as const, updated_at: new Date().toISOString() } : u
    );
    setUsers(deduplicateUsers(updatedUsers));

    const supabase = getSupabaseClient();
    if (supabase) {
      const target = updatedUsers.find(u => u.id === userId || u.email === userId);
      if (target) await supabase.from('profiles').upsert(target);
    }
  };

  const updateUserRoleAndPermissions = async (
    userId: string,
    role: UserRole,
    customPermissions?: PermissionCode[]
  ): Promise<{ success: boolean; message?: string }> => {
    const target = users.find(u => u.id === userId || u.email === userId);
    if (!target) return { success: false, message: 'Usuário não encontrado.' };

    if (target.role === 'ADMINISTRADOR' && role !== 'ADMINISTRADOR') {
      if (!canModifyAdmin(userId)) {
        return { success: false, message: 'Não é permitido rebaixar o único Administrador ativo.' };
      }
    }

    const updatedUsers = users.map(u => {
      if (u.id === userId || u.email === userId) {
        const updated = { ...u, role, custom_permissions: customPermissions || u.custom_permissions || [], updated_at: new Date().toISOString() };
        if (currentUser && (currentUser.id === userId || currentUser.email === userId)) setCurrentUser(updated);
        return updated;
      }
      return u;
    });

    setUsers(deduplicateUsers(updatedUsers));

    const supabase = getSupabaseClient();
    if (supabase) {
      const updated = updatedUsers.find(u => u.id === userId || u.email === userId);
      if (updated) await supabase.from('profiles').upsert(updated);
    }

    return { success: true };
  };

  const updateCurrentUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data, updated_at: new Date().toISOString() };
    setCurrentUser(updated);
    setUsers(prev => deduplicateUsers(prev.map(u => u.email === currentUser.email ? updated : u)));

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
