import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import {
  LayoutDashboard,
  Package,
  ScanLine,
  Tag,
  Wrench,
  ClipboardList,
  ArrowLeftRight,
  BarChart2,
  Users,
  Shield,
  Settings,
  LogOut,
  Volume2,
  VolumeX,
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

  const handleItemClick = (key: NavItemKey) => {
    onNavigate(key);
    if (onCloseMobile) onCloseMobile();
  };

  const isAdmin = currentUser?.role === 'ADMINISTRADOR';

  const groups = [
    {
      label: 'Principal',
      items: [
        { key: 'dashboard' as NavItemKey, label: 'Dashboard', icon: LayoutDashboard },
        { key: 'inventory' as NavItemKey, label: 'Inventário', icon: Package },
      ],
    },
    {
      label: 'Operações',
      items: [
        { key: 'scanner' as NavItemKey, label: 'Scanner / Bipar', icon: ScanLine, highlight: true },
        { key: 'labels' as NavItemKey, label: 'Etiquetas', icon: Tag },
        {
          key: 'maintenance' as NavItemKey,
          label: 'Manutenção',
          icon: Wrench,
          badge: activeMaintenancesCount > 0 ? activeMaintenancesCount : undefined,
          urgent: alertsCount.overdueMaintenance > 0,
        },
        {
          key: 'conference' as NavItemKey,
          label: 'Conferência',
          icon: ClipboardList,
          badge: activeConference ? '●' : undefined,
          urgent: activeConference,
        },
        { key: 'movements' as NavItemKey, label: 'Movimentações', icon: ArrowLeftRight },
      ],
    },
    {
      label: 'Gestão',
      items: [
        { key: 'reports' as NavItemKey, label: 'Relatórios', icon: BarChart2 },
        ...(isAdmin ? [
          {
            key: 'users' as NavItemKey,
            label: 'Usuários',
            icon: Users,
            badge: pendingUsersCount > 0 ? pendingUsersCount : undefined,
            urgent: pendingUsersCount > 0,
          },
          { key: 'audit' as NavItemKey, label: 'Auditoria', icon: Shield },
        ] : []),
        { key: 'settings' as NavItemKey, label: 'Configurações', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#111111] flex flex-col border-r border-white/[0.08] transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Header */}
        <div className="h-14 flex items-center px-5 border-b border-white/[0.08] flex-shrink-0 bg-[#0c0c0c]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FFD100] flex items-center justify-center flex-shrink-0 shadow-yellow-glow">
              <span className="text-black font-black text-xs tracking-tighter">MP</span>
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-tight leading-none">MP CARGAS</div>
              <div className="text-[#FFD100] font-mono text-[9px] font-bold tracking-wider mt-1 uppercase leading-none">
                Gestão Patrimonial
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 px-3 mb-2">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map(item => {
                  const isActive = activeView === item.key;

                  return (
                    <button
                      key={item.key}
                      onClick={() => handleItemClick(item.key)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-[#FFD100] text-black shadow-md font-bold'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                      } ${item.highlight && !isActive ? 'border border-[#FFD100]/30 text-[#FFD100] bg-[#FFD100]/5' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <item.icon
                          className={`w-4 h-4 flex-shrink-0 ${
                            isActive
                              ? 'text-black'
                              : item.highlight
                              ? 'text-[#FFD100]'
                              : 'text-zinc-500 group-hover:text-zinc-200'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span
                          className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-black text-[#FFD100]'
                              : item.urgent
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.08] p-3 space-y-2 flex-shrink-0 bg-[#0c0c0c]">
          {/* Som Toggle */}
          <button
            onClick={toggleSound}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {configuracoes.som_ativo ? (
                <Volume2 className="w-3.5 h-3.5 text-[#FFD100]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span className="font-medium">Feedback Sonoro</span>
            </div>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${configuracoes.som_ativo ? 'bg-[#FFD100]/20 text-[#FFD100]' : 'bg-zinc-800 text-zinc-500'}`}>
              {configuracoes.som_ativo ? 'ATIVO' : 'MUDO'}
            </span>
          </button>

          {/* Perfil & Logout */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-200 flex-shrink-0 overflow-hidden">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                currentUser?.full_name?.substring(0, 2).toUpperCase() || 'MP'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-zinc-200 truncate">{currentUser?.full_name}</div>
              <div className="text-[10px] text-zinc-500 truncate font-mono uppercase">{currentUser?.role}</div>
            </div>
            <button
              onClick={logout}
              title="Sair do sistema"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>

  );
};
