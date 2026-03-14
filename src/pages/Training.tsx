import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, WorkoutCard, EmptyState } from '../components/SharedUI';
import {
  Dumbbell, Plus, Timer, ChevronRight, X, Check, RotateCcw, Search,
  TrendingUp, TrendingDown, Minus, Award, ChevronDown, ChevronUp, Trash2, Play, RefreshCw, Info,
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useApp } from '../context/AppContext';
import { getLocalISOString } from '../utils/dateUtils';
import { WorkoutSession, ExerciseEntry, ExerciseSet } from '../types';
import { getProgramById, WorkoutProgram, ProgramDay } from '../data/workoutPrograms';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ActiveExercise {
  libraryId: string;
  name: string;
  targetReps?: string;
  rest?: number;
  notes?: string;
  supersetGroup?: string;
  variations?: string[];
  sets: { weight: string; reps: string; rpe: string; done: boolean }[];
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

const MUSCLE_COLORS: Record<string, string> = {
  Chest: 'var(--accent-blue)',
  Back: 'var(--accent-green)',
  Legs: 'var(--accent-orange)',
  Arms: 'var(--color-protein)',
  Delts: 'var(--accent-red)',
  Glutes: 'var(--color-carbs)',
  Hamstrings: 'var(--accent-orange)',
  Triceps: 'var(--color-fats)',
};

const SUPERSET_COLORS: Record<string, string> = {
  A: 'rgba(10,132,255,0.9)',
  B: 'rgba(255,159,10,0.9)',
  C: 'rgba(48,209,88,0.9)',
  D: 'rgba(255,69,58,0.9)',
  E: 'rgba(191,90,242,0.9)',
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
  if (hasPush) return 'push';
  return 'push';
};

// ── Exercise Picker Sheet ──────────────────────────────────────────────────────
const PATTERN_TABS = [
  { key: 'all', label: 'All' },
  { key: 'push', label: '💪 Push', desc: 'Chest · Shoulders · Triceps' },
  { key: 'pull', label: '🔄 Pull', desc: 'Back · Biceps' },
  { key: 'legs', label: '🦵 Legs', desc: 'Quads · Glutes · Hamstrings' },
  { key: 'core', label: '⚡ Core' },
] as const;

const ExercisePicker: React.FC<{
  library: { id: string; name: string; targetMuscles: string[] }[];
  added: string[];
  onAdd: (id: string, name: string) => void;
  onClose: () => void;
  defaultPattern?: 'all' | 'push' | 'pull' | 'legs' | 'core';
}> = ({ library, added, onAdd, onClose, defaultPattern = 'all' }) => {
  const [query, setQuery] = useState('');
  const [patternFilter, setPatternFilter] = useState<string>(defaultPattern);

  const filtered = library.filter(e => {
    const matchQuery = e.name.toLowerCase().includes(query.toLowerCase());
    const matchPattern = patternFilter === 'all' || getMovementPattern(e.targetMuscles) === patternFilter;
    return matchQuery && matchPattern;
  });

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 9003, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Add Exercise</h2>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {filtered.length} exercises
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

        {/* Pill tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}>
          {PATTERN_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setPatternFilter(tab.key)}
              style={{
                flexShrink: 0,
                padding: '0.45rem 1rem',
                borderRadius: '50px',
                fontSize: '0.78rem',
                fontWeight: 800,
                border: patternFilter === tab.key ? 'none' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                backgroundColor: patternFilter === tab.key ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                color: patternFilter === tab.key ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.15s ease',
                letterSpacing: '0.01em',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '14px',
          padding: '0.65rem 1rem',
          marginBottom: '12px',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <Search size={15} color="rgba(255,255,255,0.3)" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={patternFilter === 'all' ? 'Search all exercises...' : `Search ${patternFilter} exercises...`}
            style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.9rem', flex: 1 }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={13} color="rgba(255,255,255,0.3)" />
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem 6rem' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No exercises found</p>
          </div>
        )}
        {filtered.map(ex => {
          const isAdded = added.includes(ex.id);
          const pattern = getMovementPattern(ex.targetMuscles);
          const patternColor = pattern === 'push' ? '#60a5fa' : pattern === 'pull' ? '#4ade80' : pattern === 'legs' ? '#fb923c' : 'rgba(255,255,255,0.3)';
          return (
            <div
              key={ex.id}
              onClick={() => { if (!isAdded) { onAdd(ex.id, ex.name); onClose(); } }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 0.75rem',
                borderRadius: '14px',
                marginBottom: '3px',
                cursor: isAdded ? 'default' : 'pointer',
                backgroundColor: isAdded ? 'rgba(255,255,255,0.02)' : 'transparent',
                opacity: isAdded ? 0.4 : 1,
                transition: 'background-color 0.1s',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isAdded ? 'rgba(255,255,255,0.5)' : '#fff' }}>{ex.name}</span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '50px',
                    backgroundColor: `${patternColor}18`,
                    color: patternColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>{pattern}</span>
                  {ex.targetMuscles.map(m => (
                    <span key={m} style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 6px', borderRadius: '5px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>{m}</span>
                  ))}
                </div>
              </div>
              {isAdded
                ? <Check size={18} color="var(--accent-green)" />
                : (
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: `${patternColor}15`,
                    border: `1px solid ${patternColor}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Plus size={14} color={patternColor} />
                  </div>
                )
              }
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Active Workout Screen ──────────────────────────────────────────────────────
const ActiveWorkoutScreen: React.FC<{
  workoutName: string;
  exercises: ActiveExercise[];
  elapsed: number;
  logs: ReturnType<typeof useApp>['state']['logs'];
  today: string;
  onUpdateExercises: (fn: (prev: ActiveExercise[]) => ActiveExercise[]) => void;
  onAddExercise: () => void;
  onFinish: () => void;
  onCancel: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ workoutName, exercises, elapsed, logs, today, onUpdateExercises, onAddExercise, onFinish, onCancel, showToast }) => {
  const [expandedExercise, setExpandedExercise] = useState<string | null>(exercises[0]?.libraryId ?? null);
  const [swapOpenIdx, setSwapOpenIdx] = useState<number | null>(null);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const restRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (restTimer === null || restTimer <= 0) return;
    const t = setTimeout(() => setRestTimer(prev => (prev !== null && prev > 0 ? prev - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [restTimer]);

  const startRest = (seconds: number) => {
    setRestTimer(seconds);
    clearTimeout(restRef.current);
  };

  const [invalidSets, setInvalidSets] = useState<Record<string, boolean>>({});

  const updateSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps' | 'rpe', value: string) => {
    let clamped = value;
    let isInvalid = false;
    if (field === 'weight' && value !== '') {
      const n = parseFloat(value);
      if (!isNaN(n)) {
        if (n < 0 || n > 500) {
          clamped = String(Math.min(500, Math.max(0, n)));
          isInvalid = true;
        }
      }
    }
    if (field === 'reps' && value !== '') {
      const n = parseInt(value);
      if (!isNaN(n)) {
        if (n < 0 || n > 100) {
          clamped = String(Math.min(100, Math.max(0, n)));
          isInvalid = true;
        }
      }
    }
    const key = `${exIdx}-${setIdx}-${field}`;
    setInvalidSets(prev => ({ ...prev, [key]: isInvalid }));
    onUpdateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: clamped })
    }));
  };

  const toggleSetDone = (exIdx: number, setIdx: number) => {
    const set = exercises[exIdx]?.sets[setIdx];
    if (set && !set.done) {
      if (!set.weight || !set.reps) {
        showToast('Enter weight and reps first', 'error');
        return;
      }
    }
    const restTime = exercises[exIdx]?.rest ?? 90;
    onUpdateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, done: !s.done })
    }));
    if (!set?.done) startRest(restTime);
  };

  const addSet = (exIdx: number) => {
    onUpdateExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { weight: lastSet?.weight || '', reps: lastSet?.reps || '', rpe: '', done: false }] };
    }));
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    onUpdateExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      if (ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
    }));
  };

  const removeExercise = (exIdx: number) => {
    onUpdateExercises(prev => prev.filter((_, i) => i !== exIdx));
  };

  const swapExercise = (exIdx: number, newName: string) => {
    onUpdateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : { ...ex, name: newName }));
    setSwapOpenIdx(null);
  };

  const completedSets = exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.done).length, 0);
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const progressPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 9002, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(8,8,16,0.95)',
        backdropFilter: 'blur(12px)',
        zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ padding: '1rem 1.25rem 0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontSize: '1.15rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{workoutName}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Timer size={13} color="var(--accent-blue)" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(elapsed)}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                  {completedSets}/{totalSets} sets
                </span>
                {completedSets > 0 && totalSets > 0 && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: 'var(--accent-green)',
                    backgroundColor: 'rgba(50,215,75,0.1)',
                    padding: '2px 8px',
                    borderRadius: '50px',
                  }}>
                    {Math.round(progressPct)}%
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={onFinish}
                style={{
                  padding: '0.55rem 1.2rem',
                  backgroundColor: 'var(--accent-green)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '50px',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                Finish
              </button>
              <button
                onClick={onCancel}
                style={{
                  padding: '0.55rem 0.85rem',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '50px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Rest Timer */}
      {restTimer !== null && restTimer > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(10,132,255,0.08)',
          border: '1px solid rgba(10,132,255,0.18)',
          margin: '0.875rem 1.25rem 0',
          padding: '0.75rem 1.1rem',
          borderRadius: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '2px solid rgba(10,132,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <RotateCcw size={14} color="var(--accent-blue)" />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(10,132,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rest</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{formatDuration(restTimer)}</div>
            </div>
          </div>
          <button onClick={() => setRestTimer(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} color="rgba(255,255,255,0.4)" />
          </button>
        </div>
      )}

      {/* Exercises */}
      <div style={{ flex: 1, padding: '0.875rem 1.25rem', paddingBottom: '3rem' }}>
        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <Dumbbell size={28} color="rgba(255,255,255,0.2)" />
            </div>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>No exercises yet — add your first one</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {exercises.map((ex, exIdx) => {
              const lastPerf = getLastPerformance(logs, ex.libraryId, today);
              const isExpanded = expandedExercise === ex.libraryId;
              const isSwapOpen = swapOpenIdx === exIdx;
              const doneSets = ex.sets.filter(s => s.done).length;
              const supersetColor = ex.supersetGroup ? SUPERSET_COLORS[ex.supersetGroup] : null;
              const allSetsDone = doneSets === ex.sets.length && doneSets > 0;

              return (
                <div
                  key={`${ex.libraryId}-${exIdx}`}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '20px',
                    border: `1px solid ${allSetsDone ? 'rgba(50,215,75,0.3)' : isExpanded ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
                    overflow: 'hidden',
                    boxShadow: allSetsDone ? '0 0 0 1px rgba(50,215,75,0.08), inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                  }}
                >
                  {/* Superset / done stripe */}
                  {supersetColor ? (
                    <div style={{ height: '3px', backgroundColor: supersetColor }} />
                  ) : allSetsDone ? (
                    <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent, rgba(50,215,75,0.6), transparent)' }} />
                  ) : null}

                  {/* Exercise Header */}
                  <div
                    style={{ padding: '0.95rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setExpandedExercise(isExpanded ? null : ex.libraryId)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {supersetColor && (
                          <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            backgroundColor: `${supersetColor.replace('0.9', '0.15')}`,
                            color: supersetColor,
                            flexShrink: 0,
                            letterSpacing: '0.05em',
                          }}>
                            {ex.supersetGroup}
                          </span>
                        )}
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: allSetsDone ? 'rgba(255,255,255,0.6)' : '#fff',
                        }}>
                          {ex.name}
                        </span>
                        {allSetsDone && <Check size={14} color="var(--accent-green)" />}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {ex.targetReps && (
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
                            {ex.sets.length} × {ex.targetReps}
                          </span>
                        )}
                        {ex.rest && (
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.22)', fontWeight: 600 }}>· {ex.rest}s</span>
                        )}
                        {lastPerf ? (() => {
                          const trend = getProgressionTrend(logs, ex.libraryId, today);
                          const trendIcon = trend === 'up' || trend === 'pr'
                            ? <TrendingUp size={10} color={trend === 'pr' ? '#fbbf24' : 'var(--accent-green)'} />
                            : trend === 'down'
                            ? <TrendingDown size={10} color="var(--accent-red)" />
                            : <Minus size={10} color="rgba(255,255,255,0.2)" />;
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {trendIcon}
                              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                {lastPerf.weight}kg × {lastPerf.reps}
                              </span>
                              {trend === 'pr' && (
                                <span style={{ fontSize: '0.58rem', fontWeight: 900, color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)', padding: '1px 5px', borderRadius: '4px' }}>PR</span>
                              )}
                            </div>
                          );
                        })() : (
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>First time</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      {ex.variations && ex.variations.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); setSwapOpenIdx(isSwapOpen ? null : exIdx); }}
                          style={{
                            background: isSwapOpen ? 'rgba(255,159,10,0.12)' : 'rgba(255,255,255,0.05)',
                            border: 'none',
                            borderRadius: '8px',
                            width: 30,
                            height: 30,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <RefreshCw size={12} color={isSwapOpen ? 'rgba(255,159,10,0.9)' : 'rgba(255,255,255,0.35)'} />
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); removeExercise(exIdx); }}
                        style={{ background: 'rgba(255,69,58,0.07)', border: 'none', borderRadius: '8px', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} color="rgba(255,69,58,0.65)" />
                      </button>
                      {isExpanded ? <ChevronUp size={15} color="rgba(255,255,255,0.25)" /> : <ChevronDown size={15} color="rgba(255,255,255,0.25)" />}
                    </div>
                  </div>

                  {/* Notes */}
                  {ex.notes && isExpanded && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 1rem 0.6rem' }}>
                      <Info size={11} color="rgba(255,255,255,0.25)" />
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>{ex.notes}</span>
                    </div>
                  )}

                  {/* Swap Panel */}
                  {isSwapOpen && ex.variations && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem 1rem', backgroundColor: 'rgba(255,159,10,0.03)' }}>
                      <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,159,10,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Swap exercise</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {ex.variations.map(v => (
                          <button
                            key={v}
                            onClick={() => swapExercise(exIdx, v)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '0.65rem 0.875rem',
                              backgroundColor: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.07)',
                              borderRadius: '12px',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            {v}
                            <ChevronRight size={13} color="rgba(255,255,255,0.3)" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Set Rows */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '0.6rem 0.875rem 0.875rem' }}>
                      {/* Column headers */}
                      <div style={{ display: 'flex', padding: '0 4px', marginBottom: '6px' }}>
                        <span style={{ width: 34, fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>SET</span>
                        <span style={{ flex: 1, fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900, textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>KG</span>
                        <span style={{ flex: 1, fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900, textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>REPS</span>
                        <span style={{ width: 46 }} />
                      </div>

                      {ex.sets.map((set, setIdx) => (
                        <div key={setIdx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '7px',
                          opacity: set.done ? 0.4 : 1,
                          transition: 'opacity 0.25s',
                        }}>
                          {/* Set number badge */}
                          <div style={{
                            width: 34,
                            height: 46,
                            borderRadius: '10px',
                            backgroundColor: set.done ? 'rgba(50,215,75,0.18)' : 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            borderLeft: set.done ? '2px solid rgba(50,215,75,0.5)' : '2px solid transparent',
                          }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: set.done ? 'var(--accent-green)' : 'rgba(255,255,255,0.35)' }}>{setIdx + 1}</span>
                          </div>
                          {/* Weight input */}
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder={lastPerf ? String(lastPerf.weight) : '—'}
                            value={set.weight}
                            onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                            disabled={set.done}
                            style={{
                              flex: 1,
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              border: `1px solid ${invalidSets[`${exIdx}-${setIdx}-weight`] ? '#f87171' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: '12px',
                              color: '#fff',
                              textAlign: 'center',
                              padding: '0.75rem 0.4rem',
                              fontSize: '1rem',
                              fontWeight: 800,
                              outline: 'none',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          />
                          {/* Reps input */}
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder={lastPerf ? String(lastPerf.reps) : (ex.targetReps?.split('–')[0] || '—')}
                            value={set.reps}
                            onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                            disabled={set.done}
                            style={{
                              flex: 1,
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              border: `1px solid ${invalidSets[`${exIdx}-${setIdx}-reps`] ? '#f87171' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: '12px',
                              color: '#fff',
                              textAlign: 'center',
                              padding: '0.75rem 0.4rem',
                              fontSize: '1rem',
                              fontWeight: 800,
                              outline: 'none',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          />
                          {/* Check button */}
                          <button
                            onClick={() => toggleSetDone(exIdx, setIdx)}
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: '12px',
                              border: 'none',
                              backgroundColor: set.done
                                ? 'rgba(50,215,75,0.22)'
                                : (set.weight && set.reps ? 'rgba(50,215,75,0.12)' : 'rgba(255,255,255,0.05)'),
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'background-color 0.2s',
                            }}
                          >
                            <Check size={18} color={set.done ? '#4ade80' : (set.weight && set.reps ? 'rgba(50,215,75,0.7)' : 'rgba(255,255,255,0.18)')} />
                          </button>
                        </div>
                      ))}

                      {/* Add set + rest timers */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <button
                          onClick={() => addSet(exIdx)}
                          style={{
                            flex: 1,
                            padding: '0.6rem',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            color: 'rgba(255,255,255,0.45)',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                          }}
                        >
                          <Plus size={13} /> Add Set
                        </button>
                        {[60, 90, ex.rest && ex.rest !== 60 && ex.rest !== 90 ? ex.rest : null, 180].filter((v, i, a) => v && a.indexOf(v) === i).map(t => t && (
                          <button
                            key={t}
                            onClick={() => startRest(t)}
                            style={{
                              padding: '0.6rem 0.875rem',
                              backgroundColor: ex.rest === t ? 'rgba(10,132,255,0.12)' : 'rgba(10,132,255,0.06)',
                              border: `1px solid ${ex.rest === t ? 'rgba(10,132,255,0.35)' : 'rgba(10,132,255,0.12)'}`,
                              borderRadius: '12px',
                              color: 'var(--accent-blue)',
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                            }}
                          >
                            {t >= 60 ? `${t / 60}m` : `${t}s`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Exercise */}
        <button
          onClick={onAddExercise}
          style={{
            width: '100%',
            marginTop: '14px',
            padding: '1rem',
            backgroundColor: 'rgba(10,132,255,0.06)',
            border: '1px dashed rgba(10,132,255,0.2)',
            borderRadius: '18px',
            color: 'var(--accent-blue)',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Plus size={16} /> Add Exercise
        </button>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const Training: React.FC = () => {
  const { state, addWorkout, showToast, setAssignedProgram } = useApp();
  const today = getLocalISOString();

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDefaultPattern, setPickerDefaultPattern] = useState<'all' | 'push' | 'pull' | 'legs' | 'core'>('all');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [savedDraft, setSavedDraft] = useState<any>(null);

  useEffect(() => {
    const draft = localStorage.getItem('bbc_workout_draft');
    if (draft && !sessionActive) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.exercises?.length > 0) {
          setSavedDraft(parsed);
          setShowDraftRestore(true);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (sessionActive && exercises.length > 0) {
      localStorage.setItem('bbc_workout_draft', JSON.stringify({
        sessionName,
        exercises,
        startedAt: new Date().toISOString(),
      }));
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
    if (!state.assignedProgram) return null;
    const program = getProgramById(state.assignedProgram);
    if (!program) return null;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
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
    const nextDay = program.days[nextDayIndex >= 0 ? nextDayIndex : 0];

    return { program, nextDay, nextDayIndex: nextDayIndex >= 0 ? nextDayIndex : 0, completedDayNames: activeDone, allDone };
  }, [state.assignedProgram, state.logs]);

  const volumeData = useMemo(() => {
    const muscleVolume: Record<string, number> = { Chest: 0, Back: 0, Legs: 0, Arms: 0, Delts: 0 };
    Object.values(state.logs).forEach(log => {
      log.workouts.forEach(workout => {
        workout.exercises.forEach(ex => {
          const lib = state.workoutLibrary.find(l => l.id === ex.exerciseId);
          if (lib) lib.targetMuscles.forEach(m => { if (m in muscleVolume) muscleVolume[m] += ex.sets.length; });
        });
      });
    });
    return Object.entries(muscleVolume).map(([name, sets]) => ({ name, sets }));
  }, [state.logs, state.workoutLibrary]);

  const recentWorkouts = useMemo(() =>
    Object.values(state.logs)
      .flatMap(log => log.workouts.map(w => ({ ...w, date: log.date })))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 8),
    [state.logs]
  );

  const startProgramDay = (program: WorkoutProgram, day: ProgramDay) => {
    const preloaded: ActiveExercise[] = day.exercises.map(e => ({
      libraryId: e.exerciseId,
      name: e.name,
      targetReps: e.reps,
      rest: e.rest,
      notes: e.notes,
      supersetGroup: e.supersetGroup,
      variations: e.variations,
      sets: Array.from({ length: e.sets }, () => ({ weight: '', reps: '', rpe: '', done: false })),
    }));
    setSessionName(`${program.name} — ${day.name}`);
    setExercises(preloaded);
    setSessionActive(true);
  };

  const startCustomSession = (name: string) => {
    setSessionName(name);
    setExercises([]);
    const lower = name.toLowerCase();
    const pattern: 'all' | 'push' | 'pull' | 'legs' | 'core' =
      lower.includes('push') ? 'push' :
      lower.includes('pull') ? 'pull' :
      lower.includes('leg') ? 'legs' :
      lower.includes('arm') ? 'push' :
      'all';
    setPickerDefaultPattern(pattern);
    setSessionActive(true);
    setShowCustomPicker(false);
    setShowPicker(true);
  };

  const addExerciseToSession = (id: string, name: string) => {
    setExercises(prev => [...prev, { libraryId: id, name, sets: [{ weight: '', reps: '', rpe: '', done: false }] }]);
  };

  const finishWorkout = useCallback(() => {
    const completedExercises = exercises.filter(ex => ex.sets.some(s => s.done));
    if (completedExercises.length === 0) {
      showToast('Log at least one completed set first', 'error');
      return;
    }
    const totalVolume = completedExercises.reduce((acc, ex) =>
      acc + ex.sets.filter(s => s.done).reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);

    let prCount = 0;
    completedExercises.forEach(ex => {
      const prevPR = getPersonalRecord(state.logs, ex.libraryId);
      ex.sets.filter(s => s.done).forEach(s => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps) || 0;
        if (!prevPR || w * r > prevPR.weight * prevPR.reps) prCount++;
      });
    });

    const exerciseEntries: ExerciseEntry[] = completedExercises.map(ex => ({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      exerciseId: ex.libraryId,
      name: ex.name,
      sets: ex.sets.filter(s => s.done).map(s => ({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0,
        ...(s.rpe ? { rpe: parseFloat(s.rpe) } : {}),
      } as ExerciseSet)),
    }));
    const session: WorkoutSession = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      name: sessionName,
      timestamp: new Date().toISOString(),
      durationMinutes: Math.round(elapsed / 60),
      exercises: exerciseEntries,
      caloriesBurned: Math.round(elapsed / 60 * 5.5 * ((state.user?.weight ?? 70) / 70)),
    };
    addWorkout(today, session);
    localStorage.removeItem('bbc_workout_draft');
    setSessionActive(false);
    const prMsg = prCount > 0 ? ` · 🏆 ${prCount} PR${prCount > 1 ? 's' : ''}` : '';
    showToast(`${sessionName} complete · ${Math.round(totalVolume)}kg${prMsg}`, 'success');
  }, [exercises, sessionName, elapsed, today, state.logs, addWorkout, showToast]);

  const cancelWorkout = () => {
    localStorage.removeItem('bbc_workout_draft');
    setSessionActive(false);
    setExercises([]);
    showToast('Session cancelled', 'info');
  };

  // ── Custom workout picker view ─────────────────────────────────────────────
  if (showCustomPicker) {
    const templates = [
      { name: 'Push Day',         emoji: '💪', muscles: 'Chest · Shoulders · Triceps', color: '#60a5fa', pattern: 'push' as const },
      { name: 'Pull Day',         emoji: '🔄', muscles: 'Back · Biceps',               color: '#4ade80', pattern: 'pull' as const },
      { name: 'Leg Day',          emoji: '🦵', muscles: 'Quads · Glutes · Hamstrings', color: '#fb923c', pattern: 'legs' as const },
      { name: 'Upper Body',       emoji: '🏋️', muscles: 'Push + Pull combined',        color: '#a78bfa', pattern: 'push' as const },
      { name: 'Full Body',        emoji: '⚡', muscles: 'All muscle groups',            color: '#f9a8d4', pattern: 'all' as const },
      { name: 'Arms & Shoulders', emoji: '💥', muscles: 'Biceps · Triceps · Delts',    color: '#fbbf24', pattern: 'push' as const },
    ];

    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', paddingBottom: '6rem' }} className="animate-fade-in">
        {/* Header */}
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.025em' }}>What are you training?</h2>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: '4px' }}>Pick a focus — exercises load for you</p>
            </div>
            <button
              onClick={() => setShowCustomPicker(false)}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} color="rgba(255,255,255,0.6)" />
            </button>
          </div>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Primary 2×2 grid */}
          <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
            WHAT ARE YOU TRAINING TODAY?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            {templates.slice(0, 4).map(t => (
              <button
                key={t.name}
                onClick={() => startCustomSession(t.name)}
                style={{
                  padding: '1.25rem 1rem',
                  backgroundColor: 'var(--bg-card)',
                  border: `1px solid rgba(255,255,255,0.06)`,
                  borderRadius: '20px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                  minHeight: '90px',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }} />
                <span style={{ fontSize: '1.6rem' }}>{t.emoji}</span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{t.name}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>{t.muscles}</span>
              </button>
            ))}
          </div>

          {/* Secondary pills row */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {templates.slice(4).map(t => (
              <button
                key={t.name}
                onClick={() => startCustomSession(t.name)}
                style={{
                  flex: 1,
                  padding: '0.9rem 1rem',
                  backgroundColor: 'var(--bg-card)',
                  border: `1px solid rgba(255,255,255,0.06)`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{t.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Active Session ─────────────────────────────────────────────────────────
  if (sessionActive) {
    return (
      <>
        <ActiveWorkoutScreen
          workoutName={sessionName}
          exercises={exercises}
          elapsed={elapsed}
          logs={state.logs}
          today={today}
          onUpdateExercises={setExercises}
          onAddExercise={() => setShowPicker(true)}
          onFinish={finishWorkout}
          onCancel={cancelWorkout}
          showToast={showToast}
        />
        {showPicker && (
          <ExercisePicker
            library={state.workoutLibrary}
            added={exercises.map(e => e.libraryId)}
            onAdd={addExerciseToSession}
            onClose={() => setShowPicker(false)}
            defaultPattern={pickerDefaultPattern}
          />
        )}
      </>
    );
  }

  // ── No Program Assigned ────────────────────────────────────────────────────
  if (!state.assignedProgram) {
    return (
      <div style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
        padding: '2rem 1.25rem',
        paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '12px',
      }} className="animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            backgroundColor: 'rgba(10,132,255,0.1)',
            border: '1px solid rgba(10,132,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Dumbbell size={32} color="var(--accent-blue)" />
          </div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 900, letterSpacing: '-0.025em', margin: 0 }}>Pick your program</h1>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '8px', lineHeight: 1.5, maxWidth: '280px', margin: '8px auto 0' }}>
            Choose the one that fits your goal. You can change it any time in Settings.
          </p>
        </div>

        {[
          {
            id: 'male_phase2' as const,
            emoji: '💪',
            label: 'Strength & Size',
            tag: 'Push · Pull · Legs',
            desc: '4 days/week · Build muscle and strength',
            color: '#60a5fa',
          },
          {
            id: 'female_phase1' as const,
            emoji: '🍑',
            label: 'Glute & Tone Focus',
            tag: 'Lower · Upper',
            desc: '4 days/week · Glute & posterior emphasis',
            color: '#f9a8d4',
          },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setAssignedProgram(opt.id)}
            style={{
              padding: '1.5rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '22px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', background: `linear-gradient(90deg, transparent, ${opt.color}, transparent)` }} />
            <div style={{ fontSize: '2rem' }}>{opt.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#fff', letterSpacing: '-0.02em' }}>{opt.label}</div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: '50px',
              backgroundColor: `${opt.color}15`,
              border: `1px solid ${opt.color}30`,
            }}>
              <span style={{ fontWeight: 800, fontSize: '0.72rem', color: opt.color, letterSpacing: '0.03em' }}>{opt.tag}</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>{opt.desc}</div>
          </button>
        ))}

        <button
          onClick={() => setShowCustomPicker(true)}
          style={{
            padding: '1rem',
            backgroundColor: 'transparent',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: '16px',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Plus size={15} /> Or start a custom workout
        </button>

        {showCustomPicker && (
          <ExercisePicker
            library={state.workoutLibrary}
            added={[]}
            onAdd={addExerciseToSession}
            onClose={() => setShowCustomPicker(false)}
            defaultPattern="all"
          />
        )}
      </div>
    );
  }

  // ── Main View (program assigned) ───────────────────────────────────────────
  const { program, nextDay, nextDayIndex, completedDayNames, allDone } = programData!;
  const estimatedMinutes = Math.round(
    nextDay.exercises.reduce((acc, ex) => acc + (ex.sets * ex.rest) / 60, 0) + nextDay.exercises.length * 1.5
  );

  const thisWeekWorkouts = Object.entries(state.logs)
    .filter(([date]) => {
      const now = new Date();
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      return new Date(date) >= weekAgo;
    })
    .flatMap(([, log]) => log.workouts);

  const totalVolumeLast5 = recentWorkouts.slice(0, 5).reduce((acc, w) =>
    acc + w.exercises.reduce((a, ex) => a + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0), 0);

  return (
    <div style={{
      paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
      backgroundColor: 'var(--bg-primary)',
      minHeight: '100dvh',
    }} className="animate-fade-in">

      {/* ── Page Header ── */}
      <div style={{ padding: '1.25rem 1.25rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            letterSpacing: '-0.025em',
            margin: 0,
            fontFamily: "'Outfit', sans-serif",
          }}>Training</h1>
          <button
            onClick={() => setShowCustomPicker(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: '50px',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            <Plus size={13} /> Start Custom
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 1.25rem' }}>

        {/* ── Draft Restore Banner ── */}
        {showDraftRestore && savedDraft && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.875rem 1rem',
            backgroundColor: 'rgba(251,191,36,0.07)',
            border: '1px solid rgba(251,191,36,0.18)',
            borderRadius: '18px',
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24' }}>Resume your last workout?</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '3px' }}>
                {savedDraft.sessionName} · {savedDraft.exercises?.length} exercise{savedDraft.exercises?.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => {
                  setSessionName(savedDraft.sessionName);
                  setExercises(savedDraft.exercises);
                  setSessionActive(true);
                  setShowDraftRestore(false);
                }}
                style={{ padding: '0.45rem 0.9rem', background: '#fbbf24', border: 'none', borderRadius: '50px', fontWeight: 800, fontSize: '0.78rem', color: '#000', cursor: 'pointer' }}
              >
                Resume
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('bbc_workout_draft');
                  setShowDraftRestore(false);
                  setSavedDraft(null);
                }}
                style={{ padding: '0.45rem 0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px', fontWeight: 700, fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* ── WORKOUT TYPE SELECTOR (hero action) ── */}
        <div>
          <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            WHAT ARE YOU TRAINING TODAY?
          </p>
          {/* 2×3 full grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { name: 'Push',        emoji: '💪', muscles: 'Chest · Shoulders · Triceps', color: '#60a5fa' },
              { name: 'Pull',        emoji: '🔄', muscles: 'Back · Biceps · Rear Delts',  color: '#4ade80' },
              { name: 'Lower Body',  emoji: '🦵', muscles: 'Quads · Glutes · Hamstrings', color: '#fb923c' },
              { name: 'Upper Body',  emoji: '🏋️', muscles: 'Push + Pull combined',        color: '#a78bfa' },
              { name: 'Full Body',   emoji: '⚡', muscles: 'All muscle groups',            color: '#f9a8d4' },
              { name: 'Core & Arms', emoji: '💥', muscles: 'Core · Biceps · Triceps',      color: '#fbbf24' },
            ].map(t => (
              <button
                key={t.name}
                onClick={() => startCustomSession(t.name)}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  minHeight: '84px',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  transition: 'transform 0.1s ease, border-color 0.1s ease',
                }}
                onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2.5px', background: `linear-gradient(90deg, transparent, ${t.color}cc, transparent)` }} />
                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{t.emoji}</span>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff', marginTop: '2px' }}>{t.name}</span>
                <span style={{ fontSize: '0.63rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{t.muscles}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── PROGRAM SUGGESTION (compact secondary) ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(10,132,255,0.06)',
          border: '1px solid rgba(10,132,255,0.12)',
          borderRadius: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '10px',
              backgroundColor: 'rgba(10,132,255,0.12)',
              border: '1px solid rgba(10,132,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: '0.95rem' }}>📋</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {allDone ? 'PROGRAM · NEW WEEK' : `PROGRAM · DAY ${nextDayIndex + 1}`}
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nextDay.name}
              </div>
              <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: '1px' }}>
                {nextDay.exercises.length} exercises · ~{estimatedMinutes} min
              </div>
            </div>
          </div>
          <button
            onClick={() => startProgramDay(program, nextDay)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0,
              marginLeft: '10px',
            }}
          >
            <Play size={13} fill="currentColor" /> Start
          </button>
        </div>

        {/* ── WEEK PROGRESS ── */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '1rem 1.25rem',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>THIS WEEK</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{completedDayNames.size} / {program.days.length} done</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {program.days.map((day, i) => {
              const isDone = completedDayNames.has(`${program.name} — ${day.name}`);
              const isNext = day === nextDay;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: isDone ? 'rgba(50,215,75,0.12)' : isNext ? 'rgba(10,132,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${isDone ? 'rgba(50,215,75,0.45)' : isNext ? 'rgba(10,132,255,0.55)' : 'rgba(255,255,255,0.07)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}>
                    {isDone
                      ? <Check size={17} color="var(--accent-green)" />
                      : <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isNext ? 'var(--accent-blue)' : 'rgba(255,255,255,0.22)' }}>{i + 1}</span>
                    }
                  </div>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: isDone ? 'var(--accent-green)' : isNext ? 'var(--accent-blue)' : 'rgba(255,255,255,0.22)', textAlign: 'center', maxWidth: 50 }}>
                    {day.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
          {allDone && (
            <div style={{ marginTop: '10px', textAlign: 'center', padding: '0.5rem', backgroundColor: 'rgba(50,215,75,0.07)', borderRadius: '10px', border: '1px solid rgba(50,215,75,0.13)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-green)' }}>Week complete — program restarts</span>
            </div>
          )}
        </div>

        {/* ── STATS ROW ── */}
        {recentWorkouts.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { label: 'THIS WEEK', value: String(thisWeekWorkouts.length), sub: 'sessions' },
              { label: 'VOLUME', value: totalVolumeLast5 > 1000 ? `${(totalVolumeLast5 / 1000).toFixed(1)}k` : String(Math.round(totalVolumeLast5)), sub: 'kg lifted' },
              { label: 'LAST', value: recentWorkouts[0] ? `${recentWorkouts[0].durationMinutes}m` : '—', sub: recentWorkouts[0]?.name?.split('—')[1]?.trim()?.slice(0, 8) || '—' },
            ].map(stat => (
              <div key={stat.label} style={{
                flex: 1,
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '0.9rem',
                border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{stat.value}</div>
                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '3px' }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── VOLUME CHART ── */}
        <Card className="flex-col gap-4 p-4 card-glass">
          <div className="flex-col mb-2">
            <span className="text-h3">Volume Distribution</span>
            <span className="text-caption text-muted mt-1">Total sets per muscle group (all-time)</span>
          </div>
          <div style={{ height: '160px', width: '100%', marginLeft: '-15px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {/* @ts-ignore */}
              <BarChart data={volumeData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} dy={10} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', padding: '12px' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="sets" radius={[6, 6, 0, 0]} barSize={32}>
                  {volumeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.sets > 0 ? (MUSCLE_COLORS[entry.name] || 'var(--accent-blue)') : 'rgba(255,255,255,0.05)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ── RECENT HISTORY ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              RECENT WORKOUTS
            </p>
            {recentWorkouts.length > 0 && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>{recentWorkouts.length} sessions</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentWorkouts.length === 0 ? (
              <div style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '20px',
                border: '1px dashed rgba(255,255,255,0.08)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <Dumbbell size={22} color="rgba(255,255,255,0.2)" />
                </div>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', margin: 0 }}>No workouts yet</p>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)', fontWeight: 500, marginTop: '4px' }}>Start your first session above</p>
              </div>
            ) : (
              recentWorkouts.map(workout => {
                const totalVolume = workout.exercises.reduce((acc, ex) =>
                  acc + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0);
                const dateStr = new Date(workout.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                return (
                  <WorkoutCard
                    key={workout.id}
                    name={workout.name}
                    date={dateStr}
                    durationMinutes={workout.durationMinutes}
                    exerciseCount={workout.exercises.length}
                    totalVolume={totalVolume > 0 ? Math.round(totalVolume) : undefined}
                  />
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
