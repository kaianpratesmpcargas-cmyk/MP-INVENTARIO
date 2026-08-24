import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import {
  LayoutDashboard,
  Boxes,
  ScanLine,
  Tags,
  Wrench,
  ClipboardCheck,
  ArrowLeftRight,
  BarChart3,
  Users,
  ShieldAlert,
  Settings,
  LogOut,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'inventory'
  | 'scanner'
  | 'labels'
  | 'maintenance'
  | 'conference'
  | 'movements'
  | 'reports'
  | 'users'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeView: NavItemKey;
  onNavigate: (view: NavItemKey) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { currentUser, logout, pendingUsersCount } = useAuth();
  const { configuracoes, toggleSound, alertsCount, manutencoes, conferencias } = useInventory();

  const activeMaintenancesCount = manutencoes.filter(m => !m.concluida).length;
  const activeConference = conferencias.some(c => c.status === 'EM_ANDAMENTO');

  const navItems = [
    {
      key: 'dashboard' as NavItemKey,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      key: 'inventory' as NavItemKey,
      label: 'Inventário',
      icon: Boxes,
    },
    {
      key: 'scanner' as NavItemKey,
      label: 'Scanner Bipar',
      icon: ScanLine,
      isSpecial: true,
    },
    {
      key: 'labels' as NavItemKey,
      label: 'Etiquetas',
      icon: Tags,
    },
    {
      key: 'maintenance' as NavItemKey,
      label: 'Manutenção',
      icon: Wrench,
      badge: activeMaintenancesCount > 0 ? activeMaintenancesCount : undefined,
      badgeColor: alertsCount.overdueMaintenance > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-400 text-black',
    },
    {
      key: 'conference' as NavItemKey,
      label: 'Conferência',
      icon: ClipboardCheck,
      badge: activeConference ? 'AO VIVO' : undefined,
      badgeColor: 'bg-emerald-500 text-white font-bold animate-pulse',
    },
    {
      key: 'movements' as NavItemKey,
      label: 'Movimentações',
      icon: ArrowLeftRight,
    },
    {
      key: 'reports' as NavItemKey,
      label: 'Relatórios',
      icon: BarChart3,
    },
    {
      key: 'users' as NavItemKey,
      label: 'Usuários',
      icon: Users,
      badge: pendingUsersCount > 0 ? pendingUsersCount : undefined,
      badgeColor: 'bg-amber-400 text-black font-bold animate-pulse',
      adminOnly: true,
    },
    {
      key: 'audit' as NavItemKey,
      label: 'Auditoria',
      icon: ShieldAlert,
      adminOnly: true,
    },
    {
      key: 'settings' as NavItemKey,
      label: 'Configurações',
      icon: Settings,
    },
  ];

  const handleItemClick = (key: NavItemKey) => {
    onNavigate(key);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#111111] text-zinc-300 flex flex-col justify-between border-r border-zinc-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Topo Logo MP CARGAS */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center font-black text-black text-xl shadow-yellow-glow">
              MP
            </div>
            <div>
              <div className="font-extrabold text-white text-base tracking-wider leading-none">
                MP CARGAS
              </div>
              <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mt-1">
                Controle de Inventário
              </div>
            </div>
          </div>
        </div>

        {/* Menu de Navegação */}
        <div className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Menu Operacional
          </div>

          {navItems.map(item => {
            if (item.adminOnly && currentUser?.role !== 'ADMINISTRADOR') {
              return null;
            }

            const isActive = activeView === item.key;

            if (item.isSpecial) {
              return (
                <button
                  key={item.key}
                  onClick={() => handleItemClick(item.key)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-md my-2 ${
                    isActive
                      ? 'bg-yellow-400 text-black shadow-yellow-glow'
                      : 'bg-zinc-800/90 text-yellow-400 hover:bg-zinc-700/80 border border-yellow-400/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-yellow-400 animate-pulse'}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                    isActive ? 'bg-black text-yellow-400' : 'bg-yellow-400/20 text-yellow-300'
                  }`}>
                    USB / CÂMERA
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold shadow-sm border-l-4 border-yellow-400'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-yellow-400' : 'text-zinc-400 group-hover:text-yellow-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Rodapé do Usuário & Controle de Som */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/40">
          {/* Som Toggle */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 mb-2 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              {configuracoes.som_ativo ? (
                <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span>Bip do Scanner:</span>
            </span>
            <button
              onClick={toggleSound}
              className={`text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                configuracoes.som_ativo
                  ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {configuracoes.som_ativo ? 'LIGADO' : 'MUDO'}
            </button>
          </div>

          {/* Perfil & Logout */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-yellow-400/40 flex items-center justify-center font-bold text-yellow-400 text-xs overflow-hidden flex-shrink-0">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.full_name?.substring(0, 2).toUpperCase() || 'MP'
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.full_name || 'Usuário'}
                </div>
                <div className="text-[10px] text-yellow-400 font-medium truncate">
                  {currentUser?.role || 'CONSULTA'}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sair do Sistema"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
