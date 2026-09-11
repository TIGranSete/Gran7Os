import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Gran7Logo } from '../components/Layout';
import { Button } from '../components/ui/Button';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex text-[var(--text-primary)] transition-colors duration-200">

      {/* Branded side panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black">
        <img
          src="/assets/background_login.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-right scale-110 blur-2xl opacity-70"
        />
        {/* Legibility gradient over the texture */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-black/30" />

        <div className="relative z-10 flex flex-col justify-center h-full px-14 max-w-lg">
          <h1 className="text-5xl font-black text-white tracking-tight">
            Gran<span className="text-[var(--brand-accent)]">7</span>
          </h1>
          <p className="mt-3 text-white/80 font-semibold text-base">
            Compromisso com a excelência em resultados
          </p>
          <div className="mt-10 flex flex-col gap-3 items-start">
            {['Fertilidade do Solo', 'Nutrição Vegetal', 'Fisiologia Vegetal'].map((tag) => (
              <span
                key={tag}
                className="bg-black/50 backdrop-blur-sm border border-white/10 text-white font-bold uppercase text-xs tracking-wide px-5 py-3 rounded-lg"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-4 relative overflow-hidden bg-gradient-to-br from-[var(--brand-soft)] via-[var(--bg-app)] to-[var(--bg-app)]">

        {/* Brand glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--brand-accent)]/25 rounded-full blur-3xl pointer-events-none z-0" />

        <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm space-y-7 relative z-10"
      >
        {/* Brand mark — dark badge so it stays legible on the light backdrop */}
        <div className="flex flex-col items-center gap-3 lg:hidden">
          <div className="bg-[var(--bg-sidebar)] rounded-2xl p-3 shadow-lg shadow-black/10">
            <Gran7Logo collapsed />
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-semibold tracking-wide">
            Gran7 Nutrição e Fisiologia Vegetal
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xl shadow-black/5 p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Entre com sua conta para continuar
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Usuário ou E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <UserIcon size={15} />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ex: admin ou nome@gran7.com.br"
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg text-xs focus:outline-none focus:border-[var(--brand-accent)] focus:ring-1 focus:ring-[var(--brand-accent)]/30 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <Lock size={15} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg text-xs focus:outline-none focus:border-[var(--brand-accent)] focus:ring-1 focus:ring-[var(--brand-accent)]/30 transition-colors"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              <span>{submitting ? 'Entrando...' : 'Entrar'}</span>
              <ArrowRight size={15} />
            </Button>
          </form>

          {/* Fallback Access */}
          <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
            <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Acesso de Fallback (enquanto seu usuário não está cadastrado no banco):
            </span>
            <button
              type="button"
              onClick={() => {
                setIdentifier('admin');
                setPassword('admin');
                login('admin', 'admin').catch((err) => setError(err.message));
              }}
              className="w-full bg-[var(--bg-surface-2)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold p-2.5 rounded-lg text-[11px] text-left transition-all"
            >
              <div className="text-[var(--text-primary)] font-extrabold">Administrador (Fallback)</div>
              <div className="text-[9px] text-[var(--text-muted)] font-mono">admin / admin</div>
            </button>
          </div>
        </div>

          {/* Footer */}
          <div className="text-center text-[11px] text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} Gran7 • Gestão Operacional
          </div>
        </motion.div>
      </div>
    </div>
  );
}
