import React, { useState } from 'react';
import { X, Sparkles, ChevronRight, RefreshCw, Zap, Play } from 'lucide-react';
import { generateWorkout, AIGeneratedWorkout } from '../services/aiCoach';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LibraryEntry {
  id: string;
  name: string;
  targetMuscles: string[];
}

export interface BuiltExercise {
  libraryId: string;
  name: string;
  targetSets: number;
  targetReps: string;
  rest: number;
  notes?: string;
}

interface Props {
  library: LibraryEntry[];
  onStart: (workoutName: string, exercises: BuiltExercise[]) => void;
  onClose: () => void;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const MUSCLE_OPTIONS = [
  { label: 'Legs',        emoji: '🦵', value: 'Legs (quads, hamstrings, calves)' },
  { label: 'Glutes',      emoji: '🍑', value: 'Glutes & hamstrings' },
  { label: 'Push',        emoji: '💪', value: 'Push (chest, shoulders, triceps)' },
  { label: 'Pull',        emoji: '🔄', value: 'Pull (back, biceps)' },
  { label: 'Upper Body',  emoji: '🏋️', value: 'Upper body (chest, back, shoulders, arms)' },
  { label: 'Full Body',   emoji: '⚡', value: 'Full body' },
  { label: 'Core & Arms', emoji: '💥', value: 'Core and arms' },
  { label: 'Shoulders',   emoji: '🎯', value: 'Shoulders and traps' },
];

const DURATION_OPTIONS = [
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '75 min', value: 75 },
];

const LEVEL_OPTIONS = [
  { label: 'Beginner',     emoji: '🌱', value: 'beginner', desc: 'Simple movements, lighter load' },
  { label: 'Intermediate', emoji: '🔥', value: 'intermediate', desc: 'Mix of compound & isolation' },
  { label: 'Advanced',     emoji: '⚡', value: 'advanced', desc: 'High volume, advanced techniques' },
];

// ── Fuzzy library match ────────────────────────────────────────────────────────

function matchToLibrary(generatedName: string, library: LibraryEntry[]): LibraryEntry | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = norm(generatedName);

  // Exact normalised match
  const exact = library.find(e => norm(e.name) === target);
  if (exact) return exact;

  // Generated name is contained in library name or vice versa
  const partial = library.find(e => norm(e.name).includes(target) || target.includes(norm(e.name)));
  if (partial) return partial;

  // Word-overlap score
  const words = target.split(/\s+/).filter(w => w.length > 2);
  let best: LibraryEntry | null = null;
  let bestScore = 0;
  for (const entry of library) {
    const entryNorm = norm(entry.name);
    const score = words.filter(w => entryNorm.includes(w)).length;
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return bestScore >= 2 ? best : null;
}

// ── Pill button ────────────────────────────────────────────────────────────────

const Pill: React.FC<{
  label: string;
  emoji?: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, emoji, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '9px 16px', borderRadius: 999,
      background: active ? '#576038' : 'rgba(0,0,0,0.05)',
      border: active ? 'none' : '1px solid rgba(0,0,0,0.07)',
      color: active ? '#FCFFE2' : 'rgba(0,0,0,0.55)',
      fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
      transition: 'all 0.15s', flexShrink: 0,
    }}
  >
    {emoji && <span>{emoji}</span>}
    {label}
  </button>
);

// ── Component ──────────────────────────────────────────────────────────────────

type Step = 'build' | 'loading' | 'preview';

export const AIWorkoutBuilder: React.FC<Props> = ({ library, onStart, onClose }) => {
  const [step, setStep] = useState<Step>('build');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [level, setLevel] = useState<string>('intermediate');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<AIGeneratedWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!muscle) return;
    setStep('loading');
    setError(null);
    try {
      const workout = await generateWorkout({
        muscleGroup: muscle,
        durationMinutes: duration,
        level,
        notes: notes.trim() || undefined,
      });
      setResult(workout);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setStep('build');
    }
  };

  const handleStart = () => {
    if (!result) return;
    const exercises: BuiltExercise[] = result.exercises.map((ex, i) => {
      const match = matchToLibrary(ex.name, library);
      return {
        libraryId: match ? match.id : `ai-${Date.now()}-${i}`,
        name: match ? match.name : ex.name,
        targetSets: ex.sets,
        targetReps: ex.reps,
        rest: ex.rest,
        notes: ex.notes ?? undefined,
      };
    });
    onStart(result.name, exercises);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F5F0E8',
      zIndex: 9015, display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 1.25rem 1rem',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        background: 'rgba(245,240,232,0.98)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#576038" />
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.3rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
              AI Coach
            </h2>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.30)', fontWeight: 600, marginTop: 2 }}>
            {step === 'build' ? 'Tell me what you want to train' : step === 'loading' ? 'Building your workout…' : 'Your personalised workout'}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%',
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <X size={18} color="rgba(28,28,46,0.45)" />
        </button>
      </div>

      {/* ── LOADING ── */}
      {step === 'loading' && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(87,96,56,0.12), rgba(87,96,56,0.06))',
            border: '1px solid rgba(87,96,56,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(87,96,56,0.12)',
          }}>
            <RefreshCw size={28} color="#576038" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>
              Designing your session…
            </p>
            <p style={{ fontSize: '0.78rem', color: 'rgba(0,0,0,0.30)', fontWeight: 600, marginTop: 6 }}>
              Selecting the best exercises for your goals
            </p>
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {step === 'preview' && result && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.25rem 9rem' }}>
          {/* Workout name */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(87,96,56,0.10), rgba(87,96,56,0.06))',
            border: '1px solid rgba(87,96,56,0.20)', borderRadius: 20,
            padding: '18px 20px', marginBottom: 16,
          }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(87,96,56,0.70)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              AI-generated · {duration} min · {level}
            </div>
            <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.3rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
              {result.name}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.30)', fontWeight: 600, marginTop: 4 }}>
              {result.exercises.length} exercises
            </p>
          </div>

          {/* Exercise list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.exercises.map((ex, i) => {
              const match = matchToLibrary(ex.name, library);
              return (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(0,0,0,0.06)', borderRadius: 18,
                    padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: 8,
                          background: 'rgba(87,96,56,0.10)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 900, color: '#576038', flexShrink: 0,
                        }}>{i + 1}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {match ? match.name : ex.name}
                        </span>
                      </div>
                      {!match && (
                        <span style={{ fontSize: '0.62rem', color: '#974400', fontWeight: 700, marginLeft: 32, display: 'block', marginTop: 2 }}>
                          New exercise (will be added to your session)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 8, marginLeft: 32 }}>
                    {[
                      { label: 'Sets', value: String(ex.sets) },
                      { label: 'Reps', value: ex.reps },
                      { label: 'Rest', value: ex.rest >= 60 ? `${ex.rest / 60}m` : `${ex.rest}s` },
                    ].map(s => (
                      <div key={s.label} style={{
                        background: 'rgba(87,96,56,0.06)', borderRadius: 10, padding: '6px 10px',
                        textAlign: 'center', flex: 1,
                      }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(0,0,0,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#576038', marginTop: 1 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {ex.notes && (
                    <div style={{
                      marginLeft: 32,
                      padding: '7px 10px', borderRadius: 10,
                      background: 'rgba(87,96,56,0.05)',
                      border: '1px solid rgba(87,96,56,0.10)',
                    }}>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(87,96,56,0.75)', fontWeight: 600, fontStyle: 'italic' }}>
                        {ex.notes}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Regenerate button */}
          <button
            onClick={() => { setResult(null); setStep('build'); }}
            style={{
              width: '100%', marginTop: 14, padding: '12px',
              background: 'transparent', border: '1.5px dashed rgba(0,0,0,0.10)',
              borderRadius: 14, color: 'rgba(0,0,0,0.30)', fontWeight: 700,
              fontSize: '0.82rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <RefreshCw size={13} /> Change requirements
          </button>
        </div>
      )}

      {/* ── BUILD ── */}
      {step === 'build' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.25rem 9rem', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {error && (
            <div style={{
              padding: '12px 16px', background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.20)', borderRadius: 14,
              fontSize: '0.82rem', fontWeight: 600, color: '#DC2626',
            }}>{error}</div>
          )}

          {/* Muscle group */}
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.20)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 10 }}>
              What do you want to train?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {MUSCLE_OPTIONS.map(o => (
                <Pill
                  key={o.value} label={o.label} emoji={o.emoji}
                  active={muscle === o.value}
                  onClick={() => setMuscle(muscle === o.value ? null : o.value)}
                />
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.20)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 10 }}>
              How long do you have?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DURATION_OPTIONS.map(o => (
                <Pill
                  key={o.value} label={o.label}
                  active={duration === o.value}
                  onClick={() => setDuration(o.value)}
                />
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.20)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 10 }}>
              Experience level
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LEVEL_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setLevel(o.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 16,
                    background: level === o.value ? 'rgba(87,96,56,0.08)' : 'rgba(0,0,0,0.03)',
                    border: `1.5px solid ${level === o.value ? 'rgba(87,96,56,0.35)' : 'rgba(0,0,0,0.06)'}`,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{o.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: level === o.value ? '#576038' : 'var(--text-primary)' }}>
                      {o.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.30)', fontWeight: 600, marginTop: 2 }}>
                      {o.desc}
                    </div>
                  </div>
                  {level === o.value && (
                    <div style={{ marginLeft: 'auto' }}>
                      <ChevronRight size={16} color="#576038" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Optional notes */}
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.20)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 10 }}>
              Anything specific? <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </p>
            <textarea
              placeholder="e.g. no barbell today, focus on machines, bad lower back, want a superset…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', borderRadius: 14,
                background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)',
                color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 500,
                fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(87,96,56,0.40)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
            />
          </div>
        </div>
      )}

      {/* ── Bottom CTA ── */}
      {step !== 'loading' && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          background: 'linear-gradient(to top, #F5F0E8 60%, transparent)',
          zIndex: 20,
        }}>
          {step === 'build' ? (
            <button
              onClick={generate}
              disabled={!muscle}
              style={{
                width: '100%', height: 56, borderRadius: 18,
                background: muscle
                  ? 'linear-gradient(135deg, #576038, #3E4528)'
                  : 'rgba(0,0,0,0.08)',
                border: 'none',
                color: muscle ? '#fff' : 'rgba(0,0,0,0.25)',
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 900, fontSize: '1rem', cursor: muscle ? 'pointer' : 'default',
                boxShadow: muscle ? '0 8px 32px rgba(87,96,56,0.30)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                transition: 'all 0.2s',
              }}
            >
              <Sparkles size={18} /> {muscle ? 'Generate My Workout' : 'Pick a muscle group first'}
            </button>
          ) : (
            <button
              onClick={handleStart}
              style={{
                width: '100%', height: 56, borderRadius: 18,
                background: 'linear-gradient(135deg, #576038, #3E4528)',
                border: 'none', color: '#fff',
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(87,96,56,0.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              }}
              onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Play size={18} fill="white" /> Start Workout
            </button>
          )}
        </div>
      )}
    </div>
  );
};
