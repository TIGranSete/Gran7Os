import { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  User,
  Briefcase,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Building2
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Badge, statusTone } from '../components/ui/Badge';

type SortField = 'protocol' | 'processName' | 'requester' | 'step' | 'attendant' | 'status' | 'date';
type SortDirection = 'asc' | 'desc';

interface RequestRow {
  id: string;
  protocol: string;
  processId: string;
  processName: string;
  category?: string;
  requester: string;
  requesterDepartment?: string;
  attendant?: string;
  status: string;
  date: string;
  completedDate?: string;
  resolutionTime?: string;
  step: string;
}

export default function Requests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allRequests, setAllRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/requests')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllRequests(data); })
      .catch(err => console.error('Erro ao carregar solicitações:', err))
      .finally(() => setLoading(false));
  }, []);

  // Active Main View Tab from URL parameter (default: 'my')
  const activeTab = searchParams.get('tab') || 'my'; // 'my' | 'assigned' | 'all' | 'history'

  // Search & Excel Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterProcess, setFilterProcess] = useState('TODOS');
  const [filterStep, setFilterStep] = useState('TODOS');
  const [filterAttendant, setFilterAttendant] = useState('TODOS');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination when filters or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, filterProcess, filterStep, filterAttendant, filterStatus, filterStartDate, filterEndDate]);

  // Current logged in user name identifier
  const currentUserName = user?.name || 'Caick Ferreira';

  // Extract unique filter options from request list
  const uniqueProcesses = useMemo(() => {
    const set = new Set(allRequests.map(r => r.processName).filter(Boolean));
    return Array.from(set);
  }, [allRequests]);

  const uniqueSteps = useMemo(() => {
    const set = new Set(allRequests.map(r => r.step).filter(Boolean));
    return Array.from(set);
  }, [allRequests]);

  const uniqueAttendants = useMemo(() => {
    const set = new Set(allRequests.map(r => r.attendant).filter(Boolean));
    return Array.from(set);
  }, [allRequests]);

  // Filter requests according to view tab & custom Excel filters
  const filteredRequests = useMemo(() => {
    return allRequests.filter(req => {
      if (!req) return false;

      // Tab filtering
      if (activeTab === 'my') {
        // Minhas solicitações (criadas pelo usuário)
        const isMyReq = req.requester.toLowerCase() === currentUserName.toLowerCase() ||
                        req.requester.toLowerCase().includes('caick') ||
                        req.requester.toLowerCase().includes(user?.username || 'admin');
        if (!isMyReq) return false;
      } else if (activeTab === 'assigned') {
        // Solicitações em atendimento pelo usuário ou setor
        const isAssignedToMe = (req.attendant && req.attendant.toLowerCase().includes(currentUserName.toLowerCase())) ||
                               (req.attendant && req.attendant.toLowerCase().includes('caick')) ||
                               (user?.department && req.requesterDepartment === user.department);
        const isActiveStatus = req.status !== 'Concluído' && req.status !== 'Rejeitado' && req.status !== 'Cancelado';
        if (!isAssignedToMe || !isActiveStatus) return false;
      } else if (activeTab === 'history') {
        // Histórico de solicitações finalizadas
        const isFinalized = req.status === 'Concluído' || req.status === 'Aprovado' || req.status === 'Rejeitado' || req.status === 'Cancelado';
        if (!isFinalized) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          (req.protocol || '').toLowerCase().includes(query) ||
          (req.processName || '').toLowerCase().includes(query) ||
          (req.requester || '').toLowerCase().includes(query) ||
          (req.attendant || '').toLowerCase().includes(query) ||
          (req.step || '').toLowerCase().includes(query) ||
          (req.category || '').toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      // Custom Excel dropdown filters
      if (filterProcess !== 'TODOS' && req.processName !== filterProcess) return false;
      if (filterStep !== 'TODOS' && req.step !== filterStep) return false;
      if (filterAttendant !== 'TODOS' && req.attendant !== filterAttendant) return false;
      if (filterStatus !== 'TODOS' && req.status !== filterStatus) return false;

      // Date range filtering
      if (filterStartDate && req.date < filterStartDate) return false;
      if (filterEndDate && req.date > filterEndDate) return false;

      return true;
    });
  }, [allRequests, activeTab, currentUserName, user, searchTerm, filterProcess, filterStep, filterAttendant, filterStatus, filterStartDate, filterEndDate]);

  // Sorting
  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      let aVal = (a[sortField] || '').toString().toLowerCase();
      let bVal = (b[sortField] || '').toString().toLowerCase();

      if (sortField === 'date') {
        aVal = a.date || '';
        bVal = b.date || '';
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRequests, sortField, sortDirection]);

  // Pagination slicing
  const totalItems = sortedRequests.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRequests.slice(start, start + pageSize);
  }, [sortedRequests, currentPage, pageSize]);

  // Column sort toggle handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Tab switcher helper
  const handleTabChange = (tabKey: string) => {
    setSearchParams({ tab: tabKey });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterProcess('TODOS');
    setFilterStep('TODOS');
    setFilterAttendant('TODOS');
    setFilterStatus('TODOS');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // KPI Calculations for History View
  const historyStats = useMemo(() => {
    const finalized = allRequests.filter(r => r.status === 'Concluído' || r.status === 'Aprovado' || r.status === 'Rejeitado' || r.status === 'Cancelado');
    const approvedCount = finalized.filter(r => r.status === 'Concluído' || r.status === 'Aprovado').length;
    const rejectedCount = finalized.filter(r => r.status === 'Rejeitado' || r.status === 'Cancelado').length;
    const approvalRate = finalized.length > 0 ? Math.round((approvedCount / finalized.length) * 100) : 0;

    return {
      totalFinalized: finalized.length,
      approvedCount,
      rejectedCount,
      approvalRate,
      avgResolutionTime: '1.4 dias'
    };
  }, [allRequests]);

  const activeFiltersCount = [
    filterProcess !== 'TODOS',
    filterStep !== 'TODOS',
    filterAttendant !== 'TODOS',
    filterStatus !== 'TODOS',
    filterStartDate !== '',
    filterEndDate !== ''
  ].filter(Boolean).length;

  const tabs = [
    { key: 'my', label: 'Minhas Solicitações', icon: User },
    { key: 'assigned', label: 'Em Atendimento', icon: Briefcase },
    { key: 'all', label: 'Todas as Solicitações', icon: FileText },
    { key: 'history', label: 'Histórico & Finalizados', icon: History },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans select-none">

      {/* Header Banner */}
      <Card>
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[var(--brand-text)] text-[11px] font-extrabold uppercase tracking-wider">
            <Building2 size={14} />
            <span>Gran7 • Gestão e Automação de Processos</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
            Central de Solicitações
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Acompanhe em tempo real suas solicitações, tarefas em atendimento e o histórico completo de processos.
          </p>
        </div>
      </Card>

      {/* Main View Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[var(--bg-surface-2)] p-1.5 rounded-xl border border-[var(--border-color)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* KPI Cards section for History View */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand-text)] shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">Processos Concluídos</div>
              <div className="text-xl font-black text-[var(--text-primary)]">{historyStats.totalFinalized}</div>
            </div>
          </Card>

          <Card className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand-text)] shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">Tempo Médio Resolução</div>
              <div className="text-xl font-black text-[var(--text-primary)]">{historyStats.avgResolutionTime}</div>
            </div>
          </Card>

          <Card className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand-text)] shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">Taxa de Aprovação</div>
              <div className="text-xl font-black text-[var(--brand-text)]">{historyStats.approvalRate}%</div>
            </div>
          </Card>

          <Card className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
              <XCircle size={20} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">Rejeitados / Cancelados</div>
              <div className="text-xl font-black text-rose-600">{historyStats.rejectedCount}</div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Interactive Table Container */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden">

        {/* Controls Bar */}
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface-2)] flex flex-wrap gap-3 items-center justify-between">

          {/* Live Search */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[var(--text-muted)]">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por protocolo, processo, solicitante, atendente..."
              className="block w-full pl-10 pr-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Buttons & Filter Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 border ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-[var(--brand-soft)] text-[var(--brand-text)] border-[var(--brand-soft-border)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filtros Excel</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[var(--brand-accent)] text-[var(--text-on-brand)] text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5"
                title="Limpar todos os filtros"
              >
                <RefreshCw size={13} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Excel-Style Dropdown Filter Drawer Panel */}
        <AnimatePresence>
          {showFilterPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-[var(--bg-sunken)] border-b border-[var(--border-color)] p-4 text-xs space-y-4"
            >
              <div className="flex items-center justify-between text-[var(--text-secondary)] font-bold uppercase text-[10px] tracking-wider">
                <span>Filtros Avançados de Tabela</span>
                <button onClick={() => setShowFilterPanel(false)} className="hover:text-[var(--text-primary)]">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Process Filter */}
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Processo</label>
                  <select
                    value={filterProcess}
                    onChange={(e) => setFilterProcess(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                  >
                    <option value="TODOS">Todos os Processos</option>
                    {uniqueProcesses.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Step Filter */}
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Etapa Atual</label>
                  <select
                    value={filterStep}
                    onChange={(e) => setFilterStep(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                  >
                    <option value="TODOS">Todas as Etapas</option>
                    {uniqueSteps.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Attendant Filter */}
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Quem está atendendo</label>
                  <select
                    value={filterAttendant}
                    onChange={(e) => setFilterAttendant(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                  >
                    <option value="TODOS">Todos os Atendentes</option>
                    {uniqueAttendants.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                  >
                    <option value="TODOS">Todos os Status</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Em Atendimento">Em Atendimento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Rejeitado">Rejeitado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Date Start */}
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Requests Excel Data Table */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw size={28} className="mx-auto text-[var(--brand-text)] animate-spin" />
            <p className="text-xs font-semibold text-[var(--text-secondary)]">Carregando solicitações do banco de dados...</p>
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FileText size={40} className="mx-auto text-[var(--text-muted)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">Nenhuma solicitação encontrada</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              Não há registros para os filtros selecionados ou para a visualização atual ({activeTab === 'my' ? 'Minhas Solicitações' : activeTab === 'assigned' ? 'Em Atendimento' : activeTab === 'history' ? 'Histórico' : 'Todas'}).
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="mt-2 inline-flex items-center space-x-2 text-xs font-bold text-[var(--brand-text)] bg-[var(--brand-soft)] px-4 py-2 rounded-lg border border-[var(--brand-soft-border)] hover:bg-[var(--brand-soft-border)]/30"
              >
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-color)] text-left">
              <thead className="bg-[var(--bg-surface-2)]">
                <tr className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider select-none">

                  {/* Column: Protocolo */}
                  <th
                    onClick={() => handleSort('protocol')}
                    className="px-5 py-3.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Protocolo</span>
                      <ArrowUpDown size={12} className={sortField === 'protocol' ? 'text-[var(--brand-text)]' : 'text-[var(--text-muted)]'} />
                    </div>
                  </th>

                  {/* Column: Processo */}
                  <th
                    onClick={() => handleSort('processName')}
                    className="px-5 py-3.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Processo & Categoria</span>
                      <ArrowUpDown size={12} className={sortField === 'processName' ? 'text-[var(--brand-text)]' : 'text-[var(--text-muted)]'} />
                    </div>
                  </th>

                  {/* Column: Solicitante */}
                  <th
                    onClick={() => handleSort('requester')}
                    className="px-5 py-3.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Solicitante</span>
                      <ArrowUpDown size={12} className={sortField === 'requester' ? 'text-[var(--brand-text)]' : 'text-[var(--text-muted)]'} />
                    </div>
                  </th>

                  {/* Column: Etapa Atual */}
                  <th
                    onClick={() => handleSort('step')}
                    className="px-5 py-3.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Etapa Atual</span>
                      <ArrowUpDown size={12} className={sortField === 'step' ? 'text-[var(--brand-text)]' : 'text-[var(--text-muted)]'} />
                    </div>
                  </th>

                  {/* Column: Quem está atendendo */}
                  <th
                    onClick={() => handleSort('attendant')}
                    className="px-5 py-3.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Atendente / Responsável</span>
                      <ArrowUpDown size={12} className={sortField === 'attendant' ? 'text-[var(--brand-text)]' : 'text-[var(--text-muted)]'} />
                    </div>
                  </th>

                  {/* Column: Status */}
                  <th
                    onClick={() => handleSort('status')}
                    className="px-5 py-3.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Status</span>
                      <ArrowUpDown size={12} className={sortField === 'status' ? 'text-[var(--brand-text)]' : 'text-[var(--text-muted)]'} />
                    </div>
                  </th>

                  {/* Column: Data / Conclusão */}
                  <th
                    onClick={() => handleSort('date')}
                    className="px-5 py-3.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>{activeTab === 'history' ? 'Conclusão & SLA' : 'Data'}</span>
                      <ArrowUpDown size={12} className={sortField === 'date' ? 'text-[var(--brand-text)]' : 'text-[var(--text-muted)]'} />
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-surface)]">
                {paginatedRequests.map((req, index) => (
                  <motion.tr
                    key={req.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                    onClick={() => navigate(`/requests/${req.id}`)}
                    className="hover:bg-[var(--brand-row-hover)] transition-colors cursor-pointer group"
                  >
                    {/* Protocolo */}
                    <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-[var(--brand-text)] text-xs">
                      {req.protocol}
                    </td>

                    {/* Processo & Categoria */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-xs font-bold text-[var(--text-primary)]">{req.processName}</div>
                      {req.category && (
                        <div className="text-[10px] text-[var(--text-secondary)] font-medium">{req.category}</div>
                      )}
                    </td>

                    {/* Solicitante */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      <div className="font-semibold text-[var(--text-primary)]">{req.requester}</div>
                      {req.requesterDepartment && (
                        <div className="text-[10px] text-[var(--text-secondary)]">{req.requesterDepartment}</div>
                      )}
                    </td>

                    {/* Etapa Atual */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium">
                        <Clock size={12} className="text-[var(--brand-text)]" />
                        <span>{req.step || 'Aprovação Inicial'}</span>
                      </div>
                    </td>

                    {/* Quem está atendendo (Atendente) */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[10px] font-black text-[var(--brand-soft-text)]">
                          {(req.attendant || 'G7')[0]}
                        </div>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {req.attendant || 'Aguardando atribuição'}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge tone={statusTone(req.status)}>{req.status}</Badge>
                    </td>

                    {/* Data / Resolution */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-[var(--text-secondary)] font-mono">
                      {activeTab === 'history' ? (
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">{req.completedDate || req.date}</div>
                          {req.resolutionTime && (
                            <div className="text-[10px] text-[var(--brand-text)] font-sans">{req.resolutionTime}</div>
                          )}
                        </div>
                      ) : (
                        <span>{req.date}</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Excel Pagination Controls */}
        <div className="px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-surface-2)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">

          {/* Items count summary */}
          <div className="flex items-center space-x-4">
            <div>
              Exibindo <strong className="text-[var(--text-primary)]">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</strong> a <strong className="text-[var(--text-primary)]">{Math.min(currentPage * pageSize, totalItems)}</strong> de <strong className="text-[var(--text-primary)]">{totalItems}</strong> solicitações
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-[var(--text-muted)]">Linhas por página:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--border-color)] disabled:opacity-40 disabled:pointer-events-none text-[var(--text-primary)] rounded-lg border border-[var(--border-color)] transition-colors flex items-center space-x-1"
            >
              <ChevronLeft size={14} />
              <span>Anterior</span>
            </button>

            <div className="px-3 py-1 font-mono font-bold text-[var(--text-secondary)]">
              Página {currentPage} de {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--border-color)] disabled:opacity-40 disabled:pointer-events-none text-[var(--text-primary)] rounded-lg border border-[var(--border-color)] transition-colors flex items-center space-x-1"
            >
              <span>Próxima</span>
              <ChevronRight size={14} />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
