import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

type Mode = 'login' | 'register';

export const LoginView: React.FC = () => {
  const { login, requestAccess, isLoading, users } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isFirstSetup = users.length === 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email.trim() || !password.trim()) {
      setError('Informe o e-mail e a senha.');
      return;
    }
    const res = await login(email.trim(), password.trim());
    if (!res.success) setError(res.message);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    const res = await requestAccess(fullName.trim(), email.trim(), password.trim(), department.trim());
    if (res.success) {
      setSuccessMsg(res.message);
      if (!res.message.includes('Administrador')) {
        setMode('login');
        setEmail('');
        setPassword('');
        setFullName('');
        setDepartment('');
      }
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      {/* Fundo com grid sutil */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#FFD100] mb-4">
            <span className="text-black font-black text-sm tracking-tighter">MP</span>
          </div>
          <h1 className="text-white text-lg font-bold tracking-tight">MP CARGAS</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Controle de Inventário e Patrimônio</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-2xl p-7 shadow-2xl">
          {mode === 'login' ? (
            <>
              <h2 className="text-white font-semibold text-sm mb-3">Acesso ao Sistema</h2>

              {isFirstSetup && (
                <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  <div className="font-bold flex items-center gap-1.5 mb-0.5 text-yellow-400">
                    <span>👋 Primeiro Acesso Detectado</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Digite seu e-mail e uma senha de 6 dígitos para criar e acessar sua conta de <strong>Administrador</strong> automaticamente.
                  </p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">E-mail corporativo</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@mpcargas.com.br"
                    autoFocus
                    required
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-3.5 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-[#FFD100] focus:ring-1 focus:ring-[#FFD100]/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Senha</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-3.5 py-2.5 pr-10 placeholder:text-zinc-600 focus:outline-none focus:border-[#FFD100] focus:ring-1 focus:ring-[#FFD100]/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800/50 rounded-lg px-3 py-2.5">
                    {successMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-[#FFD100] hover:bg-yellow-300 disabled:opacity-60 text-black font-bold text-sm flex items-center justify-center gap-2 transition-colors mt-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>Entrar</span>
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-zinc-800 text-center">
                <p className="text-xs text-zinc-500">
                  Não tem acesso?{' '}
                  <button
                    onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                    className="text-[#FFD100] hover:underline font-medium"
                  >
                    Solicitar cadastro
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-white font-semibold text-sm">Solicitar Acesso</h2>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Nome completo *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    autoFocus
                    required
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-3.5 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-[#FFD100] focus:ring-1 focus:ring-[#FFD100]/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">E-mail corporativo *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@mpcargas.com.br"
                    required
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-3.5 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-[#FFD100] focus:ring-1 focus:ring-[#FFD100]/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Setor / Departamento</label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="Ex: Operações, TI, Expedição..."
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-3.5 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-[#FFD100] focus:ring-1 focus:ring-[#FFD100]/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Senha *</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mín. 6 caracteres"
                      required
                      className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-3.5 py-2.5 pr-10 placeholder:text-zinc-600 focus:outline-none focus:border-[#FFD100] focus:ring-1 focus:ring-[#FFD100]/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800/50 rounded-lg px-3 py-2.5">
                    {successMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-[#FFD100] hover:bg-yellow-300 disabled:opacity-60 text-black font-bold text-sm flex items-center justify-center gap-2 transition-colors mt-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Enviar Solicitação</span>
                </button>
              </form>

              <p className="text-xs text-zinc-600 text-center mt-4">
                Seu acesso será liberado após aprovação de um Administrador.
              </p>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-zinc-700 mt-5">
          MP CARGAS · Sistema de Controle Patrimonial · v2.0
        </p>
      </div>
    </div>
  );
};
