import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import { NavItemKey } from './Sidebar';
import {
  Menu,
  Bell,
  Search,
  AlertTriangle,
  Clock,
  UserX,
  MapPinOff,
  Trash2,
  Users,
  CheckCircle2,
  Scan,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface HeaderProps {
  activeView: NavItemKey;
  onNavigate: (view: NavItemKey, filterParam?: string) => void;
  onOpenMobileMenu: () => void;
  onQuickSearch: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  onOpenMobileMenu,
  onQuickSearch,
}) => {
  const { currentUser, pendingUsersCount } = useAuth();
  const { alertsCount, configuracoes, toggleSound } = useInventory();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const alertsRef = useRef<HTMLDivElement | null>(null);

  const totalAlerts = alertsCount.total + (currentUser?.role === 'ADMINISTRADOR' ? pendingUsersCount : 0);

  // Fecha dropdown de alertas ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setIsAlertsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onQuickSearch(searchTerm.trim());
    }
  };

  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: 'Visão geral e indicadores operacionais' };
      case 'inventory':
        return { title: 'Inventário Patrimonial', subtitle: 'Catálogo geral de ativos e equipamentos' };
      case 'scanner':
        return { title: 'Scanner & Estação de Leitura', subtitle: 'Leitura ultrarrápida USB e por câmera' };
      case 'labels':
        return { title: 'Gerador de Etiquetas', subtitle: 'Emissão e impressão Code 128 em lote' };
      case 'maintenance':
        return { title: 'Manutenção & Reparos', subtitle: 'Controle de chamados e oficina' };
      case 'conference':
        return { title: 'Conferência de Estoque', subtitle: 'Auditoria física e contagem em tempo real' };
      case 'movements':
        return { title: 'Histórico de Movimentações', subtitle: 'Rastreabilidade de transferências' };
      case 'reports':
        return { title: 'Relatórios & Exportação', subtitle: 'Planilhas Excel, CSV e relatórios PDF' };
      case 'users':
        return { title: 'Gestão de Usuários & Permissões', subtitle: 'Aprovações e controle de acesso' };
      case 'audit':
        return { title: 'Trilha de Auditoria', subtitle: 'Logs imutáveis de ações no sistema' };
      case 'settings':
        return { title: 'Configurações do Sistema', subtitle: 'Parâmetros, prefixo PAT e banco de dados' };
      default:
        return { title: 'MP CARGAS', subtitle: 'Controle de Inventário' };
    }
  };

  const pageInfo = getPageTitle();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
      {/* Esquerda: Botão Mobile + Título */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-black hover:bg-slate-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
            {pageInfo.title}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Centro: Barra de Busca Rápida */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por código (ex: PAT-000001), série, equipamento..."
            className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 text-zinc-900 rounded-xl pl-9 pr-10 py-1.5 text-xs focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-bold rounded"
            >
              IR
            </button>
          )}
        </form>
      </div>

      {/* Direita: Som + Alertas + Perfil */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle de Som */}
        <button
          onClick={toggleSound}
          title={configuracoes.som_ativo ? 'Som do scanner ativado' : 'Som do scanner mudo'}
          className={`p-2 rounded-xl border transition-all ${
            configuracoes.som_ativo
              ? 'bg-amber-50 border-amber-200 text-yellow-600 hover:bg-amber-100'
              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
          }`}
        >
          {configuracoes.som_ativo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Dropdown de Alertas / Atenção */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setIsAlertsOpen(prev => !prev)}
            className={`relative p-2 rounded-xl border transition-all ${
              totalAlerts > 0
                ? 'bg-amber-50/80 border-amber-300/80 text-amber-700 hover:bg-amber-100'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
            aria-label="Alertas e Notificações"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                {totalAlerts}
              </span>
            )}
          </button>

          {/* Modal / Popover de Alertas */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-sm text-zinc-900">Alertas Operacionais</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {totalAlerts} pendência(s)
                </span>
              </div>

              <div className="divide-y divide-slate-100 my-2 max-h-72 overflow-y-auto">
                {/* Usuários Pendentes (Para Admin) */}
                {currentUser?.role === 'ADMINISTRADOR' && pendingUsersCount > 0 && (
                  <div
                    onClick={() => {
                      onNavigate('users');
                      setIsAlertsOpen(false);
                    }}
                    className="py-2.5 px-2 hover:bg-amber-50/50 rounded-xl cursor-pointer transition-colors flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0 mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900">
                        {pendingUsersCount} {pendingUsersCount === 1 ? 'usuário aguarda aprovação' : 'usuários aguardam aprovação'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Clique para gerenciar e aprovar o acesso.
                      </div>
                    </div>
                  </div>
                )}

                {/* Manutenção > 30 dias */}
                {alertsCount.overdueMaintenance > 0 && (
                  <div
                    onClick={() => {
                      onNavigate('maintenance');
                      setIsAlertsOpen(false);
                    }}
                    className="py-2.5 px-2 hover:bg-red-50/50 rounded-xl cursor-pointer transition-colors flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-red-100 text-red-700 flex-shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900">
                        {alertsCount.overdueMaintenance} {alertsCount.overdueMaintenance === 1 ? 'equipamento em manutenção há +30 dias' : 'equipamentos em manutenção há +30 dias'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Verifique o status com a oficina técnica.
                      </div>
                    </div>
                  </div>
                )}

                {/* Sem Responsável */}
                {alertsCount.noResponsible > 0 && (
                  <div
                    onClick={() => {
                      onNavigate('inventory', 'noResponsible');
                      setIsAlertsOpen(false);
                    }}
                    className="py-2.5 px-2 hover:bg-amber-50/50 rounded-xl cursor-pointer transition-colors flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0 mt-0.5">
                      <UserX className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900">
                        {alertsCount.noResponsible} {alertsCount.noResponsible === 1 ? 'equipamento sem responsável definido' : 'equipamentos sem responsável definido'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Atribua um custodiante para o patrimônio.
                      </div>
                    </div>
                  </div>
                )}

                {/* Sem Localização */}
                {alertsCount.noLocation > 0 && (
                  <div
                    onClick={() => {
                      onNavigate('inventory', 'noLocation');
                      setIsAlertsOpen(false);
                    }}
                    className="py-2.5 px-2 hover:bg-blue-50/50 rounded-xl cursor-pointer transition-colors flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700 flex-shrink-0 mt-0.5">
                      <MapPinOff className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900">
                        {alertsCount.noLocation} {alertsCount.noLocation === 1 ? 'equipamento sem local físico registrado' : 'equipamentos sem local físico registrado'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Indique setor e sala no inventário.
                      </div>
                    </div>
                  </div>
                )}

                {/* Aguardando Descarte */}
                {alertsCount.awaitingDiscard > 0 && (
                  <div
                    onClick={() => {
                      onNavigate('inventory', 'awaitingDiscard');
                      setIsAlertsOpen(false);
                    }}
                    className="py-2.5 px-2 hover:bg-purple-50/50 rounded-xl cursor-pointer transition-colors flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700 flex-shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900">
                        {alertsCount.awaitingDiscard} {alertsCount.awaitingDiscard === 1 ? 'equipamento aguardando laudo de descarte' : 'equipamentos aguardando laudo de descarte'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Efetue a baixa patrimonial definitiva.
                      </div>
                    </div>
                  </div>
                )}

                {totalAlerts === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <span>Nenhum alerta pendente no momento!</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botão Ação Rápida Scanner */}
        <button
          onClick={() => onNavigate('scanner')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-yellow-400 text-xs font-bold shadow-sm transition-all hover:scale-[1.02]"
        >
          <Scan className="w-3.5 h-3.5" />
          <span>BIPAR</span>
        </button>

        {/* Informações do Usuário */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-zinc-900 text-yellow-400 font-bold text-xs flex items-center justify-center overflow-hidden border border-slate-200">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              currentUser?.full_name?.substring(0, 2).toUpperCase() || 'MP'
            )}
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-xs font-bold text-zinc-900 truncate max-w-[120px]">
              {currentUser?.full_name?.split(' ')[0] || 'Usuário'}
            </div>
            <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
              {currentUser?.role || 'CONSULTA'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
