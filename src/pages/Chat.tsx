import React, { useState, useRef, useEffect } from 'react';
import { Send, Search, User as UserIcon, MoreVertical, Paperclip } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { motion } from 'motion/react';

interface ChatUser {
  id: string;
  name: string;
  email: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.id && user.id !== 'fallback-admin' ? user.id : null;

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => { if (Array.isArray(data)) setAllUsers(data); }).catch(() => {});
  }, []);

  const loadMessages = () => {
    if (!currentUserId) return;
    fetch(`/api/direct-messages?userId=${currentUserId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllMessages(data); })
      .catch(() => {});
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const contacts = allUsers.filter(u => u.id !== currentUserId &&
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedUser = allUsers.find(u => u.id === selectedUserId);

  const conversation = selectedUserId ? allMessages.filter(m =>
    (m.senderId === currentUserId && m.receiverId === selectedUserId) ||
    (m.senderId === selectedUserId && m.receiverId === currentUserId)
  ) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.length]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedUserId) return;
    if (!currentUserId) {
      setError('O usuário de fallback não é uma conta real do banco. Faça login com um usuário cadastrado para enviar mensagens.');
      return;
    }

    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, receiverId: selectedUserId, content: message.trim() })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao enviar mensagem.');
      }
      setMessage('');
      loadMessages();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  const getLastMessage = (contactId: string) => {
    const msgs = allMessages.filter(m =>
      (m.senderId === currentUserId && m.receiverId === contactId) ||
      (m.senderId === contactId && m.receiverId === currentUserId)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return msgs.length > 0 ? msgs[0] : null;
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8.5rem)] flex bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden font-sans select-none">
      {/* Sidebar de contatos/conversas */}
      <div className="w-80 border-r border-[var(--border-color)] flex flex-col bg-[var(--bg-surface-2)]">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <input
              type="text"
              placeholder="Buscar contatos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {contacts.map((contact, index) => {
            const lastMsg = getLastMessage(contact.id);
            const isSelected = selectedUserId === contact.id;

            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                onClick={() => setSelectedUserId(contact.id)}
                className={`p-4 border-b border-[var(--border-color)] flex items-center cursor-pointer transition-all
                  ${isSelected ? 'bg-[var(--brand-soft)] border-l-4 border-l-[var(--brand-accent)]' : 'hover:bg-[var(--bg-surface)] border-l-4 border-l-transparent'}`}
              >
                <div className="h-10 w-10 rounded-full bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center flex-shrink-0 text-[var(--brand-soft-text)] font-bold text-sm">
                  {contact.name.charAt(0)}
                </div>
                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{contact.name}</h4>
                    {lastMsg && (
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                        {format(new Date(lastMsg.timestamp), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {lastMsg ? lastMsg.content : 'Nenhuma mensagem'}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col bg-[var(--bg-surface)]">
        {selectedUser ? (
          <>
            {/* Cabeçalho do chat */}
            <div className="h-16 border-b border-[var(--border-color)] px-6 flex items-center justify-between bg-[var(--bg-surface-2)]">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand-soft-text)] mr-3 font-bold text-sm">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{selectedUser.name}</h3>
                  <p className="text-[11px] text-[var(--brand-text)] font-bold flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-accent)] mr-1.5"></span>
                    Online
                  </p>
                </div>
              </div>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-sunken)] flex flex-col space-y-4 custom-scrollbar">
              {conversation.map((msg, index) => {
                const isMine = msg.senderId === currentUserId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.2) }}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`${
                      isMine
                        ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-medium rounded-tr-none'
                        : 'bg-[var(--bg-surface-2)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-tl-none'
                    } rounded-2xl px-4 py-3 max-w-[70%]`}>
                      <p className="text-xs leading-relaxed font-medium">{msg.content}</p>
                      <span className={`text-[9px] mt-1 block text-right font-bold ${isMine ? 'text-[var(--text-on-brand)]/70' : 'text-[var(--text-muted)]'}`}>
                        {format(new Date(msg.timestamp), 'HH:mm')}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            <div className="p-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-color)] space-y-2">
              {error && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px] font-medium">
                  {error}
                </div>
              )}
              <div className="flex items-center space-x-3">
                <button className="p-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  disabled={sending}
                  className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                />
                <button
                  className={`p-2.5 rounded-lg transition-all flex items-center justify-center ${
                    message.trim()
                      ? 'bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-[var(--text-on-brand)]'
                      : 'bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                >
                  <Send size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-sunken)]">
            <UserIcon size={48} className="mb-4 text-[var(--text-muted)]" />
            <p className="text-[var(--text-secondary)] text-xs">Selecione um contato para iniciar uma conversa</p>
          </div>
        )}
      </div>
    </div>
  );
}
