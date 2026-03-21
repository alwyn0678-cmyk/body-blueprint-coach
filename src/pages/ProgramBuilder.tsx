import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Copy, Dumbbell,
  Check, Search, X, ChevronDown as Collapse, MoreVertical, Zap, Target,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CustomProgram, CustomProgramDay, CustomProgramExercise, ProgramGoal } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const GOAL_CONFIG: Record<ProgramGoal, { label: string; color: string; emoji: string }> = {
  hypertrophy: { label: 'Hypertrophy', color: '#8B9467', emoji: '💪' },
  strength:    { label: 'Strength',    color: '#576038', emoji: '🏋️' },
  endurance:   { label: 'Endurance',   color: '#576038', emoji: '🏃' },
  fat_loss:    { label: 'Fat Loss',    color: '#974400', emoji: '🔥' },
};

const SUPERSET_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ── Local builder types ───────────────────────────────────────────────────────

interface BuilderExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes: string;
  supersetGroup: string;
}

interface BuilderDay {
  id: string;
  name: string;
  focus: string;
  exercises: BuilderExercise[];
  collapsed: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const newDay = (index: number): BuilderDay => ({
  id: `day_${Date.now()}_${index}`,
  name: `Day ${index + 1}`,
  focus: '',
  exercises: [],
  collapsed: false,
});

const newExercise = (lib: { id: string; name: string }): BuilderExercise => ({
  id: `ex_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  exerciseId: lib.id,
  name: lib.name,
  sets: 3,
  reps: '8–12',
  rest: 90,
  notes: '',
  supersetGroup: '',
});

// ── Exercise Picker Modal ─────────────────────────────────────────────────────

const ExercisePicker: React.FC<{
  library: { id: string; name: string; targetMuscles: string[] }[];
  alreadyAdded: string[];
  onAdd: (ex: BuilderExercise) => void;
  onClose: () => void;
}> = ({ library, alreadyAdded, onAdd, onClose }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? library.filter(e => e.name.toLowerCase().includes(q) || e.targetMuscles.some(m => m.toLowerCase().includes(q)))
      : library;
  }, [library, search]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirm = () => {
    selected.forEach(id => {
      const lib = library.find(e => e.id === id);
      if (lib) onAdd(newExercise(lib));
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        marginTop: 'auto', height: '80dvh',
        display: 'flex', flexDirection: 'column',
        border: '1px solid rgba(0,0,0,0.06)', borderBottom: 'none',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 10px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 99, padding: '6px 10px', color: 'rgba(26,26,26,0.5)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
          >Cancel</button>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={13} color="rgba(0,0,0,0.20)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises…"
              style={{
                width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 99, color: '#1A1A1A', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          {selected.length > 0 && (
            <button
              onClick={confirm}
              style={{
                background: 'linear-gradient(135deg, #576038, #3E4528)', border: 'none',
                borderRadius: 99, padding: '7px 14px', color: '#FFFFFF',
                fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >Add {selected.length}</button>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
          {filtered.map(ex => {
            const isSelected = selected.includes(ex.id);
            const isAdded = alreadyAdded.includes(ex.id);
            return (
              <div
                key={ex.id}
                onClick={() => !isAdded && toggle(ex.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 12px', borderRadius: 14, marginBottom: 4,
                  background: isSelected ? 'rgba(87,96,56,0.08)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(87,96,56,0.25)' : 'transparent'}`,
                  cursor: isAdded ? 'default' : 'pointer', opacity: isAdded ? 0.4 : 1,
                  transition: 'all 0.1s',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 99, flexShrink: 0,
                  border: `2px solid ${isSelected ? '#576038' : 'rgba(0,0,0,0.10)'}`,
                  background: isSelected ? '#576038' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.1s',
                }}>
                  {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                  <div style={{ fontSize: '0.67rem', color: 'rgba(0,0,0,0.24)', fontWeight: 600, marginTop: 1 }}>{ex.targetMuscles.slice(0, 3).join(' · ')}</div>
                </div>
                {isAdded && <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.20)', fontWeight: 700 }}>Added</span>}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(0,0,0,0.16)', fontSize: '0.85rem', fontWeight: 600 }}>
              No exercises found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Exercise Row ──────────────────────────────────────────────────────────────

const ExerciseRow: React.FC<{
  ex: BuilderExercise;
  index: number;
  total: number;
  usedGroups: string[];
  onChange: (updated: BuilderExercise) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}> = ({ ex, index, total, usedGroups, onChange, onDelete, onMoveUp, onMoveDown }) => {
  const [expanded, setExpanded] = useState(false);

  const fieldStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 10, color: '#1A1A1A', fontSize: '0.8rem', fontWeight: 700,
    padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  const nextGroup = () => {
    if (!ex.supersetGroup) {
      const unused = SUPERSET_LABELS.find(l => !usedGroups.includes(l));
      onChange({ ...ex, supersetGroup: unused || 'A' });
    } else {
      onChange({ ...ex, supersetGroup: '' });
    }
  };

  return (
    <div style={{
      background: 'rgba(0,0,0,0.02)', borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.05)', marginBottom: 6, overflow: 'hidden',
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 10px 8px' }}>
        {/* Reorder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button onClick={onMoveUp} disabled={index === 0} style={{ background: 'none', border: 'none', padding: '1px 4px', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.2 : 0.5 }}>
            <ChevronUp size={12} color="#1A1A1A" />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} style={{ background: 'none', border: 'none', padding: '1px 4px', cursor: index === total - 1 ? 'default' : 'pointer', opacity: index === total - 1 ? 0.2 : 0.5 }}>
            <ChevronDown size={12} color="#1A1A1A" />
          </button>
        </div>

        {/* Superset group badge */}
        <button
          onClick={nextGroup}
          title={ex.supersetGroup ? `Superset ${ex.supersetGroup} — tap to remove` : 'Tap to add superset group'}
          style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            background: ex.supersetGroup ? 'rgba(87,96,56,0.12)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${ex.supersetGroup ? 'rgba(87,96,56,0.25)' : 'rgba(0,0,0,0.06)'}`,
            color: ex.supersetGroup ? '#576038' : 'rgba(0,0,0,0.16)',
            fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {ex.supersetGroup || '+'}
        </button>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
          <div style={{ fontSize: '0.67rem', color: 'rgba(0,0,0,0.24)', fontWeight: 600, marginTop: 1 }}>
            {ex.sets} × {ex.reps} · {ex.rest}s rest
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', opacity: 0.5 }}
        >
          <Collapse size={14} color="#1A1A1A" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer' }}
        >
          <Trash2 size={13} color="rgba(255,80,80,0.7)" />
        </button>
      </div>

      {/* Expanded inputs */}
      {expanded && (
        <div style={{ padding: '0 10px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.20)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Sets</label>
              <input
                type="number" min={1} max={20}
                value={ex.sets}
                onChange={e => onChange({ ...ex, sets: Math.max(1, parseInt(e.target.value) || 1) })}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.20)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Reps</label>
              <input
                type="text"
                value={ex.reps}
                onChange={e => onChange({ ...ex, reps: e.target.value })}
                placeholder="8–12"
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.20)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Rest (s)</label>
              <input
                type="number" min={0} max={600} step={15}
                value={ex.rest}
                onChange={e => onChange({ ...ex, rest: Math.max(0, parseInt(e.target.value) || 0) })}
                style={fieldStyle}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.20)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Notes</label>
            <input
              type="text"
              value={ex.notes}
              onChange={e => onChange({ ...ex, notes: e.target.value })}
              placeholder="Optional cue or technique note…"
              style={fieldStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ── Day Section ───────────────────────────────────────────────────────────────

const DaySection: React.FC<{
  day: BuilderDay;
  index: number;
  total: number;
  library: { id: string; name: string; targetMuscles: string[] }[];
  onChange: (updated: BuilderDay) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}> = ({ day, index, total, library, onChange, onDelete, onMoveUp, onMoveDown }) => {
  const [showPicker, setShowPicker] = useState(false);

  const toggleCollapse = () => onChange({ ...day, collapsed: !day.collapsed });

  const addExercise = (ex: BuilderExercise) => {
    onChange({ ...day, exercises: [...day.exercises, ex] });
  };

  const updateExercise = (i: number, updated: BuilderExercise) => {
    const exs = [...day.exercises];
    exs[i] = updated;
    onChange({ ...day, exercises: exs });
  };

  const deleteExercise = (i: number) => {
    onChange({ ...day, exercises: day.exercises.filter((_, idx) => idx !== i) });
  };

  const moveExercise = (i: number, dir: -1 | 1) => {
    const exs = [...day.exercises];
    const j = i + dir;
    if (j < 0 || j >= exs.length) return;
    [exs[i], exs[j]] = [exs[j], exs[i]];
    onChange({ ...day, exercises: exs });
  };

  const usedGroups = day.exercises.map(e => e.supersetGroup).filter(Boolean) as string[];
  const alreadyAdded = day.exercises.map(e => e.exerciseId);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20, overflow: 'hidden', marginBottom: 10,
    }}>
      {/* Day header */}
      <div style={{ padding: '14px 14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Reorder day */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button onClick={onMoveUp} disabled={index === 0} style={{ background: 'none', border: 'none', padding: '1px 3px', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.2 : 0.4 }}>
            <ChevronUp size={11} color="#1A1A1A" />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} style={{ background: 'none', border: 'none', padding: '1px 3px', cursor: index === total - 1 ? 'default' : 'pointer', opacity: index === total - 1 ? 0.2 : 0.4 }}>
            <ChevronDown size={11} color="#1A1A1A" />
          </button>
        </div>

        {/* Day number badge */}
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: 'rgba(87,96,56,0.12)', border: '1px solid rgba(87,96,56,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '0.85rem', color: '#576038',
        }}>
          {index + 1}
        </div>

        {/* Day name input */}
        <input
          value={day.name}
          onChange={e => onChange({ ...day, name: e.target.value })}
          placeholder={`Day ${index + 1}`}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#1A1A1A', fontWeight: 800, fontSize: '0.95rem',
            fontFamily: "'Outfit', sans-serif",
          }}
        />

        {/* Exercise count badge */}
        <span style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.20)', fontWeight: 700, flexShrink: 0 }}>
          {day.exercises.length} ex
        </span>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          style={{ background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', opacity: 0.5 }}
        >
          <Collapse size={16} color="#1A1A1A" style={{ transform: day.collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.15s' }} />
        </button>

        {/* Delete day */}
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}
        >
          <X size={15} color="rgba(255,80,80,0.6)" />
        </button>
      </div>

      {/* Focus label input */}
      {!day.collapsed && (
        <div style={{ padding: '0 14px 10px' }}>
          <input
            value={day.focus}
            onChange={e => onChange({ ...day, focus: e.target.value })}
            placeholder="Focus (e.g. Push, Pull, Lower…)"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 10, color: 'rgba(26,26,26,0.5)', fontSize: '0.78rem', fontWeight: 600,
              padding: '7px 12px', outline: 'none',
            }}
          />
        </div>
      )}

      {/* Exercises */}
      {!day.collapsed && (
        <div style={{ padding: '0 10px 12px' }}>
          {day.exercises.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '1.5rem',
              border: '1.5px dashed rgba(0,0,0,0.06)', borderRadius: 14,
              color: 'rgba(0,0,0,0.16)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 8,
            }}>
              No exercises — add some below
            </div>
          ) : (
            day.exercises.map((ex, i) => (
              <ExerciseRow
                key={ex.id} ex={ex} index={i} total={day.exercises.length} usedGroups={usedGroups}
                onChange={updated => updateExercise(i, updated)}
                onDelete={() => deleteExercise(i)}
                onMoveUp={() => moveExercise(i, -1)}
                onMoveDown={() => moveExercise(i, 1)}
              />
            ))
          )}

          <button
            onClick={() => setShowPicker(true)}
            style={{
              width: '100%', padding: '9px', borderRadius: 12,
              background: 'rgba(87,96,56,0.06)', border: '1px dashed rgba(87,96,56,0.20)',
              color: '#576038', fontWeight: 700, fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Plus size={13} /> Add Exercise
          </button>
        </div>
      )}

      {showPicker && (
        <ExercisePicker
          library={library}
          alreadyAdded={alreadyAdded}
          onAdd={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
};

// ── Program Card (List view) ──────────────────────────────────────────────────

const ProgramCard: React.FC<{
  program: CustomProgram;
  isActive: boolean;
  onEdit: () => void;
  onActivate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ program, isActive, onEdit, onActivate, onDuplicate, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const goal = program.goal ? GOAL_CONFIG[program.goal] : null;
  const totalExercises = program.days.reduce((a, d) => a + d.exercises.length, 0);

  return (
    <div style={{
      background: '#FFFFFF',
      border: `1px solid ${isActive ? 'rgba(87,96,56,0.20)' : 'rgba(0,0,0,0.06)'}`,
      borderRadius: 20, overflow: 'hidden', position: 'relative',
    }}>
      {isActive && (
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: 'linear-gradient(90deg, transparent, #576038, transparent)' }} />
      )}

      <div style={{ padding: '16px 14px 14px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1.05rem', color: '#1A1A1A' }}>{program.name}</span>
              {isActive && (
                <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(87,96,56,0.12)', border: '1px solid rgba(87,96,56,0.25)', fontWeight: 800, fontSize: '0.62rem', color: '#576038', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active</span>
              )}
              {!isActive && (
                <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)', fontWeight: 700, fontSize: '0.62rem', color: 'rgba(0,0,0,0.24)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{program.status}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {goal && (
                <span style={{ padding: '3px 10px', borderRadius: 99, background: `${goal.color}18`, border: `1px solid ${goal.color}30`, fontWeight: 800, fontSize: '0.68rem', color: goal.color }}>
                  {goal.emoji} {goal.label}
                </span>
              )}
              <span style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600 }}>
                {program.days.length} day{program.days.length !== 1 ? 's' : ''} · {totalExercises} exercises
              </span>
            </div>
          </div>

          {/* Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(m => !m)}
              style={{ background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}
            >
              <MoreVertical size={15} color="rgba(0,0,0,0.35)" />
            </button>
            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setShowMenu(false)} />
                <div style={{
                  position: 'absolute', right: 0, top: 36, zIndex: 101,
                  background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: 14, overflow: 'hidden', minWidth: 150, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                  {[
                    { label: 'Edit',      action: () => { onEdit(); setShowMenu(false); }, color: '#1A1A1A' },
                    { label: 'Duplicate', action: () => { onDuplicate(); setShowMenu(false); }, color: '#1A1A1A' },
                    { label: 'Delete',    action: () => { onDelete(); setShowMenu(false); }, color: '#FF453A' },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                      color: item.color, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                      textAlign: 'left', display: 'block',
                    }}>{item.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {program.description && (
          <p style={{ fontSize: '0.78rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600, margin: '0 0 12px', lineHeight: 1.4 }}>{program.description}</p>
        )}

        {/* Day pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {program.days.map(d => (
            <span key={d.id} style={{
              padding: '4px 10px', borderRadius: 99,
              background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
              fontSize: '0.68rem', fontWeight: 700, color: 'rgba(0,0,0,0.35)',
            }}>{d.name}</span>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onEdit}
            style={{
              flex: 1, padding: '9px', borderRadius: 12,
              background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)',
              color: 'rgba(26,26,26,0.6)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
            }}
          >Edit</button>
          {!isActive && (
            <button
              onClick={onActivate}
              style={{
                flex: 2, padding: '9px', borderRadius: 12,
                background: 'linear-gradient(135deg, #576038, #3E4528)', border: 'none',
                color: '#FFFFFF', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Zap size={13} fill="#FFFFFF" /> Activate Program
            </button>
          )}
          {isActive && (
            <button
              onClick={onActivate}
              style={{
                flex: 2, padding: '9px', borderRadius: 12,
                background: 'rgba(87,96,56,0.06)', border: '1px solid rgba(87,96,56,0.20)',
                color: '#576038', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Check size={13} /> Currently Active
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Program Editor Screen ─────────────────────────────────────────────────────

const ProgramEditorScreen: React.FC<{
  program: CustomProgram | null;
  onBack: () => void;
  onSaved: (id: string) => void;
}> = ({ program, onBack, onSaved }) => {
  const { state, saveCustomProgram, activateCustomProgram, showToast } = useApp();

  const [programId] = useState(() => program?.id || `cp_${Date.now()}`);
  const [createdAt] = useState(() => program?.createdAt || new Date().toISOString());
  const [name, setName] = useState(program?.name || '');
  const [description, setDescription] = useState(program?.description || '');
  const [goal, setGoal] = useState<ProgramGoal | ''>(program?.goal || '');
  const [status, setStatus] = useState<'draft' | 'active'>(program?.status || 'draft');
  const [days, setDays] = useState<BuilderDay[]>(() =>
    program?.days.length
      ? program.days.map(d => ({
          id: d.id, name: d.name, focus: d.focus || '', collapsed: false,
          exercises: d.exercises.map(e => ({
            id: e.id, exerciseId: e.exerciseId, name: e.name,
            sets: e.sets, reps: e.reps, rest: e.rest,
            notes: e.notes || '', supersetGroup: e.supersetGroup || '',
          })),
        }))
      : [newDay(0)]
  );

  // Auto-save as draft
  const buildProgram = useCallback((): CustomProgram => ({
    id: programId, name: name.trim() || 'Untitled Program',
    description: description.trim() || undefined,
    goal: goal || undefined,
    days: days.map((d, i) => ({
      id: d.id, dayNumber: i + 1, name: d.name || `Day ${i + 1}`,
      focus: d.focus || undefined,
      exercises: d.exercises.map(e => ({
        id: e.id, exerciseId: e.exerciseId, name: e.name,
        sets: e.sets, reps: e.reps, rest: e.rest,
        notes: e.notes || undefined, supersetGroup: e.supersetGroup || undefined,
      })),
    })),
    status, createdAt, updatedAt: new Date().toISOString(),
  }), [programId, name, description, goal, days, status, createdAt]);

  useEffect(() => {
    const timer = setTimeout(() => saveCustomProgram(buildProgram()), 800);
    return () => clearTimeout(timer);
  }, [name, description, goal, days]);

  const handleActivate = () => {
    const prog = { ...buildProgram(), status: 'active' as const };
    saveCustomProgram(prog);
    activateCustomProgram(programId);
    setStatus('active');
    showToast('Program activated!', 'success');
    onSaved(programId);
  };

  const handleSaveDraft = () => {
    saveCustomProgram(buildProgram());
    showToast('Saved as draft', 'success');
    onBack();
  };

  const addDay = () => setDays(prev => [...prev, newDay(prev.length)]);

  const updateDay = (i: number, updated: BuilderDay) => {
    setDays(prev => { const d = [...prev]; d[i] = updated; return d; });
  };

  const deleteDay = (i: number) => setDays(prev => prev.filter((_, idx) => idx !== i));

  const moveDay = (i: number, dir: -1 | 1) => {
    setDays(prev => {
      const d = [...prev]; const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      [d[i], d[j]] = [d[j], d[i]]; return d;
    });
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 12, color: '#1A1A1A', fontSize: '0.9rem', fontWeight: 700,
    padding: '12px 14px', outline: 'none', fontFamily: "'Outfit', sans-serif",
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F0E8', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.25rem 0.75rem',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        background: 'rgba(250,249,246,0.95)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          onClick={handleSaveDraft}
          style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 99, padding: '7px 12px', cursor: 'pointer', color: 'rgba(26,26,26,0.6)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <ArrowLeft size={13} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1rem', color: '#1A1A1A' }}>
            {program ? 'Edit Program' : 'New Program'}
          </div>
          <div style={{ fontSize: '0.62rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600, marginTop: 1 }}>
            Auto-saving as draft
          </div>
        </div>
        <span style={{
          padding: '4px 10px', borderRadius: 99,
          background: status === 'active' ? 'rgba(87,96,56,0.10)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${status === 'active' ? 'rgba(87,96,56,0.20)' : 'rgba(0,0,0,0.07)'}`,
          color: status === 'active' ? '#576038' : 'rgba(0,0,0,0.24)',
          fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{status}</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.25rem', paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>

        {/* Program Details */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20, padding: '18px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.16)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Program Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Program name…"
              style={{ ...fieldStyle, fontSize: '1.1rem', fontWeight: 900 }}
            />
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)…"
              rows={2}
              style={{ ...fieldStyle, resize: 'none', lineHeight: 1.5 }}
            />

            {/* Goal selector */}
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.16)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Goal</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(Object.entries(GOAL_CONFIG) as [ProgramGoal, typeof GOAL_CONFIG[ProgramGoal]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setGoal(goal === key ? '' : key)}
                    style={{
                      padding: '10px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      background: goal === key ? `${cfg.color}15` : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${goal === key ? `${cfg.color}40` : 'rgba(0,0,0,0.06)'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '1rem', marginBottom: 3 }}>{cfg.emoji}</div>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: goal === key ? cfg.color : 'rgba(0,0,0,0.35)' }}>{cfg.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Days */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1rem' }}>Training Days</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600, marginTop: 1 }}>{days.length} day{days.length !== 1 ? 's' : ''} per week</div>
            </div>
            <button
              onClick={addDay}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 99,
                background: 'rgba(87,96,56,0.08)', border: '1px solid rgba(87,96,56,0.20)',
                color: '#576038', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              <Plus size={13} /> Add Day
            </button>
          </div>

          {days.length === 0 ? (
            <div style={{
              border: '2px dashed rgba(0,0,0,0.06)', borderRadius: 20,
              padding: '3rem', textAlign: 'center',
            }}>
              <Dumbbell size={28} color="rgba(0,0,0,0.10)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'rgba(0,0,0,0.20)', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>No days yet</p>
              <p style={{ color: 'rgba(0,0,0,0.12)', fontSize: '0.75rem', marginTop: 4 }}>Add your first training day above</p>
            </div>
          ) : (
            days.map((day, i) => (
              <DaySection
                key={day.id} day={day} index={i} total={days.length}
                library={state.workoutLibrary}
                onChange={updated => updateDay(i, updated)}
                onDelete={() => deleteDay(i)}
                onMoveUp={() => moveDay(i, -1)}
                onMoveDown={() => moveDay(i, 1)}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky bottom actions */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 20px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        background: 'rgba(250,249,246,0.95)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        display: 'flex', gap: 10,
      }}>
        <button
          onClick={handleSaveDraft}
          style={{
            flex: 1, padding: '13px', borderRadius: 14,
            background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.07)',
            color: 'rgba(26,26,26,0.6)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
          }}
        >Save Draft</button>
        <button
          onClick={handleActivate}
          style={{
            flex: 2, padding: '13px', borderRadius: 14,
            background: 'linear-gradient(135deg, #576038, #3E4528)', border: 'none',
            color: '#FFFFFF', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: '0 6px 24px rgba(87,96,56,0.25)',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          <Zap size={15} fill="#FFFFFF" /> Activate Program
        </button>
      </div>
    </div>
  );
};

// ── Program List Screen ───────────────────────────────────────────────────────

const ProgramListScreen: React.FC<{
  onNew: () => void;
  onEdit: (program: CustomProgram) => void;
}> = ({ onNew, onEdit }) => {
  const navigate = useNavigate();
  const { state, activateCustomProgram, deleteCustomProgram, duplicateCustomProgram, showToast } = useApp();
  const programs = state.customPrograms;
  const activeId = state.activeCustomProgramId;

  const handleActivate = (id: string) => {
    if (activeId === id) {
      activateCustomProgram(null);
      showToast('Program deactivated', 'info');
    } else {
      activateCustomProgram(id);
      showToast('Program activated!', 'success');
    }
  };

  const handleDelete = (id: string) => {
    deleteCustomProgram(id);
    showToast('Program deleted', 'info');
  };

  return (
    <div style={{
      minHeight: '100dvh', background: '#F5F0E8',
      paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.25rem 1rem',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}>
        <button
          onClick={() => navigate('/training')}
          style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 99, padding: '7px 12px', cursor: 'pointer', color: 'rgba(26,26,26,0.6)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <ArrowLeft size={13} /> Train
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>My Programs</h1>
          <p style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.20)', fontWeight: 600, margin: '2px 0 0' }}>Custom training programs</p>
        </div>
        <button
          onClick={onNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 99,
            background: 'linear-gradient(135deg, #576038, #3E4528)', border: 'none',
            color: '#FFFFFF', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
          }}
        >
          <Plus size={13} /> New
        </button>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {programs.length === 0 ? (
          /* Empty state */
          <div style={{
            background: '#FFFFFF',
            border: '1.5px dashed rgba(0,0,0,0.06)', borderRadius: 24,
            padding: '3.5rem 2rem', textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(87,96,56,0.12), rgba(87,96,56,0.08))',
              border: '1px solid rgba(87,96,56,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Target size={32} color="#576038" />
            </div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1.3rem', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Build your first program</h2>
            <p style={{ color: 'rgba(0,0,0,0.28)', fontSize: '0.82rem', fontWeight: 600, margin: '0 0 24px', lineHeight: 1.5 }}>
              Create a custom training program with your own exercises, sets, reps, and structure.
            </p>
            <button
              onClick={onNew}
              style={{
                padding: '13px 32px', borderRadius: 14,
                background: 'linear-gradient(135deg, #576038, #3E4528)', border: 'none',
                color: '#FFFFFF', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 6px 24px rgba(87,96,56,0.25)',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              <Plus size={16} /> Create Program
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {programs.map(prog => (
              <ProgramCard
                key={prog.id}
                program={prog}
                isActive={activeId === prog.id}
                onEdit={() => onEdit(prog)}
                onActivate={() => handleActivate(prog.id)}
                onDuplicate={() => { duplicateCustomProgram(prog.id); showToast('Program duplicated', 'success'); }}
                onDelete={() => handleDelete(prog.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const ProgramBuilder: React.FC = () => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingProgram, setEditingProgram] = useState<CustomProgram | null>(null);
  const navigate = useNavigate();

  const openNew = () => {
    setEditingProgram(null);
    setView('editor');
  };

  const openEdit = (program: CustomProgram) => {
    setEditingProgram(program);
    setView('editor');
  };

  const handleEditorBack = () => {
    setView('list');
    setEditingProgram(null);
  };

  const handleEditorSaved = (id: string) => {
    navigate('/training');
  };

  if (view === 'editor') {
    return (
      <ProgramEditorScreen
        program={editingProgram}
        onBack={handleEditorBack}
        onSaved={handleEditorSaved}
      />
    );
  }

  return (
    <ProgramListScreen
      onNew={openNew}
      onEdit={openEdit}
    />
  );
};
