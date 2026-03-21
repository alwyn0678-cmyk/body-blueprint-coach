import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Plus, Moon, Droplets, Footprints, Dumbbell, Apple, Smile,
  Flame, ChevronRight, X, Activity, Sparkles, RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HabitDefinition, HabitLog } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];
const last7Days = (): string[] => {
  const days = [];
  const d = new Date();
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(d); dd.setDate(d.getDate() - i);
    days.push(dd.toISOString().split('T')[0]);
  }
  return days;
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── Habit icon map ───────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  nutrition: <Apple size={14} />,
  training:  <Dumbbell size={14} />,
  sleep:     <Moon size={14} />,
  wellness:  <Activity size={14} />,
};

// ─── Habit row ────────────────────────────────────────────────────────────────

const HabitRow: React.FC<{
  habit: HabitDefinition;
  log: HabitLog | undefined;
  weekLogs: (HabitLog | undefined)[];
  weekDates: string[];
  onToggle: () => void;
  onRemove: () => void;
}> = ({ habit, log, weekLogs, weekDates, onToggle, onRemove }) => {
  const completed = log?.completed ?? false;
  const streak = useMemo(() => {
    let s = 0;
    for (let i = weekLogs.length - 1; i >= 0; i--) {
      if (weekLogs[i]?.completed) s++;
      else break;
    }
    return s;
  }, [weekLogs]);

  return (
    <motion.div
      layout
      style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px 16px', marginBottom: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Toggle */}
        <button
          onClick={onToggle}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: completed ? habit.color : 'rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.175,0.885,0.32,1.275)',
            transform: completed ? 'scale(1.05)' : 'scale(1)',
            flexShrink: 0,
          }}>
          {completed
            ? <Check size={18} color={habit.color === '#EAB308' ? '#000' : 'white'} strokeWidth={2.5} />
            : <span style={{ fontSize: 16 }}>{habit.icon}</span>}
        </button>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: completed ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 2 }}>
            {habit.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {streak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Flame size={10} color="#974400" />
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#974400' }}>{streak}d streak</span>
              </div>
            )}
            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
              {habit.category}
            </span>
          </div>
        </div>

        {/* Week dots */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {weekDates.map((date, i) => {
            const isToday = date === todayStr();
            const done = weekLogs[i]?.completed;
            return (
              <div key={date} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: done ? habit.color : isToday ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.05)',
                border: isToday && !done ? '1px solid rgba(0,0,0,0.20)' : 'none',
                transition: 'background 0.2s',
              }} />
            );
          })}
        </div>

        {/* Remove */}
        <button onClick={onRemove} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-tertiary)', borderRadius: 6, display: 'flex', alignItems: 'center' }}>
          <X size={13} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Health log section ───────────────────────────────────────────────────────

const HealthMetricsCard: React.FC = () => {
  const { state, updateHealthMetrics } = useApp();
  const dateStr = todayStr();
  const health = state.logs[dateStr]?.health ?? {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    sleepDurationMinutes: health.sleepDurationMinutes ?? 0,
    sleepScore: health.sleepScore ?? 0,
    recoveryScore: health.recoveryScore ?? 0,
    hrv: health.hrv ?? 0,
    restingHR: health.restingHR ?? 0,
    stressLevel: health.stressLevel ?? 0,
    mood: health.mood ?? 0,
  });

  const handleSave = () => {
    updateHealthMetrics(dateStr, {
      sleepDurationMinutes: form.sleepDurationMinutes || undefined,
      sleepScore: form.sleepScore || undefined,
      recoveryScore: form.recoveryScore || undefined,
      hrv: form.hrv || undefined,
      restingHR: form.restingHR || undefined,
      stressLevel: form.stressLevel || undefined,
      mood: form.mood || undefined,
    });
    setEditing(false);
  };

  const metrics = [
    { key: 'sleepDurationMinutes', label: 'Sleep', value: health.sleepDurationMinutes ? `${Math.floor(health.sleepDurationMinutes / 60)}h ${health.sleepDurationMinutes % 60}m` : '—', icon: <Moon size={13} color="#576038" />, color: '#576038', inputType: 'number', placeholder: 'mins (e.g. 450)', suffix: 'min' },
    { key: 'sleepScore', label: 'Sleep score', value: health.sleepScore ? `${health.sleepScore}/100` : '—', icon: <Moon size={13} color="#8B9467" />, color: '#8B9467', inputType: 'number', placeholder: '0–100', suffix: '/100' },
    { key: 'recoveryScore', label: 'Recovery', value: health.recoveryScore ? `${health.recoveryScore}/100` : '—', icon: <Activity size={13} color="#576038" />, color: '#576038', inputType: 'number', placeholder: '0–100', suffix: '/100' },
    { key: 'hrv', label: 'HRV', value: health.hrv ? `${health.hrv}ms` : '—', icon: <Activity size={13} color="#8B9467" />, color: '#8B9467', inputType: 'number', placeholder: 'ms', suffix: 'ms' },
    { key: 'restingHR', label: 'Resting HR', value: health.restingHR ? `${health.restingHR} bpm` : '—', icon: <Activity size={13} color="#EF4444" />, color: '#EF4444', inputType: 'number', placeholder: 'bpm', suffix: 'bpm' },
    { key: 'stressLevel', label: 'Stress', value: health.stressLevel ? `${health.stressLevel}/10` : '—', icon: <Smile size={13} color="#974400" />, color: '#974400', inputType: 'number', placeholder: '1–10', suffix: '/10' },
    { key: 'mood', label: 'Mood', value: health.mood ? `${health.mood}/5` : '—', icon: <Smile size={13} color="#8B9467" />, color: '#8B9467', inputType: 'number', placeholder: '1–5', suffix: '/5' },
  ];

  return (
    <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Today's Health Metrics</div>
        <button onClick={() => setEditing(e => !e)}
          style={{ border: 'none', padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, color: editing ? '#EF4444' : '#576038', cursor: 'pointer', background: editing ? 'rgba(239,68,68,0.1)' : 'rgba(87,96,56,0.10)' } as any}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {!editing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {metrics.slice(0, 6).map(m => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {m.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{m.label}</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: (health as any)[m.key] ? m.color : 'var(--text-tertiary)' }}>{m.value}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {metrics.map(m => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 80, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{m.label}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" inputMode="decimal"
                  value={(form as any)[m.key] || ''}
                  onChange={e => setForm(f => ({ ...f, [m.key]: parseFloat(e.target.value) || 0 }))}
                  placeholder={m.placeholder}
                  className="input-field"
                  style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, padding: '8px 12px', textAlign: 'right' }}
                />
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', width: 30 }}>{m.suffix}</span>
              </div>
            </div>
          ))}
          <button className="btn btn-primary" style={{ marginTop: 4, width: '100%' }} onClick={handleSave}>Save metrics</button>
        </div>
      )}
    </div>
  );
};

// ─── Habits page ──────────────────────────────────────────────────────────────

export const Habits: React.FC = () => {
  const { state, logHabit, removeHabitDefinition, addHabitDefinition } = useApp();
  const dateStr = todayStr();
  const weekDates = useMemo(() => last7Days(), []);

  const todayHabits = state.logs[dateStr]?.habits ?? {};
  const completedToday = state.habitDefinitions.filter(h => todayHabits[h.id]?.completed).length;
  const total = state.habitDefinitions.length;
  const streakScore = total > 0 ? Math.round((completedToday / total) * 100) : 0;

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<'nutrition' | 'training' | 'sleep' | 'wellness'>('wellness');

  const AFFIRMATIONS = [
    "I am stronger than yesterday and building the body I deserve.",
    "Every rep, every meal, every choice is shaping the best version of me.",
    "I show up consistently because I respect my goals.",
    "My body is capable of incredible things when I fuel it right.",
    "Progress over perfection — I celebrate every step forward.",
    "I am disciplined, focused, and unstoppable.",
    "My commitment to health is the greatest investment I make daily.",
    "I trust the process and embrace the journey.",
    "Every workout is a promise kept to myself.",
    "I choose strength, I choose health, I choose me.",
  ];

  const todayAffirmationIdx = useMemo(() => {
    const day = new Date().getDay();
    return day % AFFIRMATIONS.length;
  }, []);

  const [affirmationIdx, setAffirmationIdx] = useState(todayAffirmationIdx);
  const [affirmationDone, setAffirmationDone] = useState(() => {
    return localStorage.getItem('evolved_affirmation_' + new Date().toISOString().split('T')[0]) === 'true';
  });

  const handleToggle = (habit: HabitDefinition) => {
    const current = todayHabits[habit.id];
    logHabit(dateStr, habit.id, {
      habitId: habit.id,
      completed: !current?.completed,
      timestamp: new Date().toISOString(),
    });
  };

  const handleAddHabit = () => {
    if (!newName.trim()) return;
    addHabitDefinition({
      id: `h_custom_${Date.now()}`,
      name: newName.trim(),
      icon: '✓',
      color: '#576038',
      category: newCat,
    });
    setNewName('');
    setShowAdd(false);
  };

  return (
    <div className="page page-top-pad safe-bottom" style={{ gap: 14 }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="page-header" style={{ paddingBottom: 6 }}>
          <div>
            <div className="page-title">Habits</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Daily wellness rituals
            </div>
          </div>
          <button onClick={() => setShowAdd(s => !s)} className="btn-icon" style={{ width: 36, height: 36 }}>
            <Plus size={16} />
          </button>
        </div>
      </motion.div>

      {/* ── Today's progress ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <div style={{ borderRadius: 20, background: streakScore >= 80 ? 'linear-gradient(135deg, rgba(87,96,56,0.10) 0%, rgba(194,203,154,0.06) 100%)' : 'var(--bg-card)', border: `1px solid ${streakScore >= 80 ? 'rgba(87,96,56,0.25)' : 'var(--border-color)'}`, padding: '18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Today</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em', color: streakScore >= 80 ? '#576038' : 'var(--text-primary)' }}>
                {completedToday}/{total}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>habits complete</div>
            </div>
            <div style={{ width: 72, height: 72, position: 'relative' }}>
              <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={36} cy={36} r={30} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={6} />
                <circle cx={36} cy={36} r={30} fill="none"
                  stroke={streakScore >= 80 ? '#576038' : streakScore >= 50 ? '#974400' : '#576038'}
                  strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 30}
                  strokeDashoffset={2 * Math.PI * 30 * (1 - streakScore / 100)}
                  style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.25,1,0.5,1)' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>
                {streakScore}%
              </div>
            </div>
          </div>
          {/* Week summary dots */}
          <div style={{ display: 'flex', gap: 4 }}>
            {weekDates.map((date, i) => {
              const dayHabits = state.logs[date]?.habits ?? {};
              const dayDone = state.habitDefinitions.filter(h => dayHabits[h.id]?.completed).length;
              const dayPct = total > 0 ? dayDone / total : 0;
              const isToday = date === dateStr;
              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ height: 28, width: '100%', borderRadius: 6, background: dayPct >= 0.8 ? '#576038' : dayPct >= 0.5 ? '#974400' : 'rgba(0,0,0,0.05)', border: isToday ? '1px solid rgba(0,0,0,0.13)' : 'none', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${dayPct * 100}%`, background: dayPct >= 0.8 ? '#576038' : dayPct >= 0.5 ? '#974400' : '#576038', opacity: 0.5 }} />
                  </div>
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: isToday ? 'var(--text-secondary)' : 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {['M','T','W','T','F','S','S'][new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Daily Affirmation */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div style={{
          margin: '0 0 20px 0',
          background: 'linear-gradient(135deg, rgba(87,96,56,0.10) 0%, rgba(194,203,154,0.08) 100%)',
          border: `1px solid ${affirmationDone ? 'rgba(87,96,56,0.30)' : 'rgba(87,96,56,0.20)'}`,
          borderRadius: 20, padding: '16px',
          transition: 'all 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} color={affirmationDone ? '#576038' : '#8B9467'} />
              <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: affirmationDone ? '#576038' : 'rgba(87,96,56,0.8)' }}>
                Daily Affirmation
              </span>
            </div>
            <button
              onClick={() => setAffirmationIdx(i => (i + 1) % AFFIRMATIONS.length)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.5 }}
            >
              <RefreshCw size={13} color="rgba(0,0,0,0.35)" />
            </button>
          </div>
          <p style={{
            fontSize: '0.95rem', fontWeight: 600, color: affirmationDone ? 'rgba(0,0,0,0.35)' : 'var(--text-primary)',
            lineHeight: 1.5, margin: '0 0 14px 0',
            fontStyle: 'italic',
            textDecoration: affirmationDone ? 'line-through' : 'none',
            transition: 'all 0.3s',
          }}>
            "{AFFIRMATIONS[affirmationIdx]}"
          </p>
          <button
            onClick={() => {
              const newVal = !affirmationDone;
              setAffirmationDone(newVal);
              localStorage.setItem('evolved_affirmation_' + new Date().toISOString().split('T')[0], String(newVal));
            }}
            style={{
              width: '100%', padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: affirmationDone ? 'rgba(87,96,56,0.12)' : 'rgba(87,96,56,0.12)',
              color: affirmationDone ? '#576038' : 'rgba(87,96,56,0.9)',
              fontWeight: 800, fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.2s',
            }}
          >
            {affirmationDone ? <><Check size={14} /> Affirmed today</> : <><Sparkles size={14} /> Mark as affirmed</>}
          </button>
        </div>
      </motion.div>

      {/* ── Add habit form ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-default)', padding: '16px', overflow: 'hidden' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 10 }}>Add custom habit</div>
            <input
              className="input-field" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Take supplements" style={{ marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['nutrition', 'training', 'sleep', 'wellness'] as const).map(cat => (
                <button key={cat} onClick={() => setNewCat(cat)}
                  style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', fontSize: '0.62rem', fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer', background: newCat === cat ? '#576038' : 'rgba(0,0,0,0.05)', color: newCat === cat ? 'white' : 'var(--text-tertiary)' }}>
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleAddHabit}>Add habit</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Habit list ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="section-label">Daily habits</div>
        {state.habitDefinitions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-title">No habits yet</div>
            <div className="empty-state-body">Tap + to add your first daily habit to track.</div>
          </div>
        ) : (
          <AnimatePresence>
            {state.habitDefinitions.map(habit => (
              <HabitRow
                key={habit.id}
                habit={habit}
                log={todayHabits[habit.id]}
                weekLogs={weekDates.map(date => state.logs[date]?.habits?.[habit.id])}
                weekDates={weekDates}
                onToggle={() => handleToggle(habit)}
                onRemove={() => removeHabitDefinition(habit.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* ── Health metrics ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <div className="section-label">Recovery & health</div>
        <HealthMetricsCard />
      </motion.div>
    </div>
  );
};
