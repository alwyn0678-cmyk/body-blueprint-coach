import React, { useState } from 'react';
import {
  Zap, ChevronDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { ProgressRing } from './ProgressRings';
import { MacroTargets } from '../types';

// ── Safe number helper ────────────────────────────────────────────────────────
const safeNum = (v: number | undefined | null, fallback = 0): number => {
  if (v === undefined || v === null || isNaN(v) || !isFinite(v)) return fallback;
  return Math.round(v);
};

// ── Section label style ───────────────────────────────────────────────────────
export const SectionLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{
    fontSize: '0.65rem',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'rgba(0,0,0,0.20)',
    ...style,
  }}>
    {children}
  </span>
);

// ── HeroRingCard ──────────────────────────────────────────────────────────────
interface HeroRingCardProps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  targets: MacroTargets;
}

export const HeroRingCard: React.FC<HeroRingCardProps> = ({
  calories = 0, protein = 0, carbs = 0, fats = 0, targets,
}) => {
  const safeCalories = Math.max(0, safeNum(calories));
  const safeProtein  = Math.max(0, safeNum(protein));
  const safeCarbs    = Math.max(0, safeNum(carbs));
  const safeFats     = Math.max(0, safeNum(fats));
  const safeTarget   = Math.max(1, safeNum(targets?.calories, 2000));

  const calPct = Math.min(100, (safeCalories / safeTarget) * 100);
  const isOver = safeCalories > safeTarget;

  const macros = [
    { label: 'P', name: 'Protein', value: safeProtein, target: Math.max(1, safeNum(targets?.protein, 150)), color: '#FF9F0A' },
    { label: 'C', name: 'Carbs',   value: safeCarbs,   target: Math.max(1, safeNum(targets?.carbs,   200)), color: '#0A84FF' },
    { label: 'F', name: 'Fats',    value: safeFats,     target: Math.max(1, safeNum(targets?.fats,    60)),  color: '#32D74B' },
  ];

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: 24,
      padding: '20px 20px 16px',
      border: '1px solid rgba(0,0,0,0.05)',
      boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.03)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        top: '35%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 280, height: 280,
        background: isOver
          ? 'radial-gradient(circle, rgba(255,69,58,0.09) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(10,132,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Calorie ring */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: 16 }}>
        <ProgressRing
          radius={60}
          strokeWidth={10}
          progress={isNaN(calPct) ? 0 : calPct}
          color={isOver ? 'var(--accent-red)' : 'var(--color-calories)'}
          trackColor="rgba(0,0,0,0.06)"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <span style={{
              fontSize: '1.8rem',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: isOver ? 'var(--accent-red)' : 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {safeCalories}
            </span>
            <span style={{
              fontSize: '0.55rem',
              fontWeight: 700,
              color: 'rgba(0,0,0,0.24)',
              letterSpacing: '0.06em',
              marginTop: 2,
            }}>
              of {safeTarget} kcal
            </span>
          </div>
        </ProgressRing>
      </div>

      {/* Macro bars row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {macros.map(m => {
          const pct = Math.min(100, Math.max(0, (m.value / m.target) * 100));
          const over = m.value > m.target;
          return (
            <div key={m.label} style={{
              backgroundColor: 'rgba(0,0,0,0.02)',
              border: '1px solid rgba(0,0,0,0.05)',
              borderRadius: 12,
              padding: '8px 10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  color: over ? 'var(--accent-red)' : m.color,
                }}>
                  {m.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 5 }}>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                  color: over ? 'var(--accent-red)' : 'var(--text-primary)',
                  lineHeight: 1,
                }}>
                  {m.value}
                </span>
                <span style={{ fontSize: '0.55rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600 }}>
                  /{m.target}g
                </span>
              </div>
              {/* Bar */}
              <div style={{ height: 3, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${isNaN(pct) ? 0 : pct}%`,
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
  );
};

// ── QuickLogRow ───────────────────────────────────────────────────────────────
interface QuickLogRowProps {
  water: number;
  weight: number | undefined;
  steps: number;
  onWaterOpen: () => void;
  onWeightOpen: () => void;
  onStepsOpen: () => void;
}

export const QuickLogRow: React.FC<QuickLogRowProps> = ({
  water, weight, steps,
  onWaterOpen, onWeightOpen, onStepsOpen,
}) => {
  const pills = [
    {
      emoji: '💧',
      value: `${water} glass${water === 1 ? '' : 'es'}`,
      onPress: onWaterOpen,
    },
    {
      emoji: '⚖️',
      value: (weight != null && !isNaN(weight)) ? `${weight} kg` : '—',
      onPress: onWeightOpen,
    },
    {
      emoji: '👟',
      value: steps > 0 ? steps.toLocaleString() : '0 steps',
      onPress: onStepsOpen,
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {pills.map((pill, i) => (
        <button
          key={i}
          onClick={pill.onPress}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 14,
            background: 'rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '0.9rem' }}>{pill.emoji}</span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'rgba(28,28,46,0.82)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap' as const,
          }}>
            {pill.value}
          </span>
        </button>
      ))}
    </div>
  );
};

// ── ProgramSnapshotCard ───────────────────────────────────────────────────────
interface ProgramSnapshotCardProps {
  programName: string | null;
  onStartSession: () => void;
  onSetProgram: () => void;
}

export const ProgramSnapshotCard: React.FC<ProgramSnapshotCardProps> = ({
  programName, onStartSession, onSetProgram,
}) => {
  if (!programName) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 20,
        padding: '14px 16px',
        border: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.20)', fontWeight: 500 }}>
          No workout assigned
        </span>
        <button
          onClick={onSetProgram}
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--accent-blue)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Set program →
        </button>
      </div>
    );
  }

  const isStrength = programName === 'Strength & Size';
  const emoji = isStrength ? '🏋️' : '🍑';
  const focus = isStrength ? 'Hypertrophy · Upper/Lower' : 'Glute-focused · Full body';
  const exercises = isStrength ? '6 exercises · ~55 min' : '5 exercises · ~45 min';

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: 20,
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.06)',
    }}>
      {/* Accent strip */}
      <div style={{
        height: 2,
        background: 'linear-gradient(90deg, #0A84FF 0%, #30B0C7 100%)',
      }} />
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 2 }}>
              {programName}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600 }}>
              {focus}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.28)', fontWeight: 600, marginTop: 1 }}>
              {exercises}
            </div>
          </div>
        </div>
        <button
          onClick={onStartSession}
          style={{
            height: 36,
            padding: '0 16px',
            borderRadius: 10,
            background: 'var(--accent-blue)',
            border: 'none',
            color: 'white',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Start →
        </button>
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
  const [expanded, setExpanded] = useState(false);

  const borderColor = urgency === 'high'   ? '#FF453A'
    : urgency === 'medium' ? '#FF9F0A'
    : '#30D158';

  const badgeBg = urgency === 'high'   ? 'rgba(255,69,58,0.15)'
    : urgency === 'medium' ? 'rgba(255,159,10,0.15)'
    : 'rgba(48,209,88,0.12)';

  const badgeColor = urgency === 'high'   ? '#FF453A'
    : urgency === 'medium' ? '#FF9F0A'
    : '#30D158';

  const badgeLabel = urgency === 'high'   ? 'Action Required'
    : urgency === 'medium' ? 'Recommendation'
    : 'On Track';

  const isLong = reasoning.length > 100;

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: 20,
      border: '1px solid rgba(0,0,0,0.06)',
      borderLeft: `3px solid ${borderColor}`,
      overflow: 'hidden',
      padding: '14px 16px',
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          fontSize: '0.6rem',
          fontWeight: 800,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: 'rgba(0,0,0,0.20)',
        }}>
          Coach
        </span>
        <span style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 99,
          backgroundColor: badgeBg,
          color: badgeColor,
          letterSpacing: '0.04em',
        }}>
          {badgeLabel}
        </span>
      </div>

      {/* Body */}
      <p style={{
        fontSize: '0.875rem',
        color: 'rgba(28,28,46,0.78)',
        lineHeight: 1.6,
        margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: expanded ? 'unset' : (isLong ? 2 : 'unset'),
        WebkitBoxOrient: 'vertical' as const,
        overflow: expanded ? 'visible' : (isLong ? 'hidden' : 'visible'),
      }}>
        {reasoning}
      </p>

      {/* Read more toggle */}
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            marginTop: 6,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'rgba(0,0,0,0.24)',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}
        >
          {expanded ? 'Show less' : 'Read more'}
          <ChevronDown
            size={12}
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
      )}

      {/* Apply button */}
      {newTargets && onApply && (
        <button
          onClick={onApply}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: 12,
            border: `1px solid ${urgency === 'high' ? 'rgba(255,69,58,0.4)' : 'rgba(0,0,0,0.09)'}`,
            background: urgency === 'high'
              ? 'linear-gradient(135deg, rgba(255,69,58,0.12), rgba(255,69,58,0.05))'
              : 'linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02))',
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
          <span style={{ color: urgency === 'high' ? '#FF453A' : 'var(--accent-blue)' }}>
            {Math.round(newTargets.calories)} kcal
          </span>
        </button>
      )}
    </div>
  );
};

// ── WeeklyPauseCard ───────────────────────────────────────────────────────────
export const WeeklyPauseCard: React.FC = () => (
  <div style={{
    backgroundColor: 'var(--bg-card)',
    borderRadius: 20,
    border: '1px solid rgba(0,0,0,0.05)',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  }}>
    <Zap size={16} color="rgba(0,0,0,0.13)" />
    <div>
      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(0,0,0,0.35)' }}>
        Weekly Check-In Paused
      </div>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
        Enable in Settings → Coaching Engine to resume.
      </div>
    </div>
  </div>
);

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
  const safeData = data.map(d => ({
    ...d,
    calories: Math.max(0, isNaN(d.calories) ? 0 : d.calories),
    protein:  Math.max(0, isNaN(d.protein)  ? 0 : d.protein),
  }));

  const daysLogged = safeData.filter(d => !d.isFuture && d.calories > 0).length;

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: 20,
      border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 16px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <SectionLabel>Weekly Calories</SectionLabel>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(0,0,0,0.20)', letterSpacing: '0.02em' }}>
            avg: {weekAvg > 0 ? weekAvg.toLocaleString() : '—'} kcal · {activeDays ?? daysLogged} days logged
          </span>
        </div>

        {/* Chart */}
        <div style={{ height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeData} barGap={2} margin={{ top: 0, right: 4, left: -36, bottom: 0 }}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(0,0,0,0.16)', fontSize: 9, fontWeight: 700 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.07)',
                  backgroundColor: '#0D0D0D',
                  padding: '8px 12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                }}
                itemStyle={{ fontWeight: 700, fontSize: 12 }}
                labelStyle={{ display: 'none' }}
                formatter={(value: unknown) => [`${value} kcal`] as [string]}
              />
              <ReferenceLine
                y={target}
                stroke="rgba(0,0,0,0.13)"
                strokeDasharray="3 3"
              />
              <Bar dataKey="calories" radius={[3, 3, 0, 0]} barSize={20}>
                {safeData.map((e, i) => (
                  <Cell
                    key={i}
                    fill={
                      e.isFuture            ? 'rgba(0,0,0,0.03)'
                      : e.calories > e.target ? 'var(--accent-red)'
                      : e.isToday           ? 'var(--accent-blue)'
                      : 'rgba(10,132,255,0.45)'
                    }
                    fillOpacity={e.isToday || e.isFuture ? 1 : 0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day dot indicators */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
          {safeData.map((d, i) => {
            const hasLog = !d.isFuture && d.calories > 0;
            return (
              <div key={i} style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: hasLog
                  ? d.isToday ? 'var(--accent-blue)' : 'rgba(0,0,0,0.30)'
                  : 'rgba(0,0,0,0.07)',
                border: hasLog ? 'none' : '1px solid rgba(0,0,0,0.10)',
              }} />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── StreakCard ─────────────────────────────────────────────────────────────────
interface StreakCardProps {
  streak: number;
}

export const StreakCard: React.FC<StreakCardProps> = ({ streak }) => {
  const safeStreak = isNaN(streak) ? 0 : Math.max(0, Math.round(streak));

  return (
    <div style={{
      flex: 1,
      padding: 16,
      borderRadius: 20,
      backgroundColor: 'var(--bg-card)',
      border: '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontSize: '1.6rem' }}>🔥</span>
      <span style={{
        fontSize: '2rem',
        fontWeight: 900,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color: safeStreak > 0 ? 'var(--text-primary)' : 'rgba(0,0,0,0.24)',
      }}>
        {safeStreak}
      </span>
      <span style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600 }}>
        day streak
      </span>
    </div>
  );
};

// ── RecoveryCard ──────────────────────────────────────────────────────────────
interface RecoveryCardProps {
  score: number | undefined;
  recColor: string;
  recLabel: string | null;
  recCTA: { label: string; path: string };
  onNavigate: (path: string) => void;
}

export const RecoveryCard: React.FC<RecoveryCardProps> = ({
  score, recColor, onNavigate, recCTA,
}) => {
  const validScore = score != null && !isNaN(score) && score > 0 ? score : undefined;

  const badgeLabel = validScore
    ? validScore >= 85 ? 'Excellent'
    : validScore >= 70 ? 'Good'
    : validScore >= 50 ? 'Moderate'
    : 'Low'
    : null;

  const badgeBg = validScore
    ? validScore >= 85 ? 'rgba(48,209,88,0.15)'
    : validScore >= 70 ? 'rgba(10,132,255,0.15)'
    : validScore >= 50 ? 'rgba(255,159,10,0.15)'
    : 'rgba(255,69,58,0.15)'
    : 'transparent';

  return (
    <div style={{
      flex: 1,
      padding: 16,
      borderRadius: 20,
      backgroundColor: 'var(--bg-card)',
      border: '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      {validScore ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {badgeLabel && (
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 99,
                backgroundColor: badgeBg,
                color: recColor,
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
              }}>
                {badgeLabel}
              </span>
            )}
          </div>
          <span style={{
            fontSize: '2rem',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            color: recColor,
          }}>
            {Math.round(validScore)}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600 }}>
            recovery
          </span>
        </>
      ) : (
        <>
          <span style={{
            fontSize: '2rem',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: 'rgba(0,0,0,0.16)',
          }}>
            —
          </span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600 }}>
            recovery
          </span>
          <button
            onClick={() => onNavigate(recCTA.path)}
            style={{
              marginTop: 6,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              textAlign: 'left' as const,
            }}
          >
            Log vitals →
          </button>
        </>
      )}
    </div>
  );
};

// ── WeightCard (kept for legacy compat, but not used in new layout) ────────────
interface WeightCardProps {
  weight: number;
  weightDeltaStr: string | null;
  weightDeltaGood: boolean | null;
  onPress: () => void;
}

export const WeightCard: React.FC<WeightCardProps> = ({
  weight, weightDeltaStr, weightDeltaGood, onPress,
}) => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {displayWeight}
        </span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>kg</span>
      </div>
      <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem' }}>
        Weight
      </span>
    </div>
  );
};

// ── DailyHabitsCard (kept for legacy compat) ──────────────────────────────────
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
  const safeSteps  = Math.max(0, safeNum(steps));
  const safeTarget = Math.max(1, safeNum(targetSteps, 8000));
  const stepsPct   = Math.min(100, Math.max(0, (safeSteps / safeTarget) * 100));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
      {/* Water */}
      <div onClick={onWaterOpen} style={{ cursor: 'pointer', background: 'linear-gradient(145deg, rgba(10,132,255,0.08), rgba(10,132,255,0.03))', border: '1px solid rgba(10,132,255,0.18)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
        <div style={{ fontSize: '1.625rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>{Math.round(water)}</div>
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'rgba(10,132,255,0.8)', display: 'block', marginTop: 4 }}>Hydration</span>
      </div>
      {/* Steps */}
      <div onClick={onStepsOpen} style={{ cursor: 'pointer', background: 'linear-gradient(145deg, rgba(48,209,88,0.07), rgba(48,209,88,0.02))', border: '1px solid rgba(48,209,88,0.15)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
        <div style={{ fontSize: '1.375rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>{safeSteps.toLocaleString()}</div>
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'rgba(48,209,88,0.8)', display: 'block', marginTop: 4 }}>Steps</span>
        <div style={{ height: 3, borderRadius: 99, backgroundColor: 'rgba(48,209,88,0.1)', overflow: 'hidden', marginTop: 6 }}>
          <div style={{ height: '100%', width: `${isNaN(stepsPct) ? 0 : stepsPct}%`, borderRadius: 99, backgroundColor: 'var(--accent-green)', transition: 'width 0.4s ease' }} />
        </div>
      </div>
      {/* Meals */}
      <div onClick={onMealsPress} style={{ cursor: 'pointer', background: 'linear-gradient(145deg, rgba(255,159,10,0.07), rgba(255,159,10,0.02))', border: '1px solid rgba(255,159,10,0.14)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
        <div style={{ fontSize: '1.625rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>{Math.round(mealsLogged)}</div>
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'rgba(255,159,10,0.8)', display: 'block', marginTop: 4 }}>Meals</span>
      </div>
      {/* Training */}
      <div onClick={onTrainingPress} style={{ cursor: 'pointer', background: 'linear-gradient(145deg, rgba(0,0,0,0.03), rgba(255,255,255,0.01))', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
        <div style={{ fontSize: '1.625rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>{Math.round(workoutsToday)}</div>
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-tertiary)', display: 'block', marginTop: 4 }}>Training</span>
      </div>
    </div>
  );
};

// ── MacroSummaryCard (kept for legacy compat) ─────────────────────────────────
interface MacroSummaryCardProps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  targets: MacroTargets;
  onLogFood: () => void;
}

export const MacroSummaryCard: React.FC<MacroSummaryCardProps> = (props) => {
  return <HeroRingCard {...props} />;
};
