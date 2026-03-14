import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { TrendingDown, TrendingUp, Scale, Plus, Target, CheckCircle2, Flame, ChevronRight, Award, BarChart2 } from 'lucide-react';
import { calculateWeightTrend, getMacrosFromLog, computeWeeklyStats } from '../utils/aiCoachingEngine';
import { getLocalISOString } from '../utils/dateUtils';
import { BottomSheet } from '../components/MotionUI';

type Timeframe = '7D' | '14D' | '30D' | '90D';

const safeNum = (v: number | undefined | null, fallback = 0): number => {
  if (v === undefined || v === null || isNaN(v) || !isFinite(v)) return fallback;
  return v;
};

const countLoggedDaysInWeek = (logs: Record<string, any>): number => {
  let count = 0;
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const dateStr = d.toISOString().split('T')[0];
    if (logs[dateStr]) count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
};

// ── Section label ──
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{
    fontSize: '0.62rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.28)',
    marginBottom: '10px',
    margin: '0 0 10px',
  }}>
    {children}
  </p>
);

// ── Card wrapper ──
const MetricCard: React.FC<{ children: React.ReactNode; accentColor?: string; style?: React.CSSProperties }> = ({ children, accentColor, style }) => (
  <div style={{
    backgroundColor: 'var(--bg-card)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    overflow: 'hidden',
    ...style,
  }}>
    {accentColor && (
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
    )}
    {children}
  </div>
);

export const Progress: React.FC = () => {
  const { state, updateDailyLog, updateUser, showToast } = useApp();
  const { user, logs } = state;
  const [timeframe, setTimeframe] = useState<Timeframe>('7D');
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [newWeight, setNewWeight] = useState(user?.weight?.toString() || '');
  const [newGoalWeight, setNewGoalWeight] = useState(user?.goalWeight?.toString() || '');
  const [weightInputError, setWeightInputError] = useState('');
  const [goalWeightError, setGoalWeightError] = useState('');

  const todayDate = getLocalISOString();

  const allTrendData = user ? calculateWeightTrend(logs, safeNum(user.weight)) : [];

  const chartData = useMemo(() => {
    const days = timeframe === '7D' ? 7 : timeframe === '14D' ? 14 : timeframe === '30D' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const sortedDates = Object.keys(logs).sort();
    if (sortedDates.length === 0) return [];

    const trendByDate = new Map(allTrendData.map((t, i) => [sortedDates[i], t]));
    const filtered = sortedDates
      .filter(d => d >= cutoffStr)
      .map(d => {
        const log = logs[d];
        const trendEntry = trendByDate.get(d);
        const rawWeight = log?.weight ?? null;
        const rawTrend = trendEntry?.trend ?? null;
        return {
          date: d.slice(5),
          weight: (rawWeight != null && !isNaN(rawWeight)) ? rawWeight : null,
          trend: (rawTrend != null && !isNaN(rawTrend)) ? rawTrend : null,
        };
      });

    if (filtered.length === 0) return allTrendData.slice(-days) || [];
    return filtered;
  }, [logs, timeframe, allTrendData]);

  const macroAdherenceData = useMemo(() => {
    if (!user) return null;
    const days = timeframe === '7D' ? 7 : timeframe === '14D' ? 14 : timeframe === '30D' ? 30 : 90;
    let totalCal = 0, totalPro = 0, totalCarbs = 0, totalFats = 0;
    let daysWithData = 0;
    const d = new Date();
    for (let i = 0; i < days; i++) {
      const target = new Date(d);
      target.setDate(d.getDate() - i);
      const dateStr = target.toISOString().split('T')[0];
      const log = logs[dateStr];
      if (log) {
        const macros = getMacrosFromLog(log as any);
        totalCal += isNaN(macros.calories) ? 0 : macros.calories;
        totalPro += isNaN(macros.protein) ? 0 : macros.protein;
        const logAny = log as any;
        const carbs = logAny.meals
          ? Object.values(logAny.meals).flat().reduce((a: number, e: any) => a + safeNum(e?.nutrition?.carbs), 0)
          : 0;
        const fats = logAny.meals
          ? Object.values(logAny.meals).flat().reduce((a: number, e: any) => a + safeNum(e?.nutrition?.fats), 0)
          : 0;
        totalCarbs += carbs;
        totalFats += fats;
        daysWithData++;
      }
    }
    if (daysWithData === 0) return null;
    return {
      avgCal: Math.round(totalCal / daysWithData),
      avgPro: Math.round(totalPro / daysWithData),
      avgCarbs: Math.round(totalCarbs / daysWithData),
      avgFats: Math.round(totalFats / daysWithData),
    };
  }, [logs, timeframe, user]);

  const weeklyStats = user ? computeWeeklyStats(logs, user.targets) : null;
  const loggedDaysInWeek = countLoggedDaysInWeek(logs);

  const hasAnyWeightData = Object.values(logs).some(l => l.weight != null && !isNaN(l.weight as number));

  const lastTrend = allTrendData.filter(t => t.trend != null && !isNaN(t.trend as number));
  const trendDelta = lastTrend.length >= 7
    ? (() => {
        const delta = (lastTrend[lastTrend.length - 1].trend! - lastTrend[lastTrend.length - 7].trend!);
        return isNaN(delta) || !isFinite(delta) ? null : delta.toFixed(2);
      })()
    : null;
  const trendPositive = trendDelta !== null && parseFloat(trendDelta) > 0;

  const weightToGoal = (user?.goalWeight != null && !isNaN(user.goalWeight))
    ? Math.abs(safeNum(user.weight) - user.goalWeight)
    : null;

  const currentWeight = user?.weight;
  const latestLoggedWeight = Object.entries(logs)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .find(([, log]) => log.weight != null)?.[1]?.weight;

  // EMA 7d avg from trend data
  const ema7 = lastTrend.length > 0
    ? lastTrend[lastTrend.length - 1].trend
    : null;

  // Estimated weeks to goal
  const weeksToGoal = useMemo(() => {
    if (!user?.goalWeight || trendDelta === null) return null;
    const weeklyRate = Math.abs(parseFloat(trendDelta));
    if (weeklyRate < 0.05) return null;
    const remaining = Math.abs(safeNum(user.weight) - user.goalWeight);
    return Math.ceil(remaining / weeklyRate);
  }, [user, trendDelta]);

  const handleLogWeight = () => {
    const val = parseFloat(newWeight);
    if (isNaN(val) || !isFinite(val) || val < 20 || val > 400) {
      setWeightInputError('Weight must be between 20 and 400 kg');
      return;
    }
    setWeightInputError('');
    updateDailyLog(todayDate, { weight: val });
    updateUser({ weight: val });
    showToast('Weight logged', 'success');
    setShowLogWeight(false);
  };

  const handleSaveGoal = () => {
    const val = parseFloat(newGoalWeight);
    if (isNaN(val) || !isFinite(val) || val < 20 || val > 400) {
      setGoalWeightError('Goal weight must be between 20 and 400 kg');
      return;
    }
    setGoalWeightError('');
    updateUser({ goalWeight: val });
    showToast('Goal weight updated', 'success');
    setShowGoalEdit(false);
  };

  // Delta badge color logic based on goal
  const deltaIsGood = trendDelta !== null
    ? user?.goalType === 'muscle_gain' ? trendPositive : !trendPositive
    : null;

  const deltaBadgeColor = deltaIsGood === null
    ? 'rgba(255,255,255,0.2)'
    : deltaIsGood ? 'var(--accent-green)' : 'var(--accent-red)';
  const deltaBadgeBg = deltaIsGood === null
    ? 'rgba(255,255,255,0.06)'
    : deltaIsGood ? 'rgba(50,215,75,0.1)' : 'rgba(255,69,58,0.1)';

  const TIMEFRAMES: Timeframe[] = ['7D', '14D', '30D', '90D'];

  return (
    <div style={{
      paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
      backgroundColor: 'var(--bg-primary)',
      minHeight: '100dvh',
    }} className="animate-fade-in">

      {/* ── Page Header ── */}
      <div style={{
        padding: '1.25rem 1.25rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.025em', margin: 0 }}>Progress</h1>
          {/* Time filter pills */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '50px', padding: '3px' }}>
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '50px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  backgroundColor: timeframe === tf ? '#fff' : 'transparent',
                  color: timeframe === tf ? '#000' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '1.25rem' }}>

        {/* ── Empty state: no weight data ── */}
        {!hasAnyWeightData && (
          <div
            onClick={() => { setNewWeight(user?.weight?.toString() || ''); setShowLogWeight(true); }}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '20px',
              border: '1px dashed rgba(255,255,255,0.1)',
              padding: '2rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: 'rgba(10,132,255,0.08)',
              border: '1px solid rgba(10,132,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BarChart2 size={24} color="var(--accent-blue)" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '4px' }}>Start tracking your weight</div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                Log your first entry — your trend chart will appear here.
              </p>
            </div>
            <div style={{
              padding: '0.55rem 1.5rem',
              backgroundColor: 'var(--accent-blue)',
              borderRadius: '50px',
              fontSize: '0.875rem',
              fontWeight: 800,
              color: '#fff',
            }}>
              Log First Entry
            </div>
          </div>
        )}

        {/* ── 1. WEIGHT TREND CARD ── */}
        <div>
          <SectionLabel>WEIGHT TREND</SectionLabel>
          <MetricCard accentColor="rgba(10,132,255,0.6)">
            <div style={{ padding: '1.1rem 1.25rem 1rem' }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {(currentWeight != null && !isNaN(currentWeight)) ? currentWeight : '—'}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>kg</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: '3px', margin: '3px 0 0' }}>current weight</p>
                </div>
                {trendDelta !== null && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '50px',
                    backgroundColor: deltaBadgeBg,
                    border: `1px solid ${deltaBadgeColor}30`,
                  }}>
                    {trendPositive
                      ? <TrendingUp size={12} color={deltaBadgeColor} />
                      : <TrendingDown size={12} color={deltaBadgeColor} />
                    }
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: deltaBadgeColor }}>
                      {trendPositive ? '+' : ''}{trendDelta} kg
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>wk</span>
                  </div>
                )}
              </div>

              {/* Area chart */}
              {chartData.length > 0 ? (
                <div style={{ height: 140, marginLeft: -8, marginRight: -8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.12} />
                          <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontWeight: 600 }}
                        dy={8}
                        interval={timeframe === '90D' ? 8 : timeframe === '30D' ? 3 : 0}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 14,
                          border: '1px solid rgba(255,255,255,0.08)',
                          backgroundColor: '#111',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          padding: '10px 14px',
                        }}
                        labelStyle={{ fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}
                        itemStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.07)', strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth={1.5}
                        strokeDasharray="3 4"
                        fill="url(#weightAreaGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#fff', strokeWidth: 0 }}
                        name="Scale Weight"
                        connectNulls={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="trend"
                        stroke="var(--accent-blue)"
                        strokeWidth={2.5}
                        fill="url(#trendAreaGrad)"
                        dot={false}
                        activeDot={{ r: 5, fill: 'var(--bg-primary)', stroke: 'var(--accent-blue)', strokeWidth: 2 }}
                        name="7d Trend"
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>No weight data yet</span>
                </div>
              )}

              {/* Stat pills row */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {[
                  { label: 'current', value: currentWeight != null ? `${currentWeight}kg` : '—' },
                  { label: 'goal', value: user?.goalWeight != null ? `${user.goalWeight}kg` : '—' },
                  { label: '7d avg', value: ema7 != null ? `${ema7.toFixed(1)}kg` : '—' },
                ].map(pill => (
                  <div key={pill.label} style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderRadius: '12px',
                    padding: '0.65rem 0.5rem',
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: '#fff' }}>{pill.value}</div>
                    <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '2px' }}>{pill.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </MetricCard>
        </div>

        {/* ── 2. MACRO ADHERENCE CARD ── */}
        {weeklyStats && (
          <div>
            <SectionLabel>MACRO ADHERENCE</SectionLabel>
            <MetricCard accentColor="rgba(255,159,10,0.5)">
              <div style={{ padding: '1.1rem 1.25rem' }}>
                {[
                  {
                    key: 'Cal',
                    avg: isNaN(weeklyStats.avgCalories) ? 0 : weeklyStats.avgCalories,
                    target: safeNum(user?.targets.calories),
                    unit: 'kcal',
                    color: 'var(--accent-orange)',
                  },
                  {
                    key: 'Pro',
                    avg: isNaN(weeklyStats.avgProtein) ? 0 : weeklyStats.avgProtein,
                    target: safeNum(user?.targets.protein),
                    unit: 'g',
                    color: 'var(--accent-blue)',
                  },
                  {
                    key: 'Carb',
                    avg: isNaN(weeklyStats.avgCarbs) ? 0 : weeklyStats.avgCarbs,
                    target: safeNum(user?.targets.carbs),
                    unit: 'g',
                    color: 'var(--accent-green)',
                  },
                  {
                    key: 'Fat',
                    avg: isNaN(weeklyStats.avgFats) ? 0 : weeklyStats.avgFats,
                    target: safeNum(user?.targets.fats),
                    unit: 'g',
                    color: '#a78bfa',
                  },
                ].map((row, i, arr) => {
                  const safeTarget = Math.max(1, row.target);
                  const pct = Math.min(100, Math.max(0, (row.avg / safeTarget) * 100));
                  const safePct = isNaN(pct) ? 0 : pct;
                  const over = row.avg > row.target && row.target > 0;
                  return (
                    <div key={row.key} style={{
                      paddingBottom: i < arr.length - 1 ? '14px' : 0,
                      marginBottom: i < arr.length - 1 ? '14px' : 0,
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', minWidth: 36 }}>{row.key}</span>
                        <div style={{ flex: 1, margin: '0 12px' }}>
                          <div style={{ height: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${safePct}%`,
                              borderRadius: 99,
                              backgroundColor: over ? 'var(--accent-red)' : row.color,
                              transition: 'width 0.6s ease',
                              opacity: 0.85,
                            }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>avg {row.avg}{row.unit}</span>
                            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.18)', fontWeight: 600 }}>target {row.target}{row.unit}</span>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          color: over ? 'var(--accent-red)' : (safePct >= 90 ? 'var(--accent-green)' : 'rgba(255,255,255,0.5)'),
                          minWidth: 40,
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {Math.round(safePct)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </MetricCard>
          </div>
        )}

        {/* ── 3. GOAL PROGRESS CARD ── */}
        {user?.goalWeight ? (
          <div>
            <SectionLabel>GOAL PROGRESS</SectionLabel>
            <MetricCard accentColor="linear-gradient(90deg, rgba(10,132,255,0.5), rgba(50,215,75,0.5))">
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {weightToGoal != null && !isNaN(weightToGoal) ? `${weightToGoal.toFixed(1)} kg` : '—'}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '4px', margin: '4px 0 0' }}>to goal</p>
                  </div>
                  <button
                    onClick={() => { setNewGoalWeight(user.goalWeight?.toString() || ''); setShowGoalEdit(true); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '0.35rem 0.875rem',
                      backgroundColor: 'rgba(10,132,255,0.1)',
                      border: '1px solid rgba(10,132,255,0.22)',
                      borderRadius: '50px',
                      cursor: 'pointer',
                    }}
                  >
                    <Scale size={11} color="var(--accent-blue)" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{user.goalWeight} kg</span>
                  </button>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: weightToGoal != null && weightToGoal < 0.1 ? '100%' : '10%',
                      borderRadius: 99,
                      background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                      {currentWeight != null ? `${currentWeight} kg` : '—'} now
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                      {user.goalWeight} kg goal
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {trendDelta !== null && (
                    <div style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: '12px',
                      padding: '0.65rem 0.75rem',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                        {trendPositive ? <TrendingUp size={11} color={deltaBadgeColor} /> : <TrendingDown size={11} color={deltaBadgeColor} />}
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: deltaBadgeColor, fontVariantNumeric: 'tabular-nums' }}>
                          {trendPositive ? '+' : ''}{trendDelta} kg
                        </span>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>7-day rate</span>
                    </div>
                  )}
                  {weeksToGoal !== null && (
                    <div style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: '12px',
                      padding: '0.65rem 0.75rem',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums', marginBottom: '3px' }}>
                        ~{weeksToGoal}w
                      </div>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>est. weeks</span>
                    </div>
                  )}
                </div>
              </div>
            </MetricCard>
          </div>
        ) : (
          <div
            onClick={() => { setNewGoalWeight(''); setShowGoalEdit(true); }}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '20px',
              border: '1px dashed rgba(255,255,255,0.08)',
              padding: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Target size={16} color="rgba(255,255,255,0.25)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>Set a goal weight</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.22)', fontWeight: 500, marginTop: '2px' }}>Track your progress toward a target</div>
            </div>
            <ChevronRight size={15} color="rgba(255,255,255,0.18)" style={{ marginLeft: 'auto' }} />
          </div>
        )}

        {/* ── 4. LOG WEIGHT BUTTON ── */}
        <button
          onClick={() => { setNewWeight(user?.weight?.toString() || ''); setShowLogWeight(true); }}
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: 'var(--bg-card)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '18px',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            letterSpacing: '0.01em',
          }}
        >
          <Scale size={18} color="var(--accent-blue)" />
          Log Today's Weight
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: 'var(--accent-blue)',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 900,
          }}>+</span>
        </button>

        {/* ── Weekly Averages ── (kept from original) */}
        {weeklyStats && (
          <div>
            <SectionLabel>WEEKLY AVERAGES</SectionLabel>
            <MetricCard>
              <div style={{ padding: '0.5rem 0' }}>
                {[
                  { label: 'Calories', value: isNaN(weeklyStats.avgCalories) ? 0 : weeklyStats.avgCalories, target: safeNum(user?.targets.calories), unit: 'kcal', color: 'var(--color-calories)' },
                  { label: 'Protein',  value: isNaN(weeklyStats.avgProtein)  ? 0 : weeklyStats.avgProtein,  target: safeNum(user?.targets.protein),  unit: 'g',    color: 'var(--color-protein)'   },
                  { label: 'Carbs',    value: isNaN(weeklyStats.avgCarbs)    ? 0 : weeklyStats.avgCarbs,    target: safeNum(user?.targets.carbs),    unit: 'g',    color: 'var(--color-carbs)'     },
                  { label: 'Fats',     value: isNaN(weeklyStats.avgFats)     ? 0 : weeklyStats.avgFats,     target: safeNum(user?.targets.fats),     unit: 'g',    color: 'var(--color-fats)'      },
                ].map((row, i, arr) => {
                  const safeTarget = Math.max(1, row.target);
                  const pct = Math.min(100, Math.max(0, (row.value / safeTarget) * 100));
                  const safePct = isNaN(pct) ? 0 : pct;
                  const over = row.value > row.target;
                  return (
                    <div key={row.label} style={{
                      padding: '0.75rem 1.25rem',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{row.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)' }}>target {row.target}{row.unit}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: over ? 'var(--accent-red)' : row.color, fontVariantNumeric: 'tabular-nums' }}>
                            {row.value}{row.unit}
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${safePct}%`, borderRadius: 99, backgroundColor: over ? 'var(--accent-red)' : row.color, transition: 'width 0.5s ease', opacity: 0.75 }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ padding: '0.75rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Workouts</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{weeklyStats.workoutsCompleted} sessions</span>
                  </div>
                </div>
              </div>
            </MetricCard>
          </div>
        )}

      </div>

      {/* ── Weight Log Sheet ── */}
      <BottomSheet isOpen={showLogWeight} onClose={() => setShowLogWeight(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Log Weight</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '4px', fontWeight: 500 }}>
              Morning measurement recommended. Current: {user?.weight} kg
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="number"
                step="0.1"
                min="20"
                max="400"
                value={newWeight}
                onChange={e => { setNewWeight(e.target.value); setWeightInputError(''); }}
                placeholder="e.g. 79.5"
                autoFocus
                style={{
                  width: '160px',
                  padding: '0.75rem',
                  border: `1px solid ${weightInputError ? 'var(--accent-red)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-input)',
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'center',
                  letterSpacing: '-0.03em',
                }}
              />
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '1.125rem' }}>kg</span>
            </div>
            {weightInputError && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 600 }}>{weightInputError}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {[-1, -0.5, 0, 0.5, 1].map(delta => {
              const base = safeNum(user?.weight);
              const val = (base + delta).toFixed(1);
              return (
                <button
                  key={delta}
                  onClick={() => setNewWeight(val)}
                  style={{
                    padding: '0.4rem 0.875rem',
                    borderRadius: '50px',
                    border: `1px solid ${newWeight === val ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                    backgroundColor: newWeight === val ? 'rgba(10,132,255,0.12)' : 'transparent',
                    color: newWeight === val ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  {delta > 0 ? '+' : ''}{delta !== 0 ? delta.toFixed(1) : 'Same'} → {val}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleLogWeight}
            style={{
              padding: '0.9rem',
              backgroundColor: 'var(--accent-primary)',
              color: '#000',
              border: 'none',
              borderRadius: '50px',
              fontWeight: 800,
              fontSize: '0.9375rem',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Save Entry
          </button>
        </div>
      </BottomSheet>

      {/* ── Goal Edit Sheet ── */}
      <BottomSheet isOpen={showGoalEdit} onClose={() => setShowGoalEdit(false)} title="Goal Weight">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '16px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            Current: {user?.weight} kg · Your target to reach
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="number"
                step="0.1"
                min="20"
                max="400"
                value={newGoalWeight}
                onChange={e => { setNewGoalWeight(e.target.value); setGoalWeightError(''); }}
                placeholder="e.g. 72.0"
                autoFocus
                style={{
                  width: '160px',
                  padding: '0.75rem',
                  border: `1px solid ${goalWeightError ? 'var(--accent-red)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-input)',
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'center',
                  letterSpacing: '-0.03em',
                }}
              />
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '1.125rem' }}>kg</span>
            </div>
            {goalWeightError && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 600 }}>{goalWeightError}</span>
            )}
            {(() => {
              const gv = parseFloat(newGoalWeight);
              const cw = user?.weight;
              if (!isNaN(gv) && cw != null && !isNaN(cw) && Math.abs(gv - cw) < 0.05) {
                return (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', fontWeight: 600 }}>
                    That's your current weight — pick a target
                  </span>
                );
              }
              return null;
            })()}
          </div>
          <button
            onClick={handleSaveGoal}
            className="btn-primary w-full"
            style={{ padding: '0.9rem' }}
          >
            Set Goal Weight
          </button>
        </div>
      </BottomSheet>

    </div>
  );
};
