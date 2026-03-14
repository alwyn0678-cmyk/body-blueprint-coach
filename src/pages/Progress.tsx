import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/SharedUI';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, AreaChart, Area } from 'recharts';
import { TrendingDown, TrendingUp, Scale, Plus, Target, CheckCircle2, Flame, ChevronRight, Award } from 'lucide-react';
import { calculateWeightTrend, getMacrosFromLog, computeWeeklyStats } from '../utils/aiCoachingEngine';
import { getLocalISOString } from '../utils/dateUtils';
import { BottomSheet } from '../components/MotionUI';

type Timeframe = '1W' | '1M' | '3M';

export const Progress: React.FC = () => {
  const { state, updateDailyLog, updateUser, showToast } = useApp();
  const { user, logs } = state;
  const [timeframe, setTimeframe] = useState<Timeframe>('1W');
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [newWeight, setNewWeight] = useState(user?.weight?.toString() || '');
  const [newGoalWeight, setNewGoalWeight] = useState(user?.goalWeight?.toString() || '');

  const todayDate = getLocalISOString();

  const allTrendData = calculateWeightTrend(logs, user?.weight || 0);

  const chartData = useMemo(() => {
    const days = timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const sortedDates = Object.keys(logs).sort();
    const trendByDate = new Map(allTrendData.map((t, i) => [sortedDates[i], t]));
    const filtered = sortedDates
      .filter(d => d >= cutoffStr)
      .map(d => {
        const log = logs[d];
        const trendEntry = trendByDate.get(d);
        return {
          date: d.slice(5),
          weight: log?.weight ?? null,
          trend: trendEntry?.trend ?? null,
        };
      });

    if (filtered.length === 0) return allTrendData.slice(-days) || [];
    return filtered;
  }, [logs, timeframe, allTrendData]);

  const nutritionChart = useMemo(() => {
    const days = timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : 90;
    const results: { name: string; cal: number; pro: number; target: number }[] = [];
    const d = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const target = new Date(d);
      target.setDate(d.getDate() - i);
      const dateStr = target.toISOString().split('T')[0];
      const log = logs[dateStr];
      const macros = log ? getMacrosFromLog(log as any) : { calories: 0, protein: 0 };
      if (log || timeframe === '1W') {
        results.push({
          name: timeframe === '1W'
            ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][target.getDay()]
            : `${target.getMonth() + 1}/${target.getDate()}`,
          cal: Math.round(macros.calories),
          pro: Math.round(macros.protein),
          target: user?.targets.calories || 0,
        });
      }
    }
    return results;
  }, [logs, timeframe, user]);

  const weeklyStats = user ? computeWeeklyStats(logs, user.targets) : null;

  const lastTrend = allTrendData.filter(t => t.trend !== null);
  const trendDelta = lastTrend.length >= 7
    ? (lastTrend[lastTrend.length - 1].trend! - lastTrend[lastTrend.length - 7].trend!).toFixed(2)
    : null;
  const trendPositive = trendDelta !== null && parseFloat(trendDelta) > 0;

  const weightToGoal = user?.goalWeight ? Math.abs(user.weight - user.goalWeight) : null;
  const weightProgress = user?.goalWeight
    ? Math.max(0, Math.min(100, (1 - Math.abs(user.weight - user.goalWeight) / Math.abs((user.weight + (parseFloat(trendDelta || '0') * 4)) - user.goalWeight || 1)) * 100))
    : null;

  const handleLogWeight = () => {
    const val = parseFloat(newWeight);
    if (!isNaN(val) && val > 20 && val < 400) {
      updateDailyLog(todayDate, { weight: val });
      updateUser({ weight: val });
      showToast('Weight logged', 'success');
      setShowLogWeight(false);
    } else {
      showToast('Enter a valid weight (20–400 kg)', 'error');
    }
  };

  const handleSaveGoal = () => {
    const val = parseFloat(newGoalWeight);
    if (!isNaN(val) && val > 20 && val < 400) {
      updateUser({ goalWeight: val });
      showToast('Goal weight updated', 'success');
      setShowGoalEdit(false);
    } else {
      showToast('Enter a valid goal weight', 'error');
    }
  };

  const calAdherenceColor = weeklyStats
    ? weeklyStats.calorieAdherence >= 90 ? 'var(--accent-green)'
    : weeklyStats.calorieAdherence >= 70 ? 'var(--accent-blue)'
    : weeklyStats.calorieAdherence >= 50 ? 'var(--accent-orange)'
    : 'var(--accent-red)'
    : 'var(--text-tertiary)';

  const proAdherenceColor = weeklyStats
    ? weeklyStats.proteinAdherence >= 90 ? 'var(--accent-green)'
    : weeklyStats.proteinAdherence >= 70 ? 'var(--accent-blue)'
    : 'var(--accent-orange)'
    : 'var(--text-tertiary)';

  return (
    <div className="flex-col animate-fade-in" style={{
      paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
      backgroundColor: 'var(--bg-primary)',
      minHeight: '100dvh',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '1.25rem 1.25rem 1rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
      }}>
        <div className="flex-row justify-between align-center">
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>Analytics</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 500, marginTop: '2px' }}>
              {user?.goalType === 'fat_loss' ? 'Fat loss progress' : user?.goalType === 'muscle_gain' ? 'Muscle gain progress' : 'Body composition tracking'}
            </p>
          </div>
          <button
            onClick={() => { setNewWeight(user?.weight?.toString() || ''); setShowLogWeight(true); }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-full)',
              padding: '0.5rem 1rem',
              fontWeight: 700,
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Log Weight
          </button>
        </div>

        {/* Timeframe selector */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: 'var(--radius-md)',
          padding: '3px',
          border: '1px solid var(--border-subtle)',
          marginTop: '1rem',
        }}>
          {(['1W', '1M', '3M'] as Timeframe[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8125rem',
                backgroundColor: timeframe === tf ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: timeframe === tf ? '#fff' : 'rgba(255,255,255,0.32)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-col gap-3" style={{ padding: '1rem' }}>

        {/* ── Summary Stats Row ── */}
        {weeklyStats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem' }}>
            {[
              {
                icon: <CheckCircle2 size={14} />,
                value: `${weeklyStats.calorieAdherence}%`,
                label: 'Cal Adherence',
                color: calAdherenceColor,
                pct: weeklyStats.calorieAdherence,
              },
              {
                icon: <Target size={14} />,
                value: `${weeklyStats.proteinAdherence}%`,
                label: 'Protein Hit',
                color: proAdherenceColor,
                pct: weeklyStats.proteinAdherence,
              },
              {
                icon: <Flame size={14} />,
                value: `${weeklyStats.daysLogged}/7`,
                label: 'Days Logged',
                color: 'var(--accent-orange)',
                pct: (weeklyStats.daysLogged / 7) * 100,
              },
            ].map(card => (
              <div key={card.label} style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                padding: '0.75rem',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: `${card.pct}%`,
                  maxHeight: '100%',
                  backgroundColor: card.color,
                  opacity: 0.05,
                  transition: 'height 0.6s ease',
                }} />
                <div style={{ color: card.color, marginBottom: '0.4rem' }}>{card.icon}</div>
                <div style={{
                  fontSize: '1.375rem',
                  fontWeight: 800,
                  color: card.color,
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}>{card.value}</div>
                <div style={{
                  fontSize: '0.5625rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--text-tertiary)',
                  marginTop: '0.25rem',
                }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Goal Progress ── */}
        {user?.goalWeight ? (
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            padding: '1.125rem',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(10,132,255,0.5), transparent)',
            }} />
            <div className="flex-row justify-between align-center" style={{ marginBottom: '0.875rem' }}>
              <div className="flex-row align-center gap-2">
                <Award size={15} color="var(--accent-blue)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Goal Progress</span>
              </div>
              <button
                onClick={() => { setNewGoalWeight(user.goalWeight?.toString() || ''); setShowGoalEdit(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.3rem 0.75rem', backgroundColor: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.25)', borderRadius: 'var(--radius-full)', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)' }}>Goal: {user.goalWeight} kg</span>
                <Scale size={11} color="var(--accent-blue)" />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.875rem' }}>
              <div className="flex-col align-center" style={{ gap: '2px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{user.weight}</span>
                <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current</span>
              </div>
              <div className="flex-col align-center" style={{ gap: '2px' }}>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  color: weightToGoal && weightToGoal < 1 ? 'var(--accent-green)' : 'var(--accent-blue)',
                }}>{weightToGoal?.toFixed(1) ?? '—'}</span>
                <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>kg to go</span>
              </div>
              <div className="flex-col align-center" style={{ gap: '2px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text-tertiary)' }}>{user.goalWeight}</span>
                <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Goal</span>
              </div>
            </div>
            {trendDelta && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.625rem' }}>
                {trendPositive
                  ? <TrendingUp size={12} color={user.goalType === 'muscle_gain' ? 'var(--accent-green)' : 'var(--accent-red)'} />
                  : <TrendingDown size={12} color={user.goalType === 'fat_loss' ? 'var(--accent-green)' : 'var(--accent-red)'} />
                }
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  7-day trend: <strong style={{ color: 'var(--text-primary)' }}>{trendPositive ? '+' : ''}{trendDelta} kg</strong>
                </span>
              </div>
            )}
          </div>
        ) : (
          /* No goal set prompt */
          <div
            onClick={() => { setNewGoalWeight(''); setShowGoalEdit(true); }}
            style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed rgba(255,255,255,0.1)', padding: '1.125rem', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Target size={16} color="rgba(255,255,255,0.3)" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Set a goal weight</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontWeight: 500, marginTop: '2px' }}>Track your progress toward a target</div>
            </div>
            <ChevronRight size={16} color="rgba(255,255,255,0.2)" style={{ marginLeft: 'auto' }} />
          </div>
        )}

        {/* ── Weight Trend Chart ── */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: 2,
            background: 'linear-gradient(90deg, transparent 0%, rgba(100,210,255,0.5) 40%, rgba(10,132,255,0.7) 60%, transparent 100%)',
          }} />
          <div style={{ padding: '1.125rem 1.125rem 1rem' }}>
            <div className="flex-row justify-between align-start" style={{ marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Weight Trend</span>
                <div className="flex-row align-center gap-2" style={{ marginTop: '4px' }}>
                  <span style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}>{user?.weight}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>kg</span>
                  {trendDelta !== null && (
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: trendPositive
                        ? (user?.goalType === 'muscle_gain' ? 'var(--accent-green)' : 'var(--accent-red)')
                        : 'var(--accent-green)',
                      backgroundColor: trendPositive
                        ? (user?.goalType === 'muscle_gain' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)')
                        : 'rgba(48,209,88,0.1)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}>
                      {trendPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {trendPositive ? '+' : ''}{trendDelta}kg
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-col align-end gap-2">
                <div className="flex-row align-center gap-2">
                  <div style={{ width: 24, height: 2, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2 }} />
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scale</span>
                </div>
                <div className="flex-row align-center gap-2">
                  <div style={{ width: 24, height: 3, backgroundColor: 'var(--accent-blue)', borderRadius: 2 }} />
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trend</span>
                </div>
              </div>
            </div>

            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontWeight: 500 }}
                    dy={10}
                    interval={timeframe === '3M' ? 6 : 0}
                  />
                  <YAxis
                    domain={['dataMin - 1', 'dataMax + 1']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                    orientation="right"
                    dx={8}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: '#111',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      padding: '10px 14px',
                    }}
                    labelStyle={{ fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: '4px', textTransform: 'uppercase' }}
                    itemStyle={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.875rem' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1.5}
                    strokeDasharray="3 4"
                    dot={{ r: 2.5, fill: 'rgba(255,255,255,0.5)', strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: '#fff', strokeWidth: 0 }}
                    name="Scale Weight"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke="var(--accent-blue)"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--bg-primary)', stroke: 'var(--accent-blue)', strokeWidth: 2.5 }}
                    name="AI Trend"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Nutrition Chart ── */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: 2,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,59,48,0.5) 40%, rgba(255,159,10,0.5) 60%, transparent 100%)',
          }} />
          <div style={{ padding: '1.125rem 1.125rem 1rem' }}>
            <div className="flex-row justify-between align-start" style={{ marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Nutrition</span>
                {weeklyStats && (
                  <div className="flex-row gap-3" style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Avg: <strong style={{ color: 'var(--text-primary)' }}>{weeklyStats.avgCalories} kcal</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Protein: <strong style={{ color: 'var(--color-protein)' }}>{weeklyStats.avgProtein}g</strong>
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-row align-center gap-2">
                <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--color-calories)', opacity: 0.85 }} />
                <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Calories</span>
              </div>
            </div>

            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nutritionChart} margin={{ top: 0, right: 8, left: -22, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                    dy={8}
                    interval={timeframe === '3M' ? 6 : 0}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} orientation="right" dx={8} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: '#111', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', padding: '10px 14px' }}
                    labelStyle={{ fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    itemStyle={{ fontWeight: 700, fontSize: '0.875rem' }}
                  />
                  <Bar dataKey="cal" radius={[3, 3, 0, 0]} barSize={timeframe === '3M' ? 4 : 10} name="Calories">
                    {nutritionChart.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.cal > entry.target
                          ? 'var(--accent-red)'
                          : entry.cal > 0 ? 'var(--color-calories)'
                          : 'rgba(255,255,255,0.04)'}
                        fillOpacity={entry.cal > 0 ? 0.85 : 1}
                      />
                    ))}
                  </Bar>
                  {user && (
                    <ReferenceLine
                      y={user.targets.calories}
                      stroke="rgba(255,255,255,0.12)"
                      strokeDasharray="4 3"
                      label={{ value: 'Target', position: 'right', fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 700 }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Weekly Averages Table ── */}
        {weeklyStats && (
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '1rem 1.125rem 0.25rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '-0.01em' }}>This Week's Averages</span>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {[
                { label: 'Calories', value: weeklyStats.avgCalories, target: user?.targets.calories || 0, unit: 'kcal', color: 'var(--color-calories)' },
                { label: 'Protein', value: weeklyStats.avgProtein, target: user?.targets.protein || 0, unit: 'g', color: 'var(--color-protein)' },
                { label: 'Carbs', value: weeklyStats.avgCarbs, target: user?.targets.carbs || 0, unit: 'g', color: 'var(--color-carbs)' },
                { label: 'Fats', value: weeklyStats.avgFats, target: user?.targets.fats || 0, unit: 'g', color: 'var(--color-fats)' },
              ].map((row, i, arr) => {
                const pct = row.target > 0 ? Math.min(100, (row.value / row.target) * 100) : 0;
                const over = row.value > row.target;
                return (
                  <div key={row.label} style={{
                    padding: '0.75rem 1.125rem',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <div className="flex-row justify-between align-center" style={{ marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{row.label}</span>
                      <div className="flex-row align-center gap-2">
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>target {row.target}{row.unit}</span>
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: over ? 'var(--accent-red)' : row.color,
                          fontVariantNumeric: 'tabular-nums',
                        }}>{row.value}{row.unit}</span>
                      </div>
                    </div>
                    <div style={{ height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 99,
                        backgroundColor: over ? 'var(--accent-red)' : row.color,
                        transition: 'width 0.5s ease',
                        opacity: 0.8,
                      }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ padding: '0.75rem 1.125rem' }}>
                <div className="flex-row justify-between align-center">
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Workouts</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                    {weeklyStats.workoutsCompleted} sessions
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Weight Log Sheet ── */}
      <BottomSheet isOpen={showLogWeight} onClose={() => setShowLogWeight(false)}>
        <div className="flex-col gap-5 pb-4">
          <div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Log Weight</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '4px', fontWeight: 500 }}>
              Morning measurement recommended. Current: {user?.weight} kg
            </p>
          </div>
          <div className="flex-row gap-3 align-center justify-center">
            <input
              type="number"
              step="0.1"
              min="20"
              max="400"
              value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              placeholder="e.g. 79.5"
              autoFocus
              style={{
                width: '160px',
                padding: '0.75rem',
                border: '1px solid var(--border-default)',
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
          <div className="flex-row gap-2" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {[-1, -0.5, 0, 0.5, 1].map(delta => {
              const val = ((user?.weight || 0) + delta).toFixed(1);
              return (
                <button
                  key={delta}
                  onClick={() => setNewWeight(val)}
                  style={{
                    padding: '0.4rem 0.875rem',
                    borderRadius: 'var(--radius-full)',
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
              borderRadius: 'var(--radius-full)',
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
        <div className="flex-col gap-5 pb-4">
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            Current: {user?.weight} kg · Your target to reach
          </p>
          <div className="flex-row gap-3 align-center justify-center">
            <input
              type="number"
              step="0.1"
              min="20"
              max="400"
              value={newGoalWeight}
              onChange={e => setNewGoalWeight(e.target.value)}
              placeholder="e.g. 72.0"
              autoFocus
              style={{
                width: '160px',
                padding: '0.75rem',
                border: '1px solid var(--border-default)',
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
