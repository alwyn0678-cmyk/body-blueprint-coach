import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Dumbbell, Droplets, Footprints, TrendingUp,
  Brain, Activity, RefreshCw, Sparkles, Zap,
} from 'lucide-react';
import { useApp, computeLevel, xpToNextLevel, LEVEL_NAMES } from '../context/AppContext';
import {
  calculateStreak, computeWeeklyStats, calculateWeightTrend,
} from '../utils/aiCoachingEngine';
import { coachService, generateAffirmation } from '../services/aiCoach';
import { MilestoneModal } from '../components/MilestoneModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];

const fmtNum = (n: number, dp = 0): string =>
  n.toLocaleString('en-AU', { maximumFractionDigits: dp, minimumFractionDigits: dp });

// ─── Evolved Ring ────────────────────────────────────────────────────────────

const EvolvedRing: React.FC<{ score: number }> = React.memo(({ score }) => {
  const R = 112;
  const circ = 2 * Math.PI * R;
  const pct = Math.min(score / 100, 1);
  const offset = circ * (1 - pct);

  // Glow dot position (in un-rotated SVG space: 0 = 3 o'clock, clockwise)
  const angle = 2 * Math.PI * pct;
  const dotX = 132 + R * Math.cos(angle);
  const dotY = 132 + R * Math.sin(angle);

  return (
    <div style={{ position: 'relative', width: 256, height: 256, margin: '0 auto' }}>
      <svg width="256" height="256" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C2CB9A" />
            <stop offset="60%" stopColor="#8B9467" />
            <stop offset="100%" stopColor="#576038" />
          </linearGradient>
          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Soft outer halo track */}
        <circle cx="132" cy="132" r={R} fill="transparent"
          stroke="rgba(194,203,154,0.18)" strokeWidth="20" />

        {/* Main track */}
        <circle cx="132" cy="132" r={R} fill="transparent"
          stroke="rgba(0,0,0,0.07)" strokeWidth="12" />

        {/* Progress arc */}
        <circle cx="132" cy="132" r={R} fill="transparent"
          stroke="url(#ringGrad)" strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          filter="url(#ringGlow)"
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.25,1,0.5,1)' }}
        />

        {/* Glowing dot at progress tip */}
        {pct > 0.03 && (
          <>
            <circle cx={dotX} cy={dotY} r={10}
              fill="rgba(87,96,56,0.25)" filter="url(#dotGlow)" />
            <circle cx={dotX} cy={dotY} r={6}
              fill="#576038"
              style={{ transition: 'all 1.3s cubic-bezier(0.25,1,0.5,1)' }} />
            <circle cx={dotX} cy={dotY} r={3} fill="rgba(255,255,255,0.85)" />
          </>
        )}
      </svg>

      {/* Center content — glass pill */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 0,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.60)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          borderRadius: 22,
          border: '1px solid rgba(255,255,255,0.88)',
          boxShadow: '0 4px 20px rgba(87,96,56,0.10), inset 0 1.5px 0 rgba(255,255,255,0.95)',
          padding: '14px 28px 12px',
          textAlign: 'center',
          minWidth: 110,
        }}>
          <div style={{
            fontSize: '4rem', fontWeight: 900,
            letterSpacing: '-0.05em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            background: 'linear-gradient(135deg, #3E4528 20%, #8B9467 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {score}
          </div>
          <div style={{
            fontSize: '0.5rem', fontWeight: 900, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'rgba(87,96,56,0.55)', marginTop: 5,
          }}>
            Daily Score
          </div>
        </div>
      </div>
    </div>
  );
});

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
            className="input-field" type="text" inputMode="decimal"
            value={val} onChange={e => setVal(e.target.value.replace(',', '.'))}
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

const AFF_CACHE_KEY = 'bbc_affirmation_cache';

interface AffCache {
  date: string;
  text: string;
  index: number;
}

const loadCachedAff = (dateStr: string): string | null => {
  try {
    const raw = localStorage.getItem(AFF_CACHE_KEY);
    if (!raw) return null;
    const cache: AffCache = JSON.parse(raw);
    return cache.date === dateStr ? cache.text : null;
  } catch { return null; }
};

const saveCachedAff = (dateStr: string, text: string) => {
  try {
    const existing = localStorage.getItem(AFF_CACHE_KEY);
    const prev: AffCache = existing ? JSON.parse(existing) : { date: '', text: '', index: 0 };
    const nextIdx = prev.date === dateStr ? prev.index : (prev.index + 1) % 20;
    localStorage.setItem(AFF_CACHE_KEY, JSON.stringify({ date: dateStr, text, index: nextIdx }));
  } catch {}
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { state, updateDailyLog, updateWeight, getNutritionTotals, showToast } = useApp();
  const navigate = useNavigate();
  const [activeSheet, setActiveSheet] = useState<'water' | 'steps' | 'weight' | null>(null);
  const [affirmation, setAffirmation] = useState('');
  const [affirmationLoading, setAffirmationLoading] = useState(false);
  const [affFadeKey, setAffFadeKey] = useState(0);

  const dateStr = todayStr();
  const log = state.logs[dateStr];
  const user = state.user!;

  const fetchAffirmation = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = loadCachedAff(dateStr);
      if (cached) { setAffirmation(cached); return; }
    }
    setAffirmationLoading(true);
    const text = await generateAffirmation(user.name);
    saveCachedAff(dateStr, text);
    setAffirmation(text);
    setAffFadeKey(k => k + 1);
    setAffirmationLoading(false);
  }, [user.name, dateStr]);

  useEffect(() => { fetchAffirmation(); }, [fetchAffirmation]);

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

  const xpInfo = xpToNextLevel(state.xp);
  const levelName = LEVEL_NAMES[xpInfo.level] ?? 'Max';

  // Evolved score: weighted average of adherence metrics (0–100)
  const evolvedScore = useMemo(() => {
    const calAdherence = Math.min(totals.calories / Math.max(user.targets.calories, 1), 1);
    const proAdherence = Math.min(totals.protein / Math.max(user.targets.protein, 1), 1);
    const stepsAdherence = Math.min(steps / Math.max(stepsTarget, 1), 1);
    const trained = (log?.workouts?.length ?? 0) > 0 ? 1 : 0;
    return Math.round(calAdherence * 25 + proAdherence * 25 + stepsAdherence * 25 + trained * 25);
  }, [totals, user.targets, steps, stepsTarget, log]);

  const handleSave = useCallback((type: 'water' | 'steps' | 'weight') => (value: number) => {
    if (type === 'weight') {
      updateWeight(value, dateStr);
      showToast(`Weight logged: ${value}${units === 'imperial' ? ' lbs' : ' kg'}`, 'success');
    } else {
      updateDailyLog(dateStr, { [type === 'water' ? 'waterGlasses' : 'steps']: value });
      showToast(`${type === 'water' ? 'Water' : 'Steps'} updated`, 'success');
    }
    setActiveSheet(null);
  }, [dateStr, units, updateWeight, updateDailyLog, showToast]);

  const caloriesRemaining = Math.max(user.targets.calories - totals.calories, 0);
  const caloriesOver = totals.calories > user.targets.calories;
  const stepsPercent = Math.round(Math.min((steps / stepsTarget) * 100, 100));
  const workoutMinutesToday = (log?.workouts ?? []).reduce((acc, w) => acc + (w.durationMinutes ?? 0), 0);

  return (
    <>
      <MilestoneModal />
      {/* ── Page ── */}
      <div style={{
        minHeight: '100dvh',
        background: 'var(--bg-primary)',
        paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))',
        paddingLeft: 24, paddingRight: 24,
      }}>

        {/* ── Hero Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
          style={{ paddingTop: 28, paddingBottom: 4, position: 'relative' }}
        >
          {/* ── Floating background orbs ── */}
          <div style={{
            position: 'absolute', top: -40, left: -40, width: 300, height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(194,203,154,0.45) 0%, transparent 68%)',
            filter: 'blur(48px)', pointerEvents: 'none', zIndex: 0,
          }} />
          <div style={{
            position: 'absolute', top: 60, right: -60, width: 260, height: 260,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(151,68,0,0.18) 0%, transparent 68%)',
            filter: 'blur(52px)', pointerEvents: 'none', zIndex: 0,
          }} />
          <div style={{
            position: 'absolute', bottom: -20, left: '30%', width: 200, height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(87,96,56,0.14) 0%, transparent 68%)',
            filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
          }} />

          {/* ── Glass hero card ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'rgba(255,255,255,0.52)',
            backdropFilter: 'blur(48px) saturate(2)',
            WebkitBackdropFilter: 'blur(48px) saturate(2)',
            borderRadius: 36,
            border: '1.5px solid rgba(255,255,255,0.80)',
            boxShadow: [
              '0 2px 0 rgba(255,255,255,0.95) inset',
              '0 -1px 0 rgba(87,96,56,0.06) inset',
              '0 8px 48px rgba(87,96,56,0.12)',
              '0 1px 0 rgba(87,96,56,0.04)',
            ].join(', '),
            padding: '28px 20px 22px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>

            {/* Ring */}
            <EvolvedRing score={evolvedScore} />

            {/* Macro summary strip */}
            <div style={{ display: 'flex', width: '100%', gap: 8, marginTop: 20 }}>
              {[
                { label: 'Calories', value: `${Math.round(totals.calories)}`, unit: 'kcal', color: '#974400', bg: 'rgba(151,68,0,0.07)' },
                { label: 'Protein', value: `${Math.round(totals.protein)}`, unit: 'g', color: '#576038', bg: 'rgba(87,96,56,0.07)' },
                { label: 'Steps', value: fmtNum(steps), unit: '', color: '#3E4528', bg: 'rgba(62,69,40,0.07)' },
              ].map(({ label, value, unit, color, bg }) => (
                <div key={label} style={{
                  flex: 1,
                  background: bg,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.75)',
                  padding: '10px 8px',
                  textAlign: 'center',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
                }}>
                  <div style={{
                    fontSize: '1.05rem', fontWeight: 900, color,
                    letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}>
                    {value}
                    {unit && <span style={{ fontSize: '0.58rem', fontWeight: 700, opacity: 0.65, marginLeft: 2 }}>{unit}</span>}
                  </div>
                  <div style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.30)', marginTop: 4 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Streak + XP row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, width: '100%' }}>
              {streak > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 9999,
                  background: streak >= 7 ? 'rgba(151,68,0,0.12)' : 'rgba(87,96,56,0.08)',
                  border: '1px solid rgba(255,255,255,0.65)',
                  fontSize: '0.75rem', fontWeight: 800,
                  color: streak >= 7 ? '#974400' : '#576038',
                  flexShrink: 0,
                }}>
                  {streak >= 3 ? '🔥' : <Flame size={13} color="#974400" />}
                  {streak} day streak
                </div>
              )}
              <div style={{
                flex: 1,
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.75)',
                padding: '8px 12px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #576038, #8B9467)',
                      borderRadius: 7, padding: '2px 7px',
                      fontSize: '0.6rem', fontWeight: 900, color: '#fff', letterSpacing: '0.05em',
                    }}>
                      LVL {xpInfo.level}
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#576038' }}>{levelName}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(26,26,26,0.38)' }}>
                    {xpInfo.current}/{xpInfo.needed} XP
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 5, background: 'rgba(87,96,56,0.12)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 5,
                    background: 'linear-gradient(90deg, #8B9467, #576038)',
                    width: `${Math.min((xpInfo.current / xpInfo.needed) * 100, 100)}%`,
                    transition: 'width 0.9s cubic-bezier(0.25,1,0.5,1)',
                    boxShadow: '0 0 8px rgba(87,96,56,0.35)',
                  }} />
                </div>
              </div>
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
          <div className="glass-card" style={{ borderRadius: 24, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          <div className="glass-card" style={{ borderRadius: 24, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            className="glass-card"
            style={{
              gridColumn: '1 / -1', borderRadius: 24, padding: '18px 22px',
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
              className="glass-card"
              style={{ borderRadius: 24, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
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
            className="glass-card"
            style={{
              borderRadius: 24, padding: '20px 22px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
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
            borderRadius: 24, padding: '22px 24px',
            background: 'linear-gradient(135deg, #576038 0%, #3E4528 100%)',
            boxShadow: '0 8px 32px rgba(87,96,56,0.25)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* subtle radial glow */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Sparkles size={13} color="rgba(194,203,154,0.9)" />
                  <span style={{ fontSize: '0.58rem', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'rgba(194,203,154,0.75)' }}>
                    Daily Affirmation
                  </span>
                </div>
                <button
                  onClick={() => fetchAffirmation(true)}
                  disabled={affirmationLoading}
                  style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, cursor: affirmationLoading ? 'default' : 'pointer', padding: 7, display: 'flex', transition: 'background 0.2s' }}
                >
                  <RefreshCw size={12} color="rgba(194,203,154,0.8)" style={{ animation: affirmationLoading ? 'spin 1s linear infinite' : 'none' }} />
                </button>
              </div>
              <p
                key={affFadeKey}
                className="aff-fade"
                style={{
                  fontSize: '1rem', fontWeight: 600, color: affirmationLoading ? 'rgba(255,255,255,0.3)' : '#FCFFE2',
                  lineHeight: 1.6, margin: 0, fontStyle: 'italic',
                }}
              >
                {affirmation ? `"${affirmation}"` : '…'}
              </p>
            </div>
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
                  className="glass-card"
                  style={{
                    borderRadius: 20, padding: '16px 18px',
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
