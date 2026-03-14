import React from 'react';
import {
  Droplets, Footprints, Utensils, Dumbbell, Zap, HeartPulse,
  Plus, Minus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { ProgressRing } from './ProgressRings';
import { MacroBar } from './SharedUI';
import { MacroTargets } from '../types';

// ── Safe number helper ────────────────────────────────────────────────────────
// Ensures a number is finite and non-NaN, falling back to 0
const safeNum = (v: number | undefined | null, fallback = 0): number => {
  if (v === undefined || v === null || isNaN(v) || !isFinite(v)) return fallback;
  return Math.round(v);
};

// ── MacroSummaryCard ───────────────────────────────────────────────────────────
interface MacroSummaryCardProps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  targets: MacroTargets;
  onLogFood: () => void;
}

export const MacroSummaryCard: React.FC<MacroSummaryCardProps> = ({
  calories = 0, protein = 0, carbs = 0, fats = 0, targets, onLogFood,
}) => {
  // Clamp and guard all inputs
  const safeCalories  = Math.max(0, safeNum(calories));
  const safeProtein   = Math.max(0, safeNum(protein));
  const safeCarbs     = Math.max(0, safeNum(carbs));
  const safeFats      = Math.max(0, safeNum(fats));
  const safeTarget    = Math.max(1, safeNum(targets?.calories, 2000)); // avoid divide-by-zero

  const calRem  = Math.max(0, safeTarget - safeCalories);
  const calPct  = Math.min(100, (safeCalories / safeTarget) * 100);
  const isOver  = safeCalories > safeTarget;

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, var(--bg-card) 100%)',
      borderBottom: '1px solid var(--border-subtle)',
      paddingBottom: '1.375rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 320, height: 320,
        background: isOver
          ? 'radial-gradient(circle, rgba(255,69,58,0.07) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(10,132,255,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Calorie ring */}
      <div className="flex-col align-center" style={{ padding: '0.25rem 1rem 0', position: 'relative' }}>
        <ProgressRing
          radius={110}
          strokeWidth={10}
          progress={isNaN(calPct) ? 0 : calPct}
          color={isOver ? 'var(--accent-red)' : 'var(--color-calories)'}
          trackColor="rgba(255,255,255,0.05)"
        >
          <div className="flex-col align-center justify-center" style={{ gap: '2px' }}>
            <span style={{
              fontSize: '0.5625rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.35)',
            }}>
              {isOver ? 'Over by' : 'Remaining'}
            </span>
            <span style={{
              fontSize: '3.25rem', fontWeight: 800,
              letterSpacing: '-0.04em', lineHeight: 1,
              color: isOver ? 'var(--accent-red)' : 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {isOver ? Math.round(safeCalories - safeTarget) : calRem}
            </span>
            <span style={{
              fontSize: '0.5625rem', fontWeight: 700,
              color: isOver ? 'var(--accent-red)' : 'var(--color-calories)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              kcal
            </span>
            <span style={{
              fontSize: '0.5625rem', color: 'rgba(255,255,255,0.25)',
              fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: '2px',
            }}>
              {safeCalories} / {safeTarget}
            </span>
          </div>
        </ProgressRing>
      </div>

      {/* Inline P / C / F tiles */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0.5rem', padding: '1rem 1.25rem 0',
      }}>
        {[
          { label: 'Protein', abbr: 'P', value: safeProtein, target: Math.max(1, safeNum(targets?.protein, 150)), color: 'var(--color-protein)' },
          { label: 'Carbs',   abbr: 'C', value: safeCarbs,   target: Math.max(1, safeNum(targets?.carbs,   200)), color: 'var(--color-carbs)'   },
          { label: 'Fats',    abbr: 'F', value: safeFats,    target: Math.max(1, safeNum(targets?.fats,    60)),  color: 'var(--color-fats)'    },
        ].map(m => {
          const pct = Math.min(100, Math.max(0, (m.value / m.target) * 100));
          const over = m.value > m.target;
          return (
            <div key={m.abbr} style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 'var(--radius-md)',
              padding: '0.625rem 0.75rem',
            }}>
              <div className="flex-row justify-between align-center" style={{ marginBottom: '0.3rem' }}>
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: m.color,
                }}>
                  {m.abbr}
                </span>
                {over && (
                  <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--accent-red)', letterSpacing: '0.04em' }}>
                    over
                  </span>
                )}
              </div>
              <div className="flex-row align-baseline gap-1" style={{ marginBottom: '0.375rem' }}>
                <span style={{
                  fontSize: '1.125rem', fontWeight: 800,
                  letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
                  color: over ? 'var(--accent-red)' : 'var(--text-primary)',
                  lineHeight: 1,
                }}>
                  {m.value}
                </span>
                <span style={{ fontSize: '0.5625rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  / {m.target}g
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${isNaN(pct) ? 0 : pct}%`, borderRadius: 99,
                  backgroundColor: over ? 'var(--accent-red)' : m.color,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Log Food CTA */}
      <div style={{ padding: '0.75rem 1.25rem 0' }}>
        <button
          onClick={onLogFood}
          style={{
            width: '100%', padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.75)',
            fontSize: '0.875rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
          }}
        >
          <Utensils size={14} />
          Log Food
        </button>
      </div>
    </div>
  );
};

// ── DailyHabitsCard ───────────────────────────────────────────────────────────
interface DailyHabitsCardProps {
  water: number;
  steps: number;
  targetSteps: number;
  mealsLogged: number;
  workoutsToday: number;
  onWaterOpen: () => void;
  onStepsOpen: () => void;
  onMealsPress: () => void;
  onTrainingPress: () => void;
}

export const DailyHabitsCard: React.FC<DailyHabitsCardProps> = ({
  water, steps, targetSteps, mealsLogged, workoutsToday,
  onWaterOpen, onStepsOpen, onMealsPress, onTrainingPress,
}) => {
  const safeSteps      = Math.max(0, safeNum(steps));
  const safeTarget     = Math.max(1, safeNum(targetSteps, 8000));
  const stepsPct       = Math.min(100, Math.max(0, (safeSteps / safeTarget) * 100));

  return (
    <div className="flex-col gap-2">
      <span className="section-title" style={{ padding: '0.25rem 0.25rem 0' }}>Daily Vitals</span>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>

        {/* Water */}
        <div
          onClick={onWaterOpen}
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(145deg, rgba(10,132,255,0.08) 0%, rgba(10,132,255,0.03) 100%)',
            border: '1px solid rgba(10,132,255,0.18)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: 'rgba(10,132,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.625rem', boxShadow: '0 0 12px rgba(10,132,255,0.2)',
          }}>
            <Droplets size={16} color="var(--accent-blue)" />
          </div>
          <div className="flex-row align-baseline gap-1" style={{ marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.625rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {Math.round(water)}
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>/ 8</span>
          </div>
          <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(10,132,255,0.8)', display: 'block', marginBottom: '0.625rem' }}>
            Hydration
          </span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: i < water ? 'var(--accent-blue)' : 'rgba(10,132,255,0.12)',
                border: `1px solid ${i < water ? 'rgba(10,132,255,0.5)' : 'rgba(10,132,255,0.15)'}`,
                transition: 'background-color 0.2s',
              }} />
            ))}
          </div>
        </div>

        {/* Steps */}
        <div
          onClick={onStepsOpen}
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(145deg, rgba(48,209,88,0.07) 0%, rgba(48,209,88,0.02) 100%)',
            border: '1px solid rgba(48,209,88,0.15)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: 'rgba(48,209,88,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.625rem', boxShadow: '0 0 12px rgba(48,209,88,0.15)',
          }}>
            <Footprints size={16} color="var(--accent-green)" />
          </div>
          <div className="flex-row align-baseline gap-1" style={{ marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.375rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {safeSteps.toLocaleString()}
            </span>
          </div>
          <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(48,209,88,0.8)', display: 'block', marginBottom: '0.625rem' }}>
            Steps
          </span>
          <div>
            <div style={{ height: 3, borderRadius: 99, backgroundColor: 'rgba(48,209,88,0.1)', overflow: 'hidden', marginBottom: '0.25rem' }}>
              <div style={{
                height: '100%', width: `${isNaN(stepsPct) ? 0 : stepsPct}%`, borderRadius: 99,
                backgroundColor: 'var(--accent-green)',
                opacity: stepsPct >= 100 ? 1 : 0.7,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.04em' }}>
              / {safeTarget.toLocaleString()} goal
            </span>
          </div>
        </div>

        {/* Meals */}
        <div
          onClick={onMealsPress}
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(145deg, rgba(255,159,10,0.07) 0%, rgba(255,159,10,0.02) 100%)',
            border: '1px solid rgba(255,159,10,0.14)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: 'rgba(255,159,10,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.625rem', boxShadow: '0 0 12px rgba(255,159,10,0.15)',
          }}>
            <Utensils size={16} color="var(--accent-orange)" />
          </div>
          <div className="flex-row align-baseline gap-1" style={{ marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.625rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {Math.round(mealsLogged)}
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>/ 4</span>
          </div>
          <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,159,10,0.8)', display: 'block', marginBottom: '0.625rem' }}>
            Meals Logged
          </span>
          <div>
            <div style={{ height: 3, borderRadius: 99, backgroundColor: 'rgba(255,159,10,0.1)', overflow: 'hidden', marginBottom: '0.25rem' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (mealsLogged / 4) * 100)}%`,
                borderRadius: 99, backgroundColor: 'var(--accent-orange)',
                opacity: 0.8, transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.04em' }}>
              TAP TO LOG FOOD
            </span>
          </div>
        </div>

        {/* Training */}
        <div
          onClick={onTrainingPress}
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.625rem',
          }}>
            <Dumbbell size={16} color="rgba(255,255,255,0.55)" />
          </div>
          <div className="flex-row align-baseline gap-1" style={{ marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.625rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {Math.round(workoutsToday)}
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
                borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.3)',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.04em' }}>
              TAP TO LOG SESSION
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── WeeklyChartCard ───────────────────────────────────────────────────────────
interface WeeklyChartDay {
  day: string;
  dateStr: string;
  calories: number;
  protein: number;
  target: number;
  isToday: boolean;
  isFuture: boolean;
}

interface WeeklyChartCardProps {
  data: WeeklyChartDay[];
  weekAvg: number;
  target: number;
  activeDays?: number;
}

export const WeeklyChartCard: React.FC<WeeklyChartCardProps> = ({ data, weekAvg, target, activeDays }) => {
  // Clamp chart data: never show negative values
  const safeData = data.map(d => ({
    ...d,
    calories: Math.max(0, isNaN(d.calories) ? 0 : d.calories),
    protein:  Math.max(0, isNaN(d.protein)  ? 0 : d.protein),
  }));

  return (
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
        {/* Header */}
        <div className="flex-row justify-between align-center" style={{ marginBottom: '0.875rem' }}>
          <div className="flex-col" style={{ gap: '2px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '-0.01em' }}>7-Day Performance</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Calories & protein</span>
          </div>
          <div className="flex-col align-end" style={{ gap: '2px' }}>
            <span style={{
              fontSize: '1.25rem', fontWeight: 800,
              letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
              color: weekAvg > target ? 'var(--accent-red)' : weekAvg > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}>
              {weekAvg > 0 && !isNaN(weekAvg) ? weekAvg.toLocaleString() : '—'}
            </span>
            <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
              avg kcal / day
            </span>
            {activeDays !== undefined && activeDays < 7 && (
              <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.04em' }}>
                based on {activeDays} {activeDays === 1 ? 'day' : 'days'}
              </span>
            )}
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
            <BarChart data={safeData} barGap={2} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
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
              <Bar dataKey="calories" radius={[3, 3, 0, 0]} barSize={9}>
                {safeData.map((e, i) => (
                  <Cell
                    key={i}
                    fill={
                      e.isFuture    ? 'rgba(255,255,255,0.05)'
                      : e.calories > e.target ? 'var(--accent-red)'
                      : e.isToday   ? 'var(--accent-blue)'
                      : 'rgba(255,255,255,0.6)'
                    }
                  />
                ))}
              </Bar>
              <Bar dataKey="protein" radius={[3, 3, 0, 0]} barSize={9}>
                {safeData.map((e, i) => (
                  <Cell
                    key={i}
                    fill={e.isFuture ? 'rgba(255,159,10,0.1)' : 'var(--color-protein)'}
                    fillOpacity={e.isFuture ? 0.3 : 0.85}
                  />
                ))}
              </Bar>
              <ReferenceLine y={target} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ── CoachingInsightCard ───────────────────────────────────────────────────────
interface CoachingInsightCardProps {
  reasoning: string;
  urgency: 'low' | 'medium' | 'high';
  newTargets?: MacroTargets;
  onApply?: () => void;
}

export const CoachingInsightCard: React.FC<CoachingInsightCardProps> = ({
  reasoning, urgency, newTargets, onApply,
}) => {
  const borderColor = urgency === 'high'   ? 'rgba(255,69,58,0.3)'
    : urgency === 'medium' ? 'rgba(255,159,10,0.22)'
    : 'var(--border-default)';

  const accentGrad = urgency === 'high'
    ? 'linear-gradient(90deg, transparent, rgba(255,69,58,0.8), transparent)'
    : urgency === 'medium'
    ? 'linear-gradient(90deg, transparent, rgba(255,159,10,0.7), transparent)'
    : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)';

  const iconBg = urgency === 'high'   ? 'rgba(255,69,58,0.12)'
    : urgency === 'medium' ? 'rgba(255,159,10,0.12)'
    : 'rgba(255,255,255,0.06)';

  const iconBorder = urgency === 'high'   ? 'rgba(255,69,58,0.25)'
    : urgency === 'medium' ? 'rgba(255,159,10,0.2)'
    : 'rgba(255,255,255,0.08)';

  const iconColor = urgency === 'high'   ? 'var(--accent-red)'
    : urgency === 'medium' ? 'var(--accent-orange)'
    : 'rgba(255,255,255,0.5)';

  const badgeLabel = urgency === 'high'   ? 'Action Required'
    : urgency === 'medium' ? 'Recommendation'
    : 'Weekly Analysis';

  const badgeColor = urgency === 'high'   ? 'var(--accent-red)'
    : urgency === 'medium' ? 'var(--accent-orange)'
    : 'var(--text-tertiary)';

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${borderColor}`,
      overflow: 'hidden',
    }}>
      <div style={{ height: 2, background: accentGrad }} />

      <div style={{ padding: '1.125rem 1.25rem 1.25rem' }}>
        {/* Header */}
        <div className="flex-row align-center gap-3" style={{ marginBottom: '0.875rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${iconBorder}`,
          }}>
            <Zap size={16} color={iconColor} />
          </div>
          <div className="flex-col" style={{ gap: '2px', flex: 1 }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.01em' }}>AI Coach</span>
            <span style={{
              fontSize: '0.5625rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.09em',
              color: badgeColor,
            }}>
              {badgeLabel}
            </span>
          </div>
        </div>

        {/* Reasoning */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.025)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem',
          border: '1px solid rgba(255,255,255,0.05)',
          marginBottom: newTargets ? '0.875rem' : 0,
        }}>
          <p style={{
            fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.65, fontWeight: 400, margin: 0,
          }}>
            {reasoning}
          </p>
        </div>

        {/* Apply button */}
        {newTargets && onApply && (
          <button
            onClick={onApply}
            style={{
              width: '100%', padding: '0.8rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${urgency === 'high' ? 'rgba(255,69,58,0.4)' : 'rgba(255,255,255,0.13)'}`,
              background: urgency === 'high'
                ? 'linear-gradient(135deg, rgba(255,69,58,0.12), rgba(255,69,58,0.05))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
              color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            <span>Apply Adjustment</span>
            <span style={{ opacity: 0.5 }}>→</span>
            <span style={{ color: urgency === 'high' ? 'var(--accent-red)' : 'var(--accent-blue)' }}>
              {Math.round(newTargets.calories)} kcal
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

// ── WeeklyPauseCard ───────────────────────────────────────────────────────────
export const WeeklyPauseCard: React.FC = () => (
  <div style={{
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-default)',
    padding: '1.125rem 1.25rem',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Zap size={16} color="rgba(255,255,255,0.25)" />
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
          Weekly Check-In Paused
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
          Enable in Settings → Coaching Engine to resume adaptive analysis.
        </div>
      </div>
    </div>
  </div>
);

// ── RecoveryCard ──────────────────────────────────────────────────────────────
interface RecoveryCardProps {
  score: number | undefined;
  recColor: string;
  recLabel: string | null;
  recCTA: { label: string; path: string };
  onNavigate: (path: string) => void;
}

export const RecoveryCard: React.FC<RecoveryCardProps> = ({
  score, recColor, recLabel, recCTA, onNavigate,
}) => {
  // Guard: treat NaN or 0 score as absent
  const validScore = score != null && !isNaN(score) && score > 0 ? score : undefined;

  return (
    <div style={{
      background: validScore
        ? `linear-gradient(135deg, ${recColor}12 0%, ${recColor}04 100%)`
        : 'rgba(255,255,255,0.02)',
      border: `1px solid ${validScore ? recColor + '35' : 'var(--border-default)'}`,
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {validScore && (
        <div style={{
          height: 2,
          background: `linear-gradient(90deg, transparent, ${recColor}80, transparent)`,
        }} />
      )}

      <div style={{ padding: '1rem 1.125rem' }}>
        <div className="flex-row align-center justify-between" style={{ marginBottom: recLabel ? '0.625rem' : 0 }}>
          <div className="flex-row align-center gap-3" style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: validScore ? recColor + '18' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: validScore ? `0 0 14px ${recColor}22` : 'none',
            }}>
              <HeartPulse size={17} color={recColor} />
            </div>
            <div className="flex-col" style={{ gap: '2px', minWidth: 0 }}>
              <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: recColor }}>
                Recovery Score
              </span>
              {!validScore && (
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                  Log vitals to unlock
                </span>
              )}
            </div>
          </div>

          {validScore ? (
            <div className="flex-row align-baseline gap-1">
              <span style={{
                fontSize: '2.25rem', fontWeight: 800,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em',
                color: recColor, lineHeight: 1,
              }}>
                {Math.round(validScore)}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>%</span>
            </div>
          ) : null}
        </div>

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

        <button
          onClick={() => onNavigate(recCTA.path)}
          style={{
            width: '100%', padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${validScore && validScore >= 50 ? recColor + '40' : 'rgba(255,255,255,0.1)'}`,
            background: validScore && validScore >= 50
              ? `linear-gradient(135deg, ${recColor}18, ${recColor}08)`
              : 'rgba(255,255,255,0.04)',
            color: validScore && validScore >= 50 ? recColor : 'rgba(255,255,255,0.45)',
            fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.375rem', letterSpacing: '-0.01em',
          }}
        >
          {recCTA.label}
          <span style={{ opacity: 0.6 }}>→</span>
        </button>
      </div>
    </div>
  );
};

// ── QuickStatCard (weight + streak) ───────────────────────────────────────────
interface WeightCardProps {
  weight: number;
  weightDeltaStr: string | null;
  weightDeltaGood: boolean | null;
  onPress: () => void;
}

export const WeightCard: React.FC<WeightCardProps> = ({
  weight, weightDeltaStr, weightDeltaGood, onPress,
}) => {
  // Guard against NaN display
  const displayWeight = (weight != null && !isNaN(weight)) ? weight : '—';

  return (
    <div
      onClick={onPress}
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
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(10,132,255,0.5), transparent)',
      }} />
      <div className="flex-row justify-between align-center" style={{ marginBottom: '0.5rem' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(10,132,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </div>
        {weightDeltaStr && (
          <span style={{
            fontSize: '0.625rem', fontWeight: 700,
            color: weightDeltaGood ? 'var(--accent-green)' : 'var(--accent-red)',
            backgroundColor: weightDeltaGood ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)',
            padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-full)',
          }}>
            {weightDeltaStr}
          </span>
        )}
      </div>
      <div className="flex-row align-baseline gap-1">
        <span style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {displayWeight}
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
  );
};

interface StreakCardProps {
  streak: number;
}

export const StreakCard: React.FC<StreakCardProps> = ({ streak }) => {
  const safeStreak = isNaN(streak) ? 0 : Math.max(0, Math.round(streak));

  return (
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
        background: safeStreak > 0
          ? 'linear-gradient(90deg, transparent, rgba(255,159,10,0.6), transparent)'
          : 'none',
      }} />
      <div className="flex-row justify-between align-center" style={{ marginBottom: '0.5rem' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(255,159,10,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z" />
          </svg>
        </div>
        {safeStreak >= 3 && (
          <span style={{
            fontSize: '0.625rem', fontWeight: 700,
            color: 'var(--accent-orange)',
            backgroundColor: 'rgba(255,159,10,0.12)',
            padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-full)',
          }}>
            {safeStreak}d
          </span>
        )}
      </div>
      <div className="flex-row align-baseline gap-1">
        <span style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {safeStreak}
        </span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>days</span>
      </div>
      <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem' }}>
        Logging Streak
      </span>
      <span style={{ fontSize: '0.5rem', color: safeStreak > 0 ? 'rgba(255,159,10,0.4)' : 'rgba(255,255,255,0.15)', fontWeight: 600, display: 'block', marginTop: '0.15rem', letterSpacing: '0.04em' }}>
        {safeStreak === 0 ? 'START TODAY' : safeStreak >= 7 ? 'INCREDIBLE RUN' : 'KEEP IT UP'}
      </span>
    </div>
  );
};
