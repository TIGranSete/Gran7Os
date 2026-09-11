import React from 'react';
import { Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '../components/ui/Badge';

export default function Audit() {
  const logs = [
    { id: 1, action: 'UPDATE', table: 'processos', user: 'Caick', date: '2026-07-20 10:45:22', ip: '192.168.1.1' },
    { id: 2, action: 'INSERT', table: 'solicitacoes', user: 'João Silva', date: '2026-07-20 09:12:05', ip: '192.168.1.45' },
    { id: 3, action: 'DELETE', table: 'tarefas', user: 'Maria Souza', date: '2026-07-19 16:30:11', ip: '192.168.1.89' },
    { id: 4, action: 'UPDATE', table: 'usuarios', user: 'Caick', date: '2026-07-19 14:20:00', ip: '192.168.1.1' },
  ];

  const actionTone = (action: string): 'brand' | 'info' | 'danger' => {
    if (action === 'INSERT') return 'brand';
    if (action === 'UPDATE') return 'info';
    return 'danger';
  };

  return (
    <div className="max-w-7xl mx-auto font-sans select-none">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Auditoria</h1>
          <p className="text-[var(--text-secondary)] mt-1">Logs de segurança e alterações no sistema.</p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)]">
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <input
              type="text"
              placeholder="Buscar logs..."
              className="block w-full pl-10 pr-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)]"
            />
          </div>
          <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--bg-surface)] flex items-center">
            <Filter size={16} className="mr-2" />
            <span className="text-sm font-medium">Filtros Avançados</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border-color)]">
            <thead className="bg-[var(--bg-surface-2)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Ação</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Tabela</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Data/Hora</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">IP Origem</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--bg-surface)] divide-y divide-[var(--border-color)]">
              {logs.map((log, index) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.3) }}
                  className="hover:bg-[var(--brand-row-hover)] transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge tone={actionTone(log.action)}>{log.action}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{log.table}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{log.user}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{log.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)] font-mono">{log.ip}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
