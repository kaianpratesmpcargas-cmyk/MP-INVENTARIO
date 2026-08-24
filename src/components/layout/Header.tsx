import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import type { NavItemKey } from './Sidebar';
import {
  Menu,
  Bell,
  Search,
  Clock,
  UserX,
  MapPinOff,
  Trash2,
  Users,
  CheckCircle2,
  ScanLine,
  X,
  RefreshCw,
  Cloud,
} from 'lucide-react';

interface HeaderProps {
  activeView: NavItemKey;
  onNavigate: (view: NavItemKey, filterParam?: string) => void;
  onOpenMobileMenu: () => void;
  onQuickSearch: (query: string) => void;
}

const PAGE_TITLES: Record<NavItemKey, string> = {
  dashboard:   'Dashboard',
  inventory:   'Inventário Patrimonial',
  scanner:     'Scanner / Estação de Leitura',
  labels:      'Gerador de Etiquetas',
  maintenance: 'Manutenção & Reparos',
  conference:  'Conferência de Estoque',
  movements:   'Histórico de Movimentações',
  reports:     'Relatórios & Exportação',
  users:       'Usuários & Permissões',
  audit:       'Trilha de Auditoria',
  settings:    'Configurações',
};

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  onOpenMobileMenu,
  onQuickSearch,
}) => {
  const { currentUser, pendingUsersCount } = useAuth();
  const { alertsCount, isSyncing, isCloudConnected, syncWithCloud } = useInventory();

  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const alertsRef = useRef<HTMLDivElement | null>(null);

  const totalAlerts = alertsCount.total + (currentUser?.role === 'ADMINISTRADOR' ? pendingUsersCount : 0);

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
      setSearchTerm('');
    }
  };

  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-zinc-200 flex items-center px-4 sm:px-6 gap-3 z-30 sticky top-0 shadow-xs">
      {/* Mobile menu button */}
      <button
        onClick={onOpenMobileMenu}
        className="lg:hidden p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        title="Abrir menu lateral"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title & Brand */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 tracking-tight">
          {PAGE_TITLES[activeView]}
        </h1>
      </div>

      {/* Separator */}
      <div className="hidden sm:block w-px h-5 bg-zinc-200 flex-shrink-0 mx-1" />

      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative hidden sm:block">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar código (ex: PAT-000001), nome, série ou setor..."
          className="w-full h-9 bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 rounded-xl pl-9 pr-3 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/20 focus:bg-white transition-all font-medium"
        />
      </form>

      {/* Right side actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Sync Button */}
        <button
          onClick={() => syncWithCloud()}
          title={isSyncing ? 'Sincronizando com Supabase...' : 'Sincronizar dados em Tempo Real com a Nuvem'}
          className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden lg:inline text-[11px] font-bold text-zinc-600">
            {isSyncing ? 'Sincronizando...' : 'Tempo Real'}
          </span>
        </button>

        {/* Quick scan button */}
        <button
          onClick={() => onNavigate('scanner')}
          title="Estação de Scanner e Bipagem"
          className={`flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all shadow-xs ${
            activeView === 'scanner'
              ? 'bg-[#FFD100] text-black shadow-yellow-glow'
              : 'bg-zinc-900 text-yellow-400 hover:bg-black hover:scale-[1.02]'
          }`}
        >
          <ScanLine className="w-4 h-4" />
          <span className="hidden md:inline">BIPAR</span>
        </button>

        {/* Alerts */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setIsAlertsOpen(prev => !prev)}
            className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${
              totalAlerts > 0
                ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs'
                : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
            title="Alertas operacionais"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-mono text-[9px] font-black flex items-center justify-center shadow-xs">
                {totalAlerts > 9 ? '9+' : totalAlerts}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn">
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">Alertas Operacionais ({totalAlerts})</span>
                <button onClick={() => setIsAlertsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100">
                {currentUser?.role === 'ADMINISTRADOR' && pendingUsersCount > 0 && (
                  <AlertRow
                    icon={<Users className="w-4 h-4" />}
                    color="amber"
                    label={`${pendingUsersCount} usuário(s) aguardam aprovação`}
                    onClick={() => { onNavigate('users'); setIsAlertsOpen(false); }}
                  />
                )}
                {alertsCount.overdueMaintenance > 0 && (
                  <AlertRow
                    icon={<Clock className="w-4 h-4" />}
                    color="red"
                    label={`${alertsCount.overdueMaintenance} equip. em manutenção há +30 dias`}
                    onClick={() => { onNavigate('maintenance'); setIsAlertsOpen(false); }}
                  />
                )}
                {alertsCount.noResponsible > 0 && (
                  <AlertRow
                    icon={<UserX className="w-4 h-4" />}
                    color="amber"
                    label={`${alertsCount.noResponsible} equip. sem responsável`}
                    onClick={() => { onNavigate('inventory', 'noResponsible'); setIsAlertsOpen(false); }}
                  />
                )}
                {alertsCount.noLocation > 0 && (
                  <AlertRow
                    icon={<MapPinOff className="w-4 h-4" />}
                    color="blue"
                    label={`${alertsCount.noLocation} equip. sem localização`}
                    onClick={() => { onNavigate('inventory', 'noLocation'); setIsAlertsOpen(false); }}
                  />
                )}
                {alertsCount.awaitingDiscard > 0 && (
                  <AlertRow
                    icon={<Trash2 className="w-4 h-4" />}
                    color="zinc"
                    label={`${alertsCount.awaitingDiscard} equip. aguardam descarte`}
                    onClick={() => { onNavigate('inventory', 'awaitingDiscard'); setIsAlertsOpen(false); }}
                  />
                )}
                {totalAlerts === 0 && (
                  <div className="py-8 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <span className="font-semibold text-zinc-700">Tudo em ordem!</span>
                    <span>Nenhum alerta ou pendência no momento</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Pill / Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
          <div className="w-8 h-8 max-w-[32px] max-h-[32px] rounded-full bg-zinc-900 text-yellow-400 flex items-center justify-center text-xs font-black overflow-hidden border border-zinc-300 flex-shrink-0 aspect-square shadow-xs">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover max-w-full max-h-full" />
            ) : (
              currentUser?.full_name?.substring(0, 2).toUpperCase() || 'MP'
            )}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-zinc-900 leading-none truncate max-w-[120px]">{currentUser?.full_name?.split(' ')[0]}</div>
            <div className="text-[9px] text-zinc-500 font-mono font-semibold uppercase mt-0.5 leading-none">{currentUser?.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

// ──────────────────────────────────────────
// AlertRow — linha compacta de alerta no dropdown
// ──────────────────────────────────────────
const colorMap: Record<string, string> = {
  amber: 'text-amber-600 bg-amber-50',
  red:   'text-red-600 bg-red-50',
  blue:  'text-blue-600 bg-blue-50',
  zinc:  'text-zinc-600 bg-zinc-100',
};

const AlertRow: React.FC<{
  icon: React.ReactNode;
  color: string;
  label: string;
  onClick: () => void;
}> = ({ icon, color, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 text-left transition-colors"
  >
    <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.zinc}`}>
      {icon}
    </span>
    <span className="text-xs text-zinc-700 font-medium">{label}</span>
  </button>
);
