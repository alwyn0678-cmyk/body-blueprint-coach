import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell, Plus, Timer, X, Check, RotateCcw, Search,
  TrendingUp, TrendingDown, Trash2, Play, ChevronDown, ChevronUp,
  Award, Zap, Flame, Target, BarChart2, Copy, Star, RefreshCw, Sparkles,
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useApp } from '../context/AppContext';
import { getLocalISOString } from '../utils/dateUtils';
import { WorkoutSession, ExerciseEntry, ExerciseSet, CustomProgram } from '../types';
import { getProgramById, WorkoutProgram, ProgramDay } from '../data/workoutPrograms';
import { coachService } from '../services/aiCoach';
import { computeEarnedBadges } from '../utils/aiCoachingEngine';
import { AIWorkoutBuilder, BuiltExercise } from '../components/AIWorkoutBuilder';

// ── Types ──────────────────────────────────────────────────────────────────────
type SetType = 'W' | 'N' | 'D'; // Warm-up / Normal / Drop-set

interface ActiveSet {
  weight: string;
  reps: string;
  rpe: number; // 0 = not set, 6-10
  type: SetType;
  done: boolean;
}

interface ActiveExercise {
  libraryId: string;
  name: string;
  targetReps?: string;
  rest?: number;
  notes?: string;
  supersetGroup?: string;
  variations?: string[];
  sets: ActiveSet[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const getLastPerformance = (
  logs: ReturnType<typeof useApp>['state']['logs'],
  exerciseId: string,
  excludeDate?: string
): { weight: number; reps: number; sets: number } | null => {
  const sorted = Object.entries(logs)
    .filter(([date]) => date !== excludeDate)
    .sort((a, b) => b[0].localeCompare(a[0]));
  for (const [, log] of sorted) {
    for (const workout of log.workouts) {
      const ex = workout.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return { weight: lastSet.weight, reps: lastSet.reps, sets: ex.sets.length };
      }
    }
  }
  return null;
};

const getPersonalRecord = (
  logs: ReturnType<typeof useApp>['state']['logs'],
  exerciseId: string,
): { weight: number; reps: number; date: string } | null => {
  let best: { weight: number; reps: number; date: string } | null = null;
  for (const [date, log] of Object.entries(logs)) {
    for (const workout of log.workouts) {
      const ex = workout.exercises.find(e => e.exerciseId === exerciseId);
      if (ex) {
        for (const set of ex.sets) {
          if (!best || set.weight * set.reps > best.weight * best.reps) {
            best = { weight: set.weight, reps: set.reps, date };
          }
        }
      }
    }
  }
  return best;
};

const getProgressionTrend = (
  logs: ReturnType<typeof useApp>['state']['logs'],
  exerciseId: string,
  excludeDate?: string,
): 'pr' | 'up' | 'same' | 'down' | null => {
  const sorted = Object.entries(logs)
    .filter(([date]) => date !== excludeDate)
    .sort((a, b) => b[0].localeCompare(a[0]));
  const sessions: number[] = [];
  for (const [, log] of sorted) {
    for (const workout of log.workouts) {
      const ex = workout.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const vol = ex.sets.reduce((a, s) => a + s.weight * s.reps, 0);
        sessions.push(vol);
        if (sessions.length >= 3) break;
      }
    }
    if (sessions.length >= 3) break;
  }
  if (sessions.length < 2) return null;
  const [latest, previous] = sessions;
  const pct = previous > 0 ? (latest - previous) / previous : 0;
  if (pct > 0.05) return 'up';
  if (pct < -0.05) return 'down';
  return 'same';
};

const getLastExerciseVolume = (
  logs: ReturnType<typeof useApp>['state']['logs'],
  exerciseId: string,
  excludeDate?: string,
): number | null => {
  const sorted = Object.entries(logs)
    .filter(([date]) => date !== excludeDate)
    .sort((a, b) => b[0].localeCompare(a[0]));
  for (const [, log] of sorted) {
    for (const workout of log.workouts) {
      const ex = workout.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        return ex.sets.reduce((a, s) => a + s.weight * s.reps, 0);
      }
    }
  }
  return null;
};

const getPrevSessionVolume = (
  logs: ReturnType<typeof useApp>['state']['logs'],
  sessionName: string,
  excludeDate?: string,
): number | null => {
  const sorted = Object.entries(logs)
    .filter(([date]) => date !== excludeDate)
    .sort((a, b) => b[0].localeCompare(a[0]));
  for (const [, log] of sorted) {
    for (const workout of log.workouts) {
      if (workout.name === sessionName) {
        return workout.exercises.reduce(
          (a, ex) => a + ex.sets.reduce((b, s) => b + s.weight * s.reps, 0), 0
        );
      }
    }
  }
  return null;
};

const cycleRpe = (current: number): number => {
  if (current === 0) return 6;
  if (current >= 10) return 0;
  return current + 1;
};

const rpeColor = (rpe: number): string => {
  if (rpe === 0) return 'rgba(0,0,0,0.10)';
  if (rpe <= 7) return '#8B9467';
  if (rpe <= 8) return '#974400';
  return '#DC2626';
};

const SET_TYPE_CONFIG: Record<SetType, { label: string; bg: string; color: string }> = {
  W: { label: 'W', bg: 'rgba(194,203,154,0.25)', color: '#576038' },
  N: { label: 'N', bg: 'rgba(87,96,56,0.12)',    color: '#3E4528' },
  D: { label: 'D', bg: 'rgba(151,68,0,0.12)',    color: '#974400' },
};

const cycleSetType = (t: SetType): SetType => t === 'W' ? 'N' : t === 'N' ? 'D' : 'W';

// ── Custom Program Adapter ─────────────────────────────────────────────────────
const adaptCustomProgram = (cp: CustomProgram): WorkoutProgram => ({
  id: cp.id as any,
  name: cp.name,
  description: cp.description || '',
  days: cp.days.map(d => ({
    dayNumber: d.dayNumber,
    name: d.name,
    focus: d.focus || '',
    exercises: d.exercises.map(e => ({
      exerciseId: e.exerciseId,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      rest: e.rest,
      notes: e.notes,
      supersetGroup: e.supersetGroup,
    })),
  })),
  sex: 'male' as const,
  phase: 1,
  weeklyFrequency: cp.days.length,
});

// ── Next-set Recommendation ────────────────────────────────────────────────────
const getNextSetRecommendation = (
  doneSets: ActiveSet[],
  targetReps?: string,
  lastPerf?: { weight: number; reps: number; sets: number } | null,
  goalType?: string,
): string | null => {
  if (!doneSets.length) return null;
  const last = doneSets[doneSets.length - 1];
  const w = parseFloat(last.weight) || 0;
  const r = parseInt(last.reps) || 0;
  if (!w || !r) return null;

  const rpe = last.rpe;
  const isMuscleGain = goalType === 'muscle_gain';

  let tMin = 0, tMax = 0;
  if (targetReps) {
    const clean = targetReps.replace(/[–—]/g, '-');
    const m = clean.match(/^(\d+)(?:\D+(\d+))?/);
    if (m) { tMin = parseInt(m[1]); tMax = m[2] ? parseInt(m[2]) : tMin; }
  }

  // RPE 10 — hard cap, reduce weight
  if (rpe >= 10) {
    const drop = (Math.round(w * 0.95 / 2.5) * 2.5);
    return `RPE 10 — reduce to ${drop}kg next set`;
  }

  // Hit top of rep range with gas in the tank
  if (tMax > 0 && r >= tMax && rpe < 9) {
    return `Hit ${r} reps — push to ${w + 2.5}kg next set`;
  }

  // Short of target AND RPE 9 — form breakdown risk
  if (tMin > 0 && r < tMin - 1 && rpe === 9) {
    return `Short of target at RPE 9 — hold ${w}kg, drive reps`;
  }

  // Short of target — hold weight, more sets to go
  if (tMin > 0 && r < tMin - 1) {
    const gap = tMin - r;
    return `${gap} rep${gap > 1 ? 's' : ''} short — hold at ${w}kg`;
  }

  // vs last session comparisons
  if (lastPerf) {
    if (w > lastPerf.weight) {
      return `+${(w - lastPerf.weight).toFixed(1).replace(/\.0$/, '')}kg vs last — stay aggressive`;
    }
    if (w === lastPerf.weight && r > lastPerf.reps) {
      return `+${r - lastPerf.reps} rep vs last — great progress`;
    }
    if (w === lastPerf.weight && r === lastPerf.reps) {
      if (rpe >= 9) return `Matched last at RPE ${rpe} — you're at your limit here`;
      return isMuscleGain
        ? `Matched last — push one more rep or add 2.5kg next set`
        : `Matched last — one more rep if you can`;
    }
    if (w < lastPerf.weight || (w === lastPerf.weight && r < lastPerf.reps)) {
      return `Down from last (${lastPerf.weight}kg × ${lastPerf.reps}) — assess fatigue`;
    }
  }
  return null;
};

// ── Exercise Completion Verdict ───────────────────────────────────────────────
const getExerciseVerdict = (
  doneSets: ActiveSet[],
  lastVolume: number | null,
): { label: string; color: string } | null => {
  const completedSets = doneSets.filter(s => s.done);
  if (!completedSets.length) return null;
  const vol = completedSets.reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
  if (vol === 0) return null;
  if (lastVolume === null || lastVolume === 0) {
    return { label: `First time — ${Math.round(vol)}kg volume`, color: '#576038' };
  }
  const pct = ((vol - lastVolume) / lastVolume) * 100;
  if (pct >= 5) return { label: `+${pct.toFixed(0)}% vs last (${Math.round(vol)} vs ${Math.round(lastVolume)}kg)`, color: '#576038' };
  if (pct <= -5) return { label: `${pct.toFixed(0)}% vs last — below last session`, color: '#EF4444' };
  return { label: `Matched last session · ${Math.round(vol)}kg`, color: '#974400' };
};

// ── Summary Types ──────────────────────────────────────────────────────────────
interface ExerciseSummary {
  name: string;
  setCount: number;
  bestSet: { weight: number; reps: number } | null;
  volume: number;
  isPR: boolean;
}

interface SummaryData {
  name: string;
  durationMinutes: number;
  totalVolume: number;
  prCount: number;
  caloriesBurned: number;
  exercises: ExerciseSummary[];
  prevVolume?: number;
}

// ── Confetti Burst ────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#576038', '#974400', '#8B9467', '#C2CB9A', '#D2691E', '#3E4528'];
const ConfettiBurst: React.FC = () => {
  const pieces = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      w: 5 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      delay: Math.random() * 0.9,
      duration: 1.6 + Math.random() * 1.4,
    }))
  , []);
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <style>{`@keyframes cfDrop{0%{transform:translateY(-12px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:0}}`}</style>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: '-8px',
          width: p.w, height: p.h, background: p.color, borderRadius: 2,
          animation: `cfDrop ${p.duration}s ease-in ${p.delay}s forwards`,
          opacity: 0,
        }} />
      ))}
    </div>
  );
};

// ── Workout Summary Screen ─────────────────────────────────────────────────────
const WorkoutSummaryScreen: React.FC<{
  summary: SummaryData;
  coachFeedback: string;
  logs: ReturnType<typeof useApp>['state']['logs'];
  user: ReturnType<typeof useApp>['state']['user'];
  onDone: () => void;
}> = ({ summary, coachFeedback, logs, user, onDone }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const badges = useMemo(() =>
    user ? computeEarnedBadges(logs, user) : []
  , [logs, user]);

  // Badges earned from this session: weekly target + PR milestones
  const sessionBadges = useMemo(() => {
    const earned: { icon: string; label: string; color: string }[] = [];
    if (summary.prCount > 0) earned.push({ icon: '🏆', label: `${summary.prCount} new PR${summary.prCount > 1 ? 's' : ''}`, color: '#974400' });
    const weekBadge = badges.find(b => b.id === 'weekly_target');
    if (weekBadge) earned.push({ icon: weekBadge.icon, label: weekBadge.label, color: weekBadge.color });
    return earned;
  }, [summary.prCount, badges]);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F5F0E8',
      zIndex: 9020, display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {showConfetti && <ConfettiBurst />}
      {/* Hero header */}
      <div style={{
        padding: '3.5rem 1.5rem 2rem', textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(87,96,56,0.07) 0%, transparent 100%)',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(87,96,56,0.15), rgba(87,96,56,0.06))',
          border: '1px solid rgba(87,96,56,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 0 50px rgba(87,96,56,0.18)',
        }}>
          <Check size={36} color="#576038" />
        </div>
        <h1 style={{
          fontFamily: "'Outfit',sans-serif", fontSize: '2rem', fontWeight: 900,
          letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)',
        }}>Workout Complete</h1>
        <p style={{ fontSize: '0.82rem', color: 'rgba(0,0,0,0.24)', fontWeight: 600, marginTop: 8 }}>
          {summary.name}
        </p>
        {sessionBadges.length > 0 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {sessionBadges.map((b, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 99,
                background: `${b.color}14`, border: `1px solid ${b.color}30`,
              }}>
                <span style={{ fontSize: '0.78rem' }}>{b.icon}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: b.color }}>{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '0 1.25rem', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Duration', value: `${summary.durationMinutes}m`, color: '#576038', icon: <Timer size={14} color="#576038" /> },
            { label: 'Volume', value: summary.totalVolume > 1000 ? `${(summary.totalVolume / 1000).toFixed(1)}k` : String(Math.round(summary.totalVolume)), sub: 'kg', color: '#974400', icon: <BarChart2 size={14} color="#974400" /> },
            { label: 'PRs', value: String(summary.prCount), color: '#974400', icon: <Award size={14} color="#974400" /> },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)',
              borderRadius: 18, padding: '16px 8px',
              border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ marginBottom: 6 }}>{s.icon}</div>
              <div style={{
                fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1.5rem',
                color: s.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1,
              }}>
                {s.value}
                {'sub' in s && s.sub && <span style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.7 }}>{s.sub}</span>}
              </div>
              <div style={{ fontSize: '0.52rem', color: 'rgba(0,0,0,0.16)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* vs Last Session */}
        {summary.prevVolume !== undefined && summary.prevVolume > 0 && (() => {
          const pct = ((summary.totalVolume - summary.prevVolume) / summary.prevVolume) * 100;
          const up = pct >= 0;
          return (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 16px',
              background: up ? 'rgba(87,96,56,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${up ? 'rgba(87,96,56,0.18)' : 'rgba(239,68,68,0.18)'}`,
              borderRadius: 14,
            }}>
              {up ? <TrendingUp size={14} color="#576038" /> : <TrendingDown size={14} color="#EF4444" />}
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: up ? '#576038' : '#EF4444' }}>
                {up ? '+' : ''}{pct.toFixed(0)}% vs last session
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(0,0,0,0.20)' }}>
                ({Math.round(summary.prevVolume)}→{Math.round(summary.totalVolume)}kg)
              </span>
            </div>
          );
        })()}

        {/* Calories */}
        {summary.caloriesBurned > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px',
            background: 'rgba(151,68,0,0.06)', border: '1px solid rgba(151,68,0,0.15)', borderRadius: 14,
          }}>
            <Flame size={14} color="#974400" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(28,28,46,0.68)' }}>
              ~{summary.caloriesBurned} kcal burned
            </span>
          </div>
        )}

        {/* AI Coach Feedback */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(87,96,56,0.06), rgba(87,96,56,0.03))',
          border: '1px solid rgba(87,96,56,0.18)', borderRadius: 20, padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Zap size={13} color="#576038" fill="#576038" />
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'rgba(87,96,56,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Coach Feedback</span>
          </div>
          <p style={{
            fontSize: '0.88rem',
            color: coachFeedback ? 'rgba(28,28,46,0.85)' : 'rgba(28,28,46,0.30)',
            fontWeight: 600, lineHeight: 1.65, margin: 0,
            fontStyle: coachFeedback ? 'normal' : 'italic',
          }}>
            {coachFeedback || 'Analyzing your session…'}
          </p>
        </div>

        {/* Exercise breakdown */}
        <div>
          <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'rgba(0,0,0,0.14)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Exercises · {summary.exercises.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {summary.exercises.map((ex, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--bg-card)',
                border: `1px solid ${ex.isPR ? 'rgba(151,68,0,0.22)' : 'rgba(0,0,0,0.05)'}`,
                borderRadius: 14,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</span>
                    {ex.isPR && (
                      <span style={{
                        fontSize: '0.54rem', fontWeight: 800, padding: '2px 6px', borderRadius: 99, flexShrink: 0,
                        background: 'rgba(151,68,0,0.10)', color: '#974400', border: '1px solid rgba(151,68,0,0.20)',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        <Award size={8} /> PR
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.67rem', color: 'rgba(0,0,0,0.32)', fontWeight: 600, marginTop: 3 }}>
                    {ex.setCount} sets{ex.bestSet ? ` · best ${ex.bestSet.weight}kg × ${ex.bestSet.reps}` : ''}
                  </div>
                </div>
                {ex.volume > 0 && (
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'rgba(0,0,0,0.32)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, paddingLeft: 12 }}>
                    {Math.round(ex.volume)}kg
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Done CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '1rem 1.25rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, var(--bg-primary) 55%, transparent)',
      }}>
        <button
          onClick={onDone}
          style={{
            width: '100%', padding: '1.1rem',
            background: 'linear-gradient(135deg, #576038, #3E4528)',
            border: 'none', borderRadius: 18,
            color: '#FFFFFF', fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
            fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.01em',
            boxShadow: '0 8px 32px rgba(87,96,56,0.35)',
          }}
          onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
          onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Done
        </button>
      </div>
    </div>
  );
};

// ── Muscle Colors ──────────────────────────────────────────────────────────────
const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#576038', Back: '#3E4528', Legs: '#974400',
  Arms: '#8B9467', Delts: '#C2CB9A', Glutes: '#D2691E',
  Hamstrings: '#974400', Triceps: '#576038', Core: '#8B9467',
};

const PUSH_MUSCLES = ['Chest', 'Triceps', 'Delts', 'Shoulders'];
const PULL_MUSCLES = ['Back', 'Arms', 'Traps', 'Biceps'];
const LEG_MUSCLES = ['Legs', 'Glutes', 'Hamstrings', 'Calves', 'Quads'];

const getMovementPattern = (muscles: string[]): 'push' | 'pull' | 'legs' | 'core' => {
  if (muscles.some(m => LEG_MUSCLES.includes(m))) return 'legs';
  if (muscles.some(m => m === 'Core' || m === 'Abs')) return 'core';
  const hasPush = muscles.some(m => PUSH_MUSCLES.includes(m));
  const hasPull = muscles.some(m => PULL_MUSCLES.includes(m));
  if (hasPull && !hasPush) return 'pull';
  return 'push';
};

const PATTERN_COLOR: Record<string, string> = {
  push: '#576038', pull: '#3E4528', legs: '#974400', core: '#8B9467',
  favorites: '#974400', swap: '#8B9467',
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'favorites', label: '★ Saved' },
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'legs', label: 'Legs' },
  { key: 'core', label: 'Core' },
  { key: 'Chest', label: 'Chest' },
  { key: 'Back', label: 'Back' },
  { key: 'Shoulders', label: 'Shoulders' },
  { key: 'Glutes', label: 'Glutes' },
  { key: 'Hamstrings', label: 'Hamstrings' },
  { key: 'Biceps', label: 'Biceps' },
  { key: 'Triceps', label: 'Triceps' },
] as const;

// ── Exercise Picker ────────────────────────────────────────────────────────────
const ExercisePicker: React.FC<{
  library: { id: string; name: string; targetMuscles: string[] }[];
  alreadyAdded: string[];
  recentIds: string[];
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  onConfirm: (selected: { id: string; name: string }[]) => void;
  onClose: () => void;
  /** If set, show only exercises matching these muscles (swap mode) */
  swapMuscles?: string[];
}> = ({ library, alreadyAdded, recentIds, favoriteIds, onToggleFavorite, onConfirm, onClose, swapMuscles }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>(swapMuscles ? 'swap' : 'all');
  const [selected, setSelected] = useState<{ id: string; name: string }[]>([]);

  const toggle = (id: string, name: string) => {
    setSelected(prev =>
      prev.some(s => s.id === id) ? prev.filter(s => s.id !== id) : [...prev, { id, name }]
    );
  };

  const MUSCLE_KEYS = new Set(['Chest', 'Back', 'Shoulders', 'Glutes', 'Hamstrings', 'Biceps', 'Triceps', 'Quads', 'Calves', 'Core', 'Traps', 'Rear Delts']);

  const filtered = library.filter(e => {
    const matchQ = e.name.toLowerCase().includes(query.toLowerCase());
    let matchF = true;
    if (filter === 'favorites') matchF = favoriteIds.includes(e.id);
    else if (filter === 'swap') matchF = !!swapMuscles && e.targetMuscles.some(m => swapMuscles.includes(m));
    else if (MUSCLE_KEYS.has(filter)) matchF = e.targetMuscles.includes(filter);
    else if (filter !== 'all') matchF = getMovementPattern(e.targetMuscles) === filter;
    return matchQ && matchF;
  });

  const recentExercises = recentIds
    .map(id => library.find(e => e.id === id))
    .filter(Boolean) as { id: string; name: string; targetMuscles: string[] }[];

  const isSelected = (id: string) => selected.some(s => s.id === id);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#F5F0E8',
      zIndex: 9010,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.25rem 0',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        background: 'rgba(245,240,232,0.98)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.4rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
              Add Exercises
            </h2>
            <p style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.24)', fontWeight: 600, marginTop: 2 }}>
              {selected.length > 0 ? `${selected.length} selected` : `${filtered.length} exercises`}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%',
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <X size={18} color="rgba(28,28,46,0.45)" />
          </button>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(0,0,0,0.05)', borderRadius: 14,
          padding: '0.7rem 1rem', marginBottom: 12,
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <Search size={15} color="rgba(0,0,0,0.20)" />
          <input
            autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search exercises..."
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.95rem', flex: 1 }}
          />
          {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={13} color="rgba(0,0,0,0.20)" /></button>}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTER_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={{
                flexShrink: 0, padding: '6px 16px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: filter === t.key
                  ? (t.key === 'all' ? '#576038' : PATTERN_COLOR[t.key as keyof typeof PATTERN_COLOR] || '#576038')
                  : 'rgba(0,0,0,0.05)',
                color: filter === t.key ? '#fff' : 'rgba(0,0,0,0.30)',
                transition: 'all 0.15s',
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1rem 6rem' }}>
        {/* Recent */}
        {recentExercises.length > 0 && !query && filter === 'all' && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.16)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, paddingLeft: 4 }}>Recently Used</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {recentExercises.slice(0, 6).map(ex => {
                const sel = isSelected(ex.id);
                const already = alreadyAdded.includes(ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => !already && toggle(ex.id, ex.name)}
                    style={{
                      padding: '8px 14px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 700,
                      background: sel ? 'rgba(87,96,56,0.12)' : already ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.06)',
                      border: sel ? '1px solid rgba(87,96,56,0.35)' : '1px solid rgba(0,0,0,0.07)',
                      color: sel ? '#576038' : already ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.55)',
                      cursor: already ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {sel && <Check size={12} color="#576038" />}
                    {ex.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(0,0,0,0.16)' }}>
            <Dumbbell size={28} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.9rem' }}>No exercises found</p>
          </div>
        ) : (
          filtered.map(ex => {
            const sel = isSelected(ex.id);
            const already = alreadyAdded.includes(ex.id);
            const pattern = getMovementPattern(ex.targetMuscles);
            const pColor = PATTERN_COLOR[pattern];
            return (
              <div
                key={ex.id}
                onClick={() => !already && toggle(ex.id, ex.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0.9rem 0.75rem', borderRadius: 14,
                  marginBottom: 2, cursor: already ? 'default' : 'pointer',
                  background: sel ? 'rgba(87,96,56,0.06)' : 'transparent',
                  border: sel ? '1px solid rgba(87,96,56,0.20)' : '1px solid transparent',
                  opacity: already ? 0.35 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: sel ? '#576038' : 'rgba(0,0,0,0.06)',
                  border: sel ? 'none' : '1.5px solid rgba(0,0,0,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {sel && <Check size={14} color="#FFFFFF" />}
                  {already && <Check size={14} color="rgba(0,0,0,0.28)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>{ex.name}</span>
                  <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                      background: `${pColor}18`, color: pColor, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{pattern}</span>
                    {ex.targetMuscles.slice(0, 2).map(m => (
                      <span key={m} style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: 5, background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.28)' }}>{m}</span>
                    ))}
                  </div>
                </div>
                {/* Favorite star */}
                <button
                  onClick={e => { e.stopPropagation(); onToggleFavorite(ex.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, flexShrink: 0, display: 'flex' }}
                >
                  <Star
                    size={16}
                    color={favoriteIds.includes(ex.id) ? '#974400' : 'rgba(0,0,0,0.12)'}
                    fill={favoriteIds.includes(ex.id) ? '#974400' : 'none'}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Floating confirm button */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '1rem 1.25rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, var(--bg-primary) 60%, transparent)',
        zIndex: 10,
      }}>
        <button
          onClick={() => { if (selected.length > 0) { onConfirm(selected); } else onClose(); }}
          style={{
            width: '100%', padding: '1.1rem',
            background: selected.length > 0
              ? 'linear-gradient(135deg, #576038, #3E4528)'
              : 'rgba(0,0,0,0.06)',
            border: 'none', borderRadius: 18,
            color: selected.length > 0 ? '#fff' : 'rgba(0,0,0,0.28)',
            fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
            fontFamily: "'Outfit',sans-serif",
            letterSpacing: '-0.01em',
            boxShadow: selected.length > 0 ? '0 8px 32px rgba(87,96,56,0.35)' : 'none',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {selected.length > 0 ? (
            <><Plus size={18} /> Add {selected.length} Exercise{selected.length !== 1 ? 's' : ''}</>
          ) : 'Close'}
        </button>
      </div>
    </div>
  );
};

// ── Active Workout ─────────────────────────────────────────────────────────────
const ActiveWorkoutScreen: React.FC<{
  workoutName: string;
  exercises: ActiveExercise[];
  elapsed: number;
  logs: ReturnType<typeof useApp>['state']['logs'];
  today: string;
  goalType?: string;
  onUpdateExercises: (fn: (prev: ActiveExercise[]) => ActiveExercise[]) => void;
  onAddExercise: () => void;
  onFinish: () => void;
  onCancel: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ workoutName, exercises, elapsed, logs, today, goalType, onUpdateExercises, onAddExercise, onFinish, onCancel, showToast }) => {
  const { state, toggleFavoriteExercise } = useApp();
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const restRef = useRef<ReturnType<typeof setTimeout>>();
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [swapExIdx, setSwapExIdx] = useState<number | null>(null);
  const [swapMuscles, setSwapMuscles] = useState<string[]>([]);

  useEffect(() => {
    if (restTimer === null || restTimer <= 0) return;
    const t = setTimeout(() => setRestTimer(prev => (prev !== null && prev > 0 ? prev - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [restTimer]);

  const startRest = (s: number) => { setRestTimer(s); clearTimeout(restRef.current); };

  const updateSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    onUpdateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }),
    }));
  };

  const toggleSetType = (exIdx: number, setIdx: number) => {
    onUpdateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, type: cycleSetType(s.type) }),
    }));
  };

  const updateRpe = (exIdx: number, setIdx: number) => {
    onUpdateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, rpe: cycleRpe(s.rpe) }),
    }));
  };

  const toggleSetDone = (exIdx: number, setIdx: number) => {
    const set = exercises[exIdx]?.sets[setIdx];
    if (set && !set.done && set.type !== 'W' && (!set.weight || !set.reps)) {
      showToast('Enter weight and reps first', 'error');
      return;
    }
    // Smart rest: warm-up = 45s, high RPE gets extra rest
    const base = exercises[exIdx]?.rest ?? 90;
    const restTime = set?.type === 'W' ? 45
      : set?.rpe >= 10 ? Math.max(base, 180)
      : set?.rpe === 9 ? Math.max(base, 150)
      : set?.rpe === 8 ? Math.max(base, 120)
      : base;
    onUpdateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, done: !s.done }),
    }));
    if (!set?.done) startRest(restTime);
  };

  const addSet = (exIdx: number) => {
    onUpdateExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { weight: last?.weight || '', reps: last?.reps || '', rpe: 0, type: 'N' as SetType, done: false }] };
    }));
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    onUpdateExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx || ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
    }));
  };

  const removeExercise = (exIdx: number) => {
    onUpdateExercises(prev => prev.filter((_, i) => i !== exIdx));
  };

  const fillFromLast = (exIdx: number) => {
    const ex = exercises[exIdx];
    if (!ex) return;
    const lastPerf = getLastPerformance(logs, ex.libraryId, today);
    if (!lastPerf) { showToast('No previous data found', 'info'); return; }
    onUpdateExercises(prev => prev.map((e, i) => i !== exIdx ? e : {
      ...e,
      sets: e.sets.map(s => s.done ? s : {
        ...s,
        weight: s.weight || String(lastPerf.weight),
        reps: s.reps || String(lastPerf.reps),
      }),
    }));
    showToast(`Filled from last: ${lastPerf.weight}kg × ${lastPerf.reps}`, 'info');
  };

  const completedSets = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
  const totalSets = exercises.reduce((a, ex) => a + ex.sets.length, 0);
  const progressPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#F5F0E8',
      zIndex: 9002, display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(245,240,232,0.97)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{ padding: '1rem 1.25rem 0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontFamily: "'Outfit',sans-serif", fontSize: '1.1rem', fontWeight: 900,
                margin: 0, letterSpacing: '-0.02em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{workoutName}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Timer size={12} color="#576038" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#576038', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(elapsed)}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600 }}>{completedSets}/{totalSets} sets</span>
                {progressPct > 0 && (
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 800, color: '#576038',
                    background: 'rgba(87,96,56,0.10)', padding: '2px 8px', borderRadius: 99,
                  }}>{Math.round(progressPct)}%</span>
                )}
              </div>
            </div>
            <button
              onClick={onCancel}
              style={{
                background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 99, padding: '6px 14px',
                color: 'rgba(0,0,0,0.30)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >Cancel</button>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(0,0,0,0.04)' }}>
          <div style={{
            height: '100%', width: `${progressPct}%`,
            background: progressPct === 100
              ? 'linear-gradient(90deg, #576038, #3E4528)'
              : 'linear-gradient(90deg, #576038, #3E4528)',
            transition: 'width 0.4s ease',
            boxShadow: progressPct > 0 ? '0 0 12px rgba(87,96,56,0.45)' : 'none',
          }} />
        </div>
      </div>

      {/* Rest Timer Banner */}
      {restTimer !== null && restTimer > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(87,96,56,0.07)', border: '1px solid rgba(87,96,56,0.15)',
          margin: '12px 16px 0', padding: '12px 16px', borderRadius: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '2px solid rgba(87,96,56,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RotateCcw size={16} color="#576038" />
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(87,96,56,0.60)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rest</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#576038', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{formatDuration(restTimer)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[30, 60].map(s => (
              <button key={s} onClick={() => setRestTimer(t => (t ?? 0) + s)} style={{
                background: 'rgba(87,96,56,0.10)', border: '1px solid rgba(87,96,56,0.15)',
                borderRadius: 99, padding: '4px 10px', color: '#576038',
                fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer',
              }}>+{s}s</button>
            ))}
            <button onClick={() => setRestTimer(null)} style={{
              background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
              borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={14} color="rgba(0,0,0,0.28)" />
            </button>
          </div>
        </div>
      )}

      {/* Exercise Cards */}
      <div style={{ flex: 1, padding: '12px 16px', paddingBottom: '7rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {exercises.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'rgba(0,0,0,0.16)' }}>
            <Dumbbell size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>No exercises yet</p>
            <p style={{ fontSize: '0.78rem', marginTop: 4, opacity: 0.7 }}>Tap "Add Exercise" below</p>
          </div>
        )}

        {exercises.map((ex, exIdx) => {
          const lastPerf = getLastPerformance(logs, ex.libraryId, today);
          const pr = getPersonalRecord(logs, ex.libraryId);
          const trend = getProgressionTrend(logs, ex.libraryId, today);
          const doneSets = ex.sets.filter(s => s.done).length;
          const allDone = doneSets === ex.sets.length && doneSets > 0;

          return (
            <div
              key={`${ex.libraryId}-${exIdx}`}
              style={{
                background: allDone
                  ? 'linear-gradient(135deg, rgba(87,96,56,0.07) 0%, var(--bg-card) 100%)'
                  : 'var(--bg-card)',
                borderRadius: 22,
                border: `1px solid ${allDone ? 'rgba(87,96,56,0.25)' : 'rgba(0,0,0,0.06)'}`,
                overflow: 'hidden',
                boxShadow: allDone ? '0 0 30px rgba(87,96,56,0.07)' : '0 4px 24px rgba(0,0,0,0.3)',
                transition: 'all 0.3s',
              }}
            >
              {/* Top stripe */}
              <div style={{
                height: 2,
                background: allDone
                  ? 'linear-gradient(90deg, transparent, #576038, transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(87,96,56,0.35), transparent)',
              }} />

              {/* Header */}
              <div style={{ padding: '14px 16px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: '1rem',
                        color: allDone ? 'rgba(0,0,0,0.38)' : 'var(--text-primary)',
                      }}>{ex.name}</span>
                      {allDone && <Check size={15} color="#576038" />}
                      {trend === 'up' && <TrendingUp size={13} color="#576038" />}
                      {trend === 'down' && <TrendingDown size={13} color="#EF4444" />}
                      {pr && (
                        <span style={{
                          fontSize: '0.58rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                          background: 'rgba(151,68,0,0.10)', color: '#974400',
                          border: '1px solid rgba(151,68,0,0.20)',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <Award size={9} /> PR {pr.weight}×{pr.reps}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 800, color: '#576038',
                        background: 'rgba(87,96,56,0.08)', padding: '2px 8px', borderRadius: 99,
                      }}>{doneSets}/{ex.sets.length} sets</span>
                      {lastPerf ? (
                        <span style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.24)', fontWeight: 600 }}>
                          Last: {lastPerf.weight}kg × {lastPerf.reps}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.14)', fontWeight: 600 }}>First time</span>
                      )}
                      {/* Today's Target — projected from last performance */}
                      {!allDone && (lastPerf || ex.targetReps) && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 800,
                          color: '#576038',
                          background: 'rgba(87,96,56,0.07)',
                          padding: '2px 8px', borderRadius: 99,
                          border: '1px solid rgba(87,96,56,0.18)',
                        }}>
                          {lastPerf
                            ? `→ ${lastPerf.weight}kg × ${ex.targetReps || lastPerf.reps}`
                            : `→ ${ex.targetReps} reps`}
                        </span>
                      )}
                      {ex.rest && (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.14)', fontWeight: 600 }}>· {ex.rest}s rest</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    {lastPerf && (
                      <button
                        onClick={() => fillFromLast(exIdx)}
                        title="Fill all sets from last session"
                        style={{
                          background: 'rgba(87,96,56,0.07)', border: '1px solid rgba(87,96,56,0.18)',
                          borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                      >
                        <Copy size={13} color="rgba(87,96,56,0.70)" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        // Find muscles for this exercise and open swap picker
                        const libEx = state.workoutLibrary.find(l => l.id === ex.libraryId);
                        setSwapExIdx(exIdx);
                        setSwapMuscles(libEx?.targetMuscles ?? []);
                        setShowPicker(true);
                      }}
                      title="Swap exercise"
                      style={{
                        background: 'rgba(87,96,56,0.07)', border: '1px solid rgba(87,96,56,0.18)',
                        borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <RefreshCw size={13} color="rgba(87,96,56,0.70)" />
                    </button>
                    <button
                      onClick={() => removeExercise(exIdx)}
                      style={{
                        background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 10,
                        width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} color="rgba(239,68,68,0.6)" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Column headers */}
              <div style={{ display: 'flex', padding: '0 16px', marginBottom: 6, alignItems: 'center' }}>
                <div style={{ width: 24, flexShrink: 0 }} />
                <span style={{ width: 36, flexShrink: 0, fontSize: '0.55rem', fontWeight: 900, color: 'rgba(0,0,0,0.12)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>TYPE</span>
                <span style={{ flex: 1, fontSize: '0.55rem', fontWeight: 900, color: 'rgba(0,0,0,0.12)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>KG</span>
                <span style={{ flex: 1, fontSize: '0.55rem', fontWeight: 900, color: 'rgba(0,0,0,0.12)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>REPS</span>
                <span style={{ width: 32, flexShrink: 0, fontSize: '0.55rem', fontWeight: 900, color: 'rgba(0,0,0,0.12)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>RPE</span>
                <div style={{ width: 40, flexShrink: 0 }} />
                <div style={{ width: 20, flexShrink: 0 }} />
              </div>

              {/* Sets */}
              <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {ex.sets.map((set, setIdx) => {
                  const inputKey = `${exIdx}-${setIdx}`;
                  const isActive = activeInput === inputKey;
                  const typeConf = SET_TYPE_CONFIG[set.type];
                  return (
                    <div
                      key={setIdx}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        opacity: set.done ? 0.45 : 1,
                        transition: 'opacity 0.25s',
                      }}
                    >
                      {/* Set number */}
                      <div style={{
                        width: 24, height: 42, borderRadius: 9, flexShrink: 0,
                        background: set.done ? 'rgba(87,96,56,0.10)' : 'rgba(0,0,0,0.03)',
                        border: `1.5px solid ${set.done ? 'rgba(87,96,56,0.30)' : 'rgba(0,0,0,0.06)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 900, color: set.done ? '#576038' : 'rgba(0,0,0,0.28)' }}>{setIdx + 1}</span>
                      </div>

                      {/* Set Type badge */}
                      <button
                        onClick={() => !set.done && toggleSetType(exIdx, setIdx)}
                        disabled={set.done}
                        title="W = Warm-up  ·  N = Normal  ·  D = Drop set"
                        style={{
                          width: 36, height: 42, borderRadius: 10, flexShrink: 0,
                          background: typeConf.bg,
                          border: `1.5px solid ${typeConf.color}40`,
                          color: typeConf.color,
                          fontWeight: 900, fontSize: '0.7rem',
                          cursor: set.done ? 'default' : 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span>{typeConf.label}</span>
                      </button>

                      {/* Weight — type="text" fixes iOS decimal point blocked by type="number" */}
                      <input
                        type="text" inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        placeholder={lastPerf ? String(lastPerf.weight) : '0'}
                        value={set.weight}
                        onChange={e => {
                          const raw = e.target.value.replace(',', '.');
                          if (/^(\d*\.?\d*)$/.test(raw)) updateSet(exIdx, setIdx, 'weight', raw);
                        }}
                        onFocus={() => setActiveInput(inputKey)}
                        onBlur={() => setActiveInput(null)}
                        disabled={set.done}
                        style={{
                          width: 62, height: 42, borderRadius: 11, flexShrink: 0,
                          background: isActive ? 'rgba(87,96,56,0.10)' : 'rgba(0,0,0,0.04)',
                          border: `1.5px solid ${isActive ? 'rgba(87,96,56,0.45)' : 'rgba(0,0,0,0.06)'}`,
                          color: 'var(--text-primary)', textAlign: 'center',
                          fontSize: '1.05rem', fontWeight: 800,
                          outline: 'none', fontVariantNumeric: 'tabular-nums',
                          boxShadow: isActive ? '0 0 16px rgba(87,96,56,0.15)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      />

                      {/* Reps */}
                      <input
                        type="number" inputMode="numeric"
                        placeholder={lastPerf ? String(lastPerf.reps) : (ex.targetReps?.split('–')[0] || '0')}
                        value={set.reps}
                        onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                        onFocus={() => setActiveInput(inputKey)}
                        onBlur={() => setActiveInput(null)}
                        disabled={set.done}
                        style={{
                          width: 52, height: 42, borderRadius: 11, flexShrink: 0,
                          background: isActive ? 'rgba(87,96,56,0.10)' : 'rgba(0,0,0,0.04)',
                          border: `1.5px solid ${isActive ? 'rgba(87,96,56,0.45)' : 'rgba(0,0,0,0.06)'}`,
                          color: 'var(--text-primary)', textAlign: 'center',
                          fontSize: '1.05rem', fontWeight: 800,
                          outline: 'none', fontVariantNumeric: 'tabular-nums',
                          boxShadow: isActive ? '0 0 16px rgba(87,96,56,0.15)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      />

                      {/* RPE badge */}
                      <button
                        onClick={() => !set.done && updateRpe(exIdx, setIdx)}
                        disabled={set.done}
                        title="RPE (Rate of Perceived Exertion) — tap to set"
                        style={{
                          width: 32, height: 42, borderRadius: 10, flexShrink: 0,
                          background: set.rpe > 0 ? `${rpeColor(set.rpe)}18` : 'rgba(0,0,0,0.03)',
                          border: `1.5px solid ${set.rpe > 0 ? `${rpeColor(set.rpe)}40` : 'rgba(0,0,0,0.06)'}`,
                          color: set.rpe > 0 ? rpeColor(set.rpe) : 'rgba(0,0,0,0.13)',
                          fontWeight: 900, fontSize: set.rpe > 0 ? '0.88rem' : '0.68rem',
                          cursor: set.done ? 'default' : 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        {set.rpe > 0 ? (
                          <>{set.rpe}<span style={{ fontSize: '0.4rem', fontWeight: 700, opacity: 0.7 }}>RPE</span></>
                        ) : (
                          <span style={{ fontSize: '0.6rem' }}>RPE</span>
                        )}
                      </button>

                      {/* Done button */}
                      <button
                        onClick={() => toggleSetDone(exIdx, setIdx)}
                        style={{
                          width: 40, height: 42, borderRadius: 11, border: 'none', cursor: 'pointer',
                          background: set.done
                            ? 'rgba(87,96,56,0.20)'
                            : (set.weight && set.reps ? 'rgba(87,96,56,0.10)' : 'rgba(0,0,0,0.04)'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          boxShadow: set.done ? '0 0 16px rgba(87,96,56,0.20)' : 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Check size={20} color={set.done ? '#576038' : (set.weight && set.reps ? 'rgba(87,96,56,0.5)' : 'rgba(0,0,0,0.10)')} />
                      </button>

                      {/* Remove set */}
                      <button
                        onClick={() => removeSet(exIdx, setIdx)}
                        style={{
                          width: 20, height: 42, borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        <X size={12} color="rgba(0,0,0,0.12)" />
                      </button>
                    </div>
                  );
                })}

                {/* Next-set recommendation */}
                {(() => {
                  const doneSets = ex.sets.filter(s => s.done);
                  const undoneSets = ex.sets.filter(s => !s.done);
                  if (!doneSets.length || !undoneSets.length) return null;
                  const rec = getNextSetRecommendation(doneSets, ex.targetReps, lastPerf, goalType);
                  if (!rec) return null;
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 10px', borderRadius: 10,
                      background: 'rgba(87,96,56,0.06)',
                      border: '1px solid rgba(87,96,56,0.12)',
                      marginTop: 2,
                    }}>
                      <Zap size={10} color="#576038" fill="#576038" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(87,96,56,0.80)' }}>{rec}</span>
                    </div>
                  );
                })()}

                {/* Exercise completion verdict — shown when all sets done */}
                {allDone && (() => {
                  const lastVol = getLastExerciseVolume(logs, ex.libraryId, today);
                  const verdict = getExerciseVerdict(ex.sets, lastVol);
                  if (!verdict) return null;
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: 10,
                      background: `${verdict.color}10`,
                      border: `1px solid ${verdict.color}25`,
                      marginTop: 2,
                    }}>
                      <Check size={11} color={verdict.color} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: verdict.color }}>{verdict.label}</span>
                    </div>
                  );
                })()}

                {/* Add Set + Rest timers */}
                <div style={{ display: 'flex', gap: 7, marginTop: 4 }}>
                  <button
                    onClick={() => addSet(exIdx)}
                    style={{
                      flex: 1, height: 38,
                      background: 'rgba(0,0,0,0.02)',
                      border: '1.5px dashed rgba(0,0,0,0.07)',
                      borderRadius: 11, color: 'rgba(0,0,0,0.28)',
                      fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <Plus size={12} /> Add Set
                  </button>
                  {[60, 90, 120, 180].map(t => (
                    <button
                      key={t}
                      onClick={() => startRest(t)}
                      style={{
                        padding: '0 10px', height: 38,
                        background: ex.rest === t ? 'rgba(87,96,56,0.12)' : 'rgba(87,96,56,0.05)',
                        border: `1px solid ${ex.rest === t ? 'rgba(87,96,56,0.35)' : 'rgba(87,96,56,0.10)'}`,
                        borderRadius: 11, color: '#576038',
                        fontWeight: 800, fontSize: '0.68rem', cursor: 'pointer', flexShrink: 0,
                      }}
                    >{t >= 60 ? `${t / 60}m` : `${t}s`}</button>
                  ))}
                </div>

                {/* Notes */}
                {ex.notes && (
                  <div style={{
                    marginTop: 4, padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(87,96,56,0.05)', border: '1px solid rgba(87,96,56,0.10)',
                  }}>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(87,96,56,0.70)', fontWeight: 600, fontStyle: 'italic' }}>{ex.notes}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, var(--bg-primary) 60%, transparent)',
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onAddExercise}
            style={{
              flex: 1, height: 54, borderRadius: 16,
              background: 'rgba(87,96,56,0.10)',
              border: '1.5px solid rgba(87,96,56,0.30)',
              color: '#576038', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <Plus size={17} /> Add Exercise
          </button>
          <button
            onClick={onFinish}
            style={{
              flex: 1, height: 54, borderRadius: 16,
              background: 'linear-gradient(135deg, #576038, #3E4528)',
              border: 'none', color: '#FFFFFF',
              fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer',
              fontFamily: "'Outfit',sans-serif",
              boxShadow: '0 8px 32px rgba(87,96,56,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
            onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Check size={17} /> Finish
          </button>
        </div>
      </div>

      {/* Swap / add exercise picker (inside ActiveWorkoutScreen) */}
      {showPicker && (
        <ExercisePicker
          library={state.workoutLibrary}
          alreadyAdded={swapExIdx !== null ? [] : exercises.map(e => e.libraryId)}
          recentIds={Object.entries(logs).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5).flatMap(([, l]) => l.workouts.flatMap(w => w.exercises.map(e => e.exerciseId)))}
          favoriteIds={state.favoriteExerciseIds ?? []}
          onToggleFavorite={toggleFavoriteExercise}
          swapMuscles={swapExIdx !== null ? swapMuscles : undefined}
          onConfirm={selected => {
            if (swapExIdx !== null && selected.length > 0) {
              const pick = selected[0];
              onUpdateExercises(prev => prev.map((ex, i) => i !== swapExIdx ? ex : {
                ...ex,
                libraryId: pick.id,
                name: pick.name,
              }));
              showToast(`Swapped to ${pick.name}`, 'success');
            }
            setShowPicker(false);
            setSwapExIdx(null);
            setSwapMuscles([]);
          }}
          onClose={() => { setShowPicker(false); setSwapExIdx(null); setSwapMuscles([]); }}
        />
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const Training: React.FC = () => {
  const { state, addWorkout, showToast, setAssignedProgram, activateCustomProgram, toggleFavoriteExercise } = useApp();
  const navigate = useNavigate();
  const today = getLocalISOString();

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [savedDraft, setSavedDraft] = useState<any>(null);
  const [selectedDayOverride, setSelectedDayOverride] = useState<number | null>(null);
  const swipeTouchStartX = useRef<number | null>(null);
  const [showCustomOptions, setShowCustomOptions] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [coachFeedback, setCoachFeedback] = useState('');

  // Recent exercise IDs from logs
  const recentExerciseIds = useMemo(() => {
    const ids: string[] = [];
    const sorted = Object.entries(state.logs).sort((a, b) => b[0].localeCompare(a[0]));
    for (const [, log] of sorted) {
      for (const w of log.workouts) {
        for (const ex of w.exercises) {
          if (!ids.includes(ex.exerciseId)) ids.push(ex.exerciseId);
          if (ids.length >= 12) break;
        }
        if (ids.length >= 12) break;
      }
      if (ids.length >= 12) break;
    }
    return ids;
  }, [state.logs]);

  useEffect(() => {
    const draft = localStorage.getItem('bbc_workout_draft');
    if (draft && !sessionActive) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.exercises?.length > 0) { setSavedDraft(parsed); setShowDraftRestore(true); }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (sessionActive && exercises.length > 0) {
      localStorage.setItem('bbc_workout_draft', JSON.stringify({ sessionName, exercises, startedAt: new Date().toISOString() }));
    }
  }, [exercises, sessionActive, sessionName]);

  useEffect(() => {
    if (sessionActive) {
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionActive]);

  const programData = useMemo(() => {
    let program: WorkoutProgram | null = null;

    if (state.assignedProgram) {
      program = getProgramById(state.assignedProgram) || null;
    } else if (state.activeCustomProgramId) {
      const cp = (state.customPrograms || []).find(p => p.id === state.activeCustomProgramId);
      if (cp) program = adaptCustomProgram(cp);
    }

    if (!program) return null;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const programWorkoutNames = program.days.map(d => `${program.name} — ${d.name}`);
    const completedThisWeek = new Set(
      Object.entries(state.logs)
        .filter(([date]) => date >= weekStartStr)
        .flatMap(([, log]) => log.workouts.map(w => w.name))
        .filter(n => programWorkoutNames.includes(n))
    );

    const allDone = program.days.every(d => completedThisWeek.has(`${program.name} — ${d.name}`));
    const activeDone = allDone ? new Set<string>() : completedThisWeek;
    const nextDayIndex = program.days.findIndex(d => !activeDone.has(`${program.name} — ${d.name}`));

    return {
      program, completedDayNames: activeDone, allDone,
      nextDayIndex: nextDayIndex >= 0 ? nextDayIndex : 0,
      nextDay: program.days[nextDayIndex >= 0 ? nextDayIndex : 0],
    };
  }, [state.assignedProgram, state.activeCustomProgramId, state.customPrograms, state.logs]);

  const volumeData = useMemo(() => {
    const mv: Record<string, number> = { Chest: 0, Back: 0, Legs: 0, Arms: 0, Delts: 0, Glutes: 0 };
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    Object.entries(state.logs)
      .filter(([date]) => date >= weekAgoStr)
      .forEach(([, log]) => {
        log.workouts.forEach(w => {
          w.exercises.forEach(ex => {
            const lib = state.workoutLibrary.find(l => l.id === ex.exerciseId);
            if (lib) lib.targetMuscles.forEach(m => { if (m in mv) mv[m] += ex.sets.length; });
          });
        });
      });
    return Object.entries(mv).map(([name, sets]) => ({ name, sets }));
  }, [state.logs, state.workoutLibrary]);

  const recentWorkouts = useMemo(() =>
    Object.entries(state.logs)
      .flatMap(([date, log]) => log.workouts.map(w => ({ ...w, date })))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 8),
    [state.logs]
  );

  // PRs this month
  const prsThisMonth = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const monthStr = monthStart.toISOString().split('T')[0];
    let count = 0;
    const allEntries = Object.entries(state.logs).sort((a, b) => a[0].localeCompare(b[0]));
    const prMap: Record<string, number> = {};
    for (const [date, log] of allEntries) {
      for (const w of log.workouts) {
        for (const ex of w.exercises) {
          for (const s of ex.sets) {
            const vol = s.weight * s.reps;
            if (!prMap[ex.exerciseId] || vol > prMap[ex.exerciseId]) {
              if (date >= monthStr && prMap[ex.exerciseId] !== undefined) count++;
              prMap[ex.exerciseId] = vol;
            }
          }
        }
      }
    }
    return count;
  }, [state.logs]);

  const startProgramDay = (program: WorkoutProgram, day: ProgramDay) => {
    setSessionName(`${program.name} — ${day.name}`);
    setExercises(day.exercises.map(e => {
      const lastPerf = getLastPerformance(state.logs, e.exerciseId, today);
      return {
        libraryId: e.exerciseId, name: e.name,
        targetReps: e.reps, rest: e.rest, notes: e.notes,
        supersetGroup: e.supersetGroup, variations: e.variations,
        sets: Array.from({ length: e.sets }, () => ({
          weight: lastPerf ? String(lastPerf.weight) : '',
          reps: '',
          rpe: 0, type: 'N' as SetType, done: false,
        })),
      };
    }));
    setSessionActive(true);
  };

  const startAIWorkout = (workoutName: string, builtExercises: BuiltExercise[]) => {
    setSessionName(workoutName);
    setExercises(builtExercises.map(ex => {
      const lastPerf = getLastPerformance(state.logs, ex.libraryId, today);
      return {
        libraryId: ex.libraryId,
        name: ex.name,
        targetReps: ex.targetReps,
        rest: ex.rest,
        notes: ex.notes,
        sets: Array.from({ length: ex.targetSets }, () => ({
          weight: lastPerf ? String(lastPerf.weight) : '',
          reps: '',
          rpe: 0,
          type: 'N' as SetType,
          done: false,
        })),
      };
    }));
    setShowAIBuilder(false);
    setShowCustomOptions(false);
    setSessionActive(true);
  };

  const startCustomSession = (name: string) => {
    setSessionName(name);
    setExercises([]);
    setSessionActive(true);
    setShowCustomOptions(false);
    setShowPicker(true);
  };

  const addExercisesToSession = (selected: { id: string; name: string }[]) => {
    setExercises(prev => [
      ...prev,
      ...selected.map(s => {
        const lastPerf = getLastPerformance(state.logs, s.id, today);
        return {
          libraryId: s.id, name: s.name,
          sets: [{ weight: lastPerf ? String(lastPerf.weight) : '', reps: '', rpe: 0, type: 'N' as SetType, done: false }],
        };
      }),
    ]);
    setShowPicker(false);
  };

  const finishWorkout = useCallback(() => {
    const done = exercises.filter(ex => ex.sets.some(s => s.done));
    if (done.length === 0) { showToast('Log at least one set first', 'error'); return; }

    const totalVolume = done.reduce((acc, ex) =>
      acc + ex.sets.filter(s => s.done).reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);

    // Build per-exercise summary and count PRs
    let prCount = 0;
    const exerciseSummaries: ExerciseSummary[] = done.map(ex => {
      const prevPR = getPersonalRecord(state.logs, ex.libraryId);
      const doneSets = ex.sets.filter(s => s.done);
      const bestSet = doneSets.reduce<{ weight: number; reps: number } | null>((b, s) => {
        const w = parseFloat(s.weight) || 0; const r = parseInt(s.reps) || 0;
        if (!b || w * r > b.weight * b.reps) return { weight: w, reps: r };
        return b;
      }, null);
      const vol = doneSets.reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
      let isPR = false;
      doneSets.forEach(s => {
        const w = parseFloat(s.weight) || 0; const r = parseInt(s.reps) || 0;
        if (!prevPR || w * r > prevPR.weight * prevPR.reps) { isPR = true; prCount++; }
      });
      return { name: ex.name, setCount: doneSets.length, bestSet, volume: vol, isPR };
    });

    const caloriesBurned = Math.round(elapsed / 60 * 5.5 * ((state.user?.weight ?? 70) / 70));

    const session: WorkoutSession = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      name: sessionName,
      timestamp: new Date().toISOString(),
      durationMinutes: Math.round(elapsed / 60),
      exercises: done.map(ex => ({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        exerciseId: ex.libraryId, name: ex.name,
        sets: ex.sets.filter(s => s.done).map(s => ({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
          weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0,
          ...(s.rpe ? { rpe: s.rpe } : {}),
        } as ExerciseSet)),
      } as ExerciseEntry)),
      caloriesBurned,
    };

    addWorkout(today, session);
    localStorage.removeItem('bbc_workout_draft');
    setSessionActive(false);

    // Get previous session volume for comparison
    const prevVolume = getPrevSessionVolume(state.logs, sessionName, today) ?? undefined;

    // Build summary and show summary screen
    const summary: SummaryData = {
      name: sessionName,
      durationMinutes: Math.round(elapsed / 60),
      totalVolume,
      prCount,
      caloriesBurned,
      exercises: exerciseSummaries,
      prevVolume,
    };
    setSummaryData(summary);
    setCoachFeedback('');
    setShowSummary(true);

    // Async: get AI coaching feedback and update when ready
    if (state.user) {
      coachService.getWorkoutFeedback(state.user, session, prevVolume).then(feedback => {
        setCoachFeedback(feedback);
      });
    }
  }, [exercises, sessionName, elapsed, today, state.logs, state.user, addWorkout, showToast]);

  const cancelWorkout = () => {
    localStorage.removeItem('bbc_workout_draft');
    setSessionActive(false);
    setExercises([]);
    showToast('Session cancelled', 'info');
  };

  // ── AI Workout Builder ────────────────────────────────────────────────────
  if (showAIBuilder) {
    return (
      <AIWorkoutBuilder
        library={state.workoutLibrary}
        onStart={startAIWorkout}
        onClose={() => setShowAIBuilder(false)}
      />
    );
  }

  // ── Workout Summary ───────────────────────────────────────────────────────
  if (showSummary && summaryData) {
    return (
      <WorkoutSummaryScreen
        summary={summaryData}
        coachFeedback={coachFeedback}
        logs={state.logs}
        user={state.user}
        onDone={() => {
          setShowSummary(false);
          setSummaryData(null);
          setExercises([]);
        }}
      />
    );
  }

  // ── Active Session ────────────────────────────────────────────────────────
  if (sessionActive) {
    return (
      <>
        <ActiveWorkoutScreen
          workoutName={sessionName} exercises={exercises} elapsed={elapsed}
          logs={state.logs} today={today} goalType={state.user?.goalType}
          onUpdateExercises={setExercises}
          onAddExercise={() => setShowPicker(true)}
          onFinish={finishWorkout} onCancel={cancelWorkout} showToast={showToast}
        />
        {showPicker && (
          <ExercisePicker
            library={state.workoutLibrary}
            alreadyAdded={exercises.map(e => e.libraryId)}
            recentIds={recentExerciseIds}
            favoriteIds={state.favoriteExerciseIds ?? []}
            onToggleFavorite={toggleFavoriteExercise}
            onConfirm={addExercisesToSession}
            onClose={() => setShowPicker(false)}
          />
        )}
      </>
    );
  }

  // ── No Program Assigned ───────────────────────────────────────────────────
  if (!state.assignedProgram && !state.activeCustomProgramId) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#F5F0E8',
        padding: '2rem 1.25rem', paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(87,96,56,0.12), rgba(87,96,56,0.06))',
            border: '1px solid rgba(87,96,56,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(87,96,56,0.12)',
          }}>
            <Dumbbell size={32} color="#576038" />
          </div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>Choose your program</h1>
          <p style={{ fontSize: '0.82rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600, marginTop: 8, lineHeight: 1.5 }}>
            Evidence-based training structured for progressive overload
          </p>
        </div>

        {[
          {
            id: 'male_phase2' as const,
            emoji: '💪', label: 'Strength & Hypertrophy', tag: 'Push · Pull · Legs',
            desc: '4 days/week · RPE 7-9 · Volume focus', color: '#576038',
            sub: 'High volume PPL — maximise muscle & strength',
          },
          {
            id: 'female_phase1' as const,
            emoji: '🍑', label: 'Glute & Posterior Focus', tag: 'Lower · Upper',
            desc: '4 days/week · Glute emphasis', color: '#8B9467',
            sub: 'Posterior chain priority with upper accessory work',
          },
        ].map(opt => (
          <button
            key={opt.id} onClick={() => setAssignedProgram(opt.id)}
            style={{
              padding: '1.5rem', background: 'var(--bg-card)',
              border: '1px solid rgba(0,0,0,0.06)', borderRadius: 22,
              cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8,
              position: 'relative', overflow: 'hidden',
            }}
            onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.99)')}
            onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: `linear-gradient(90deg, transparent, ${opt.color}, transparent)` }} />
            <div style={{ position: 'absolute', top: 20, right: 20, width: 80, height: 80, borderRadius: '50%', background: `${opt.color}08`, filter: 'blur(20px)', pointerEvents: 'none' }} />
            <span style={{ fontSize: '2rem' }}>{opt.emoji}</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{opt.label}</span>
            <span style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 99,
              background: `${opt.color}18`, border: `1px solid ${opt.color}30`,
              fontWeight: 800, fontSize: '0.72rem', color: opt.color,
            }}>{opt.tag}</span>
            <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'rgba(0,0,0,0.24)' }}>{opt.sub}</span>
            <span style={{ fontWeight: 600, fontSize: '0.72rem', color: `${opt.color}90` }}>{opt.desc}</span>
          </button>
        ))}

        <button
          onClick={() => setShowAIBuilder(true)}
          style={{
            padding: '1.25rem', background: 'linear-gradient(135deg, rgba(87,96,56,0.10), rgba(87,96,56,0.07))',
            border: '1px solid rgba(87,96,56,0.25)', borderRadius: 18,
            cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.5rem' }}>✨</span>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1.05rem', color: '#576038', letterSpacing: '-0.01em' }}>
                Ask AI Coach
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(87,96,56,0.70)', fontWeight: 600, marginTop: 2 }}>
                Tell me what you want to train — I'll build your workout
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => startCustomSession('Custom Workout')}
          style={{
            padding: '1rem', background: 'transparent',
            border: '1.5px dashed rgba(0,0,0,0.08)', borderRadius: 16,
            cursor: 'pointer', color: 'rgba(0,0,0,0.28)',
            fontWeight: 700, fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Play size={14} /> Start custom workout now
        </button>

        <button
          onClick={() => navigate('/programs')}
          style={{
            padding: '1rem', borderRadius: 16, cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(87,96,56,0.10), rgba(87,96,56,0.07))',
            border: '1px solid rgba(87,96,56,0.22)',
            color: '#576038', fontWeight: 800, fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Target size={14} /> Build a custom program
        </button>

        {showPicker && (
          <ExercisePicker
            library={state.workoutLibrary} alreadyAdded={[]} recentIds={recentExerciseIds}
            favoriteIds={state.favoriteExerciseIds ?? []}
            onToggleFavorite={toggleFavoriteExercise}
            onConfirm={addExercisesToSession} onClose={() => { setShowPicker(false); setSessionActive(false); }}
          />
        )}
      </div>
    );
  }

  // ── Main Dashboard ─────────────────────────────────────────────────────────
  const { program, nextDay, nextDayIndex, completedDayNames, allDone } = programData!;
  const selectedDayIdx = selectedDayOverride !== null ? selectedDayOverride : nextDayIndex;
  const selectedDay = program.days[selectedDayIdx] ?? nextDay;
  const estimatedMinutes = Math.round(
    selectedDay.exercises.reduce((acc, ex) => acc + (ex.sets * ex.rest) / 60, 0) + selectedDay.exercises.length * 1.5
  );

  const thisWeekWorkouts = Object.entries(state.logs)
    .filter(([date]) => { const w = new Date(); w.setDate(w.getDate() - 7); return new Date(date) >= w; })
    .flatMap(([, log]) => log.workouts);

  const totalVolumeRecent = recentWorkouts.slice(0, 5).reduce((acc, w) =>
    acc + w.exercises.reduce((a, ex) => a + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0), 0);

  const CUSTOM_SESSIONS = [
    { name: 'Push Day', emoji: '💪', color: '#576038', pattern: 'push' },
    { name: 'Pull Day', emoji: '🔄', color: '#576038', pattern: 'pull' },
    { name: 'Leg Day', emoji: '🦵', color: '#974400', pattern: 'legs' },
    { name: 'Upper Body', emoji: '🏋️', color: '#974400', pattern: 'push' },
    { name: 'Glutes & Hams', emoji: '🍑', color: '#8B9467', pattern: 'legs' },
    { name: 'Full Body', emoji: '⚡', color: '#576038', pattern: 'all' },
    { name: 'Core & Arms', emoji: '💥', color: '#3E4528', pattern: 'core' },
    { name: 'Shoulders', emoji: '🎯', color: '#C05200', pattern: 'push' },
    { name: 'Back & Bis', emoji: '🔝', color: '#576038', pattern: 'pull' },
  ];

  return (
    <div style={{
      paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
      background: '#F5F0E8', minHeight: '100dvh',
    }}>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.25rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>Train</h1>
          <p style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600, margin: '2px 0 0' }}>{program.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/programs')}
            style={{
              padding: '7px 12px', borderRadius: 99,
              background: 'rgba(87,96,56,0.07)', border: '1px solid rgba(87,96,56,0.15)',
              color: '#576038', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
            }}
          >Programs</button>
          <button
            onClick={() => { setAssignedProgram(null as any); activateCustomProgram(null); }}
            style={{
              padding: '7px 12px', borderRadius: 99,
              background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
              color: 'rgba(0,0,0,0.28)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
            }}
          >Switch</button>
          <button
            onClick={() => setShowCustomOptions(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 99,
              background: showCustomOptions ? 'rgba(87,96,56,0.12)' : 'rgba(0,0,0,0.06)',
              border: `1px solid ${showCustomOptions ? 'rgba(87,96,56,0.35)' : 'rgba(0,0,0,0.07)'}`,
              color: showCustomOptions ? '#576038' : 'rgba(28,28,46,0.55)',
              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Plus size={13} /> Custom
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px' }}>

        {/* Draft restore */}
        {showDraftRestore && savedDraft && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: 'rgba(87,96,56,0.06)',
            border: '1px solid rgba(151,68,0,0.20)', borderRadius: 18,
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#974400' }}>Resume last workout?</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600, marginTop: 2 }}>
                {savedDraft.sessionName} · {savedDraft.exercises?.length} exercises
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setSessionName(savedDraft.sessionName); setExercises(savedDraft.exercises); setSessionActive(true); setShowDraftRestore(false); }}
                style={{ padding: '6px 14px', background: '#974400', border: 'none', borderRadius: 99, fontWeight: 800, fontSize: '0.78rem', color: '#000', cursor: 'pointer' }}>
                Resume
              </button>
              <button onClick={() => { localStorage.removeItem('bbc_workout_draft'); setShowDraftRestore(false); setSavedDraft(null); }}
                style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 99, fontWeight: 700, fontSize: '0.78rem', color: 'rgba(0,0,0,0.28)', cursor: 'pointer' }}>
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Custom session options */}
        {showCustomOptions && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(0,0,0,0.06)', borderRadius: 22, overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: '0.95rem' }}>Custom Session</span>
                  <p style={{ fontSize: '0.66rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600, margin: '2px 0 0' }}>Pick a template or build your own</p>
                </div>
                <button onClick={() => setShowCustomOptions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <X size={16} color="rgba(0,0,0,0.24)" />
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
              {CUSTOM_SESSIONS.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => startCustomSession(s.name)}
                  style={{
                    padding: '14px 10px', background: 'transparent',
                    border: 'none',
                    borderRight: i % 3 !== 2 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    borderBottom: i < CUSTOM_SESSIONS.length - 3 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  }}
                  onPointerDown={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
                  onPointerUp={e => (e.currentTarget.style.background = 'transparent')}
                  onPointerLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '1.3rem' }}>{s.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.68rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.name}</span>
                  <div style={{ width: 18, height: 2, borderRadius: 99, background: s.color, opacity: 0.6 }} />
                </button>
              ))}
            </div>
            <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => setShowAIBuilder(true)}
                style={{
                  width: '100%', padding: '12px 16px', marginTop: 8,
                  background: 'linear-gradient(135deg, rgba(87,96,56,0.12), rgba(87,96,56,0.08))',
                  border: '1px solid rgba(87,96,56,0.30)', borderRadius: 14,
                  color: '#576038', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Sparkles size={15} /> Ask AI Coach to build my workout
              </button>
              <button
                onClick={() => startCustomSession('My Workout')}
                style={{
                  width: '100%', padding: '10px',
                  background: 'rgba(0,0,0,0.02)', border: '1.5px dashed rgba(0,0,0,0.07)',
                  borderRadius: 12, color: 'rgba(0,0,0,0.28)',
                  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Plus size={13} /> Build from scratch
              </button>
            </div>
          </div>
        )}

        {/* Hero: Next Workout */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(87,96,56,0.10) 0%, rgba(87,96,56,0.07) 100%)',
          border: '1px solid rgba(87,96,56,0.22)', borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(87,96,56,0.10)',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(87,96,56,0.07)', filter: 'blur(50px)', pointerEvents: 'none' }} />

          <div style={{ padding: '20px 20px 18px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(87,96,56,0.70)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  {allDone ? '✓ Week Complete' : `Day ${selectedDayIdx + 1} of ${program.days.length}`}
                </div>
                <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.35rem', fontWeight: 900, margin: 0, letterSpacing: '-0.025em' }}>
                  {selectedDay.name}
                </h2>
                {selectedDay.focus && (
                  <p style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600, margin: '4px 0 0' }}>{selectedDay.focus}</p>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.35)', fontWeight: 600 }}>
                    {selectedDay.exercises.length} exercises
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.13)' }}>·</span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.35)', fontWeight: 600 }}>
                    ~{estimatedMinutes} min
                  </span>
                </div>
              </div>
            </div>

            {/* Exercise preview chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {selectedDay.exercises.slice(0, 5).map((ex, i) => (
                <span key={i} style={{
                  fontSize: '0.66rem', fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                  background: 'rgba(0,0,0,0.06)', color: 'rgba(28,28,46,0.65)',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}>{ex.name}</span>
              ))}
              {selectedDay.exercises.length > 5 && (
                <span style={{
                  fontSize: '0.66rem', fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                  background: 'rgba(0,0,0,0.03)', color: 'rgba(0,0,0,0.24)',
                }}>+{selectedDay.exercises.length - 5} more</span>
              )}
            </div>

            <button
              onClick={() => startProgramDay(program, selectedDay)}
              style={{
                width: '100%', padding: '15px',
                background: 'linear-gradient(135deg, #576038, #3E4528)',
                border: 'none', borderRadius: 16,
                color: '#fff', fontFamily: "'Outfit',sans-serif",
                fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(87,96,56,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: '-0.01em',
              }}
              onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
              onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Zap size={18} fill="currentColor" /> Start {selectedDay.name}
            </button>
          </div>
        </div>

        {/* AI Coach card */}
        <button
          onClick={() => setShowAIBuilder(true)}
          style={{
            width: '100%', padding: '16px 20px',
            background: 'var(--bg-card)',
            border: '1px solid rgba(87,96,56,0.18)', borderRadius: 20,
            cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
          onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.99)')}
          onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(87,96,56,0.14), rgba(87,96,56,0.08))',
            border: '1px solid rgba(87,96,56,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={20} color="#576038" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              AI Coach
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.35)', fontWeight: 600, marginTop: 2 }}>
              Build a custom workout based on your goals
            </div>
          </div>
          <ChevronDown size={16} color="rgba(0,0,0,0.20)" style={{ transform: 'rotate(-90deg)' }} />
        </button>

        {/* Week progress */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(0,0,0,0.05)', borderRadius: 22, padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.16)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>This Week</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: completedDayNames.size === program.days.length ? '#576038' : 'rgba(0,0,0,0.20)' }}>
              {completedDayNames.size}/{program.days.length} done
            </span>
          </div>
          <div
            style={{ display: 'flex', justifyContent: 'space-around' }}
            onTouchStart={e => { swipeTouchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              if (swipeTouchStartX.current === null) return;
              const dx = e.changedTouches[0].clientX - swipeTouchStartX.current;
              swipeTouchStartX.current = null;
              if (Math.abs(dx) < 40) return;
              const next = dx < 0 ? Math.min(selectedDayIdx + 1, program.days.length - 1) : Math.max(selectedDayIdx - 1, 0);
              setSelectedDayOverride(next);
            }}
          >
            {program.days.map((day, i) => {
              const isDone = completedDayNames.has(`${program.name} — ${day.name}`);
              const isSel = i === selectedDayIdx;
              return (
                <div key={i} onClick={() => setSelectedDayOverride(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: isDone ? 'rgba(87,96,56,0.12)' : isSel ? 'rgba(87,96,56,0.15)' : 'rgba(0,0,0,0.03)',
                    border: `2px solid ${isDone ? 'rgba(87,96,56,0.40)' : isSel ? 'rgba(87,96,56,0.60)' : 'rgba(0,0,0,0.06)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isSel && !isDone ? '0 0 20px rgba(87,96,56,0.15)' : isDone ? '0 0 20px rgba(87,96,56,0.12)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {isDone
                      ? <Check size={18} color="#576038" />
                      : <span style={{ fontSize: '0.9rem', fontWeight: 900, color: isSel ? '#576038' : 'rgba(0,0,0,0.13)' }}>{i + 1}</span>
                    }
                  </div>
                  <span style={{ fontSize: '0.58rem', fontWeight: 700, color: isDone ? '#576038' : isSel ? '#576038' : 'rgba(0,0,0,0.13)', textAlign: 'center', maxWidth: 52 }}>
                    {day.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
          {allDone && (
            <div style={{ marginTop: 12, textAlign: 'center', padding: '8px', background: 'rgba(87,96,56,0.06)', borderRadius: 12, border: '1px solid rgba(87,96,56,0.12)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#576038' }}>Week complete — program restarts next week 🎉</span>
            </div>
          )}
        </div>

        {/* Stats */}
        {recentWorkouts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Sessions', value: String(thisWeekWorkouts.length), sub: 'this week', color: '#576038', icon: <Dumbbell size={14} color="#576038" /> },
              { label: 'Volume', value: totalVolumeRecent > 1000 ? `${(totalVolumeRecent / 1000).toFixed(1)}k` : String(Math.round(totalVolumeRecent)), sub: 'kg lifted', color: '#974400', icon: <BarChart2 size={14} color="#974400" /> },
              { label: 'Last', value: recentWorkouts[0] ? `${recentWorkouts[0].durationMinutes}m` : '—', sub: 'duration', color: '#576038', icon: <Timer size={14} color="#576038" /> },
              { label: 'PRs', value: String(prsThisMonth), sub: 'this month', color: '#974400', icon: <Award size={14} color="#974400" /> },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--bg-card)',
                borderRadius: 16, padding: '12px 8px',
                border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -10, right: -10, width: 40, height: 40, borderRadius: '50%', background: `${stat.color}08`, filter: 'blur(15px)' }} />
                <div style={{ marginBottom: 4 }}>{stat.icon}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: stat.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', fontFamily: "'Outfit',sans-serif" }}>{stat.value}</div>
                <div style={{ fontSize: '0.52rem', color: 'rgba(0,0,0,0.16)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Volume Chart — last 7 days */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(0,0,0,0.05)', borderRadius: 22, padding: '16px 20px',
        }}>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: '0.95rem' }}>Muscle Volume</span>
              <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600, marginTop: 2 }}>Sets per muscle · last 7 days</div>
            </div>
            <Target size={16} color="rgba(0,0,0,0.13)" />
          </div>
          <div style={{ height: 140, marginLeft: -10 }}>
            <ResponsiveContainer width="100%" height="100%">
              {/* @ts-ignore */}
              <BarChart data={volumeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.14)', fontWeight: 700 }} dy={8} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', background: '#FFFFFF', padding: '10px 14px' }}
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  formatter={(val: any) => [`${val} sets`, '']}
                />
                <Bar dataKey="sets" radius={[7, 7, 0, 0]} barSize={26}>
                  {volumeData.map((entry, i) => (
                    <Cell key={i} fill={entry.sets > 0 ? (MUSCLE_COLORS[entry.name] || '#576038') : 'rgba(0,0,0,0.03)'} fillOpacity={entry.sets > 0 ? 0.8 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent workouts */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.16)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>History</span>
            {recentWorkouts.length > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(0,0,0,0.14)' }}>{recentWorkouts.length} sessions</span>}
          </div>

          {recentWorkouts.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1.5px dashed rgba(0,0,0,0.06)', borderRadius: 20,
              padding: '2.5rem', textAlign: 'center',
            }}>
              <Dumbbell size={28} color="rgba(0,0,0,0.10)" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(0,0,0,0.20)', margin: 0 }}>No workouts yet</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.12)', marginTop: 4 }}>Start your first session above</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentWorkouts.map(workout => {
                const totalVolume = workout.exercises.reduce((acc, ex) =>
                  acc + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0);
                const dateStr = new Date(workout.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                const musclesHit = [...new Set(workout.exercises.flatMap(ex => {
                  const lib = state.workoutLibrary.find(l => l.id === ex.exerciseId);
                  return lib?.targetMuscles?.slice(0, 1) ?? [];
                }))].slice(0, 3);
                const isExpanded = expandedWorkout === workout.id;

                return (
                  <div key={workout.id} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(0,0,0,0.05)', borderRadius: 18,
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}>
                    {/* Main row */}
                    <div
                      onClick={() => setExpandedWorkout(isExpanded ? null : workout.id)}
                      style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {workout.name.split('—')[1]?.trim() || workout.name}
                        </div>
                        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.67rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600 }}>{dateStr}</span>
                          <span style={{ fontSize: '0.55rem', color: 'rgba(0,0,0,0.10)' }}>·</span>
                          <span style={{ fontSize: '0.67rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600 }}>{workout.durationMinutes}m</span>
                          <span style={{ fontSize: '0.55rem', color: 'rgba(0,0,0,0.10)' }}>·</span>
                          <span style={{ fontSize: '0.67rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600 }}>{workout.exercises.length} exercises</span>
                          {musclesHit.map(m => (
                            <span key={m} style={{
                              fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                              background: `${MUSCLE_COLORS[m] || '#576038'}12`,
                              color: MUSCLE_COLORS[m] || '#576038',
                              border: `1px solid ${MUSCLE_COLORS[m] || '#576038'}20`,
                            }}>{m}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingLeft: 12 }}>
                        {totalVolume > 0 && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '0.95rem', color: '#974400', fontVariantNumeric: 'tabular-nums' }}>
                              {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : Math.round(totalVolume)}
                            </div>
                            <div style={{ fontSize: '0.5rem', color: 'rgba(0,0,0,0.14)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>kg</div>
                          </div>
                        )}
                        {isExpanded ? <ChevronUp size={14} color="rgba(0,0,0,0.13)" /> : <ChevronDown size={14} color="rgba(0,0,0,0.13)" />}
                      </div>
                    </div>

                    {/* Expanded: exercise list */}
                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid rgba(0,0,0,0.04)',
                        padding: '12px 16px',
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        {workout.exercises.map(ex => {
                          const bestSet = ex.sets.reduce((b, s) => s.weight * s.reps > b.weight * b.reps ? s : b, ex.sets[0]);
                          const vol = ex.sets.reduce((a, s) => a + s.weight * s.reps, 0);
                          return (
                            <div key={ex.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '8px 10px', borderRadius: 10,
                              background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.03)',
                            }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'rgba(28,28,46,0.82)' }}>{ex.name}</div>
                                <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600, marginTop: 2 }}>
                                  {ex.sets.length} sets · best {bestSet?.weight}kg × {bestSet?.reps}
                                </div>
                              </div>
                              {vol > 0 && (
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'rgba(0,0,0,0.24)', fontVariantNumeric: 'tabular-nums' }}>
                                  {Math.round(vol)}kg
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {showPicker && (
        <ExercisePicker
          library={state.workoutLibrary} alreadyAdded={exercises.map(e => e.libraryId)}
          recentIds={recentExerciseIds}
          favoriteIds={state.favoriteExerciseIds ?? []}
          onToggleFavorite={toggleFavoriteExercise}
          onConfirm={addExercisesToSession} onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
};

export default Training;
