import { useState, useEffect } from 'react';
import { Layers, Plus, Search, Edit, Play, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';

interface ProcessSummary {
  id: string;
  name: string;
  category: string;
  executionType: string;
  description: string;
  status: string;
  fields: any[];
  steps: any[];
}

export default function Processes() {
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODOS');

  const loadProcesses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/processes');
      const data = await res.json();
      if (Array.isArray(data)) setProcesses(data);
    } catch (err) {
      console.error('Erro ao carregar processos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  // Categories list derived from processes
  const categories = ['TODOS', ...Array.from(new Set(processes.map(p => p.category).filter(Boolean)))];

  const filteredProcesses = processes.filter(p => {
    if (!p) return false;
    const matchesCategory = selectedCategory === 'TODOS' || p.category === selectedCategory;
    const matchesSearch =
      (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans select-none">

      {/* Header Banner */}
      <div className="md:flex md:items-center md:justify-between bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 rounded-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-[var(--brand-accent)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex-1 min-w-0 space-y-1.5 z-10">
          <div className="flex items-center space-x-2 text-[var(--brand-text)] text-xs font-bold uppercase tracking-wider">
            <Layers size={15} />
            <span>Fluxos &amp; Automação Operacional</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] tracking-tight">
            Modelos de Processos
          </h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-xl">
            Gerencie os fluxos de trabalho, etapas de aprovação e formulários de entrada de dados da sua empresa.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3 z-10">
          <button
            onClick={loadProcesses}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-2)] rounded-lg transition-colors border border-[var(--border-color)] bg-[var(--bg-surface)]"
            title="Atualizar dados"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <Link
            to="/processes/new"
            className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[var(--text-on-brand)] font-extrabold px-4 py-2.5 rounded-lg text-xs flex items-center space-x-2 transition-all active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Novo Processo</span>
          </Link>
        </div>
      </div>

      {/* Search and Category Filter Chips */}
      <div className="bg-[var(--bg-surface-2)] border border-[var(--border-color)] p-4 rounded-xl space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">

        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
            <Search size={15} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, setor ou descrição..."
            className="block w-full pl-9 pr-3 py-2 bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs rounded-lg border border-[var(--border-color)] focus:outline-none focus:border-[var(--brand-accent)] transition-all"
          />
        </div>

        {/* Category Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-extrabold'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              {cat === 'TODOS' ? 'Todos os Setores' : cat}
            </button>
          ))}
        </div>

      </div>

      {/* Process Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-[var(--text-secondary)] flex flex-col items-center justify-center space-y-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl">
          <RefreshCw className="animate-spin text-[var(--brand-text)]" size={28} />
          <p className="text-xs font-semibold">Carregando processos do banco de dados...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProcesses.map((process, index) => (
            <motion.div
              key={process.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.4) }}
              whileHover={{ y: -3 }}
            >
              <Card hoverable className="flex flex-col justify-between space-y-4 h-full group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[var(--brand-soft)] text-[var(--brand-text)] border border-[var(--brand-soft-border)]">
                      {process.category || 'GERAL'}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--brand-text)] flex items-center space-x-1 bg-[var(--bg-surface-2)] px-2 py-0.5 rounded-md border border-[var(--border-color)]">
                      <CheckCircle2 size={11} />
                      <span>{process.status || 'Ativo'}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--text-primary)] group-hover:text-[var(--brand-text)] transition-colors leading-snug">
                      {process.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1.5 leading-relaxed">
                      {process.description || 'Processo configurado com regras de validação e aprovação sequencial.'}
                    </p>
                  </div>

                  {/* Badges info */}
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-[10px] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] px-2.5 py-1 rounded-md border border-[var(--border-color)]">
                      🎯 {(process.steps || []).length} {process.steps?.length === 1 ? 'Etapa' : 'Etapas'}
                    </span>
                    <span className="text-[10px] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] px-2.5 py-1 rounded-md border border-[var(--border-color)]">
                      📝 {(process.fields || []).length} Campos
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                  <Link
                    to={`/processes/${process.id}/edit`}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold flex items-center space-x-1.5 px-2 py-1 rounded-lg hover:bg-[var(--bg-surface-2)] transition-all"
                  >
                    <Edit size={13} />
                    <span>Editar Modelo</span>
                  </Link>

                  <Link
                    to={`/requests/new?processId=${process.id}`}
                    className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[var(--text-on-brand)] px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition-all active:scale-95"
                  >
                    <Play size={12} className="fill-[var(--text-on-brand)]" />
                    <span>Iniciar Fluxo</span>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}

          {filteredProcesses.length === 0 && (
            <div className="col-span-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-10 text-center space-y-3">
              <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">Nenhum processo encontrado</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                {processes.length === 0
                  ? 'Nenhum processo cadastrado ainda. Crie o primeiro modelo de fluxo da sua empresa.'
                  : 'Não encontramos nenhum fluxo de trabalho correspondente à sua busca ou filtro atual.'}
              </p>
              <div className="pt-2 flex justify-center space-x-3">
                {processes.length > 0 && (
                  <button
                    onClick={() => { setSearchTerm(''); setSelectedCategory('TODOS'); }}
                    className="text-xs text-[var(--brand-text)] font-bold hover:underline"
                  >
                    Limpar Filtros
                  </button>
                )}
                <Link
                  to="/processes/new"
                  className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[var(--text-on-brand)] px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all"
                >
                  Criar Novo Processo
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
