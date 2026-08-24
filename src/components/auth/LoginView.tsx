import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, User, Building, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, requestAccess, isLoading } = useAuth();
  const [tab, setTab] = useState<'login' | 'request'>('login');

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqDept, setReqDept] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqConfirmPassword, setReqConfirmPassword] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!loginEmail) {
      setFeedback({ type: 'error', message: 'Informe seu e-mail de acesso.' });
      return;
    }

    const res = await login(loginEmail, loginPassword);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!reqName || !reqEmail || !reqPassword) {
      setFeedback({ type: 'error', message: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    if (reqPassword !== reqConfirmPassword) {
      setFeedback({ type: 'error', message: 'A confirmação de senha não confere.' });
      return;
    }

    if (reqPassword.length < 6) {
      setFeedback({ type: 'error', message: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    const res = await requestAccess(reqName, reqEmail, reqPassword, reqDept);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setReqName('');
      setReqEmail('');
      setReqDept('');
      setReqPassword('');
      setReqConfirmPassword('');
      setTimeout(() => {
        setTab('login');
      }, 3500);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Demo accounts helper
  const fillDemoAccount = (email: string) => {
    setLoginEmail(email);
    setLoginPassword('123456');
    setTab('login');
    setFeedback({ type: 'info', message: `Credenciais de teste preenchidas para: ${email}` });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#111111]">
      {/* Lado Esquerdo - Branding Institucional MP CARGAS */}
      <div className="w-full md:w-1/2 lg:w-3/5 p-8 md:p-14 lg:p-20 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#111111] via-[#1a1a1a] to-[#0d0d0d] border-b md:border-b-0 md:border-r border-zinc-800">
        {/* Glow de fundo */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Topo Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center font-extrabold text-black text-2xl shadow-yellow-glow">
              MP
            </div>
            <div>
              <span className="text-2xl font-black tracking-wider text-white">MP CARGAS</span>
              <span className="block text-xs font-semibold uppercase tracking-widest text-yellow-400">
                Controle de Inventário
              </span>
            </div>
          </div>
        </div>

        {/* Centro - Mensagem de Destaque */}
        <div className="relative z-10 my-12 md:my-auto max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-700 text-yellow-400 text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4" />
            Sistema Integrado de Gestão Patrimonial
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Controle seu patrimônio <br />
            <span className="text-yellow-400">com precisão absoluta.</span>
          </h1>

          <p className="text-base md:text-lg text-zinc-300 font-normal leading-relaxed mb-8">
            Inventário, movimentações, manutenção preventiva, conferência em tempo real e etiquetas de código de barras Code 128 em um único lugar.
          </p>

          {/* Cards de Métricas em Destaque */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800/80">
            <div>
              <span className="block text-xl font-bold text-white font-mono">100%</span>
              <span className="text-xs text-zinc-400">Rastreabilidade</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-yellow-400 font-mono">Code 128</span>
              <span className="text-xs text-zinc-400">Código de Barras</span>
            </div>
            <div>
              <span className="block text-xl font-bold text-white font-mono">Real-time</span>
              <span className="text-xs text-zinc-400">Bipagem USB & Web</span>
            </div>
          </div>
        </div>

        {/* Rodapé institucional */}
        <div className="relative z-10 text-xs text-zinc-500 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} MP CARGAS Logística. Todos os direitos reservados.</span>
          <span className="hidden sm:inline">v2.4.0 Enterprise</span>
        </div>
      </div>

      {/* Lado Direito - Card de Login / Solicitação de Acesso */}
      <div className="w-full md:w-1/2 lg:w-2/5 p-6 sm:p-10 md:p-12 lg:p-16 flex flex-col justify-center bg-[#18181B]">
        <div className="max-w-md w-full mx-auto">
          {/* Header do Card */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {tab === 'login' ? 'Acesso ao Sistema' : 'Solicitar Acesso'}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {tab === 'login'
                ? 'Insira suas credenciais corporativas para entrar'
                : 'Preencha seus dados para aprovação do administrador'}
            </p>
          </div>

          {/* Abas Alternadoras */}
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 mb-6">
            <button
              type="button"
              onClick={() => { setTab('login'); setFeedback(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                tab === 'login'
                  ? 'bg-yellow-400 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ENTRAR
            </button>
            <button
              type="button"
              onClick={() => { setTab('request'); setFeedback(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                tab === 'request'
                  ? 'bg-yellow-400 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              SOLICITAR ACESSO
            </button>
          </div>

          {/* Feedback Alerta */}
          {feedback && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-3 border ${
                feedback.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-yellow-400/10 border-yellow-400/30 text-yellow-300'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Formulário de Login */}
          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="seu.nome@mpcargas.com.br"
                    required
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 placeholder:text-zinc-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 placeholder:text-zinc-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-yellow-glow flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Autenticando...</span>
                ) : (
                  <>
                    <span>ENTRAR NO SISTEMA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setTab('request'); setFeedback(null); }}
                  className="text-xs text-zinc-400 hover:text-yellow-400 transition-colors"
                >
                  Novo por aqui? <strong className="text-yellow-400 underline">Solicitar cadastro de acesso</strong>
                </button>
              </div>
            </form>
          ) : (
            /* Formulário de Solicitação de Acesso */
            <form onSubmit={handleRequestSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={reqName}
                    onChange={e => setReqName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Mendes"
                    required
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                  E-mail Corporativo *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    value={reqEmail}
                    onChange={e => setReqEmail(e.target.value)}
                    placeholder="carlos@mpcargas.com.br"
                    required
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                  Setor / Departamento
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={reqDept}
                    onChange={e => setReqDept(e.target.value)}
                    placeholder="Ex: Operações / Galpão / TI"
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                    Senha *
                  </label>
                  <input
                    type="password"
                    value={reqPassword}
                    onChange={e => setReqPassword(e.target.value)}
                    placeholder="Mín 6 dígitos"
                    required
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 placeholder:text-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                    Confirmar *
                  </label>
                  <input
                    type="password"
                    value={reqConfirmPassword}
                    onChange={e => setReqConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span>
                  O cadastro iniciará com status <strong>PENDENTE</strong>. O administrador definirá suas permissões operacionais.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-yellow-glow flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading ? 'Enviando...' : 'ENVIAR SOLICITAÇÃO'}
              </button>
            </form>
          )}

          {/* Atalhos Rápidos para Teste Imediato (Demo Picker) */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2.5 text-center">
              Acesso Rápido para Demonstração
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@mpcargas.com.br')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors"
              >
                <div className="font-bold text-yellow-400">Kaian Admin</div>
                <div className="text-[10px] text-zinc-400 truncate">admin@mpcargas.com.br</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('carlos@mpcargas.com.br')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors"
              >
                <div className="font-bold text-blue-400">Carlos Conferente</div>
                <div className="text-[10px] text-zinc-400 truncate">carlos@mpcargas.com.br</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('roberto@mpcargas.com.br')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors"
              >
                <div className="font-bold text-amber-400">Roberto Manutenção</div>
                <div className="text-[10px] text-zinc-400 truncate">roberto@mpcargas.com.br</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('ana@mpcargas.com.br')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors"
              >
                <div className="font-bold text-zinc-300">Ana Consulta</div>
                <div className="text-[10px] text-zinc-400 truncate">ana@mpcargas.com.br</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
