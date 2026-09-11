import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Download, Trash2, Plus, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

interface DocumentRow {
  id: string;
  name: string;
  type: string;
  date: string;
  size: string;
  author: string;
}

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (Array.isArray(data)) setDocuments(data);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id || user.id === 'fallback-admin') {
      setError('O usuário de fallback não é uma conta real do banco. Faça login com um usuário cadastrado para enviar documentos.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', String(user.id));
      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao enviar documento.');
      }
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar documento.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    await loadDocuments();
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans select-none">
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">Documentos &amp; Repositório</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Repositório central de arquivos, termos e modelos da Gran7.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDocuments}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-2)] rounded-lg transition-colors border border-[var(--border-color)] bg-[var(--bg-surface)]"
            title="Atualizar dados"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Plus size={16} strokeWidth={3} className="mr-2" />
            {uploading ? 'Enviando...' : 'Novo Documento'}
          </Button>
        </div>
      </Card>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface-2)]">
          <div className="relative w-72">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar documentos..."
              className="block w-full pl-10 pr-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border-color)]">
            <thead className="bg-[var(--bg-surface-2)]">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Nome do Arquivo</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Autor</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Data</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Tamanho</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-surface)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[var(--text-secondary)] text-xs font-semibold">
                    Carregando documentos do banco de dados...
                  </td>
                </tr>
              ) : (
                <>
                  {filteredDocuments.map((doc, index) => (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.3) }}
                      className="hover:bg-[var(--brand-row-hover)] transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-text)]">
                            <FileText size={20} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-[var(--text-primary)]">{doc.name}</div>
                            <div className="text-[10px] uppercase font-bold text-[var(--brand-text)]">{doc.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-[var(--text-secondary)]">{doc.author}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-[var(--text-secondary)]">
                        {new Date(doc.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-[var(--text-muted)] font-mono">{doc.size}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          className="inline-flex text-[var(--text-muted)] hover:text-[var(--brand-text)] p-1.5 rounded-lg hover:bg-[var(--brand-soft)] transition-colors mr-2"
                          title="Download"
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-[var(--text-muted)] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredDocuments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-[var(--text-muted)] text-sm">
                        {documents.length === 0 ? 'Nenhum documento cadastrado ainda.' : 'Nenhum documento corresponde à sua busca.'}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
