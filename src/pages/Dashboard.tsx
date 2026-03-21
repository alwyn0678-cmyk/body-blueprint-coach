import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Dumbbell, Droplets, Footprints, TrendingUp, TrendingDown,
  Minus, ChevronRight, Brain, Zap, Target, Activity, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateWeightTrend, calculateStreak, computeWeeklyStats,
  calculateWorkoutStreak, computeEarnedBadges, getWeeklyWorkoutNudge, computeConsistencyScore,
  detectPlateau, detectTrainingStall, computeRecoveryInsight,
} from '../utils/aiCoachingEngine';
import { coachService } from '../services/aiCoach';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];

const getGreeting = (name: string): string => {
  const h = new Date().getHours();
  const part = h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
  return `Good ${part}`;
};

const fmtNum = (n: number, dp = 0): string =>
  n.toLocaleString('en-AU', { maximumFractionDigits: dp, minimumFractionDigits: dp });

// ─── Calorie Arc SVG ──────────────────────────────────────────────────────────

const CalorieArc: React.FC<{
  calories: number; target: number;
  protein: number; proteinTarget: number;
  carbs: number; carbsTarget: number;
  fats: number; fatsTarget: number;
}> = ({ calories, target, protein, proteinTarget, carbs, carbsTarget, fats, fatsTarget }) => {
  const R = 58;
  const circ = 2 * Math.PI * R;
  const calPct = Math.min(calories / Math.max(target, 1), 1);
  const calOffset = circ * (1 - calPct);
  const over = calories > target;
  const remaining = Math.max(target - calories, 0);

  // Inner ring: 3 equal segments (protein / carbs / fats), each 120° of arc
  const innerR = 44;
  const innerCirc = 2 * Math.PI * innerR;
  const oneThird = innerCirc / 3;
  const proPct = Math.min(protein / Math.max(proteinTarget, 1), 1);
  const carPct = Math.min(carbs / Math.max(carbsTarget, 1), 1);
  const fatPct = Math.min(fats / Math.max(fatsTarget, 1), 1);

  return (
    <div style={{ position: 'relative', width: 152, height: 152, flexShrink: 0 }}>
      <svg width={152} height={152} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        {/* Outer calorie track */}
        <circle cx={76} cy={76} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={9} />
        {/* Outer calorie fill */}
        <circle cx={76} cy={76} r={R} fill="none" stroke={over ? '#EF4444' : '#22C55E'}
          strokeWidth={9} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={calOffset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.25,1,0.5,1), stroke 0.3s ease', filter: over ? 'drop-shadow(0 0 6px #EF4444)' : 'drop-shadow(0 0 6px #22C55E)' }} />

        {/* Inner macro ring track */}
        <circle cx={76} cy={76} r={innerR} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={7} />

        {/* Protein segment — first 120° (top third) */}
        <circle cx={76} cy={76} r={innerR} fill="none" stroke="#F59E0B"
          strokeWidth={7} strokeLinecap="butt"
          strokeDasharray={`${proPct * oneThird} ${innerCirc}`}
          style={{
            transform: 'rotate(0deg)', transformOrigin: '76px 76px',
            transition: 'stroke-dasharray 1s cubic-bezier(0.25,1,0.5,1)',
            filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))',
          }} />

        {/* Carbs segment — second 120° (right third) */}
        <circle cx={76} cy={76} r={innerR} fill="none" stroke="#3B82F6"
          strokeWidth={7} strokeLinecap="butt"
          strokeDasharray={`${carPct * oneThird} ${innerCirc}`}
          style={{
            transform: 'rotate(120deg)', transformOrigin: '76px 76px',
            transition: 'stroke-dasharray 1s cubic-bezier(0.25,1,0.5,1)',
            filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.5))',
          }} />

        {/* Fats segment — third 120° (left third) */}
        <circle cx={76} cy={76} r={innerR} fill="none" stroke="#22C55E"
          strokeWidth={7} strokeLinecap="butt"
          strokeDasharray={`${fatPct * oneThird} ${innerCirc}`}
          style={{
            transform: 'rotate(240deg)', transformOrigin: '76px 76px',
            transition: 'stroke-dasharray 1s cubic-bezier(0.25,1,0.5,1)',
            filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.4))',
          }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: over ? '#EF4444' : 'var(--text-primary)' }}>
          {fmtNum(calories)}
        </div>
        <div style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
          {over ? `+${fmtNum(calories - target)} over` : `${fmtNum(remaining)} left`}
        </div>
        <div style={{ fontSize: '0.52rem', fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 2 }}>
          / {fmtNum(target)} kcal
        </div>
      </div>
    </div>
  );
};

// ─── Macro stat bar ───────────────────────────────────────────────────────────

const MacroBar: React.FC<{ label: string; value: number; target: number; color: string }> = ({ label, value, target, color }) => {
  const pct = Math.min((value / Math.max(target, 1)) * 100, 100);
  const over = value > target;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: over ? '#EF4444' : color }}>
          {fmtNum(value)}<span style={{ fontSize: '0.58rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>/{target}g</span>
        </span>
      </div>
      <div className="progress-track" style={{ height: 5 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: over ? '#EF4444' : color, boxShadow: `0 0 6px ${color}60` }} />
      </div>
    </div>
  );
};

// ─── Log sheet ────────────────────────────────────────────────────────────────

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
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        style={{ position: 'relative', background: 'var(--bg-sheet)', borderRadius: '28px 28px 0 0', padding: '24px 20px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))', border: '1px solid var(--border-default)', borderBottom: 'none', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '0 auto 20px' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 16 }}>{labels[type]}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            className="input-field" type="number" inputMode="decimal"
            value={val} onChange={e => setVal(e.target.value)}
            placeholder="0"
            style={{ flex: 1, fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', textAlign: 'center', padding: '14px' }}
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { state, updateDailyLog, updateWeight, getNutritionTotals, showToast, lastSavedAt } = useApp();
  const navigate = useNavigate();
  const [activeSheet, setActiveSheet] = useState<'water' | 'steps' | 'weight' | null>(null);

  const dateStr = todayStr();
  const log = state.logs[dateStr];
  const user = state.user!;

  const totals = useMemo(() => getNutritionTotals(dateStr), [state.logs, dateStr]);
  const streak = useMemo(() => calculateStreak(state.logs), [state.logs]);
  const workoutStreak = useMemo(() => calculateWorkoutStreak(state.logs), [state.logs]);
  const weeklyStats = useMemo(() => computeWeeklyStats(state.logs, user.targets), [state.logs, user.targets]);
  const earnedBadges = useMemo(() => computeEarnedBadges(state.logs, user), [state.logs, user]);
  const weeklyNudge = useMemo(() => getWeeklyWorkoutNudge(weeklyStats.workoutsCompleted, user.trainingFrequency), [weeklyStats.workoutsCompleted, user.trainingFrequency]);
  const consistencyScore = useMemo(() => computeConsistencyScore(weeklyStats.calorieAdherence, weeklyStats.proteinAdherence, weeklyStats.workoutsCompleted, user.trainingFrequency), [weeklyStats, user.trainingFrequency]);
  const isPlateauing = useMemo(() => user.weight ? detectPlateau(state.logs, user.weight) : false, [state.logs, user.weight]);
  const isTrainingStalled = useMemo(() => detectTrainingStall(state.logs), [state.logs]);
  const recoveryInsight = useMemo(() => computeRecoveryInsight(state.logs), [state.logs]);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  const weightTrendData = useMemo(() => {
    const data = calculateWeightTrend(state.logs, user.weight);
    return data.filter(d => d.trend !== null).slice(-14);
  }, [state.logs, user.weight]);

  const currentEma = weightTrendData[weightTrendData.length - 1]?.trend ?? null;
  const prevEma = weightTrendData.length >= 7 ? weightTrendData[Math.max(0, weightTrendData.length - 8)]?.trend ?? null : null;
  const weightDelta = currentEma !== null && prevEma !== null ? currentEma - prevEma : 0;

  const coachInsight = useMemo(() => coachService.getDailyInsight({
    user, todayLog: log, weeklyStats,
    recentWorkouts: Object.values(state.logs).flatMap(l => l.workouts)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3),
    weightTrend: weightDelta < -0.1 ? 'losing' : weightDelta > 0.1 ? 'gaining' : 'maintaining',
    weightDelta7d: weightDelta,
    currentEma: currentEma ?? undefined,
  }), [user, weeklyStats, weightDelta]);

  const recentWorkout = useMemo(() =>
    Object.values(state.logs).flatMap(l => l.workouts)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] ?? null
  , [state.logs]);

  const steps = log?.steps ?? 0;
  const water = log?.waterGlasses ?? 0;
  const stepsTarget = user.stepsTarget ?? 8000;
  const units = state.settings.units;

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

  const insightColor = coachInsight.priority === 'high' ? '#EF4444'
    : coachInsight.priority === 'medium' ? '#F59E0B' : '#6366F1';

  const savedLabel = lastSavedAt
    ? (() => {
        const diff = Math.floor((Date.now() - new Date(lastSavedAt).getTime()) / 1000);
        if (diff < 10) return 'Saved';
        if (diff < 60) return `Saved ${diff}s ago`;
        return `Saved ${Math.floor(diff / 60)}m ago`;
      })()
    : null;

  const calPct = Math.round(Math.min((totals.calories / user.targets.calories) * 100, 100));

  return (
    <div className="page page-top-pad safe-bottom" style={{ gap: 14 }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 2 }}>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 3 }}>
              {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.55rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {getGreeting(user.name)},{' '}
              <span style={{ background: 'linear-gradient(135deg, #fff 0%, rgba(165,180,252,0.8) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {user.name.split(' ')[0]}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {workoutStreak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 20 }}>
                <Dumbbell size={11} color="#3B82F6" />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3B82F6' }}>{workoutStreak}d</span>
              </div>
            )}
            {streak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 20 }}>
                <Flame size={12} color="#F59E0B" />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B' }}>{streak}d</span>
              </div>
            )}
            <button
              onClick={() => navigate('/settings')}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 900, color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
              {user.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Nutrition Hero Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07, duration: 0.4 }}
        onClick={() => navigate('/log')} style={{ cursor: 'pointer' }}
      >
        <div className="card-nutrition" style={{ padding: '18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <CalorieArc
              calories={Math.round(totals.calories)} target={user.targets.calories}
              protein={Math.round(totals.protein)} proteinTarget={user.targets.protein}
              carbs={Math.round(totals.carbs)} carbsTarget={user.targets.carbs}
              fats={Math.round(totals.fats)} fatsTarget={user.targets.fats}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#22C55E' }}>Today's Nutrition</div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[['#F59E0B', 'P'], ['#3B82F6', 'C'], ['#22C55E', 'F']].map(([color, label]) => (
                      <span key={label} style={{ fontSize: '0.48rem', fontWeight: 800, color, opacity: 0.7 }}>{label}</span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: calPct >= 90 ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.06)', color: calPct >= 90 ? '#EF4444' : 'var(--text-secondary)' }}>
                  {calPct}%
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <MacroBar label="Protein" value={Math.round(totals.protein)} target={user.targets.protein} color="#F59E0B" />
                <MacroBar label="Carbs" value={Math.round(totals.carbs)} target={user.targets.carbs} color="#3B82F6" />
                <MacroBar label="Fats" value={Math.round(totals.fats)} target={user.targets.fats} color="#22C55E" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 600 }}>Tap to log food</span>
                <ChevronRight size={10} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Quick log row ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11, duration: 0.38 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { icon: <Droplets size={16} color="#06B6D4" />, label: 'Water', value: `${water} gl`, color: '#06B6D4', onClick: () => setActiveSheet('water') },
          { icon: <Footprints size={16} color="#22C55E" />, label: 'Steps', value: steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : String(steps), color: '#22C55E', onClick: () => setActiveSheet('steps') },
          { icon: <Activity size={16} color="#6366F1" />, label: 'Weight', value: log?.weight ? String(log.weight) : String(user.weight), color: '#6366F1', onClick: () => setActiveSheet('weight') },
        ].map(({ icon, label, value, color, onClick }) => (
          <button key={label} onClick={onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '14px 8px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 18, cursor: 'pointer', transition: 'transform 0.12s, background 0.12s',
            boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)',
          }}
            onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.95)')}
            onTouchEnd={e => (e.currentTarget.style.transform = '')}
          >
            <div style={{ width: 34, height: 34, borderRadius: 11, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}20` }}>
              {icon}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>{label}</div>
          </button>
        ))}
      </motion.div>

      {/* ── Coach Insight ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.38 }}
        onClick={() => navigate('/coach')} style={{ cursor: 'pointer' }}
      >
        <div style={{ borderRadius: 18, padding: '14px 16px', background: `${insightColor}08`, border: `1px solid ${insightColor}22`, borderLeft: `3px solid ${insightColor}`, boxShadow: `0 0 24px ${insightColor}10` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${insightColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Brain size={15} color={insightColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: insightColor, marginBottom: 3 }}>
                Coach · {coachInsight.type}
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.35 }}>
                {coachInsight.title}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.5 }} className="truncate-2">
                {coachInsight.message}
              </div>
            </div>
            <ChevronRight size={14} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 4 }} />
          </div>
        </div>
      </motion.div>

      {/* ── Training snapshot ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19, duration: 0.38 }}
        onClick={() => navigate('/training')} style={{ cursor: 'pointer' }}
      >
        <div className="card-training" style={{ padding: '16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Dumbbell size={14} color="#3B82F6" />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3B82F6' }}>Training</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>
                {weeklyStats.workoutsCompleted}/{user.trainingFrequency} this week
              </span>
              <ChevronRight size={13} color="var(--text-tertiary)" />
            </div>
          </div>
          {recentWorkout ? (
            <>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>{recentWorkout.name}</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{recentWorkout.exercises.length} exercises</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{recentWorkout.durationMinutes}min</span>
                {recentWorkout.sessionRPE && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>RPE {recentWorkout.sessionRPE}</span>}
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: weeklyNudge ? 8 : 0 }}>
                {Array.from({ length: Math.max(user.trainingFrequency, 1) }).map((_, i) => (
                  <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < weeklyStats.workoutsCompleted ? '#3B82F6' : 'rgba(0,0,0,0.06)', transition: 'background 0.3s', boxShadow: i < weeklyStats.workoutsCompleted ? '0 0 6px rgba(59,130,246,0.5)' : 'none' }} />
                ))}
              </div>
              {weeklyNudge && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginTop: 2, padding: '6px 10px', borderRadius: 10,
                  background: weeklyStats.workoutsCompleted >= user.trainingFrequency
                    ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.07)',
                  border: `1px solid ${weeklyStats.workoutsCompleted >= user.trainingFrequency ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.15)'}`,
                }}>
                  <Target size={10} color={weeklyStats.workoutsCompleted >= user.trainingFrequency ? '#22C55E' : '#3B82F6'} />
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    color: weeklyStats.workoutsCompleted >= user.trainingFrequency ? '#22C55E' : '#3B82F6',
                  }}>{weeklyNudge}</span>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>No sessions yet — start your first workout</div>
          )}
        </div>
      </motion.div>

      {/* ── Weight + Stats row ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23, duration: 0.38 }}
        style={{ display: 'flex', gap: 10 }}>

        {/* Weight EMA mini chart */}
        <div style={{ flex: 3, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '14px 14px 10px', overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Weight</span>
            {weightDelta !== 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 20, background: weightDelta < 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)' }}>
                {weightDelta < -0.1 ? <TrendingDown size={9} color="#22C55E" /> : weightDelta > 0.1 ? <TrendingUp size={9} color="#F59E0B" /> : <Minus size={9} color="#6366F1" />}
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: weightDelta < -0.1 ? '#22C55E' : '#F59E0B', fontVariantNumeric: 'tabular-nums' }}>
                  {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>
            {currentEma ? currentEma.toFixed(1) : (log?.weight ?? user.weight)}
            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-tertiary)', marginLeft: 4 }}>{units === 'imperial' ? 'lbs' : 'kg'}</span>
          </div>
          {weightTrendData.length > 3 ? (
            <div style={{ height: 46, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightTrendData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="trend" stroke="#6366F1" strokeWidth={2} fill="url(#wGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: 6 }}>Log weight for trend</div>
          )}
        </div>

        {/* Stats mini tiles */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              label: 'Consistency',
              value: `${consistencyScore}%`,
              sub: 'nutrition + training',
              color: consistencyScore >= 80 ? '#22C55E' : consistencyScore >= 60 ? '#F59E0B' : '#EF4444',
            },
            {
              label: 'Avg protein',
              value: `${weeklyStats.avgProtein}g`,
              sub: `vs ${user.targets.protein}g`,
              color: weeklyStats.proteinAdherence >= 80 ? '#22C55E' : '#F59E0B',
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '12px 12px', flex: 1, boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.03em', color }}>{value}</div>
              <div style={{ fontSize: '0.58rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{sub}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Badges row ── */}
      {earnedBadges.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27, duration: 0.38 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, msOverflowStyle: 'none' }}>
            {earnedBadges.slice(-5).map(badge => (
              <div key={badge.id} style={{
                display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                padding: '6px 10px', borderRadius: 99,
                background: `${badge.color}10`,
                border: `1px solid ${badge.color}28`,
              }}>
                <span style={{ fontSize: '0.72rem' }}>{badge.icon}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: badge.color, whiteSpace: 'nowrap' }}>{badge.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Proactive coaching insights ── */}
      {isPlateauing && !dismissedInsights.has('plateau') && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{
            background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 18, padding: '13px 15px',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Target size={15} color="#F59E0B" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#F59E0B', marginBottom: 3 }}>Plateau detected</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.35)', lineHeight: 1.5, fontWeight: 600 }}>
                Your weight trend has moved less than 0.3kg in 14 days. Your weekly check-in will suggest a 100 kcal reduction. Consider a high-carb refeed day to reset leptin.
              </div>
            </div>
            <button
              onClick={() => setDismissedInsights(prev => new Set([...prev, 'plateau']))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}
            ><X size={14} color="rgba(0,0,0,0.16)" /></button>
          </div>
        </motion.div>
      )}

      {recoveryInsight && !dismissedInsights.has(`recovery_${recoveryInsight.type}`) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{
            background: recoveryInsight.type === 'fatigue' ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.06)',
            border: `1px solid ${recoveryInsight.type === 'fatigue' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.18)'}`,
            borderRadius: 18, padding: '13px 15px',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: recoveryInsight.type === 'fatigue' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={15} color={recoveryInsight.type === 'fatigue' ? '#EF4444' : '#22C55E'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 800, marginBottom: 3,
                color: recoveryInsight.type === 'fatigue' ? '#EF4444' : '#22C55E',
              }}>
                {recoveryInsight.type === 'fatigue' ? 'Fatigue signal' : 'Ready to push'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.35)', lineHeight: 1.5, fontWeight: 600 }}>
                {recoveryInsight.message}
              </div>
            </div>
            <button
              onClick={() => setDismissedInsights(prev => new Set([...prev, `recovery_${recoveryInsight.type}`]))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}
            ><X size={14} color="rgba(0,0,0,0.16)" /></button>
          </div>
        </motion.div>
      )}

      {isTrainingStalled && !dismissedInsights.has('stall') && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{
            background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 18, padding: '13px 15px',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Dumbbell size={15} color="#6366F1" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6366F1', marginBottom: 3 }}>4+ days without training</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.35)', lineHeight: 1.5, fontWeight: 600 }}>
                No workouts logged in 4+ days. The training stimulus is the driver of adaptation — even a 30-minute session beats skipping.
              </div>
            </div>
            <button
              onClick={() => setDismissedInsights(prev => new Set([...prev, 'stall']))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}
            ><X size={14} color="rgba(0,0,0,0.16)" /></button>
          </div>
        </motion.div>
      )}

      {/* ── Steps bar (visible when logged) ── */}
      {steps > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27, duration: 0.38 }}
          onClick={() => setActiveSheet('steps')} style={{ cursor: 'pointer' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 18, padding: '13px 15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Footprints size={13} color="#22C55E" />
                <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>Steps</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.92rem', fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {fmtNum(steps)} <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>/ {fmtNum(stepsTarget)}</span>
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min((steps / stepsTarget) * 100, 100)}%`, background: 'linear-gradient(90deg, #22C55E, #06B6D4)', boxShadow: '0 0 8px rgba(34,197,94,0.4)' }} />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── CTA Row ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.31, duration: 0.38 }}
        style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-green" style={{ flex: 1, fontSize: '0.88rem', padding: '14px', gap: 8, borderRadius: 18 }} onClick={() => navigate('/log')}>
          <Zap size={15} /> Log Food
        </button>
        <button className="btn btn-coach" style={{ flex: 1, fontSize: '0.88rem', padding: '14px', gap: 8, borderRadius: 18 }} onClick={() => navigate('/coach')}>
          <Brain size={15} /> AI Coach
        </button>
      </motion.div>

      {/* ── Sync status ── */}
      {savedLabel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, paddingBottom: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 4px #22C55E' }} />
          <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {savedLabel} · data stored locally
          </span>
        </div>
      )}

      {/* ── Log sheets ── */}
      <AnimatePresence>
        {activeSheet && (
          <LogSheet
            type={activeSheet}
            currentValue={activeSheet === 'water' ? water : activeSheet === 'steps' ? steps : (log?.weight ?? user.weight)}
            unit={activeSheet === 'water' ? 'glasses' : activeSheet === 'steps' ? 'steps' : (units === 'imperial' ? 'lbs' : 'kg')}
            onSave={handleSave(activeSheet)}
            onClose={() => setActiveSheet(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
