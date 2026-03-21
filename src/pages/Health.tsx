import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { HeartPulse, Moon, Zap, Activity, Plus, TrendingUp, TrendingDown, Minus, Brain, X } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getLocalISOString } from '../utils/dateUtils';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bgPrimary: '#FAF9F6',
  bgCard: '#FFFFFF',
  bgElevated: '#F4F3F1',
  accentBlue: '#576038',
  accentGreen: '#8B9467',
  accentOrange: '#974400',
  accentRed: '#DC2626',
  textPrimary: '#1A1A1A',
  textSecondary: 'rgba(26,26,26,0.6)',
  textTertiary: 'rgba(26,26,26,0.35)',
  border: 'rgba(0,0,0,0.06)',
  borderMd: 'rgba(0,0,0,0.10)',
};

// ── Recovery Algorithm ────────────────────────────────────────────────────────
interface RecoveryInputs {
  sleepMinutes: number;
  hrv?: number;
  restingHR?: number;
  workoutsLast48h: number;
}

const calculateRecovery = (inputs: RecoveryInputs): { score: number; sleepScore: number; hrvScore: number | null; loadScore: number } => {
  const sleepHours = inputs.sleepMinutes / 60;
  let sleepScore: number;
  if (sleepHours >= 9) sleepScore = 95;
  else if (sleepHours >= 7.5) sleepScore = 100;
  else if (sleepHours >= 6) sleepScore = 60 + (sleepHours - 6) * 26.7;
  else sleepScore = Math.max(0, sleepHours * 10);
  sleepScore = Math.min(100, Math.max(0, sleepScore));

  const hasHrv = inputs.hrv !== undefined && inputs.hrv > 0;
  const hasRhr = inputs.restingHR !== undefined && inputs.restingHR > 0;

  const hrvScore = hasHrv ? Math.min(100, Math.max(0, ((inputs.hrv! - 20) / 60) * 80 + 20)) : null;
  const loadScore = Math.min(100, Math.max(0, 100 - inputs.workoutsLast48h * 25));
  const rhrModifier = hasRhr ? ((60 - inputs.restingHR!) / 30) * 8 : 0;

  let raw: number;
  if (hasHrv) {
    raw = sleepScore * 0.4 + hrvScore! * 0.4 + loadScore * 0.2 + rhrModifier;
  } else {
    raw = sleepScore * 0.65 + loadScore * 0.35 + rhrModifier;
  }

  if (!isFinite(raw) || isNaN(raw)) raw = 0;
  const score = Math.min(100, Math.max(1, Math.round(raw)));
  return {
    score,
    sleepScore: Math.round(Math.min(100, Math.max(0, sleepScore))),
    hrvScore: hasHrv ? Math.round(Math.min(100, Math.max(0, hrvScore!))) : null,
    loadScore: Math.round(Math.min(100, Math.max(0, loadScore))),
  };
};

const recoveryLabel = (score: number) => {
  if (score >= 85) return { label: 'Peak', color: '#576038', advice: 'Physiological markers are optimal. You are primed for high-intensity training today.' };
  if (score >= 70) return { label: 'Good', color: '#8B9467', advice: 'Recovery is solid. Follow your scheduled training volume without major modifications.' };
  if (score >= 50) return { label: 'Moderate', color: '#974400', advice: 'Moderate recovery. Consider reducing intensity by 10–15% or substituting with moderate cardio.' };
  return { label: 'Low', color: '#DC2626', advice: 'Recovery is low. Prioritise sleep, active recovery, and adequate nutrition. Avoid high-strain sessions.' };
};

const getTrend = (current: number, prev: number | undefined): 'up' | 'down' | 'flat' => {
  if (prev === undefined) return 'flat';
  if (current > prev + 2) return 'up';
  if (current < prev - 2) return 'down';
  return 'flat';
};

// ── Recovery Arc SVG ──────────────────────────────────────────────────────────
const ReadinessArc: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const r = 54;
  const cx = 70;
  const cy = 70;
  const startAngle = -220;
  const sweepAngle = 260;
  const pct = Math.min(1, Math.max(0, isNaN(score) ? 0 : score / 100));
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, end: number) => {
    const s = toRad(start);
    const e = toRad(end);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const endAngle = startAngle + sweepAngle * pct;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <path d={arcPath(startAngle, startAngle + sweepAngle)} stroke="rgba(87,96,56,0.12)" strokeWidth="10" fill="none" strokeLinecap="round" />
      {score > 0 && (
        <path d={arcPath(startAngle, endAngle)} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }} />
      )}
    </svg>
  );
};

// ── Input validation helpers ──────────────────────────────────────────────────
const clampInt = (val: string, min: number, max: number): string => {
  const n = parseInt(val, 10);
  if (isNaN(n)) return val;
  return String(Math.min(max, Math.max(min, n)));
};

// ── Section label ─────────────────────────────────────────────────────────────
const SecLabel: React.FC<{ text: string }> = ({ text }) => (
  <div style={{
    fontSize: '0.65rem',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'rgba(0,0,0,0.20)',
    marginBottom: 8,
  }}>
    {text}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const Health: React.FC = () => {
  const { state, updateHealthMetrics, showToast } = useApp();
  const today = getLocalISOString();
  const log = state.logs[today] || { health: {} };
  const health = log.health || {};

  const [isLoggingVitals, setIsLoggingVitals] = useState(false);
  const [vitals, setVitals] = useState({
    sleepHours: health.sleepDurationMinutes ? String(Math.floor(health.sleepDurationMinutes / 60)) : '7',
    sleepMins: health.sleepDurationMinutes ? String(health.sleepDurationMinutes % 60) : '30',
    hrv: health.hrv?.toString() || '',
    restingHR: health.restingHR?.toString() || '',
  });
  const [hrvError, setHrvError] = useState('');
  const [rhrError, setRhrError] = useState('');

  const workoutsLast48h = useMemo(() => {
    const cutoff = Date.now() - 48 * 3600 * 1000;
    return Object.values(state.logs)
      .flatMap(l => l.workouts || [])
      .filter(w => {
        const t = new Date(w.timestamp).getTime();
        return !isNaN(t) && t > cutoff;
      }).length;
  }, [state.logs]);

  const trendData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const dateStr = d.toISOString().split('T')[0];
      const entry = state.logs[dateStr]?.health || {};
      return {
        name: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
        recovery: (entry.recoveryScore != null && !isNaN(entry.recoveryScore)) ? entry.recoveryScore : null,
        hrv: (entry.hrv != null && !isNaN(entry.hrv)) ? entry.hrv : null,
      };
    });
  }, [state.logs]);

  const hasEverLoggedVitals = useMemo(() => {
    return Object.values(state.logs).some(l => l.health?.recoveryScore != null);
  }, [state.logs]);

  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return state.logs[d.toISOString().split('T')[0]]?.health;
  })();

  const saveVitals = () => {
    const hours = parseInt(vitals.sleepHours, 10);
    const mins  = parseInt(vitals.sleepMins || '0', 10);

    if (isNaN(hours) || hours < 0 || hours > 16) {
      showToast('Sleep hours must be between 0 and 16', 'error');
      return;
    }
    if (isNaN(mins) || mins < 0 || mins > 59) {
      showToast('Sleep minutes must be between 0 and 59', 'error');
      return;
    }

    const totalMinutes = hours * 60 + mins;
    if (totalMinutes < 60) {
      showToast('Please enter at least 1 hour of sleep', 'error');
      return;
    }

    const hrvRaw = vitals.hrv ? parseInt(vitals.hrv, 10) : undefined;
    const rhrRaw = vitals.restingHR ? parseInt(vitals.restingHR, 10) : undefined;

    if (hrvRaw !== undefined && (isNaN(hrvRaw) || hrvRaw < 0 || hrvRaw > 300)) {
      setHrvError('HRV must be between 0 and 300 ms');
      return;
    }
    setHrvError('');
    if (rhrRaw !== undefined && (isNaN(rhrRaw) || rhrRaw < 30 || rhrRaw > 220)) {
      setRhrError('Resting HR must be between 30 and 220 bpm');
      return;
    }
    setRhrError('');

    const result = calculateRecovery({ sleepMinutes: totalMinutes, hrv: hrvRaw, restingHR: rhrRaw, workoutsLast48h });
    const clampedScore = Math.min(100, Math.max(0, result.score));

    updateHealthMetrics(today, {
      sleepDurationMinutes: totalMinutes,
      sleepScore: Math.min(100, Math.max(0, result.sleepScore)),
      hrv: hrvRaw,
      restingHR: rhrRaw,
      recoveryScore: clampedScore,
    });

    setVitals({ sleepHours: '7', sleepMins: '30', hrv: '', restingHR: '' });
    setIsLoggingVitals(false);
    showToast(`Readiness: ${clampedScore}% · ${recoveryLabel(clampedScore).label}`, 'success');
  };

  const currentRecovery = (health.recoveryScore != null && !isNaN(health.recoveryScore))
    ? Math.min(100, Math.max(0, health.recoveryScore))
    : 0;
  const recInfo = currentRecovery > 0 ? recoveryLabel(currentRecovery) : null;
  const recoveryTrend = getTrend(currentRecovery, yesterday?.recoveryScore);
  const sleepHours = health.sleepDurationMinutes
    ? `${Math.floor(health.sleepDurationMinutes / 60)}h ${health.sleepDurationMinutes % 60}m`
    : null;

  const openVitals = () => {
    setVitals({
      sleepHours: health.sleepDurationMinutes ? String(Math.floor(health.sleepDurationMinutes / 60)) : '7',
      sleepMins: health.sleepDurationMinutes ? String(health.sleepDurationMinutes % 60) : '30',
      hrv: health.hrv?.toString() || '',
      restingHR: health.restingHR?.toString() || '',
    });
    setHrvError('');
    setRhrError('');
    setIsLoggingVitals(true);
  };

  const hasTrendData = trendData.some(d => d.recovery !== null);
  const metricCount = [health.sleepDurationMinutes, health.hrv, health.restingHR].filter(v => v != null).length;

  // ── Recent vitals history ─────────────────────────────────────────────────
  const recentLogs = useMemo(() => {
    return Object.entries(state.logs)
      .filter(([, l]) => l.health?.recoveryScore != null)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7)
      .map(([date, l]) => ({ date, health: l.health! }));
  }, [state.logs]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '1rem',
        paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
        background: C.bgPrimary,
        minHeight: '100dvh',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: C.textPrimary }}>Health</h1>
          <p style={{ fontSize: '0.78rem', color: C.textTertiary, fontWeight: 600, marginTop: 2 }}>Recovery & readiness</p>
        </div>
        <button
          onClick={openVitals}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0.55rem 1.1rem',
            borderRadius: 14,
            fontSize: '0.85rem',
            fontWeight: 800,
            background: recInfo ? recInfo.color : C.accentBlue,
            color: '#000',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
          }}
        >
          <Plus size={15} /> Log Vitals
        </button>
      </div>

      {/* ── Empty state ── */}
      {!hasEverLoggedVitals && (
        <div style={{
          background: C.bgCard,
          borderRadius: 20,
          border: '1px dashed rgba(0,0,0,0.08)',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          textAlign: 'center',
        }}>
          <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(87,96,56,0.10)', border: '1px solid rgba(87,96,56,0.18)' }}>
            <HeartPulse size={28} color="#576038" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6, color: C.textPrimary }}>Log your morning vitals</div>
            <p style={{ fontSize: '0.8rem', color: C.textTertiary, lineHeight: 1.5, margin: 0 }}>
              Track sleep, HRV, and resting heart rate to unlock your daily readiness score and recovery trends.
            </p>
          </div>
          <button
            onClick={openVitals}
            style={{ padding: '0.75rem 2rem', background: 'white', color: 'black', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            Log Today's Vitals
          </button>
        </div>
      )}

      {/* ══ 1. RECOVERY SCORE HERO ══════════════════════════════════════════ */}
      {health.recoveryScore != null && (
        <div style={{
          background: C.bgCard,
          borderRadius: 24,
          border: `1px solid ${recInfo ? recInfo.color + '30' : C.border}`,
          padding: 24,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {recInfo && (
            <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${recInfo.color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          )}
          <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 2, background: recInfo ? `linear-gradient(90deg, transparent, ${recInfo.color}, transparent)` : 'transparent' }} />

          {/* Arc centered */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <ReadinessArc score={currentRecovery} color={recInfo?.color || 'rgba(0,0,0,0.07)'} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '3rem', fontWeight: 900, color: recInfo?.color || 'rgba(0,0,0,0.13)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
                  {currentRecovery > 0 ? currentRecovery : '—'}
                </span>
                {currentRecovery > 0 && <span style={{ fontSize: '0.6rem', color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>/100</span>}
              </div>
            </div>

            {recInfo && (
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: recInfo.color, letterSpacing: '-0.01em' }}>{recInfo.label}</span>
                  {recoveryTrend !== 'flat' && (
                    recoveryTrend === 'up'
                      ? <TrendingUp size={16} color="#576038" />
                      : <TrendingDown size={16} color="#DC2626" />
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: C.textSecondary, lineHeight: 1.5, margin: 0, maxWidth: 280 }}>{recInfo.advice}</p>
              </div>
            )}
            {!recInfo && (
              <p style={{ fontSize: '0.8rem', color: C.textTertiary, lineHeight: 1.5, margin: 0, textAlign: 'center' }}>Log your morning vitals to calculate your daily readiness score.</p>
            )}
            {metricCount < 3 && currentRecovery > 0 && (
              <p style={{ fontSize: '0.68rem', color: C.textTertiary, fontWeight: 600, margin: '6px 0 0', textAlign: 'center' }}>
                Based on {metricCount} of 3 metrics
              </p>
            )}
          </div>

          {/* 3 metric chips */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              {
                label: 'Sleep',
                value: sleepHours || '—',
                color: '#576038',
                dot: health.sleepDurationMinutes != null,
              },
              {
                label: 'HRV',
                value: (health.hrv != null && !isNaN(health.hrv)) ? `${health.hrv} ms` : '—',
                color: '#8B9467',
                dot: health.hrv != null,
              },
              {
                label: 'Rest HR',
                value: (health.restingHR != null && !isNaN(health.restingHR)) ? `${health.restingHR} bpm` : '—',
                color: '#974400',
                dot: health.restingHR != null,
              },
            ].map(chip => (
              <div key={chip.label} style={{
                background: C.bgElevated,
                borderRadius: 14,
                border: `1px solid ${C.border}`,
                padding: '10px 8px',
                textAlign: 'center' as const,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: chip.dot ? chip.color : 'rgba(0,0,0,0.10)',
                  }} />
                  <span style={{ fontSize: '0.56rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: C.textTertiary }}>{chip.label}</span>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: chip.dot ? C.textPrimary : C.textTertiary, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                  {chip.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ 2. LOG MORNING VITALS ═══════════════════════════════════════════ */}
      {!isLoggingVitals && (
        <div>
          <SecLabel text="Log Morning Vitals" />
          <button
            onClick={openVitals}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 20,
              padding: '16px 18px',
              cursor: 'pointer',
              textAlign: 'left' as const,
            }}
          >
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: C.textPrimary }}>
                {health.recoveryScore != null ? 'Update today\'s vitals' : 'Log today\'s vitals'}
              </div>
              <div style={{ fontSize: '0.68rem', color: C.textTertiary, marginTop: 2 }}>Sleep · HRV · Resting HR</div>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: C.accentBlue,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Plus size={18} color="#fff" />
            </div>
          </button>
        </div>
      )}

      {/* ══ 3. 14-DAY RECOVERY TREND ════════════════════════════════════════ */}
      {hasTrendData && (
        <div>
          <SecLabel text="14-Day Recovery Trend" />
          <div style={{
            background: C.bgCard,
            borderRadius: 20,
            border: `1px solid ${C.border}`,
            padding: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: 'linear-gradient(90deg, transparent, rgba(87,96,56,0.4), transparent)' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 3, background: '#576038', borderRadius: 2 }} />
                <span style={{ fontSize: '0.62rem', color: C.textTertiary, fontWeight: 600 }}>Recovery</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 2, background: '#8B9467', borderRadius: 2, opacity: 0.7 }} />
                <span style={{ fontSize: '0.62rem', color: C.textTertiary, fontWeight: 600 }}>HRV</span>
              </div>
            </div>
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                {/* @ts-ignore */}
                <LineChart data={trendData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.20)', fontWeight: 700 }} interval={1} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: `1px solid ${C.border}`, background: '#FFFFFF', padding: '8px 12px', fontSize: '0.78rem', color: C.textPrimary }}
                    cursor={{ stroke: 'rgba(0,0,0,0.05)', strokeWidth: 1 }}
                  />
                  <Line type="monotone" dataKey="recovery" stroke="#576038" strokeWidth={2.5} dot={{ r: 3, fill: '#576038', strokeWidth: 0 }} connectNulls name="Recovery %" />
                  <Line type="monotone" dataKey="hrv" stroke="#8B9467" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls name="HRV ms" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ══ Score Breakdown ══════════════════════════════════════════════════ */}
      {health.recoveryScore != null && health.sleepDurationMinutes != null && (() => {
        const { sleepScore, hrvScore, loadScore } = calculateRecovery({
          sleepMinutes: health.sleepDurationMinutes!,
          hrv: health.hrv,
          restingHR: health.restingHR,
          workoutsLast48h,
        });
        const hasHrv = hrvScore !== null;
        const items = [
          { label: 'Sleep Quality', value: Math.min(100, Math.max(0, sleepScore)), weight: hasHrv ? '40%' : '65%', color: '#576038' },
          ...(hasHrv ? [{ label: 'HRV', value: Math.min(100, Math.max(0, hrvScore!)), weight: '40%', color: '#8B9467' }] : []),
          { label: 'Training Load', value: Math.min(100, Math.max(0, loadScore)), weight: hasHrv ? '20%' : '35%', color: '#974400' },
        ];
        return (
          <div style={{ background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ padding: 6, borderRadius: 9, background: 'rgba(0,0,0,0.05)' }}>
                <Brain size={14} color="rgba(0,0,0,0.35)" />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: C.textPrimary }}>Score Breakdown</span>
            </div>
            {items.map(item => (
              <div key={item.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.78rem', color: C.textSecondary, fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(0,0,0,0.13)', fontWeight: 700, background: 'rgba(0,0,0,0.04)', padding: '1px 5px', borderRadius: 4 }}>{item.weight}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{isNaN(item.value) ? '—' : item.value}%</span>
                </div>
                <div style={{ height: 5, background: 'rgba(0,0,0,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${isNaN(item.value) ? 0 : item.value}%`, background: `linear-gradient(90deg, ${item.color}90, ${item.color})`, borderRadius: 3, transition: 'width 0.6s ease', boxShadow: `0 0 6px ${item.color}60` }} />
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ══ 4. RECENT VITALS ════════════════════════════════════════════════ */}
      {recentLogs.length > 0 && (
        <div>
          <SecLabel text="Recent Vitals" />
          <div style={{ background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {recentLogs.map((entry, i) => {
              const score = entry.health.recoveryScore ?? 0;
              const info = recoveryLabel(score);
              const sh = entry.health.sleepDurationMinutes
                ? `${Math.floor(entry.health.sleepDurationMinutes / 60)}h${entry.health.sleepDurationMinutes % 60 > 0 ? ` ${entry.health.sleepDurationMinutes % 60}m` : ''}`
                : null;
              const dateObj = new Date(entry.date + 'T00:00:00');
              const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <React.Fragment key={entry.date}>
                  {i > 0 && <div style={{ height: 1, background: 'rgba(0,0,0,0.03)', margin: '0 16px' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.textTertiary, minWidth: 48 }}>{dateLabel}</span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 800,
                      color: info.color,
                      background: `${info.color}18`,
                      border: `1px solid ${info.color}35`,
                      borderRadius: 9999,
                      padding: '2px 8px',
                      minWidth: 36,
                      textAlign: 'center' as const,
                    }}>
                      {score}
                    </span>
                    <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' as const, justifyContent: 'flex-end' }}>
                      {sh && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#576038', background: 'rgba(87,96,56,0.10)', borderRadius: 6, padding: '2px 7px' }}>
                          {sh}
                        </span>
                      )}
                      {entry.health.hrv != null && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8B9467', background: 'rgba(139,148,103,0.12)', borderRadius: 6, padding: '2px 7px' }}>
                          {entry.health.hrv} ms
                        </span>
                      )}
                      {entry.health.restingHR != null && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#974400', background: 'rgba(151,68,0,0.10)', borderRadius: 6, padding: '2px 7px' }}>
                          {entry.health.restingHR} bpm
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ VITALS LOG SHEET ════════════════════════════════════════════════ */}
      {isLoggingVitals && (
        <div className="animate-slide-up" style={{ position: 'fixed', inset: 0, background: C.bgPrimary, zIndex: 9002, overflowY: 'auto' }}>
          <div style={{ padding: '1.5rem', paddingBottom: '3rem', display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Sheet header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: C.textPrimary }}>Morning Vitals</h2>
                <p style={{ fontSize: '0.78rem', color: C.textTertiary, fontWeight: 600, marginTop: 2 }}>Log today's recovery data</p>
              </div>
              <button onClick={() => setIsLoggingVitals(false)} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={16} color="rgba(26,26,26,0.5)" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Sleep card */}
              <div style={{ background: C.bgCard, borderRadius: 20, padding: '1.25rem', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ padding: 6, borderRadius: 9, background: 'rgba(87,96,56,0.10)' }}>
                    <Moon size={15} color="#576038" />
                  </div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: C.textSecondary }}>Sleep Duration</label>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      type="number" inputMode="numeric" min="0" max="16"
                      value={vitals.sleepHours}
                      onChange={e => setVitals(v => ({ ...v, sleepHours: e.target.value }))}
                      onBlur={e => setVitals(v => ({ ...v, sleepHours: clampInt(e.target.value, 0, 16) }))}
                      className="input-field"
                      style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center' as const, fontVariantNumeric: 'tabular-nums' }}
                    />
                    <span style={{ textAlign: 'center' as const, fontSize: '0.68rem', color: C.textTertiary, fontWeight: 700 }}>hours (0–16)</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      type="number" inputMode="numeric" min="0" max="59"
                      value={vitals.sleepMins}
                      onChange={e => setVitals(v => ({ ...v, sleepMins: e.target.value }))}
                      onBlur={e => setVitals(v => ({ ...v, sleepMins: clampInt(e.target.value, 0, 59) }))}
                      className="input-field"
                      style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center' as const, fontVariantNumeric: 'tabular-nums' }}
                    />
                    <span style={{ textAlign: 'center' as const, fontSize: '0.68rem', color: C.textTertiary, fontWeight: 700 }}>minutes (0–59)</span>
                  </div>
                </div>
              </div>

              {/* HRV card */}
              <div style={{ background: C.bgCard, borderRadius: 20, padding: '1.25rem', border: `1px solid ${hrvError ? 'rgba(248,113,113,0.4)' : C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ padding: 6, borderRadius: 9, background: 'rgba(139,148,103,0.12)' }}>
                    <Activity size={15} color="#8B9467" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: C.textSecondary }}>Morning HRV</label>
                    <p style={{ fontSize: '0.62rem', color: C.textTertiary, margin: '1px 0 0', fontWeight: 600 }}>From Apple Watch, Garmin, or Whoop</p>
                  </div>
                </div>
                <input
                  type="number" inputMode="numeric" placeholder="65"
                  value={vitals.hrv}
                  onChange={e => { setVitals(v => ({ ...v, hrv: e.target.value })); setHrvError(''); }}
                  onBlur={e => { if (e.target.value) setVitals(v => ({ ...v, hrv: clampInt(e.target.value, 0, 300) })); }}
                  className="input-field"
                  style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center' as const, fontVariantNumeric: 'tabular-nums' }}
                />
                {hrvError
                  ? <p className="field-error" style={{ textAlign: 'center' as const, marginTop: 6 }}>{hrvError}</p>
                  : <p style={{ fontSize: '0.65rem', color: C.textTertiary, textAlign: 'center' as const, marginTop: 6, fontWeight: 600 }}>milliseconds · range 0–300 ms</p>
                }
              </div>

              {/* RHR card */}
              <div style={{ background: C.bgCard, borderRadius: 20, padding: '1.25rem', border: `1px solid ${rhrError ? 'rgba(248,113,113,0.4)' : C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ padding: 6, borderRadius: 9, background: 'rgba(151,68,0,0.10)' }}>
                    <Zap size={15} color="#974400" />
                  </div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: C.textSecondary }}>Resting Heart Rate</label>
                </div>
                <input
                  type="number" inputMode="numeric" placeholder="52"
                  value={vitals.restingHR}
                  onChange={e => { setVitals(v => ({ ...v, restingHR: e.target.value })); setRhrError(''); }}
                  onBlur={e => { if (e.target.value) setVitals(v => ({ ...v, restingHR: clampInt(e.target.value, 30, 220) })); }}
                  className="input-field"
                  style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center' as const, fontVariantNumeric: 'tabular-nums' }}
                />
                {rhrError
                  ? <p className="field-error" style={{ textAlign: 'center' as const, marginTop: 6 }}>{rhrError}</p>
                  : <p style={{ fontSize: '0.65rem', color: C.textTertiary, textAlign: 'center' as const, marginTop: 6, fontWeight: 600 }}>beats per minute · range 30–220 bpm</p>
                }
              </div>

              {/* Live preview */}
              {vitals.sleepHours && (() => {
                const h = parseInt(vitals.sleepHours, 10);
                const m = parseInt(vitals.sleepMins || '0', 10);
                if (isNaN(h) || isNaN(m)) return null;
                const totalMin = h * 60 + m;
                if (totalMin < 60) return null;
                const hrvNum = vitals.hrv ? parseInt(vitals.hrv, 10) : undefined;
                const rhrNum = vitals.restingHR ? parseInt(vitals.restingHR, 10) : undefined;
                if (hrvNum !== undefined && (isNaN(hrvNum) || hrvNum < 0 || hrvNum > 300)) return null;
                if (rhrNum !== undefined && (isNaN(rhrNum) || rhrNum < 30 || rhrNum > 220)) return null;
                const preview = calculateRecovery({ sleepMinutes: totalMin, hrv: hrvNum, restingHR: rhrNum, workoutsLast48h });
                if (!isFinite(preview.score) || isNaN(preview.score)) return null;
                const info = recoveryLabel(preview.score);
                return (
                  <div style={{ padding: '1.25rem', background: `${info.color}0d`, border: `1px solid ${info.color}25`, borderRadius: 20, textAlign: 'center' as const, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', width: 120, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${info.color}20 0%, transparent 70%)`, pointerEvents: 'none' }} />
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: C.textTertiary, marginBottom: 6 }}>Live Preview</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: info.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{preview.score}<span style={{ fontSize: '1.2rem', opacity: 0.6 }}>%</span></div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: info.color, marginTop: 2 }}>{info.label}</div>
                  </div>
                );
              })()}

              {/* Save button */}
              <button
                onClick={saveVitals}
                style={{ padding: '1.1rem', background: C.accentBlue, color: '#fff', border: 'none', borderRadius: 16, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', letterSpacing: '-0.01em' }}
              >
                Save & Calculate Readiness
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Health;
