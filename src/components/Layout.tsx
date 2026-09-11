import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  FileText,
  CheckSquare,
  Layers,
  Search,
  Bell,
  FolderOpen,
  BarChart2,
  Calendar,
  MessageSquare,
  Users,
  Shield,
  FileSearch,
  Building2,
  X,
  Plus,
  Menu,
  User,
  Briefcase,
  History
} from 'lucide-react';
import clsx from 'clsx';

// Gran7 Official Brand Logo Component - Prominent Seamless Logo
export function Gran7Logo({ className = "", collapsed = false }: { className?: string; collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="w-10 h-10 flex items-center justify-center mx-auto transition-transform hover:scale-105">
        <img
          src="/image2.png"
          alt="Gran7 OS"
          className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,200,83,0.4)]"
        />
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col items-center justify-center select-none w-full py-1", className)}>
      <img
        src="/image2.png"
        alt="Gran7 OS - Sistema de Gestão de Processos"
        className="h-16 sm:h-18 max-h-20 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(0,200,83,0.4)] transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
}

export default function Layout() {
  const { dbUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const [showNotification, setShowNotification] = useState(false);
  const [latestRequest, setLatestRequest] = useState<any>(null);
  const [dismissedRequests, setDismissedRequests] = useState<Set<string | number>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  useEffect(() => {
    const loadSidebarData = () => {
      fetch('/api/requests').then(r => r.json()).then(data => { if (Array.isArray(data)) setRequests(data); }).catch(() => {});
      fetch('/api/tasks').then(r => r.json()).then(data => { if (Array.isArray(data)) setTasks(data); }).catch(() => {});
    };
    loadSidebarData();
    const interval = setInterval(loadSidebarData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (dbUser?.role === 'Gestor' || dbUser?.role === 'Administrador') {
      const pendingRequests = requests.filter(r => r.status === 'Em Análise' || r.status === 'Pendente');
      const activePending = pendingRequests.filter(r => !dismissedRequests.has(r.id));

      if (activePending.length > 0) {
        setLatestRequest(activePending[0]);
        setShowNotification(true);
      } else {
        setShowNotification(false);
      }
    }
  }, [requests, dbUser, dismissedRequests]);

  const handleDismiss = () => {
    if (latestRequest) {
      setDismissedRequests(prev => new Set(prev).add(latestRequest.id));
      setShowNotification(false);
    }
  };

  const pendingRequestsCount = requests.filter(r => r.status === 'Em Análise' || r.status === 'Pendente').length;
  const pendingTasksCount = tasks.filter(t => t.status !== 'Concluído' && t.status !== 'CONCLUIDO').length;

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['Administrador', 'Gestor', 'Usuário', 'Auditor'] },
    {
      name: 'Solicitações',
      href: '/requests',
      icon: FileText,
      count: pendingRequestsCount,
      roles: ['Administrador', 'Gestor', 'Usuário', 'Auditor'],
      subItems: [
        { name: 'Minhas Solicitações', href: '/requests?tab=my', icon: User },
        { name: 'Em Atendimento', href: '/requests?tab=assigned', icon: Briefcase },
        { name: 'Histórico & Finalizados', href: '/requests?tab=history', icon: History },
      ]
    },
    { name: 'Processos', href: '/processes', icon: Layers, roles: ['Administrador', 'Gestor'] },
    { name: 'Tarefas', href: '/tasks', icon: CheckSquare, count: pendingTasksCount, roles: ['Administrador', 'Gestor', 'Usuário'] },
    { name: 'Documentos', href: '/documents', icon: FolderOpen, roles: ['Administrador', 'Gestor', 'Usuário', 'Auditor'] },
    { name: 'Relatórios', href: '/reports', icon: BarChart2, roles: ['Administrador', 'Gestor', 'Auditor'] },
    { name: 'Calendário', href: '/calendar', icon: Calendar, roles: ['Administrador', 'Gestor', 'Usuário', 'Auditor'] },
    { name: 'Chat', href: '/chat', icon: MessageSquare, roles: ['Administrador', 'Gestor', 'Usuário', 'Auditor'] },
  ];

  const adminNav = [
    { name: 'Organização', href: '/organization', icon: Building2, roles: ['Administrador'] },
    { name: 'Usuários', href: '/users', icon: Users, roles: ['Administrador', 'Gestor'] },
    { name: 'Perfis e Permissões', href: '/roles', icon: Shield, roles: ['Administrador'] },
    { name: 'Configurações', href: '/settings', icon: Settings, roles: ['Administrador'] },
    { name: 'Auditoria', href: '/audit', icon: FileSearch, roles: ['Administrador', 'Auditor'] },
  ];

  const userRole = dbUser?.role || 'Usuário';

  const filteredNav = navigation.filter(item => item.roles.includes(userRole));
  const filteredAdminNav = adminNav.filter(item => item.roles.includes(userRole));

  // Determine current active page name for top breadcrumb
  const currentPage = [...navigation, ...adminNav].find(
    item => item.href === location.pathname || (item.href !== '/' && location.pathname.startsWith(item.href))
  )?.name || 'Gran7 App';

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] flex font-sans select-none relative">

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? '80px' : '232px' }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
        className="h-full max-h-screen bg-[var(--bg-sidebar)] text-[var(--text-sidebar)] flex flex-col z-30 relative shrink-0 overflow-hidden"
      >
        {/* Background mascot watermark — kept within the sidebar, same asset/treatment as before */}
        <div className="absolute inset-0 pointer-events-none z-0 flex items-end justify-center overflow-hidden">
          <img
            src="/logogran7.png"
            alt=""
            className="h-[70vh] w-auto max-w-[160%] object-contain opacity-[0.08] filter brightness-125 select-none pointer-events-none"
          />
        </div>

        {/* Brand Header with Clean Prominent Gran7 Logo - Seamless Background */}
        <div className={clsx(
          "flex items-center px-4 shrink-0 justify-center transition-all relative z-10",
          isSidebarCollapsed ? "h-20" : "py-2 min-h-[90px]"
        )}>
          <Link to="/" className="flex items-center justify-center overflow-hidden w-full cursor-pointer">
            <Gran7Logo collapsed={isSidebarCollapsed} />
          </Link>
        </div>

        {/* Main Navigation Links */}
        <div className="flex-1 min-h-0 overflow-y-auto py-3 px-3 space-y-6 custom-scrollbar relative z-10">
          <div>
            {!isSidebarCollapsed && (
              <div className="px-3.5 mb-2.5 text-[11px] font-bold text-[var(--text-sidebar)] uppercase tracking-wider">
                Menu Principal
              </div>
            )}
            <nav className="space-y-1">
              {filteredNav.map((item) => {
                const active = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                const hasSub = !isSidebarCollapsed && item.subItems && item.subItems.length > 0;

                return (
                  <div key={item.name} className="space-y-1">
                    <Link
                      to={item.href}
                      className={clsx(
                        'group relative flex items-center px-3.5 py-2.5 rounded-lg text-[13.5px] font-semibold transition-all duration-150 cursor-pointer',
                        active
                          ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-bold'
                          : 'text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-sidebar-hover)]'
                      )}
                      title={isSidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon
                        className={clsx(
                          'flex-shrink-0 h-4 w-4 transition-colors',
                          isSidebarCollapsed ? 'mx-auto' : 'mr-3.5',
                          active ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-sidebar)] group-hover:text-[var(--text-sidebar-hover)]'
                        )}
                      />

                      {!isSidebarCollapsed && (
                        <span className="truncate flex-1">{item.name}</span>
                      )}

                      {!isSidebarCollapsed && item.count !== undefined && item.count > 0 && (
                        <span className={clsx(
                          'ml-auto text-[10px] px-2 py-0.5 rounded-full font-extrabold',
                          active ? 'bg-black/10 text-[var(--text-on-brand)]' : 'bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]'
                        )}>
                          {item.count}
                        </span>
                      )}
                    </Link>

                    {/* Sub-items rendering */}
                    {hasSub && (
                      <div className="pl-7 pr-1 space-y-1 py-1 border-l border-[var(--bg-sidebar-hover)] ml-5">
                        {item.subItems?.map((sub) => {
                          const isSubActive = location.pathname === '/requests' && (
                            location.search.includes(sub.href.split('?')[1]) ||
                            (sub.href.endsWith('tab=my') && (location.search === '' || location.search.includes('tab=my')))
                          );
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.name}
                              to={sub.href}
                              className={clsx(
                                'flex items-center px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer',
                                isSubActive
                                  ? 'text-[var(--text-sidebar-hover)] font-bold bg-[var(--bg-sidebar-hover)]'
                                  : 'text-[var(--text-sidebar)] hover:text-[var(--text-sidebar-hover)] hover:bg-[var(--bg-sidebar-hover)]'
                              )}
                            >
                              <SubIcon size={13} className="mr-2 shrink-0" />
                              <span className="truncate">{sub.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {filteredAdminNav.length > 0 && (
            <div>
              {!isSidebarCollapsed && (
                <div className="px-3.5 mb-2.5 text-[11px] font-bold text-[var(--text-sidebar)] uppercase tracking-wider">
                  Gestão & Sistema
                </div>
              )}
              <nav className="space-y-1">
                {filteredAdminNav.map((item) => {
                  const active = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={clsx(
                        'group relative flex items-center px-3.5 py-2.5 rounded-lg text-[13.5px] font-semibold transition-all duration-150 cursor-pointer',
                        active
                          ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-bold'
                          : 'text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-sidebar-hover)]'
                      )}
                      title={isSidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon
                        className={clsx(
                          'flex-shrink-0 h-4 w-4 transition-colors',
                          isSidebarCollapsed ? 'mx-auto' : 'mr-3.5',
                          active ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-sidebar)] group-hover:text-[var(--text-sidebar-hover)]'
                        )}
                      />

                      {!isSidebarCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-[var(--bg-sidebar-hover)] space-y-3 shrink-0 relative z-10">
          <button
            onClick={logout}
            className="flex items-center text-[13.5px] font-semibold text-[var(--text-sidebar)] hover:text-red-400 hover:bg-red-500/10 transition-all w-full px-3 py-2.5 rounded-lg cursor-pointer"
            title={isSidebarCollapsed ? "Sair do sistema" : undefined}
          >
            <LogOut className={clsx("h-4 w-4", isSidebarCollapsed ? "mx-auto" : "mr-3")} />
            {!isSidebarCollapsed && <span>Sair da conta</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 min-h-0">

        {/* Top Header Bar */}
        <header className="bg-[var(--bg-surface)] border-b border-[var(--border-color)] h-[68px] px-4 sm:px-6 flex items-center justify-between z-20 shrink-0">

          {/* Left: Sidebar Toggle + Page Title */}
          <div className="flex items-center space-x-3.5 min-w-0">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-soft)] border border-transparent transition-all active:scale-95 cursor-pointer flex items-center justify-center"
              title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
            >
              <Menu size={20} />
            </button>

            <div>
              <h1 className="text-[18px] font-extrabold text-[var(--text-primary)] tracking-tight truncate leading-tight">
                {currentPage}
              </h1>
              <p className="text-[12px] text-[var(--text-secondary)] leading-tight">
                Visão geral da operação
              </p>
            </div>
          </div>

          {/* Center/Right: Quick Search & User Profile */}
          <div className="flex items-center space-x-3.5 ml-auto">

            {/* Quick Search Bar */}
            <div className="relative hidden md:block md:w-56 lg:w-[280px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Buscar solicitações, tarefas..."
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs rounded-lg pl-9 pr-9 py-2 border border-[var(--border-color)] focus:outline-none focus:border-[var(--brand-accent)] focus:ring-1 focus:ring-[var(--brand-accent)]/30 transition-all"
              />
              {quickSearch ? (
                <button
                  onClick={() => setQuickSearch('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X size={13} />
                </button>
              ) : (
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                  <kbd className="text-[10px] font-mono font-medium text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">⌘K</kbd>
                </div>
              )}
            </div>

            {/* Quick Create Button */}
            <button
              onClick={() => navigate('/requests/new')}
              className="hidden lg:flex bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[var(--text-on-brand)] px-3.5 py-2 rounded-lg text-xs font-bold items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={15} strokeWidth={3} />
              <span>Solicitação</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotification(!showNotification)}
                className="p-2 rounded-lg bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-all relative active:scale-95 cursor-pointer"
                title="Notificações"
              >
                <Bell size={18} />
                {pendingRequestsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[var(--brand-accent)] border-2 border-[var(--bg-surface)]" />
                )}
              </button>
            </div>

            {/* User Profile Badge */}
            <div className="flex items-center space-x-3 border-l border-[var(--border-color)] pl-3.5">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                  {dbUser?.name || 'Caick Ferreira'}
                </span>
                <span className="text-[10px] text-[var(--brand-text)] font-bold leading-tight">
                  {dbUser?.role || 'Administrador'}
                </span>
              </div>

              <div className="w-9 h-9 rounded-lg bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-black text-xs flex items-center justify-center">
                {dbUser?.name ? dbUser.name.charAt(0).toUpperCase() : 'C'}
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Outlet View Content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-8 relative z-10 custom-scrollbar bg-[var(--bg-app)]">
          <Outlet />

          {/* Floating Notification Popup */}
          <AnimatePresence>
            {showNotification && latestRequest && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="fixed bottom-6 right-6 w-88 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-lg overflow-hidden z-40 text-[var(--text-primary)] p-5 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-[var(--brand-text)] uppercase tracking-wider block">
                      Atenção Necessária
                    </span>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">
                      Nova Solicitação Pendente
                    </h4>
                  </div>
                  <button onClick={handleDismiss} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                    <X size={15} />
                  </button>
                </div>

                <div className="bg-[var(--bg-sunken)] p-3.5 rounded-lg text-xs space-y-1 border border-[var(--border-color)]">
                  <div className="text-[var(--text-secondary)]">Protocolo: <strong className="text-[var(--brand-text)] font-mono">{latestRequest.protocol}</strong></div>
                  <div className="text-[var(--text-secondary)] truncate">Processo: <span className="font-semibold">{latestRequest.processName}</span></div>
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Dispensar
                  </button>
                  <Link
                    to={`/requests/${latestRequest.id}`}
                    onClick={handleDismiss}
                    className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[var(--text-on-brand)] px-4 py-1.5 rounded-lg text-xs font-extrabold"
                  >
                    Analisar
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
