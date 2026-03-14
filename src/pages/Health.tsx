import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { HeartPulse, Moon, Zap, Activity, Plus, TrendingUp, TrendingDown, Minus, Brain, X } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getLocalISOString } from '../utils/dateUtils';

// ── Recovery Algorithm ─────────────────────────────────────────────────────────
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

  // Clamp sleepScore
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

  // Guard against NaN/Infinity before clamping
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
  if (score >= 85) return { label: 'Peak', color: '#4ade80', advice: 'Physiological markers are optimal. You are primed for high-intensity training today.' };
  if (score >= 70) return { label: 'Good', color: '#60a5fa', advice: 'Recovery is solid. Follow your scheduled training volume without major modifications.' };
  if (score >= 50) return { label: 'Moderate', color: '#fb923c', advice: 'Moderate recovery. Consider reducing intensity by 10–15% or substituting with moderate cardio.' };
  return { label: 'Low', color: '#f87171', advice: 'Recovery is low. Prioritise sleep, active recovery, and adequate nutrition. Avoid high-strain sessions.' };
};

const getTrend = (current: number, prev: number | undefined): 'up' | 'down' | 'flat' => {
  if (prev === undefined) return 'flat';
  if (current > prev + 2) return 'up';
  if (current < prev - 2) return 'down';
  return 'flat';
};

// Circular arc SVG for readiness score
const ReadinessArc: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const r = 54;
  const cx = 70;
  const cy = 70;
  const startAngle = -220;
  const sweepAngle = 260;
  // Clamp pct 0–1, guard NaN
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
      <path d={arcPath(startAngle, startAngle + sweepAngle)} stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" strokeLinecap="round" />
      {score > 0 && (
        <path d={arcPath(startAngle, endAngle)} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
      )}
    </svg>
  );
};

// ── Input validation helpers ──────────────────────────────────────────────────
const clampInt = (val: string, min: number, max: number): string => {
  const n = parseInt(val, 10);
  if (isNaN(n)) return val; // let user continue typing
  return String(Math.min(max, Math.max(min, n)));
};

// ── Main Component ─────────────────────────────────────────────────────────────
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

  // Check whether any vitals have ever been logged across all time
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

    // Validate: hours 0–16, mins 0–59
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

    // Validate HRV range 0–300
    if (hrvRaw !== undefined && (isNaN(hrvRaw) || hrvRaw < 0 || hrvRaw > 300)) {
      setHrvError('HRV must be between 0 and 300 ms');
      return;
    }
    setHrvError('');
    // Validate resting HR range 30–220
    if (rhrRaw !== undefined && (isNaN(rhrRaw) || rhrRaw < 30 || rhrRaw > 220)) {
      setRhrError('Resting HR must be between 30 and 220 bpm');
      return;
    }
    setRhrError('');

    const result = calculateRecovery({ sleepMinutes: totalMinutes, hrv: hrvRaw, restingHR: rhrRaw, workoutsLast48h });

    // Clamp final score 0–100
    const clampedScore = Math.min(100, Math.max(0, result.score));

    updateHealthMetrics(today, {
      sleepDurationMinutes: totalMinutes,
      sleepScore: Math.min(100, Math.max(0, result.sleepScore)),
      hrv: hrvRaw,
      restingHR: rhrRaw,
      recoveryScore: clampedScore,
    });

    // Clear form fields after successful save
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

  // Whether the 14-day trend chart has any data worth showing
  const hasTrendData = trendData.some(d => d.recovery !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '1rem', paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))', backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }} className="animate-fade-in">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Health</h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>Recovery & readiness</p>
        </div>
        <button onClick={openVitals} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1.1rem', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800, backgroundColor: recInfo ? recInfo.color : 'var(--accent-primary)', color: '#000', border: 'none', cursor: 'pointer', transition: 'background-color 0.3s ease' }}>
          <Plus size={16} /> Log Vitals
        </button>
      </div>

      {/* ── Empty state: first-time visitor ── */}
      {!hasEverLoggedVitals && (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1px dashed rgba(255,255,255,0.12)',
          padding: '2rem 1.5rem',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '1rem',
          textAlign: 'center',
        }}>
          <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
            <HeartPulse size={28} color="#60a5fa" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>Log your morning vitals</div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
              Track sleep, HRV, and resting heart rate to unlock your daily readiness score and recovery trends.
            </p>
          </div>
          <button
            onClick={openVitals}
            style={{ padding: '0.75rem 2rem', backgroundColor: 'white', color: 'black', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            Log Today's Vitals
          </button>
        </div>
      )}

      {/* ── Hero Readiness Score — only show if any vitals have been logged today ── */}
      {health.recoveryScore != null && (() => {
        // Count how many of the 3 key metrics were provided today
        const metricCount = [health.sleepDurationMinutes, health.hrv, health.restingHR].filter(v => v != null).length;
        return (
          <div style={{ position: 'relative', backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: `1px solid ${recInfo ? recInfo.color + '30' : 'rgba(255,255,255,0.06)'}`, padding: '1.5rem', overflow: 'hidden' }}>
            {recInfo && (
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: `radial-gradient(circle, ${recInfo.color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
            )}
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', borderRadius: '0 0 2px 2px', background: recInfo ? `linear-gradient(90deg, transparent, ${recInfo.color}, transparent)` : 'transparent' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <ReadinessArc score={currentRecovery} color={recInfo?.color || 'rgba(255,255,255,0.1)'} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: recInfo?.color || 'rgba(255,255,255,0.2)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {currentRecovery > 0 ? currentRecovery : '—'}
                  </span>
                  {currentRecovery > 0 && <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>/ 100</span>}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>Readiness</span>
                  {currentRecovery > 0 && recoveryTrend !== 'flat' && (
                    recoveryTrend === 'up'
                      ? <TrendingUp size={13} color="#4ade80" />
                      : <TrendingDown size={13} color="#f87171" />
                  )}
                </div>
                {recInfo ? (
                  <>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: recInfo.color, letterSpacing: '-0.01em', marginBottom: '6px' }}>{recInfo.label}</div>
                    <p style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: 0 }}>{recInfo.advice}</p>
                  </>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, margin: 0 }}>Log your morning vitals to calculate your daily readiness score.</p>
                )}
                {metricCount < 3 && (
                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600, margin: '6px 0 0' }}>
                    Based on {metricCount} of 3 metrics
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Metrics Grid — only show if any vitals today ── */}
      {(health.sleepDurationMinutes != null || health.hrv != null || health.restingHR != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {/* Sleep */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.06)', padding: '0.9rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.6), transparent)', borderRadius: '18px 18px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ padding: '5px', borderRadius: '8px', backgroundColor: 'rgba(96,165,250,0.12)' }}>
                <Moon size={14} color="#60a5fa" />
              </div>
              {health.sleepScore != null && !isNaN(health.sleepScore) && (
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: health.sleepScore >= 80 ? '#4ade80' : health.sleepScore >= 60 ? '#fb923c' : '#f87171', backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '5px' }}>
                  {Math.round(health.sleepScore)}%
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '3px' }}>Sleep</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{sleepHours || '—'}</div>
            {health.sleepDurationMinutes != null && (
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginTop: '3px', fontWeight: 600 }}>
                {health.sleepDurationMinutes >= 420 ? 'Well rested' : health.sleepDurationMinutes >= 360 ? 'Adequate' : 'Insufficient'}
              </div>
            )}
          </div>

          {/* HRV */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.06)', padding: '0.9rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.6), transparent)', borderRadius: '18px 18px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ padding: '5px', borderRadius: '8px', backgroundColor: 'rgba(74,222,128,0.12)' }}>
                <Activity size={14} color="#4ade80" />
              </div>
              {yesterday?.hrv != null && health.hrv != null && !isNaN(health.hrv) && !isNaN(yesterday.hrv) && (
                health.hrv > yesterday.hrv
                  ? <TrendingUp size={13} color="#4ade80" />
                  : health.hrv < yesterday.hrv
                    ? <TrendingDown size={13} color="#f87171" />
                    : <Minus size={13} color="rgba(255,255,255,0.3)" />
              )}
            </div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '3px' }}>HRV</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {(health.hrv != null && !isNaN(health.hrv)) ? health.hrv : '—'}
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginLeft: '2px' }}>
                {(health.hrv != null && !isNaN(health.hrv)) ? 'ms' : ''}
              </span>
            </div>
            {yesterday?.hrv != null && health.hrv != null && !isNaN(health.hrv) && !isNaN(yesterday.hrv) && (
              <div style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: '3px', color: health.hrv >= yesterday.hrv ? '#4ade80' : '#f87171' }}>
                {health.hrv >= yesterday.hrv ? '+' : ''}{health.hrv - yesterday.hrv} vs yday
              </div>
            )}
          </div>

          {/* RHR */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.06)', padding: '0.9rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(251,146,60,0.6), transparent)', borderRadius: '18px 18px 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ padding: '5px', borderRadius: '8px', backgroundColor: 'rgba(251,146,60,0.12)' }}>
                <Zap size={14} color="#fb923c" />
              </div>
              {yesterday?.restingHR != null && health.restingHR != null && !isNaN(health.restingHR) && !isNaN(yesterday.restingHR) && (
                health.restingHR < yesterday.restingHR
                  ? <TrendingDown size={13} color="#4ade80" />
                  : health.restingHR > yesterday.restingHR
                    ? <TrendingUp size={13} color="#f87171" />
                    : <Minus size={13} color="rgba(255,255,255,0.3)" />
              )}
            </div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '3px' }}>Rest HR</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {(health.restingHR != null && !isNaN(health.restingHR)) ? health.restingHR : '—'}
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginLeft: '2px' }}>
                {(health.restingHR != null && !isNaN(health.restingHR)) ? 'bpm' : ''}
              </span>
            </div>
            {health.restingHR != null && !isNaN(health.restingHR) && (
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginTop: '3px', fontWeight: 600 }}>
                {health.restingHR <= 50 ? 'Athletic' : health.restingHR <= 60 ? 'Good' : health.restingHR <= 70 ? 'Normal' : 'Elevated'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 14-Day Recovery Trend — guard against empty data ── */}
      {hasTrendData && (
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.5), transparent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>14-Day Trend</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: '1px' }}>Recovery & HRV</div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: 8, height: 3, backgroundColor: '#4ade80', borderRadius: '2px' }} />
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Recovery</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: 8, height: 2, backgroundColor: '#60a5fa', borderRadius: '2px', opacity: 0.7 }} />
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>HRV</span>
              </div>
            </div>
          </div>
          <div style={{ height: '120px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {/* @ts-ignore */}
              <LineChart data={trendData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontWeight: 700 }} interval={1} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#1a1a1a', padding: '8px 12px', fontSize: '0.78rem' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                />
                <Line type="monotone" dataKey="recovery" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }} connectNulls name="Recovery %" />
                <Line type="monotone" dataKey="hrv" stroke="#60a5fa" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls name="HRV ms" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Score Breakdown — only when today has full data ── */}
      {health.recoveryScore != null && health.sleepDurationMinutes != null && (() => {
        const { sleepScore, hrvScore, loadScore } = calculateRecovery({
          sleepMinutes: health.sleepDurationMinutes!,
          hrv: health.hrv,
          restingHR: health.restingHR,
          workoutsLast48h,
        });
        const hasHrv = hrvScore !== null;
        const items = [
          { label: 'Sleep Quality', value: Math.min(100, Math.max(0, sleepScore)), weight: hasHrv ? '40%' : '65%', color: '#60a5fa' },
          ...(hasHrv ? [{ label: 'HRV', value: Math.min(100, Math.max(0, hrvScore!)), weight: '40%', color: '#4ade80' }] : []),
          { label: 'Training Load', value: Math.min(100, Math.max(0, loadScore)), weight: hasHrv ? '20%' : '35%', color: '#fb923c' },
        ];
        return (
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ padding: '6px', borderRadius: '9px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <Brain size={15} color="rgba(255,255,255,0.5)" />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>Score Breakdown</span>
            </div>
            {items.map(item => (
              <div key={item.label} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '4px' }}>{item.weight}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{isNaN(item.value) ? '—' : item.value}%</span>
                </div>
                <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${isNaN(item.value) ? 0 : item.value}%`, background: `linear-gradient(90deg, ${item.color}90, ${item.color})`, borderRadius: '3px', transition: 'width 0.6s ease', boxShadow: `0 0 6px ${item.color}60` }} />
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Vitals Log Sheet ── */}
      {isLoggingVitals && (
        <div className="animate-slide-up" style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 9002, overflowY: 'auto' }}>
          <div style={{ padding: '1.5rem', paddingBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Sheet header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Morning Vitals</h2>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>Log today's recovery data</p>
              </div>
              <button onClick={() => setIsLoggingVitals(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={16} color="rgba(255,255,255,0.7)" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Sleep card */}
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ padding: '6px', borderRadius: '9px', backgroundColor: 'rgba(96,165,250,0.12)' }}>
                    <Moon size={15} color="#60a5fa" />
                  </div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>Sleep Duration</label>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="number" inputMode="numeric" min="0" max="16"
                      value={vitals.sleepHours}
                      onChange={e => setVitals(v => ({ ...v, sleepHours: e.target.value }))}
                      onBlur={e => setVitals(v => ({ ...v, sleepHours: clampInt(e.target.value, 0, 16) }))}
                      className="input-field"
                      style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
                    />
                    <span style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>hours (0–16)</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="number" inputMode="numeric" min="0" max="59"
                      value={vitals.sleepMins}
                      onChange={e => setVitals(v => ({ ...v, sleepMins: e.target.value }))}
                      onBlur={e => setVitals(v => ({ ...v, sleepMins: clampInt(e.target.value, 0, 59) }))}
                      className="input-field"
                      style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
                    />
                    <span style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>minutes (0–59)</span>
                  </div>
                </div>
              </div>

              {/* HRV card */}
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', padding: '1.25rem', border: `1px solid ${hrvError ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.06)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ padding: '6px', borderRadius: '9px', backgroundColor: 'rgba(74,222,128,0.12)' }}>
                    <Activity size={15} color="#4ade80" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>Morning HRV</label>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', margin: '1px 0 0', fontWeight: 600 }}>From Apple Watch, Garmin, or Whoop</p>
                  </div>
                </div>
                <input
                  type="number" inputMode="numeric" placeholder="65"
                  value={vitals.hrv}
                  onChange={e => { setVitals(v => ({ ...v, hrv: e.target.value })); setHrvError(''); }}
                  onBlur={e => { if (e.target.value) setVitals(v => ({ ...v, hrv: clampInt(e.target.value, 0, 300) })); }}
                  className="input-field"
                  style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
                />
                {hrvError ? (
                  <p style={{ fontSize: '0.68rem', color: '#f87171', textAlign: 'center', marginTop: '6px', fontWeight: 700 }}>{hrvError}</p>
                ) : (
                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '6px', fontWeight: 600 }}>milliseconds · range 0–300 ms</p>
                )}
              </div>

              {/* RHR card */}
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', padding: '1.25rem', border: `1px solid ${rhrError ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.06)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ padding: '6px', borderRadius: '9px', backgroundColor: 'rgba(251,146,60,0.12)' }}>
                    <Zap size={15} color="#fb923c" />
                  </div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>Resting Heart Rate</label>
                </div>
                <input
                  type="number" inputMode="numeric" placeholder="52"
                  value={vitals.restingHR}
                  onChange={e => { setVitals(v => ({ ...v, restingHR: e.target.value })); setRhrError(''); }}
                  onBlur={e => { if (e.target.value) setVitals(v => ({ ...v, restingHR: clampInt(e.target.value, 30, 220) })); }}
                  className="input-field"
                  style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
                />
                {rhrError ? (
                  <p style={{ fontSize: '0.68rem', color: '#f87171', textAlign: 'center', marginTop: '6px', fontWeight: 700 }}>{rhrError}</p>
                ) : (
                  <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '6px', fontWeight: 600 }}>beats per minute · range 30–220 bpm</p>
                )}
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
                // Skip live preview if inputs are out of valid range (would produce misleading score)
                if (hrvNum !== undefined && (isNaN(hrvNum) || hrvNum < 0 || hrvNum > 300)) return null;
                if (rhrNum !== undefined && (isNaN(rhrNum) || rhrNum < 30 || rhrNum > 220)) return null;
                const preview = calculateRecovery({
                  sleepMinutes: totalMin,
                  hrv: hrvNum,
                  restingHR: rhrNum,
                  workoutsLast48h,
                });
                if (!isFinite(preview.score) || isNaN(preview.score)) return null;
                const info = recoveryLabel(preview.score);
                return (
                  <div style={{ padding: '1.25rem', backgroundColor: info.color + '0d', border: `1px solid ${info.color}25`, borderRadius: '20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '80px', borderRadius: '50%', background: `radial-gradient(circle, ${info.color}20 0%, transparent 70%)`, pointerEvents: 'none' }} />
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>Live Preview</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: info.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{preview.score}<span style={{ fontSize: '1.2rem', opacity: 0.6 }}>%</span></div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: info.color, marginTop: '2px' }}>{info.label}</div>
                  </div>
                );
              })()}

              <button
                onClick={saveVitals}
                style={{ padding: '1.1rem', backgroundColor: 'white', color: 'black', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', letterSpacing: '-0.01em' }}
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
