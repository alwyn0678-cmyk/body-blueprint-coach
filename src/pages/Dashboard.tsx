import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProgressRing } from '../components/ProgressRings';
import { MacroBar } from '../components/SharedUI';
import {
  Activity, Droplets, Utensils, Calendar, Zap,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Plus, Minus, Footprints, Flame, Settings, HeartPulse, Dumbbell
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { evaluateWeeklyCheckIn, calculateWeightTrend, calculateStreak, getMacrosFromLog } from '../utils/aiCoachingEngine';
import { getLocalISOString, formatReadableDate } from '../utils/dateUtils';
import { BottomSheet } from '../components/MotionUI';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavigate } from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────────────────────
const Divider = () => (
  <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '0 -1.25rem' }} />
);

export const Dashboard: React.FC = () => {
  const { state, updateUser, showToast, updateDailyLog } = useApp();
  const { user, logs, settings } = state;
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(getLocalISOString());
  const [isWaterSheetOpen, setIsWaterSheetOpen]   = useState(false);
  const [isWeightSheetOpen, setIsWeightSheetOpen] = useState(false);
  const [isStepsSheetOpen, setIsStepsSheetOpen]   = useState(false);
  const [tempWeight, setTempWeight] = useState(user?.weight || 0);
  const [tempSteps, setTempSteps]   = useState(0);

  if (!user) return null;

  const todayDate = getLocalISOString();
  const todayLog = logs[selectedDate] || {
    id: selectedDate, date: selectedDate, steps: 0, waterGlasses: 0,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    workouts: [], health: {}, adherenceScore: 0,
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const next = getLocalISOString(d);
    if (next <= todayDate) setSelectedDate(next);
  };

  const consumed    = getMacrosFromLog(todayLog as any);
  const targets     = user.targets;
  const calRem      = Math.max(0, targets.calories - Math.round(consumed.calories));
  const calPct      = (consumed.calories / targets.calories) * 100;
  const isOver      = consumed.calories > targets.calories;

  // Weekly chart
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = getLocalISOString(d);
    const m = logs[dateStr] ? getMacrosFromLog(logs[dateStr] as any) : { calories: 0, protein: 0 };
    const isFuture = d > new Date();
    return {
      day: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()],
      dateStr,
      calories: Math.round(m.calories),
      protein:  Math.round(m.protein),
      target:   targets.calories,
      isToday:  dateStr === todayDate,
      isFuture,
    };
  });

  // Weekly avg calories (non-future, non-zero days)
  const activeDays = weeklyData.filter(d => !d.isFuture && d.calories > 0);
  const weekAvgCal = activeDays.length > 0
    ? Math.round(activeDays.reduce((sum, d) => sum + d.calories, 0) / activeDays.length)
    : 0;

  // AI coaching
  const trendData  = calculateWeightTrend(logs, user.weight);
  const currentEma = trendData.length > 0 ? trendData[trendData.length - 1].trend : null;
  const evaluation = evaluateWeeklyCheckIn(user, logs, currentEma, { plateauDetection: settings.plateauDetection });
  const streak     = calculateStreak(logs);

  const weekAgoEma  = trendData.length >= 7 ? trendData[trendData.length - 7]?.trend : null;
  const weightDelta = currentEma && weekAgoEma ? currentEma - weekAgoEma : null;
  const weightDeltaStr = weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}kg` : null;
  const weightDeltaGood = weightDelta === null ? null
    : user.goalType === 'fat_loss' ? weightDelta <= 0
    : weightDelta >= 0;

  // Vitals data
  const stepsTarget = user.stepsTarget || 8000;
  const stepsPct = Math.min(100, ((todayLog.steps || 0) / stepsTarget) * 100);
  const waterPct = Math.min(100, (todayLog.waterGlasses / 8) * 100);
  const mealsLogged = Object.values(todayLog.meals).filter((m: any) => m.length > 0).length;
  const workoutsToday = (todayLog.workouts || []).length;

  // Recovery
  const rec = todayLog.health?.recoveryScore;
  const recColor = rec
    ? rec >= 85 ? 'var(--accent-green)'
      : rec >= 70 ? 'var(--accent-blue)'
      : rec >= 50 ? 'var(--accent-orange)'
      : 'var(--accent-red)'
    : 'rgba(255,255,255,0.25)';

  const assignedProgram = state.assignedProgram;
  const programName = assignedProgram === 'male_phase2' ? 'Strength & Size'
    : assignedProgram === 'female_phase1' ? 'Glute & Tone Focus'
    : null;

  const recLabel = rec
    ? rec >= 85
      ? programName ? `Push hard — perfect day for ${programName}` : 'Excellent — push hard today'
      : rec >= 70
      ? programName ? `${programName} — good to go` : 'Good — normal training'
      : rec >= 50
      ? 'Moderate — consider a lighter session'
      : 'Low — prioritise rest & recovery today'
    : null;

  const recCTA = rec
    ? rec >= 50
      ? { label: 'Start Session', path: '/training' }
      : { label: 'View Recovery', path: '/health' }
    : { label: 'Log Vitals', path: '/health' };

  // Handlers
  const handleWaterUpdate = (n: number) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    const v = Math.max(0, Math.min(20, todayLog.waterGlasses + n));
    updateDailyLog(todayDate, { waterGlasses: v });
  };

  const handleWeightSave = () => {
    if (!tempWeight || isNaN(tempWeight)) return;
    updateUser({ weight: tempWeight });
    updateDailyLog(selectedDate, { weight: tempWeight });
    showToast('Weight logged', 'success');
    setIsWeightSheetOpen(false);
  };

  const handleStepsSave = () => {
    updateDailyLog(todayDate, { steps: tempSteps });
    showToast('Steps logged', 'success');
    setIsStepsSheetOpen(false);
  };

  return (
    <div className="flex-col animate-fade-in" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))', backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }}>

      {/* ══════════════════════════════════════════════════
          HERO — date nav + calorie ring + inline macros
          ══════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, var(--bg-card) 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1.375rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle radial glow behind ring */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 320,
          height: 320,
          background: isOver
            ? 'radial-gradient(circle, rgba(255,69,58,0.07) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(10,132,255,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Date nav row */}
        <div className="flex-row justify-between align-center" style={{ padding: '0.75rem 1rem 0.75rem', position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => changeDate(-1)}
            style={{ width: 34, height: 34 }}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex-row align-center gap-2" style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 'var(--radius-full)',
            padding: '0.35rem 0.85rem',
            border: '1px solid var(--border-subtle)',
          }}>
            <Calendar size={13} color="var(--accent-blue)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
              {formatReadableDate(selectedDate)}
            </span>
          </div>

          <div className="flex-row align-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              style={{
                width: 34, height: 34,
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Settings size={15} color="rgba(255,255,255,0.45)" />
            </button>
            <button
              className="btn-icon"
              onClick={() => changeDate(1)}
              disabled={selectedDate >= todayDate}
              style={{ width: 34, height: 34, opacity: selectedDate >= todayDate ? 0.3 : 1 }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Calorie Ring */}
        <div className="flex-col align-center" style={{ padding: '0.25rem 1rem 0', position: 'relative' }}>
          <ProgressRing
            radius={110}
            strokeWidth={10}
            progress={Math.min(calPct, 100)}
            color={isOver ? 'var(--accent-red)' : 'var(--color-calories)'}
            trackColor="rgba(255,255,255,0.05)"
          >
            <div className="flex-col align-center justify-center" style={{ gap: '2px' }}>
              <span style={{
                fontSize: '0.5625rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.35)',
              }}>
                {isOver ? 'Over by' : 'Remaining'}
              </span>
              <span style={{
                fontSize: '3.25rem',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: isOver ? 'var(--accent-red)' : 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {isOver ? Math.round(consumed.calories - targets.calories) : calRem}
              </span>
              <span style={{
                fontSize: '0.5625rem',
                fontWeight: 700,
                color: isOver ? 'var(--accent-red)' : 'var(--color-calories)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                kcal
              </span>
              <span style={{
                fontSize: '0.5625rem',
                color: 'rgba(255,255,255,0.25)',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                marginTop: '2px',
              }}>
                {Math.round(consumed.calories)} / {targets.calories}
              </span>
            </div>
          </ProgressRing>
        </div>

        {/* Inline Macro Row — P / C / F */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.5rem',
          padding: '1rem 1.25rem 0',
        }}>
          {[
            { label: 'Protein', abbr: 'P', value: Math.round(consumed.protein),  target: targets.protein,  color: 'var(--color-protein)' },
            { label: 'Carbs',   abbr: 'C', value: Math.round(consumed.carbs),    target: targets.carbs,    color: 'var(--color-carbs)'   },
            { label: 'Fats',    abbr: 'F', value: Math.round(consumed.fats),     target: targets.fats,     color: 'var(--color-fats)'    },
          ].map(m => {
            const pct = Math.min(100, (m.value / m.target) * 100);
            const over = m.value > m.target;
            return (
              <div key={m.abbr} style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 'var(--radius-md)',
                padding: '0.625rem 0.75rem',
              }}>
                {/* Label row */}
                <div className="flex-row justify-between align-center" style={{ marginBottom: '0.3rem' }}>
                  <span style={{
                    fontSize: '0.5625rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: m.color,
                  }}>
                    {m.abbr}
                  </span>
                  {over && (
                    <span style={{
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      color: 'var(--accent-red)',
                      letterSpacing: '0.04em',
                    }}>over</span>
                  )}
                </div>

                {/* Value */}
                <div className="flex-row align-baseline gap-1" style={{ marginBottom: '0.375rem' }}>
                  <span style={{
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    color: over ? 'var(--accent-red)' : 'var(--text-primary)',
                    lineHeight: 1,
                  }}>
                    {m.value}
                  </span>
                  <span style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    / {m.target}g
                  </span>
                </div>

                {/* Thin progress bar */}
                <div style={{
                  height: 3,
                  borderRadius: 99,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: 99,
                    backgroundColor: over ? 'var(--accent-red)' : m.color,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CONTENT SECTIONS
          ══════════════════════════════════════════════════ */}
      <div className="flex-col gap-3" style={{ padding: '1rem' }}>

        {/* ── Quick Stats 2-col ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

          {/* Weight card */}
          <div
            onClick={() => { setTempWeight(user.weight); setIsWeightSheetOpen(true); }}
            style={{
              cursor: 'pointer',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* subtle accent top line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(10,132,255,0.5), transparent)',
            }} />
            <div className="flex-row justify-between align-center" style={{ marginBottom: '0.5rem' }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(10,132,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <TrendingUp size={14} color="var(--accent-blue)" />
              </div>
              {weightDeltaStr && (
                <span style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: weightDeltaGood ? 'var(--accent-green)' : 'var(--accent-red)',
                  backgroundColor: weightDeltaGood ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)',
                  padding: '0.15rem 0.4rem',
                  borderRadius: 'var(--radius-full)',
                }}>
                  {weightDeltaStr}
                </span>
              )}
            </div>
            <div className="flex-row align-baseline gap-1">
              <span style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {user.weight}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>kg</span>
            </div>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem' }}>
              Weight
            </span>
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, display: 'block', marginTop: '0.15rem', letterSpacing: '0.04em' }}>
              TAP TO LOG
            </span>
          </div>

          {/* Streak card */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: streak > 0
                ? 'linear-gradient(90deg, transparent, rgba(255,159,10,0.6), transparent)'
                : 'none',
            }} />
            <div className="flex-row justify-between align-center" style={{ marginBottom: '0.5rem' }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255,159,10,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Flame size={14} color="var(--accent-orange)" />
              </div>
              {streak >= 3 && (
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent-orange)', backgroundColor: 'rgba(255,159,10,0.12)', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-full)' }}>
                  🔥 {streak}d
                </span>
              )}
            </div>
            <div className="flex-row align-baseline gap-1">
              <span style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {streak}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>days</span>
            </div>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem' }}>
              Logging Streak
            </span>
            <span style={{ fontSize: '0.5rem', color: streak > 0 ? 'rgba(255,159,10,0.4)' : 'rgba(255,255,255,0.15)', fontWeight: 600, display: 'block', marginTop: '0.15rem', letterSpacing: '0.04em' }}>
              {streak === 0 ? 'START TODAY' : streak >= 7 ? 'INCREDIBLE RUN' : 'KEEP IT UP'}
            </span>
          </div>
        </div>

        {/* ── Weekly Performance Chart ── */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Gradient top-edge accent */}
          <div style={{
            height: 3,
            background: 'linear-gradient(90deg, transparent 0%, rgba(10,132,255,0.6) 30%, rgba(48,209,88,0.5) 70%, transparent 100%)',
          }} />

          <div style={{ padding: '1rem 1rem 0.75rem' }}>
            {/* Header row with week avg */}
            <div className="flex-row justify-between align-center" style={{ marginBottom: '0.875rem' }}>
              <div className="flex-col" style={{ gap: '2px' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '-0.01em' }}>7-Day Performance</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Calories & protein</span>
              </div>
              <div className="flex-col align-end" style={{ gap: '2px' }}>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                  color: weekAvgCal > targets.calories ? 'var(--accent-red)' : weekAvgCal > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}>
                  {weekAvgCal > 0 ? weekAvgCal.toLocaleString() : '—'}
                </span>
                <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
                  avg kcal / day
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-row gap-3 align-center" style={{ marginBottom: '0.625rem' }}>
              {[
                { color: 'var(--accent-primary)', label: 'Calories' },
                { color: 'var(--color-protein)',  label: 'Protein' },
              ].map(l => (
                <div key={l.label} className="flex-row align-center gap-1">
                  <div style={{ width: 6, height: 6, borderRadius: '2px', backgroundColor: l.color }} />
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l.label}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barGap={2} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.09)',
                      backgroundColor: '#0D0D0D',
                      padding: '10px 14px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                    }}
                    itemStyle={{ fontWeight: 700, fontSize: 12 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: 11, marginBottom: 4 }}
                  />
                  <Bar dataKey="calories" radius={[3,3,0,0]} barSize={9}>
                    {weeklyData.map((e, i) => (
                      <Cell
                        key={i}
                        fill={
                          e.isFuture   ? 'rgba(255,255,255,0.05)'
                          : e.calories > e.target ? 'var(--accent-red)'
                          : e.isToday  ? 'var(--accent-blue)'
                          : 'rgba(255,255,255,0.6)'
                        }
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="protein" radius={[3,3,0,0]} barSize={9}>
                    {weeklyData.map((e, i) => (
                      <Cell
                        key={i}
                        fill={e.isFuture ? 'rgba(255,159,10,0.1)' : 'var(--color-protein)'}
                        fillOpacity={e.isFuture ? 0.3 : 0.85}
                      />
                    ))}
                  </Bar>
                  <ReferenceLine y={targets.calories} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 3" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── AI Coaching Panel ── */}
        {settings.adaptiveCoaching && (
          <div>
          {settings.weeklyCheckIn ? (
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: `1px solid ${
              evaluation.urgency === 'high'   ? 'rgba(255,69,58,0.3)'
              : evaluation.urgency === 'medium' ? 'rgba(255,159,10,0.22)'
              : 'var(--border-default)'
            }`,
            overflow: 'hidden',
          }}>
            {/* Top accent line */}
            <div style={{
              height: 2,
              background: evaluation.urgency === 'high'
                ? 'linear-gradient(90deg, transparent, rgba(255,69,58,0.8), transparent)'
                : evaluation.urgency === 'medium'
                ? 'linear-gradient(90deg, transparent, rgba(255,159,10,0.7), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            }} />

            <div style={{ padding: '1.125rem 1.25rem 1.25rem' }}>
              {/* Header */}
              <div className="flex-row align-center gap-3" style={{ marginBottom: '0.875rem' }}>
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 10,
                  background: evaluation.urgency === 'high'
                    ? 'rgba(255,69,58,0.12)'
                    : evaluation.urgency === 'medium'
                    ? 'rgba(255,159,10,0.12)'
                    : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${
                    evaluation.urgency === 'high'   ? 'rgba(255,69,58,0.25)'
                    : evaluation.urgency === 'medium' ? 'rgba(255,159,10,0.2)'
                    : 'rgba(255,255,255,0.08)'
                  }`,
                }}>
                  <Zap size={16} color={
                    evaluation.urgency === 'high' ? 'var(--accent-red)'
                    : evaluation.urgency === 'medium' ? 'var(--accent-orange)'
                    : 'rgba(255,255,255,0.5)'
                  } />
                </div>
                <div className="flex-col" style={{ gap: '2px', flex: 1 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.01em' }}>AI Coach</span>
                  <span style={{
                    fontSize: '0.5625rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.09em',
                    color: evaluation.urgency === 'high'
                      ? 'var(--accent-red)'
                      : evaluation.urgency === 'medium'
                      ? 'var(--accent-orange)'
                      : 'var(--text-tertiary)',
                  }}>
                    {evaluation.urgency === 'high' ? 'Action Required' : evaluation.urgency === 'medium' ? 'Recommendation' : 'Weekly Analysis'}
                  </span>
                </div>
              </div>

              {/* Reasoning */}
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.025)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                border: '1px solid rgba(255,255,255,0.05)',
                marginBottom: evaluation.newTargets ? '0.875rem' : 0,
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.65,
                  fontWeight: 400,
                  margin: 0,
                }}>
                  {evaluation.reasoning}
                </p>
              </div>

              {evaluation.newTargets && (
                <button
                  onClick={() => {
                    updateUser({ targets: evaluation.newTargets });
                    showToast('Calorie target updated', 'success');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${evaluation.urgency === 'high' ? 'rgba(255,69,58,0.4)' : 'rgba(255,255,255,0.13)'}`,
                    background: evaluation.urgency === 'high'
                      ? 'linear-gradient(135deg, rgba(255,69,58,0.12), rgba(255,69,58,0.05))'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>Apply Adjustment</span>
                  <span style={{ opacity: 0.5 }}>→</span>
                  <span style={{ color: evaluation.urgency === 'high' ? 'var(--accent-red)' : 'var(--accent-blue)' }}>
                    {evaluation.newTargets.calories} kcal
                  </span>
                </button>
              )}
            </div>
          </div>
          ) : (
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', padding: '1.125rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={16} color="rgba(255,255,255,0.25)" />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Weekly Check-In Paused</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Enable in Settings → Coaching Engine to resume adaptive analysis.</div>
                </div>
              </div>
            </div>
          )}
          </div>
        )}

        {/* ── Daily Vitals ── */}
        <div className="flex-col gap-2">
          <span className="section-title" style={{ padding: '0.25rem 0.25rem 0' }}>Daily Vitals</span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>

            {/* Water tile */}
            <div
              onClick={() => setIsWaterSheetOpen(true)}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(145deg, rgba(10,132,255,0.08) 0%, rgba(10,132,255,0.03) 100%)',
                border: '1px solid rgba(10,132,255,0.18)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem',
              }}
            >
              {/* Icon with glow */}
              <div style={{
                width: 32, height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(10,132,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.625rem',
                boxShadow: '0 0 12px rgba(10,132,255,0.2)',
              }}>
                <Droplets size={16} color="var(--accent-blue)" />
              </div>

              <div className="flex-row align-baseline gap-1" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.625rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {todayLog.waterGlasses}
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>/ 8</span>
              </div>

              <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(10,132,255,0.8)', display: 'block', marginBottom: '0.625rem' }}>
                Hydration
              </span>

              {/* 8 glass dots */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: i < todayLog.waterGlasses ? 'var(--accent-blue)' : 'rgba(10,132,255,0.12)',
                    border: `1px solid ${i < todayLog.waterGlasses ? 'rgba(10,132,255,0.5)' : 'rgba(10,132,255,0.15)'}`,
                    transition: 'background-color 0.2s',
                  }} />
                ))}
              </div>
            </div>

            {/* Steps tile */}
            <div
              onClick={() => { setTempSteps(todayLog.steps || 0); setIsStepsSheetOpen(true); }}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(145deg, rgba(48,209,88,0.07) 0%, rgba(48,209,88,0.02) 100%)',
                border: '1px solid rgba(48,209,88,0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem',
              }}
            >
              <div style={{
                width: 32, height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(48,209,88,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.625rem',
                boxShadow: '0 0 12px rgba(48,209,88,0.15)',
              }}>
                <Footprints size={16} color="var(--accent-green)" />
              </div>

              <div className="flex-row align-baseline gap-1" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.375rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {(todayLog.steps || 0).toLocaleString()}
                </span>
              </div>

              <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(48,209,88,0.8)', display: 'block', marginBottom: '0.625rem' }}>
                Steps
              </span>

              {/* Progress bar toward target */}
              <div>
                <div style={{ height: 3, borderRadius: 99, backgroundColor: 'rgba(48,209,88,0.1)', overflow: 'hidden', marginBottom: '0.25rem' }}>
                  <div style={{
                    height: '100%',
                    width: `${stepsPct}%`,
                    borderRadius: 99,
                    backgroundColor: stepsPct >= 100 ? 'var(--accent-green)' : 'var(--accent-green)',
                    opacity: stepsPct >= 100 ? 1 : 0.7,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.04em' }}>
                  / {stepsTarget.toLocaleString()} goal
                </span>
              </div>
            </div>

            {/* Meals tile */}
            <div
              onClick={() => navigate('/log')}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(145deg, rgba(255,159,10,0.07) 0%, rgba(255,159,10,0.02) 100%)',
                border: '1px solid rgba(255,159,10,0.14)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem',
              }}
            >
              <div style={{
                width: 32, height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(255,159,10,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.625rem',
                boxShadow: '0 0 12px rgba(255,159,10,0.15)',
              }}>
                <Utensils size={16} color="var(--accent-orange)" />
              </div>

              <div className="flex-row align-baseline gap-1" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.625rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {mealsLogged}
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>/ 4</span>
              </div>

              <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,159,10,0.8)', display: 'block', marginBottom: '0.625rem' }}>
                Meals Logged
              </span>

              {/* Meal progress bar */}
              <div>
                <div style={{ height: 3, borderRadius: 99, backgroundColor: 'rgba(255,159,10,0.1)', overflow: 'hidden', marginBottom: '0.25rem' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (mealsLogged / 4) * 100)}%`,
                    borderRadius: 99,
                    backgroundColor: 'var(--accent-orange)',
                    opacity: 0.8,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.04em' }}>
                  TAP TO LOG FOOD
                </span>
              </div>
            </div>

            {/* Training tile */}
            <div
              onClick={() => navigate('/training')}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem',
              }}
            >
              <div style={{
                width: 32, height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.625rem',
              }}>
                <Dumbbell size={16} color="rgba(255,255,255,0.55)" />
              </div>

              <div className="flex-row align-baseline gap-1" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.625rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {workoutsToday}
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>sessions</span>
              </div>

              <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.625rem' }}>
                Training
              </span>

              <div>
                <div style={{ height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: '0.25rem' }}>
                  <div style={{
                    height: '100%',
                    width: workoutsToday > 0 ? '100%' : '0%',
                    borderRadius: 99,
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.04em' }}>
                  TAP TO LOG SESSION
                </span>
              </div>
            </div>
          </div>

          {/* Recovery tile — full width */}
          <div style={{
            background: rec
              ? `linear-gradient(135deg, ${recColor}12 0%, ${recColor}04 100%)`
              : 'rgba(255,255,255,0.02)',
            border: `1px solid ${rec ? recColor + '35' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* top accent glow line */}
            {rec && (
              <div style={{
                height: 2,
                background: `linear-gradient(90deg, transparent, ${recColor}80, transparent)`,
              }} />
            )}

            <div style={{ padding: '1rem 1.125rem' }}>
              {/* Top row: icon + label + score */}
              <div className="flex-row align-center justify-between" style={{ marginBottom: recLabel ? '0.625rem' : 0 }}>
                <div className="flex-row align-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: 10,
                    backgroundColor: rec ? recColor + '18' : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: rec ? `0 0 14px ${recColor}22` : 'none',
                  }}>
                    <HeartPulse size={17} color={recColor} />
                  </div>
                  <div className="flex-col" style={{ gap: '2px', minWidth: 0 }}>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: recColor }}>
                      Recovery Score
                    </span>
                    {!rec && (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                        Log vitals to unlock
                      </span>
                    )}
                  </div>
                </div>

                {rec ? (
                  <div className="flex-row align-baseline gap-1">
                    <span style={{
                      fontSize: '2.25rem',
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.03em',
                      color: recColor,
                      lineHeight: 1,
                    }}>{rec}</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>%</span>
                  </div>
                ) : null}
              </div>

              {/* Recommendation row */}
              {recLabel && (
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${recColor}22`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  marginBottom: '0.75rem',
                }}>
                  <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500, lineHeight: 1.4 }}>
                    {recLabel}
                  </span>
                </div>
              )}

              {/* CTA button */}
              <button
                onClick={() => navigate(recCTA.path)}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${rec && rec >= 50 ? recColor + '40' : 'rgba(255,255,255,0.1)'}`,
                  background: rec && rec >= 50
                    ? `linear-gradient(135deg, ${recColor}18, ${recColor}08)`
                    : 'rgba(255,255,255,0.04)',
                  color: rec && rec >= 50 ? recColor : 'rgba(255,255,255,0.45)',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  letterSpacing: '-0.01em',
                }}
              >
                {recCTA.label}
                <span style={{ opacity: 0.6 }}>→</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Water Sheet ── */}
      <BottomSheet isOpen={isWaterSheetOpen} onClose={() => setIsWaterSheetOpen(false)}>
        <div className="flex-col align-center gap-6 pb-2">
          <div style={{ textAlign: 'center' }}>
            <h2 className="text-h2" style={{ marginBottom: '0.25rem' }}>Hydration</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Target: 8 glasses per day</p>
          </div>
          <div className="flex-row justify-center align-center gap-8">
            <button
              onClick={() => handleWaterUpdate(-1)}
              style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Minus size={20} />
            </button>
            <span style={{ fontSize: '4.5rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', width: '70px', textAlign: 'center', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {todayLog.waterGlasses}
            </span>
            <button
              onClick={() => handleWaterUpdate(1)}
              style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', border: 'none', backgroundColor: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Plus size={20} color="white" />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                onClick={() => updateDailyLog(todayDate, { waterGlasses: i + 1 })}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  backgroundColor: i < todayLog.waterGlasses ? 'var(--accent-blue)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${i < todayLog.waterGlasses ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer', transition: 'background-color 0.2s',
                }}
              />
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* ── Weight Sheet ── */}
      <BottomSheet isOpen={isWeightSheetOpen} onClose={() => setIsWeightSheetOpen(false)}>
        <div className="flex-col align-center gap-6 pb-2">
          <div style={{ textAlign: 'center' }}>
            <h2 className="text-h2" style={{ marginBottom: '0.25rem' }}>Log Weight</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Morning measurement recommended</p>
          </div>
          <div className="flex-row justify-center align-baseline gap-2">
            <input
              type="number"
              step="0.1"
              value={tempWeight}
              onChange={e => setTempWeight(Number(e.target.value))}
              style={{
                fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums', width: '160px', textAlign: 'center',
                background: 'transparent', border: 'none',
                borderBottom: '2px solid rgba(255,255,255,0.15)', outline: 'none',
                letterSpacing: '-0.04em', paddingBottom: '4px',
              }}
            />
            <span style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>kg</span>
          </div>
          {currentEma && (
            <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: '0.625rem 1.25rem', border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Trend: <strong style={{ color: 'var(--text-primary)' }}>{currentEma.toFixed(1)} kg</strong>
              </span>
            </div>
          )}
          <button className="btn-primary w-full" style={{ padding: '0.9rem' }} onClick={handleWeightSave}>
            Save Weight
          </button>
        </div>
      </BottomSheet>

      {/* ── Steps Sheet ── */}
      <BottomSheet isOpen={isStepsSheetOpen} onClose={() => setIsStepsSheetOpen(false)}>
        <div className="flex-col align-center gap-6 pb-2">
          <div style={{ textAlign: 'center' }}>
            <h2 className="text-h2" style={{ marginBottom: '0.25rem' }}>Log Steps</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Target: {(user.stepsTarget || 8000).toLocaleString()} steps
            </p>
          </div>
          <input
            type="number"
            value={tempSteps}
            onChange={e => setTempSteps(Number(e.target.value))}
            style={{
              fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums', width: '220px', textAlign: 'center',
              background: 'transparent', border: 'none',
              borderBottom: '2px solid rgba(255,255,255,0.15)', outline: 'none',
              letterSpacing: '-0.03em', paddingBottom: '4px',
            }}
          />
          <div className="flex-row gap-2" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {[2000, 5000, 8000, 10000, 12000].map(n => (
              <button
                key={n}
                onClick={() => setTempSteps(n)}
                style={{
                  padding: '0.4rem 0.875rem',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${tempSteps === n ? 'var(--accent-green)' : 'var(--border-default)'}`,
                  backgroundColor: tempSteps === n ? 'rgba(48,209,88,0.12)' : 'transparent',
                  color: tempSteps === n ? 'var(--accent-green)' : 'var(--text-secondary)',
                  fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
                }}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full" style={{ padding: '0.9rem' }} onClick={handleStepsSave}>
            Save Steps
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
