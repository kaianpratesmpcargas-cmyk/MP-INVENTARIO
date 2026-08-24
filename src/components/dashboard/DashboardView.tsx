import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import { NavItemKey } from '../layout/Sidebar';
import {
  Boxes,
  Activity,
  Archive,
  Wrench,
  AlertOctagon,
  Trash2,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  UserX,
  MapPinOff,
  Users,
  CheckCircle2,
  Plus,
  Scan,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (view: NavItemKey, filterParam?: string) => void;
  onOpenNewEquipment: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewEquipment,
}) => {
  const { currentUser, pendingUsersCount } = useAuth();
  const { equipamentos, setores, movimentacoes, alertsCount, configuracoes } = useInventory();

  // Contagens por Status
  const total = equipamentos.length;
  const emUso = equipamentos.filter(e => e.status === 'EM USO').length;
  const emEstoque = equipamentos.filter(e => e.status === 'EM ESTOQUE').length;
  const emManutencao = equipamentos.filter(e => e.status === 'EM MANUTENÇÃO').length;
  const danificados = equipamentos.filter(e => e.status === 'DANIFICADO').length;
  const aguardandoDescarte = equipamentos.filter(e => e.status === 'AGUARDANDO DESCARTE').length;
  const baixados = equipamentos.filter(e => e.status === 'BAIXADO').length;

  // Dados do Gráfico de Rosca (Status)
  const statusChartData = [
    { name: 'Em Uso', value: emUso, color: '#22C55E' },
    { name: 'Em Estoque', value: emEstoque, color: '#3B82F6' },
    { name: 'Em Manutenção', value: emManutencao, color: '#F59E0B' },
    { name: 'Danificados', value: danificados, color: '#EF4444' },
    { name: 'Aguardando Descarte', value: aguardandoDescarte, color: '#A855F7' },
    { name: 'Baixados', value: baixados, color: '#94A3B8' },
  ].filter(d => d.value > 0);

  // Dados do Gráfico de Setores
  const sectorChartData = setores.map(setor => ({
    name: setor.nome.length > 15 ? setor.nome.substring(0, 13) + '...' : setor.nome,
    fullName: setor.nome,
    quantidade: equipamentos.filter(e => e.setor_id === setor.id && e.status !== 'BAIXADO').length,
  }));

  // Atividades Recentes (Últimas 5)
  const recentActivities = movimentacoes.slice(0, 6);

  // Cumprimento baseado na hora
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = currentUser?.full_name?.split(' ')[0] || 'Usuário';

  // Checklist de Onboarding para Administrador
  const onboardingSteps = [
    { label: 'Setores Operacionais cadastrados', done: setores.length > 0 },
    { label: 'Locais físicos configurados', done: true },
    { label: 'Categorias de patrimônio criadas', done: true },
    { label: 'Primeiro equipamento com Code 128 gerado', done: total > 0 },
  ];
  const completedSteps = onboardingSteps.filter(s => s.done).length;
  const progressPercent = Math.round((completedSteps / onboardingSteps.length) * 100);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header com Boas-Vindas e Ações Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-[#18181B] to-zinc-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-yellow-400 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            MP CARGAS • Gestão de Patrimônio
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {greeting}, {firstName}.
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-xl">
            Aqui está o resumo operacional em tempo real do inventário da <strong className="text-yellow-400">MP CARGAS</strong>.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('scanner')}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-yellow-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Scan className="w-4 h-4" />
            <span>ESTAÇÃO SCANNER</span>
          </button>

          <button
            onClick={onOpenNewEquipment}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 text-yellow-400" />
            <span>+ NOVO EQUIPAMENTO</span>
          </button>
        </div>
      </div>

      {/* Grid de Cards Métricas de Status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {/* Total */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-yellow-400/80 cursor-pointer transition-all col-span-2 sm:col-span-1 md:col-span-1 xl:col-span-1 group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">TOTAL</span>
            <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-900 group-hover:bg-yellow-400 group-hover:text-black transition-colors">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-900 font-mono">{total}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">Patrimônios Ativos</div>
        </div>

        {/* Em Uso */}
        <div
          onClick={() => onNavigate('inventory', 'EM USO')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">EM USO</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">{emUso}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">{total ? Math.round((emUso / total) * 100) : 0}% da frota</div>
        </div>

        {/* Em Estoque */}
        <div
          onClick={() => onNavigate('inventory', 'EM ESTOQUE')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">ESTOQUE</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">{emEstoque}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">Disponíveis</div>
        </div>

        {/* Em Manutenção */}
        <div
          onClick={() => onNavigate('maintenance')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-amber-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">MANUTENÇÃO</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">{emManutencao}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            {alertsCount.overdueMaintenance > 0 ? (
              <span className="text-red-500 font-bold">{alertsCount.overdueMaintenance} em atraso</span>
            ) : (
              'Na oficina'
            )}
          </div>
        </div>

        {/* Danificados */}
        <div
          onClick={() => onNavigate('inventory', 'DANIFICADO')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-rose-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">DANIFICADOS</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">{danificados}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">Requer reparo</div>
        </div>

        {/* Aguardando Descarte */}
        <div
          onClick={() => onNavigate('inventory', 'AGUARDANDO DESCARTE')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-purple-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">DESCARTE</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 font-mono">{aguardandoDescarte}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">Aguardando laudo</div>
        </div>

        {/* Baixados */}
        <div
          onClick={() => onNavigate('inventory', 'BAIXADO')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">BAIXADOS</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-600 font-mono">{baixados}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">Histórico contábil</div>
        </div>
      </div>

      {/* Seção de Alertas Operacionais (Atenção) */}
      {alertsCount.total > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>ATENÇÃO OPERACIONAL — PENDÊNCIAS DETECTADAS</span>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
              {alertsCount.total} alertas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {alertsCount.overdueMaintenance > 0 && (
              <button
                onClick={() => onNavigate('maintenance')}
                className="p-3 bg-white rounded-xl border border-red-200 hover:border-red-400 text-left transition-all shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900">
                      {alertsCount.overdueMaintenance} em manutenção há +30 dias
                    </div>
                    <div className="text-[10px] text-slate-500">Cobrar retorno da oficina</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            )}

            {alertsCount.noResponsible > 0 && (
              <button
                onClick={() => onNavigate('inventory', 'noResponsible')}
                className="p-3 bg-white rounded-xl border border-amber-200 hover:border-amber-400 text-left transition-all shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <UserX className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900">
                      {alertsCount.noResponsible} sem responsável
                    </div>
                    <div className="text-[10px] text-slate-500">Atribuir custodiante</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </button>
            )}

            {alertsCount.noLocation > 0 && (
              <button
                onClick={() => onNavigate('inventory', 'noLocation')}
                className="p-3 bg-white rounded-xl border border-blue-200 hover:border-blue-400 text-left transition-all shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <MapPinOff className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900">
                      {alertsCount.noLocation} sem localização física
                    </div>
                    <div className="text-[10px] text-slate-500">Definir sala/doca</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </button>
            )}

            {alertsCount.awaitingDiscard > 0 && (
              <button
                onClick={() => onNavigate('inventory', 'awaitingDiscard')}
                className="p-3 bg-white rounded-xl border border-purple-200 hover:border-purple-400 text-left transition-all shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900">
                      {alertsCount.awaitingDiscard} aguardando descarte
                    </div>
                    <div className="text-[10px] text-slate-500">Finalizar processo de baixa</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Usuários Pendentes de Aprovação (Visível para Administradores) */}
      {currentUser?.role === 'ADMINISTRADOR' && pendingUsersCount > 0 && (
        <div className="bg-zinc-900 text-white rounded-2xl p-5 shadow-lg border border-yellow-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-yellow-400 text-black font-black">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-white">
                {pendingUsersCount} {pendingUsersCount === 1 ? 'Solicitação de Acesso Aguardando Aprovação' : 'Solicitações de Acesso Aguardando Aprovação'}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Novos funcionários solicitaram acesso ao sistema e necessitam de aprovação de perfil.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('users')}
            className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-yellow-glow"
          >
            <span>ANALISAR SOLICITAÇÕES</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Gráficos e Analytics Operacionais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Distribuição por Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm text-zinc-900">Status do Inventário</h3>
              <span className="text-[11px] font-semibold text-slate-400">{total} itens</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Distribuição percentual da frota</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} itens`, 'Quantidade']}
                    contentStyle={{ backgroundColor: '#18181B', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Sem dados cadastrados</div>
            )}
          </div>

          {/* Legendas */}
          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-xs">
            {statusChartData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate">{item.name}:</span>
                <span className="font-bold font-mono text-zinc-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico 2: Equipamentos por Setor */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm text-zinc-900">Equipamentos por Setor</h3>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 flex items-center gap-1"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Volume de ativos alocados por departamento</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(value: any, _: any, item: any) => [`${value} equipamentos`, item.payload.fullName]}
                  contentStyle={{ backgroundColor: '#18181B', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="quantidade" fill="#FFD100" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Seção Inferior: Atividade Recente + Onboarding Admin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed de Atividades Recentes */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Atividade Recente</h3>
              <p className="text-xs text-slate-500">Últimas movimentações e ações registradas</p>
            </div>
            <button
              onClick={() => onNavigate('movements')}
              className="text-xs font-semibold text-zinc-700 hover:text-black flex items-center gap-1"
            >
              <span>Histórico completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentActivities.length > 0 ? (
              recentActivities.map(act => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-zinc-800 flex items-center justify-center flex-shrink-0 font-mono font-bold mt-0.5">
                      {act.tipo === 'CADASTRO' ? '🆕' : act.tipo === 'TRANSFERENCIA' ? '📍' : act.tipo === 'ENVIO_MANUTENCAO' ? '🛠' : act.tipo === 'RETORNO_MANUTENCAO' ? '✅' : '📦'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 truncate">
                        <span className="text-yellow-600 font-mono mr-1.5">{act.equipamento_codigo}</span>
                        <span>{act.equipamento_nome}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] truncate">
                        {act.motivo || `Movimentação por ${act.usuario_nome}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 text-[11px] text-slate-400">
                    <div>{new Date(act.created_at).toLocaleDateString('pt-BR')}</div>
                    <div>{new Date(act.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">Nenhuma movimentação registrada.</div>
            )}
          </div>
        </div>

        {/* Card de Configuração Inicial / Onboarding */}
        <div className="bg-gradient-to-br from-zinc-900 to-black text-white p-6 rounded-3xl border border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Status da Empresa</span>
              <span className="text-xs font-mono font-bold">{progressPercent}%</span>
            </div>
            <h4 className="font-extrabold text-base text-white">Configurações MP CARGAS</h4>
            <p className="text-xs text-zinc-400 mt-1 mb-4">Etapas essenciais do sistema patrimonial</p>

            {/* Barra de Progresso */}
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-5 overflow-hidden">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all duration-500 shadow-yellow-glow"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Itens */}
            <div className="space-y-3 text-xs">
              {onboardingSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-zinc-300">
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-zinc-600 flex-shrink-0" />
                  )}
                  <span className={step.done ? 'text-zinc-200' : 'text-zinc-400'}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800/80 mt-6">
            <button
              onClick={() => onNavigate('settings')}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-yellow-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>AJUSTAR PARÂMETROS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
