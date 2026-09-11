import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, X } from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
  isSameDay, isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  type: string;
}

const EVENT_TYPE_CLASSES: Record<string, string> = {
  meeting: 'bg-sky-100 border-sky-200 text-sky-800',
  task: 'bg-[var(--brand-soft)] border-[var(--brand-soft-border)] text-[var(--brand-soft-text)]',
  reminder: 'bg-amber-100 border-amber-200 text-amber-800',
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'Reunião de Alinhamento',
      date: new Date(),
      time: '14:00',
      type: 'meeting'
    }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', type: 'meeting' });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;

    // Parse the local date correctly
    const [year, month, day] = newEvent.date.split('-');
    const eventDate = new Date(Number(year), Number(month) - 1, Number(day));

    setEvents([
      ...events,
      {
        id: Date.now().toString(),
        title: newEvent.title,
        date: eventDate,
        time: newEvent.time,
        type: newEvent.type
      }
    ]);
    setIsModalOpen(false);
    setNewEvent({ title: '', date: format(currentDate, 'yyyy-MM-dd'), time: '09:00', type: 'meeting' });
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col relative space-y-6 pb-12 font-sans select-none">
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">Calendário Operacional</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Acompanhe prazos, reuniões e compromissos da Gran7.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={16} strokeWidth={3} className="mr-1.5" />
            Nova Agenda
          </Button>
          <div className="h-6 w-px bg-[var(--border-color)] hidden sm:block"></div>
          <Button variant="secondary" onClick={goToToday}>
            Hoje
          </Button>
          <div className="flex items-center text-[var(--text-primary)] font-bold capitalize bg-[var(--bg-surface-2)] border border-[var(--border-color)] px-2 py-1 rounded-lg text-xs">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--border-color)] text-[var(--brand-text)] transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="w-32 text-center text-[var(--text-primary)]">
              {format(currentDate, dateFormat, { locale: ptBR })}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--border-color)] text-[var(--brand-text)] transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </Card>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-surface-2)]">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="px-4 py-3 text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider border-r border-[var(--border-color)] last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 bg-[var(--border-color)] gap-px auto-rows-fr">
          {days.map((day, i) => {
            const isTodayDate = isToday(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const dayEvents = events.filter(e => isSameDay(e.date, day));

            return (
              <motion.div
                key={day.toString()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.01, 0.25) }}
                className={`bg-[var(--bg-surface)] p-2 min-h-[110px] hover:bg-[var(--brand-row-hover)] transition-colors flex flex-col cursor-pointer
                  ${!isCurrentMonth ? 'opacity-40 bg-[var(--bg-sunken)]' : ''}
                  ${isTodayDate ? 'bg-[var(--brand-soft)] ring-1 ring-inset ring-[var(--brand-accent)]/50' : ''}
                `}
                onClick={() => {
                  setNewEvent({ ...newEvent, date: format(day, 'yyyy-MM-dd') });
                  setIsModalOpen(true);
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                    ${isTodayDate ? 'bg-[var(--brand-accent)] text-[var(--text-on-brand)] font-black' : 'text-[var(--text-secondary)]'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className={`text-[11px] px-2 py-1 rounded-lg truncate flex items-center font-bold border ${EVENT_TYPE_CLASSES[event.type] || EVENT_TYPE_CLASSES.meeting}`}
                      title={event.title}
                    >
                      <Clock size={10} className="mr-1 flex-shrink-0" />
                      <span className="truncate">{event.time} - {event.title}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-surface-2)]">
              <h2 className="text-lg font-black text-[var(--text-primary)]">Nova Agenda</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="new-event-form" onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Título do Compromisso *</label>
                  <input
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="Ex: Reunião de alinhamento"
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Data *</label>
                    <input
                      type="date"
                      required
                      value={newEvent.date}
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Horário *</label>
                    <input
                      type="time"
                      required
                      value={newEvent.time}
                      onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Tipo</label>
                  <select
                    value={newEvent.type}
                    onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/40 focus:border-[var(--brand-accent)] text-sm font-medium"
                  >
                    <option value="meeting">Reunião</option>
                    <option value="task">Tarefa</option>
                    <option value="reminder">Lembrete</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-color)] flex justify-end space-x-3">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="new-event-form">
                Salvar Agenda
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
