import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card } from '../components/SharedUI';
import {
  Dumbbell, Plus, Timer, ChevronRight, X, Check, RotateCcw, Search,
  TrendingUp, ChevronDown, ChevronUp, Trash2, Play, RefreshCw, Info,
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

// Movement pattern classification for Push/Pull/Legs tabs
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
      <div style={{ padding: '1rem 1rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Add Exercise</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>
              {filtered.length} exercises
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        {/* Push / Pull / Legs tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', marginBottom: '8px' }}>
          {PATTERN_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setPatternFilter(tab.key)}
              style={{
                flexShrink: 0,
                padding: '0.45rem 0.9rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: patternFilter === tab.key ? 'white' : 'rgba(255,255,255,0.08)',
                color: patternFilter === tab.key ? '#000' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.6rem 0.9rem', marginBottom: '6px' }}>
          <Search size={15} color="rgba(255,255,255,0.35)" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={patternFilter === 'all' ? 'Search all exercises...' : `Search ${patternFilter} exercises...`}
            style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.9rem', flex: 1 }}
          />
          {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={13} color="rgba(255,255,255,0.3)" /></button>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 1rem 6rem' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)' }}>
            <p style={{ fontSize: '0.9rem' }}>No exercises found</p>
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
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0.75rem', borderRadius: '14px', marginBottom: '3px', cursor: isAdded ? 'default' : 'pointer', backgroundColor: isAdded ? 'rgba(255,255,255,0.03)' : 'transparent', opacity: isAdded ? 0.45 : 1, transition: 'background-color 0.1s' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isAdded ? 'rgba(255,255,255,0.5)' : '#fff' }}>{ex.name}</span>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {ex.targetMuscles.map(m => (
                    <span key={m} style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: '5px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>{m}</span>
                  ))}
                </div>
              </div>
              {isAdded
                ? <Check size={18} color="var(--accent-green)" />
                : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: `${patternColor}18`, border: `1px solid ${patternColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
}> = ({ workoutName, exercises, elapsed, logs, today, onUpdateExercises, onAddExercise, onFinish, onCancel }) => {
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

  const updateSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps' | 'rpe', value: string) => {
    onUpdateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value })
    }));
  };

  const toggleSetDone = (exIdx: number, setIdx: number) => {
    const restTime = exercises[exIdx]?.rest ?? 90;
    onUpdateExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, done: !s.done })
    }));
    startRest(restTime);
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

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 9002, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', zIndex: 10, padding: '1rem 1rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex-row justify-between align-center">
          <div className="flex-col">
            <span className="text-h3">{workoutName}</span>
            <div className="flex-row gap-3 align-center mt-1">
              <div className="flex-row align-center gap-1">
                <Timer size={13} color="var(--accent-blue)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(elapsed)}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{completedSets}/{totalSets} sets done</span>
            </div>
          </div>
          <div className="flex-row gap-2">
            <button onClick={onFinish} style={{ padding: '0.5rem 1.1rem', backgroundColor: 'var(--accent-green)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Finish</button>
            <button onClick={onCancel} style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', height: '3px', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%`, backgroundColor: 'var(--accent-green)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Rest Timer Banner */}
      {restTimer !== null && restTimer > 0 && (
        <div className="flex-row justify-between align-center" style={{ backgroundColor: 'rgba(10,132,255,0.1)', border: '1px solid rgba(10,132,255,0.2)', margin: '0.75rem 1rem 0', padding: '0.6rem 1rem', borderRadius: '12px' }}>
          <div className="flex-row align-center gap-2">
            <RotateCcw size={15} color="var(--accent-blue)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-blue)' }}>Rest Timer</span>
          </div>
          <div className="flex-row align-center gap-3">
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(restTimer)}</span>
            <button onClick={() => setRestTimer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={16} color="rgba(255,255,255,0.4)" />
            </button>
          </div>
        </div>
      )}

      {/* Exercises */}
      <div style={{ flex: 1, padding: '0.75rem 1rem', paddingBottom: '2rem' }}>
        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)' }}>
            <Dumbbell size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>No exercises added yet.</p>
          </div>
        ) : (
          <div className="flex-col gap-3">
            {exercises.map((ex, exIdx) => {
              const lastPerf = getLastPerformance(logs, ex.libraryId, today);
              const isExpanded = expandedExercise === ex.libraryId;
              const isSwapOpen = swapOpenIdx === exIdx;
              const doneSets = ex.sets.filter(s => s.done).length;
              const supersetColor = ex.supersetGroup ? SUPERSET_COLORS[ex.supersetGroup] : null;

              return (
                <div key={`${ex.libraryId}-${exIdx}`} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: `1px solid ${isExpanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}>
                  {/* Superset connector */}
                  {supersetColor && (
                    <div style={{ height: '3px', backgroundColor: supersetColor, opacity: 0.7 }} />
                  )}

                  {/* Exercise Header */}
                  <div className="flex-row justify-between align-center" style={{ padding: '0.9rem 1rem', cursor: 'pointer' }} onClick={() => setExpandedExercise(isExpanded ? null : ex.libraryId)}>
                    <div className="flex-col" style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex-row align-center gap-2">
                        {supersetColor && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 900, padding: '0.15rem 0.4rem', borderRadius: '5px', backgroundColor: `${supersetColor.replace('0.9', '0.15')}`, color: supersetColor, flexShrink: 0, letterSpacing: '0.03em' }}>
                            {ex.supersetGroup}
                          </span>
                        )}
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</span>
                        {doneSets === ex.sets.length && doneSets > 0 && <Check size={14} color="var(--accent-green)" />}
                      </div>
                      <div className="flex-row gap-2 mt-1 align-center flex-wrap">
                        {ex.targetReps && (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                            {ex.sets.length} × {ex.targetReps}
                          </span>
                        )}
                        {ex.rest && (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>· {ex.rest}s rest</span>
                        )}
                        {lastPerf ? (
                          <div className="flex-row align-center gap-1">
                            <TrendingUp size={11} color="var(--accent-orange)" />
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Last: {lastPerf.weight}kg × {lastPerf.reps}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>First time</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-row gap-2 align-center">
                      {ex.variations && ex.variations.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); setSwapOpenIdx(isSwapOpen ? null : exIdx); }}
                          style={{ background: isSwapOpen ? 'rgba(255,159,10,0.15)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <RefreshCw size={13} color={isSwapOpen ? 'rgba(255,159,10,0.9)' : 'rgba(255,255,255,0.4)'} />
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); removeExercise(exIdx); }} style={{ background: 'rgba(255,59,48,0.08)', border: 'none', borderRadius: '8px', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Trash2 size={13} color="rgba(255,59,48,0.7)" />
                      </button>
                      {isExpanded ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />}
                    </div>
                  </div>

                  {/* Notes */}
                  {ex.notes && isExpanded && (
                    <div className="flex-row align-center gap-2" style={{ padding: '0 1rem 0.5rem' }}>
                      <Info size={12} color="rgba(255,255,255,0.3)" />
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>{ex.notes}</span>
                    </div>
                  )}

                  {/* Variation Swap Panel */}
                  {isSwapOpen && ex.variations && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.75rem 1rem', backgroundColor: 'rgba(255,159,10,0.04)' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,159,10,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Swap exercise</p>
                      <div className="flex-col gap-1">
                        {ex.variations.map(v => (
                          <button
                            key={v}
                            onClick={() => swapExercise(exIdx, v)}
                            className="flex-row justify-between align-center"
                            style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            {v}
                            <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Set Rows */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem 0.75rem 0.75rem' }}>
                      <div style={{ display: 'flex', padding: '0.25rem 0.5rem', marginBottom: '4px' }}>
                        <span style={{ width: 32, fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, letterSpacing: '0.05em' }}>SET</span>
                        <span style={{ flex: 1, fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textAlign: 'center' }}>WEIGHT (kg)</span>
                        <span style={{ flex: 1, fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textAlign: 'center' }}>REPS</span>
                        <span style={{ width: 44 }} />
                      </div>

                      {ex.sets.map((set, setIdx) => (
                        <div key={setIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px', opacity: set.done ? 0.45 : 1, transition: 'opacity 0.2s' }}>
                          <div style={{ width: 32, height: 44, borderRadius: '10px', backgroundColor: set.done ? 'rgba(48,209,88,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: set.done ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>{setIdx + 1}</span>
                          </div>
                          <input
                            type="number" inputMode="decimal"
                            placeholder={lastPerf ? String(lastPerf.weight) : '—'}
                            value={set.weight}
                            onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                            disabled={set.done}
                            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', color: '#fff', textAlign: 'center', padding: '0.7rem 0.4rem', fontSize: '1rem', fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                          />
                          <input
                            type="number" inputMode="numeric"
                            placeholder={lastPerf ? String(lastPerf.reps) : (ex.targetReps?.split('–')[0] || '—')}
                            value={set.reps}
                            onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                            disabled={set.done}
                            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', color: '#fff', textAlign: 'center', padding: '0.7rem 0.4rem', fontSize: '1rem', fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                          />
                          <button
                            onClick={() => set.done ? toggleSetDone(exIdx, setIdx) : (set.weight && set.reps ? toggleSetDone(exIdx, setIdx) : removeSet(exIdx, setIdx))}
                            style={{ width: 44, height: 44, borderRadius: '10px', border: 'none', backgroundColor: set.done ? 'rgba(48,209,88,0.25)' : (set.weight && set.reps ? 'rgba(48,209,88,0.15)' : 'rgba(255,59,48,0.1)'), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >
                            {set.done ? <Check size={18} color="#4ade80" /> : (set.weight && set.reps) ? <Check size={18} color="rgba(48,209,88,0.8)" /> : <X size={14} color="rgba(255,59,48,0.6)" />}
                          </button>
                        </div>
                      ))}

                      <div className="flex-row gap-2 mt-2">
                        <button onClick={() => addSet(exIdx)} className="flex-row align-center justify-center gap-1" style={{ flex: 1, padding: '0.55rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                          <Plus size={13} /> Add Set
                        </button>
                        {[60, 90, ex.rest && ex.rest !== 60 && ex.rest !== 90 ? ex.rest : null, 180].filter((v, i, a) => v && a.indexOf(v) === i).map(t => t && (
                          <button key={t} onClick={() => startRest(t)} style={{ padding: '0.55rem 0.8rem', backgroundColor: ex.rest === t ? 'rgba(10,132,255,0.15)' : 'rgba(10,132,255,0.08)', border: `1px solid ${ex.rest === t ? 'rgba(10,132,255,0.4)' : 'rgba(10,132,255,0.15)'}`, borderRadius: '10px', color: 'var(--accent-blue)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
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

        <button onClick={onAddExercise} className="flex-row align-center justify-center gap-2" style={{ width: '100%', marginTop: '1rem', padding: '0.9rem', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
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

  useEffect(() => {
    if (sessionActive) {
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionActive]);

  // ── Auto-compute next workout ──────────────────────────────────────────────
  const programData = useMemo(() => {
    if (!state.assignedProgram) return null;
    const program = getProgramById(state.assignedProgram);
    if (!program) return null;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday
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

  // ── Volume chart data ──────────────────────────────────────────────────────
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

  // ── Session actions ────────────────────────────────────────────────────────
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
    // Pre-set the exercise picker to match the workout type
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
    // Auto-open the exercise picker so they can immediately add exercises
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
    setSessionActive(false);
    showToast(`${sessionName} complete · ${Math.round(totalVolume)}kg total volume`, 'success');
  }, [exercises, sessionName, elapsed, today, addWorkout, showToast]);

  const cancelWorkout = () => {
    setSessionActive(false);
    setExercises([]);
    showToast('Session cancelled', 'info');
  };

  // ── Custom workout name picker ─────────────────────────────────────────────
  if (showCustomPicker) {
    const templates = [
      { name: 'Push Day',        emoji: '💪', muscles: 'Chest · Shoulders · Triceps', color: '#60a5fa', pattern: 'push' as const },
      { name: 'Pull Day',        emoji: '🔄', muscles: 'Back · Biceps',               color: '#4ade80', pattern: 'pull' as const },
      { name: 'Leg Day',         emoji: '🦵', muscles: 'Quads · Glutes · Hamstrings', color: '#fb923c', pattern: 'legs' as const },
      { name: 'Upper Body',      emoji: '🏋️', muscles: 'Push + Pull combined',        color: '#a78bfa', pattern: 'push' as const },
      { name: 'Full Body',       emoji: '⚡', muscles: 'All muscle groups',            color: '#f9a8d4', pattern: 'all' as const },
      { name: 'Arms & Shoulders',emoji: '💥', muscles: 'Biceps · Triceps · Delts',    color: '#fbbf24', pattern: 'push' as const },
    ];
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', padding: '1.5rem', paddingBottom: '6rem' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>What are you training?</h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>Pick a focus — exercises are loaded for you</p>
          </div>
          <button onClick={() => setShowCustomPicker(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        {/* Push / Pull highlight row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          {templates.slice(0, 2).map(t => (
            <button
              key={t.name}
              onClick={() => startCustomSession(t.name)}
              style={{ padding: '1.25rem 1rem', backgroundColor: 'var(--bg-card)', border: `1px solid ${t.color}25`, borderRadius: '18px', cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }} />
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{t.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: '3px' }}>{t.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{t.muscles}</div>
            </button>
          ))}
        </div>

        {/* Rest of options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {templates.slice(2).map(t => (
            <button
              key={t.name}
              onClick={() => startCustomSession(t.name)}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: '1.5rem' }}>{t.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{t.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: '2px' }}>{t.muscles}</div>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
            </button>
          ))}
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

  // ── No program assigned ────────────────────────────────────────────────────
  if (!state.assignedProgram) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', padding: '2rem 1.5rem', paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px' }} className="animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏋️</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Pick your program</h1>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '8px', lineHeight: 1.5 }}>Choose the one that fits your goal. You can change it any time in Settings.</p>
        </div>
        {[
          { id: 'male_phase2' as const, emoji: '💪', label: 'Strength & Size', sub: 'Push · Pull · Legs · Upper', desc: '4 days/week · Build muscle and strength', color: '#60a5fa' },
          { id: 'female_phase1' as const, emoji: '🍑', label: 'Glute & Tone Focus', sub: 'Lower · Upper · Lower · Upper', desc: '4 days/week · Glute & posterior emphasis', color: '#f9a8d4' },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setAssignedProgram(opt.id)}
            style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', border: `1px solid ${opt.color}20`, borderRadius: '22px', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', background: `linear-gradient(90deg, transparent, ${opt.color}, transparent)` }} />
            <div style={{ fontSize: '2rem' }}>{opt.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#fff' }}>{opt.label}</div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: opt.color }}>{opt.sub}</div>
            <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{opt.desc}</div>
          </button>
        ))}
        <button
          onClick={() => setShowCustomPicker(true)}
          style={{ padding: '1rem', backgroundColor: 'transparent', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '16px', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Plus size={16} /> Or start a custom workout
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

  // ── Main View ──────────────────────────────────────────────────────────────
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
    <div className="flex-col gap-4 p-4 animate-fade-in" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))', backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }}>

      {/* Header */}
      <div className="flex-row justify-between align-center mb-1">
        <div>
          <h1 className="text-h2">Training</h1>
          <p className="text-subtitle">{program.name} · Phase {program.phase}</p>
        </div>
        <button
          onClick={() => setShowCustomPicker(true)}
          style={{ padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={15} /> Custom
        </button>
      </div>

      {/* ── TODAY'S WORKOUT HERO ── */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        {/* Top label */}
        <div style={{ padding: '0.6rem 1.25rem', backgroundColor: 'rgba(10,132,255,0.07)', borderBottom: '1px solid rgba(10,132,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {allDone ? 'NEW WEEK — DAY 1' : `DAY ${nextDayIndex + 1} OF ${program.days.length}`}
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{estimatedMinutes} min</span>
        </div>

        {/* Day info */}
        <div style={{ padding: '1.1rem 1.25rem 0.75rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{nextDay.name}</h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>{nextDay.focus} · {nextDay.exercises.length} exercises</p>
        </div>

        {/* Exercise preview */}
        <div style={{ padding: '0 1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {nextDay.exercises.map((ex, j) => {
            const supersetColor = ex.supersetGroup ? SUPERSET_COLORS[ex.supersetGroup] : null;
            return (
              <div key={j} className="flex-row justify-between align-center" style={{ padding: '0.3rem 0', borderBottom: j < nextDay.exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="flex-row align-center gap-2">
                  {supersetColor && (
                    <span style={{ fontSize: '0.55rem', fontWeight: 900, padding: '0.1rem 0.35rem', borderRadius: '4px', backgroundColor: `${supersetColor.replace('0.9', '0.12')}`, color: supersetColor, flexShrink: 0 }}>
                      {ex.supersetGroup}
                    </span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{ex.name}</span>
                </div>
                <div className="flex-row align-center gap-2">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>{ex.sets} × {ex.reps}</span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>{ex.rest}s</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Start button */}
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <button
            onClick={() => startProgramDay(program, nextDay)}
            style={{ width: '100%', padding: '0.9rem', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Play size={18} fill="currentColor" /> Start Workout
          </button>
        </div>
      </div>

      {/* ── QUICK START ── */}
      <div>
        <div className="flex-row justify-between align-center" style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Start</span>
          <button
            onClick={() => setShowCustomPicker(true)}
            style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            More options →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { name: 'Push Day', emoji: '💪', muscles: 'Chest · Shoulders', color: '#60a5fa' },
            { name: 'Pull Day', emoji: '🔄', muscles: 'Back · Biceps',      color: '#4ade80' },
            { name: 'Leg Day',  emoji: '🦵', muscles: 'Quads · Glutes',     color: '#fb923c' },
          ].map(t => (
            <button
              key={t.name}
              onClick={() => startCustomSession(t.name)}
              style={{ padding: '0.85rem 0.6rem', backgroundColor: 'var(--bg-card)', border: `1px solid ${t.color}22`, borderRadius: '16px', cursor: 'pointer', textAlign: 'center', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
              <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px', background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }} />
              <span style={{ fontSize: '1.5rem' }}>{t.emoji}</span>
              <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#fff' }}>{t.name.split(' ')[0]}</span>
              <span style={{ fontSize: '0.58rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', lineHeight: 1.2 }}>{t.muscles}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── WEEK PROGRESS ── */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '1rem 1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex-row justify-between align-center mb-3">
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>This Week</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{completedDayNames.size} / {program.days.length} done</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {program.days.map((day, i) => {
            const isDone = completedDayNames.has(`${program.name} — ${day.name}`);
            const isNext = day === nextDay;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: isDone ? 'rgba(48,209,88,0.15)' : isNext ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.04)', border: `2px solid ${isDone ? 'rgba(48,209,88,0.5)' : isNext ? 'rgba(10,132,255,0.6)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                >
                  {isDone
                    ? <Check size={18} color="var(--accent-green)" />
                    : <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isNext ? 'var(--accent-blue)' : 'rgba(255,255,255,0.25)' }}>{i + 1}</span>
                  }
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: isDone ? 'var(--accent-green)' : isNext ? 'var(--accent-blue)' : 'rgba(255,255,255,0.25)', textAlign: 'center', maxWidth: 50 }}>
                  {day.name.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
        {allDone && (
          <div style={{ marginTop: '0.75rem', textAlign: 'center', padding: '0.5rem', backgroundColor: 'rgba(48,209,88,0.08)', borderRadius: '10px', border: '1px solid rgba(48,209,88,0.15)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-green)' }}>Week complete — program restarts</span>
          </div>
        )}
      </div>

      {/* ── STATS ROW ── */}
      {recentWorkouts.length > 0 && (
        <div className="flex-row gap-3">
          {[
            { label: 'This Week', value: String(thisWeekWorkouts.length), sub: 'sessions' },
            { label: 'Volume', value: totalVolumeLast5 > 1000 ? `${(totalVolumeLast5 / 1000).toFixed(1)}k` : String(Math.round(totalVolumeLast5)), sub: 'kg lifted' },
            { label: 'Last', value: recentWorkouts[0] ? `${recentWorkouts[0].durationMinutes}m` : '—', sub: recentWorkouts[0]?.name?.split('—')[1]?.trim()?.slice(0, 8) || '—' },
          ].map(stat => (
            <div key={stat.label} style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '14px', padding: '0.9rem', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>{stat.sub}</div>
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
      <h3 className="text-h3" style={{ marginTop: '0.5rem' }}>Recent History</h3>
      <div className="flex-col gap-3">
        {recentWorkouts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Dumbbell size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ fontSize: '0.85rem' }}>No workouts yet. Hit Start Workout above.</p>
          </div>
        ) : (
          recentWorkouts.map(workout => {
            const totalVolume = workout.exercises.reduce((acc, ex) =>
              acc + ex.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0);
            return (
              <div key={workout.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div className="flex-row justify-between align-center" style={{ padding: '1rem' }}>
                  <div className="flex-row gap-3 align-center">
                    <div style={{ backgroundColor: 'rgba(10,132,255,0.1)', padding: '8px', borderRadius: '10px' }}>
                      <Dumbbell size={18} color="var(--accent-blue)" />
                    </div>
                    <div className="flex-col">
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{workout.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {new Date(workout.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {workout.durationMinutes}m
                      </span>
                    </div>
                  </div>
                  <div className="flex-col" style={{ textAlign: 'right', gap: '2px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-green)' }}>{totalVolume > 0 ? `${Math.round(totalVolume)}kg` : 'Done'}</span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{workout.exercises.length} exercises</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
