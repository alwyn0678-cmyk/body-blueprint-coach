import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Dumbbell, Droplets, Footprints, TrendingUp,
  Brain, Activity, RefreshCw, Sparkles, Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateStreak, computeWeeklyStats, calculateWeightTrend,
} from '../utils/aiCoachingEngine';
import { coachService } from '../services/aiCoach';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];

const fmtNum = (n: number, dp = 0): string =>
  n.toLocaleString('en-AU', { maximumFractionDigits: dp, minimumFractionDigits: dp });

// ─── Evolved Ring ────────────────────────────────────────────────────────────

const EvolvedRing: React.FC<{ score: number }> = ({ score }) => {
  const R = 120;
  const circ = 2 * Math.PI * R;
  const pct = Math.min(score / 100, 1);
  const offset = circ * (1 - pct);

  return (
    <div style={{ position: 'relative', width: 264, height: 264, margin: '0 auto' }}>
      <svg width="264" height="264" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx="132" cy="132" r={R} fill="transparent" stroke="#E3E2E0" strokeWidth="11" />
        {/* Progress */}
        <circle
          cx="132" cy="132" r={R} fill="transparent"
          stroke="#C2CB9A" strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.25,1,0.5,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontSize: '4.5rem', fontWeight: 800,
          letterSpacing: '-0.04em', lineHeight: 1,
          color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
        }}>
          {score}
        </div>
        <div style={{
          fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'var(--text-tertiary)', marginTop: 6,
        }}>
          Daily Evolved
        </div>
      </div>
    </div>
  );
};

// ─── Log Sheet ────────────────────────────────────────────────────────────────

const LogSheet: React.FC<{
  type: 'water' | 'steps' | 'weight';
  currentValue: number;
  unit: string;
  onSave: (v: number) => void;
  onClose: () => void;
}> = ({ type, currentValue, unit, onSave, onClose }) => {
  const [val, setVal] = useState(String(currentValue || ''));
  const labels: Record<string, string> = { water: 'Glasses of water', steps: 'Steps today', weight: 'Body weight' };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        style={{
          position: 'relative', background: 'var(--bg-sheet)',
          borderRadius: '32px 32px 0 0', padding: '24px 20px',
          paddingBottom: 'calc(28px + env(safe-area-inset-bottom))',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-strong)', margin: '0 auto 20px' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16 }}>{labels[type]}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            className="input-field" type="number" inputMode="decimal"
            value={val} onChange={e => setVal(e.target.value)}
            placeholder="0"
            style={{ flex: 1, fontSize: '1.6rem', fontWeight: 900, textAlign: 'center', padding: '14px' }}
            autoFocus
          />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-tertiary)', minWidth: 60 }}>{unit}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => { const n = parseFloat(val); if (isFinite(n) && n >= 0) onSave(n); }}>
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Affirmations ─────────────────────────────────────────────────────────────

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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { state, updateDailyLog, updateWeight, getNutritionTotals, showToast } = useApp();
  const navigate = useNavigate();
  const [activeSheet, setActiveSheet] = useState<'water' | 'steps' | 'weight' | null>(null);
  const [affirmationIdx, setAffirmationIdx] = useState(() => new Date().getDay() % AFFIRMATIONS.length);

  const dateStr = todayStr();
  const log = state.logs[dateStr];
  const user = state.user!;

  const totals = useMemo(() => getNutritionTotals(dateStr), [state.logs, dateStr]);
  const streak = useMemo(() => calculateStreak(state.logs), [state.logs]);
  const weeklyStats = useMemo(() => computeWeeklyStats(state.logs, user.targets), [state.logs, user.targets]);

  const weightDelta = useMemo(() => {
    const trend = calculateWeightTrend(state.logs, user.weight).filter(d => d.trend !== null);
    if (trend.length < 7) return 0;
    const latest = trend[trend.length - 1].trend!;
    const week = trend[Math.max(0, trend.length - 8)].trend!;
    return parseFloat((latest - week).toFixed(2));
  }, [state.logs, user.weight]);

  const coachInsight = useMemo(() => coachService.getDailyInsight({
    user, todayLog: log, weeklyStats,
    recentWorkouts: Object.values(state.logs).flatMap(l => l.workouts)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3),
    weightTrend: weightDelta < -0.1 ? 'losing' : weightDelta > 0.1 ? 'gaining' : 'maintaining',
    weightDelta7d: weightDelta,
  }), [user, weeklyStats, log, state.logs, weightDelta]);

  const recentWorkouts = useMemo(() =>
    Object.entries(state.logs)
      .flatMap(([date, log]) => log.workouts.map(w => ({ ...w, date })))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 3)
  , [state.logs]);

  const steps = log?.steps ?? 0;
  const water = log?.waterGlasses ?? 0;
  const stepsTarget = user.stepsTarget ?? 8000;
  const units = state.settings.units;

  // Evolved score: weighted average of adherence metrics (0–100)
  const evolvedScore = useMemo(() => {
    const calAdherence = Math.min(totals.calories / Math.max(user.targets.calories, 1), 1);
    const proAdherence = Math.min(totals.protein / Math.max(user.targets.protein, 1), 1);
    const stepsAdherence = Math.min(steps / Math.max(stepsTarget, 1), 1);
    const trained = (log?.workouts?.length ?? 0) > 0 ? 1 : 0;
    return Math.round(calAdherence * 25 + proAdherence * 25 + stepsAdherence * 25 + trained * 25);
  }, [totals, user.targets, steps, stepsTarget, log]);

  const handleSave = (type: 'water' | 'steps' | 'weight') => (value: number) => {
    if (type === 'weight') {
      updateWeight(value, dateStr);
      showToast(`Weight logged: ${value}${units === 'imperial' ? ' lbs' : ' kg'}`, 'success');
    } else {
      updateDailyLog(dateStr, { [type === 'water' ? 'waterGlasses' : 'steps']: value });
      showToast(`${type === 'water' ? 'Water' : 'Steps'} updated`, 'success');
    }
    setActiveSheet(null);
  };

  const caloriesRemaining = Math.max(user.targets.calories - totals.calories, 0);
  const caloriesOver = totals.calories > user.targets.calories;
  const stepsPercent = Math.round(Math.min((steps / stepsTarget) * 100, 100));
  const workoutMinutesToday = (log?.workouts ?? []).reduce((acc, w) => acc + (w.durationMinutes ?? 0), 0);

  return (
    <>
      {/* ── Page ── */}
      <div style={{
        minHeight: '100dvh',
        background: 'var(--bg-primary)',
        paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))',
        paddingLeft: 24, paddingRight: 24,
      }}>

        {/* ── Evolved Ring Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ paddingTop: 32, paddingBottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <EvolvedRing score={evolvedScore} />

          {/* Streaks below ring */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {streak > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 9999,
                background: '#F4F3F1', fontSize: '0.75rem', fontWeight: 700, color: '#576038',
              }}>
                <Flame size={13} color="#974400" />
                {streak} day streak
              </div>
            )}
            <div style={{
              padding: '6px 14px', borderRadius: 9999,
              background: '#F4F3F1', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(86,67,56,0.55)',
            }}>
              Goal: 100
            </div>
          </div>
        </motion.section>

        {/* ── Bento Stats Grid ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
          style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
        >
          {/* Calories — full width, terracotta */}
          <div
            onClick={() => navigate('/log')}
            style={{
              gridColumn: '1 / -1', borderRadius: 24, padding: '22px 22px',
              background: '#FC9A77', position: 'relative', overflow: 'hidden', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
              boxShadow: '0 12px 40px rgba(149,72,43,0.12)',
            }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(118,48,21,0.7)', marginBottom: 4 }}>Calories</div>
              <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#763015', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {fmtNum(Math.round(totals.calories))}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'rgba(118,48,21,0.65)', marginTop: 4 }}>
                {caloriesOver ? `${fmtNum(Math.round(totals.calories - user.targets.calories))} kcal over` : `${fmtNum(caloriesRemaining)} kcal remaining`}
              </div>
            </div>
            <Flame size={80} style={{ color: 'rgba(118,48,21,0.08)', position: 'absolute', right: -8, top: -8 }} />
          </div>

          {/* Protein */}
          <div style={{ borderRadius: 24, padding: '20px', background: '#FFFFFF', boxShadow: '0 12px 40px rgba(26,28,26,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Dumbbell size={20} style={{ color: '#576038' }} strokeWidth={1.8} />
              <span style={{ fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(86,67,56,0.5)' }}>Protein</span>
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(totals.protein)}<span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-tertiary)', marginLeft: 3 }}>g</span>
              </div>
              <div style={{ marginTop: 8, height: 5, borderRadius: 999, background: '#E3E2E0', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 999, background: '#576038', width: `${Math.min((totals.protein / user.targets.protein) * 100, 100)}%`, transition: 'width 0.7s ease' }} />
              </div>
            </div>
          </div>

          {/* Exercise */}
          <div style={{ borderRadius: 24, padding: '20px', background: '#FFFFFF', boxShadow: '0 12px 40px rgba(26,28,26,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Activity size={20} style={{ color: '#576038' }} strokeWidth={1.8} />
              <span style={{ fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(86,67,56,0.5)' }}>Exercise</span>
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {workoutMinutesToday > 0 ? workoutMinutesToday : '--'}<span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-tertiary)', marginLeft: 3 }}>{workoutMinutesToday > 0 ? 'min' : ''}</span>
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#576038', marginTop: 4 }}>
                {weeklyStats.workoutsCompleted}/{user.trainingFrequency} this week
              </div>
            </div>
          </div>

          {/* Steps — full width */}
          <div
            onClick={() => setActiveSheet('steps')}
            style={{
              gridColumn: '1 / -1', borderRadius: 24, padding: '18px 22px',
              background: '#FFFFFF', boxShadow: '0 12px 40px rgba(26,28,26,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DEE8B4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Footprints size={22} style={{ color: '#576038' }} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtNum(steps)}
                </div>
                <div style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(86,67,56,0.5)', marginTop: 2 }}>Steps Walked</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(86,67,56,0.5)' }}>
                Goal {fmtNum(stepsTarget)}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#576038', marginTop: 2 }}>{stepsPercent}%</div>
            </div>
          </div>

          {/* Water */}
          {([
            { key: 'water' as const, Icon: Droplets, label: 'Water', value: water, unit: 'gl' },
            { key: 'weight' as const, Icon: TrendingUp, label: 'Weight', value: log?.weight ?? user.weight, unit: units === 'imperial' ? 'lbs' : 'kg' },
          ]).map(({ key, Icon, label, value, unit }) => (
            <div key={key} onClick={() => setActiveSheet(key)}
              style={{ borderRadius: 24, padding: '18px 20px', background: '#F4F3F1', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} style={{ color: '#576038' }} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {value}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', marginLeft: 3 }}>{unit}</span>
                </div>
                <div style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(86,67,56,0.5)' }}>{label}</div>
              </div>
            </div>
          ))}
        </motion.section>

        {/* ── Today's Training ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          style={{ marginTop: 36 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#576038' }}>Strength Training</h2>
            <button onClick={() => navigate('/training')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(86,67,56,0.5)' }}>
              Open
            </button>
          </div>
          <div
            onClick={() => navigate('/training')}
            style={{
              borderRadius: 24, padding: '20px 22px',
              background: '#FFFFFF', boxShadow: '0 12px 40px rgba(26,28,26,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', border: '1px solid rgba(87,96,56,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, rgba(87,96,56,0.12), rgba(87,96,56,0.05))', border: '1px solid rgba(87,96,56,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Dumbbell size={22} style={{ color: '#576038' }} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {workoutMinutesToday > 0 ? 'Session Complete' : "Today's Session"}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(87,96,56,0.65)', fontWeight: 600, marginTop: 2 }}>
                  {workoutMinutesToday > 0
                    ? `${workoutMinutesToday} min · ${(log?.workouts ?? []).length} workout${(log?.workouts ?? []).length !== 1 ? 's' : ''} logged`
                    : weeklyStats.workoutsCompleted + '/' + user.trainingFrequency + ' sessions this week'}
                </div>
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); navigate('/training'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 16px', borderRadius: 99,
                background: workoutMinutesToday > 0 ? 'rgba(87,96,56,0.08)' : '#576038',
                border: 'none', cursor: 'pointer',
                color: workoutMinutesToday > 0 ? '#576038' : '#FCFFE2',
                fontSize: '0.78rem', fontWeight: 800, flexShrink: 0,
              }}
            >
              <Zap size={13} fill="currentColor" />
              {workoutMinutesToday > 0 ? 'Log More' : 'Start'}
            </button>
          </div>
        </motion.section>

        {/* ── Daily Affirmation ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}
          style={{ marginTop: 16 }}
        >
          <div style={{
            borderRadius: 24, padding: '20px 22px',
            background: 'linear-gradient(135deg, rgba(87,96,56,0.06) 0%, rgba(194,203,154,0.05) 100%)',
            border: '1px solid rgba(87,96,56,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={13} color="#8B9467" />
                <span style={{ fontSize: '0.58rem', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(87,96,56,0.65)' }}>
                  Daily Affirmation
                </span>
              </div>
              <button
                onClick={() => setAffirmationIdx(i => (i + 1) % AFFIRMATIONS.length)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.5 }}
              >
                <RefreshCw size={13} color="rgba(0,0,0,0.40)" />
              </button>
            </div>
            <p style={{
              fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)',
              lineHeight: 1.55, margin: 0, fontStyle: 'italic',
            }}>
              "{AFFIRMATIONS[affirmationIdx]}"
            </p>
          </div>
        </motion.section>

        {/* ── Coach Insight ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}
          style={{ marginTop: 36 }}
          onClick={() => navigate('/coach')}
        >
          <div style={{
            borderRadius: 24, padding: '28px 24px',
            background: '#576038', position: 'relative', overflow: 'hidden',
            cursor: 'pointer',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(255,255,255,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <Brain size={32} style={{ color: '#C2CB9A', marginBottom: 12 }} strokeWidth={1.5} />
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FCFFE2', letterSpacing: '-0.02em', lineHeight: 1.35, fontStyle: 'italic', marginBottom: 16 }}>
                "{coachInsight.title}"
              </div>
              <div style={{ height: 1.5, width: 40, background: '#C2CB9A', borderRadius: 999, margin: '0 auto 12px' }} />
              <div style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C2CB9A' }}>
                Daily Insight · Tap to open
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Recent Activity ── */}
        {recentWorkouts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}
            style={{ marginTop: 36 }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#576038', marginBottom: 16 }}>
              Recent Activity
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentWorkouts.map((w, i) => (
                <div
                  key={i}
                  onClick={() => navigate('/training')}
                  style={{
                    borderRadius: 20, padding: '16px 18px',
                    background: '#F4F3F1',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Dumbbell size={18} style={{ color: '#576038' }} strokeWidth={1.8} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{w.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {new Date(w.date).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{w.durationMinutes ?? '--'}m</div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#576038', marginTop: 2 }}>
                      {w.exercises.length} ex
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

      </div>

      {/* ── Log Sheets ── */}
      <AnimatePresence>
        {activeSheet === 'water' && (
          <LogSheet type="water" currentValue={water} unit="glasses"
            onSave={handleSave('water')} onClose={() => setActiveSheet(null)} />
        )}
        {activeSheet === 'steps' && (
          <LogSheet type="steps" currentValue={steps} unit="steps"
            onSave={handleSave('steps')} onClose={() => setActiveSheet(null)} />
        )}
        {activeSheet === 'weight' && (
          <LogSheet type="weight" currentValue={log?.weight ?? user.weight} unit={units === 'imperial' ? 'lbs' : 'kg'}
            onSave={handleSave('weight')} onClose={() => setActiveSheet(null)} />
        )}
      </AnimatePresence>
    </>
  );
};
