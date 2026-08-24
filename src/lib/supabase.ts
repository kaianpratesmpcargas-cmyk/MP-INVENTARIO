// ==========================================
// MP CARGAS - Supabase Client & Config
// ==========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Chaves padrão via .env ou configuradas no painel
const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sliaonkhubndtpmgmgbz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable__GwdRbQElGEo4qBtsin5NQ_eu3PG5dF';

export function getStoredSupabaseConfig() {
  if (typeof window === 'undefined') {
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
  }
  const customUrl = localStorage.getItem('mp_supabase_url');
  const customKey = localStorage.getItem('mp_supabase_anon_key');
  return {
    url: customUrl || DEFAULT_SUPABASE_URL,
    anonKey: customKey || DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mp_supabase_url', url.trim());
    localStorage.setItem('mp_supabase_anon_key', anonKey.trim());
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  
  if (!url || !anonKey || url === 'YOUR_SUPABASE_URL' || anonKey === 'YOUR_SUPABASE_ANON_KEY') {
    return null;
  }

  try {
    if (!supabaseInstance) {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    return supabaseInstance;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

export function resetSupabaseClient() {
  supabaseInstance = null;
}

/**
 * Testa a conexão com o banco Supabase
 */
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string }> {
  const targetUrl = url || getStoredSupabaseConfig().url;
  const targetKey = anonKey || getStoredSupabaseConfig().anonKey;

  if (!targetUrl || !targetKey) {
    return { success: false, message: 'URL e Anon Key do Supabase não configurados.' };
  }

  try {
    const testClient = createClient(targetUrl, targetKey);
    // Tenta uma consulta simples
    const { error } = await testClient.from('equipamentos').select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') {
      // Se a tabela ainda não existir, pode retornar erro de tabela, mas a conexão com o Supabase Auth/PostgREST funcionou
      if (error.message.includes('relation "equipamentos" does not exist') || error.code === '42P01') {
        return { 
          success: true, 
          message: 'Conectado ao Supabase com sucesso! (Aviso: As tabelas ainda precisam ser criadas executando o script schema.sql).' 
        };
      }
      return { success: false, message: `Erro ao conectar: ${error.message}` };
    }

    return { success: true, message: 'Conexão com o Supabase estabelecida com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Falha na conexão: ${err?.message || 'Verifique as credenciais.'}` };
  }
}
