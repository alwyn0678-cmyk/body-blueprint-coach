import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, RefreshCw, ChevronDown, ChevronUp,
  Dumbbell, Utensils, Trophy, Target, Zap, Clock, RotateCcw,
  ChevronRight, Trash2, BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateAIProgram, ProgramQuestionnaire } from '../services/aiCoach';
import type { AIProgram as AIProgramData, AIProgramDay, ExperienceLevel, EquipmentLevel } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVELS: { id: ExperienceLevel; label: string; sub: string; emoji: string; color: string }[] = [
  { id: 'beginner',     label: 'Beginner',     sub: '0 – 1 year training',  emoji: '🌱', color: '#8B9467' },
  { id: 'intermediate', label: 'Intermediate', sub: '1 – 3 years training',  emoji: '💪', color: '#576038' },
  { id: 'advanced',     label: 'Advanced',     sub: '3+ years training',     emoji: '🏆', color: '#3E4528' },
];

const GOALS = [
  { id: 'Build Muscle',           emoji: '💪', color: '#576038' },
  { id: 'Lose Fat',               emoji: '🔥', color: '#974400' },
  { id: 'Build Strength',         emoji: '🏋️', color: '#3E4528' },
  { id: 'Athletic Performance',   emoji: '⚡', color: '#8B5CF6' },
];

const EQUIPMENT: { id: EquipmentLevel; label: string; sub: string; emoji: string }[] = [
  { id: 'full_gym',   label: 'Full Gym',      sub: 'Barbells, cables, machines',  emoji: '🏋️' },
  { id: 'dumbbells',  label: 'Dumbbells',     sub: 'Dumbbells & cables only',      emoji: '🔩' },
  { id: 'bodyweight', label: 'Bodyweight',    sub: 'No equipment needed',          emoji: '🤸' },
];

const DAYS_OPTIONS = [3, 4, 5, 6];

const PHASE_COLORS = ['#576038', '#974400', '#3E4528'];

// ── Wizard ────────────────────────────────────────────────────────────────────

interface WizardState {
  level: ExperienceLevel | null;
  goal: string | null;
  daysPerWeek: number;
  equipment: EquipmentLevel | null;
  injuries: string;
}

const INITIAL_WIZARD: WizardState = {
  level: null,
  goal: null,
  daysPerWeek: 4,
  equipment: null,
  injuries: '',
};

// ── Step indicator ────────────────────────────────────────────────────────────

const StepDots: React.FC<{ total: number; current: number }> = ({ total, current }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        height: 4, borderRadius: 4,
        width: i === current ? 20 : 8,
        background: i <= current ? '#576038' : 'rgba(87,96,56,0.18)',
        transition: 'all 0.3s ease',
      }} />
    ))}
  </div>
);

// ── Selection Card ────────────────────────────────────────────────────────────

const SelectCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  sub?: string;
  color?: string;
}> = ({ selected, onClick, emoji, label, sub, color = '#576038' }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', padding: '16px 18px', borderRadius: 16, textAlign: 'left',
      border: selected ? `2px solid ${color}` : '2px solid rgba(87,96,56,0.12)',
      background: selected ? `${color}12` : 'var(--bg-card)',
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
      transition: 'all 0.18s ease',
      boxShadow: selected ? `0 4px 16px ${color}20` : '0 1px 4px rgba(0,0,0,0.04)',
    }}
  >
    <div style={{
      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
      background: selected ? `${color}18` : 'rgba(87,96,56,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.4rem',
    }}>
      {emoji}
    </div>
    <div>
      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: selected ? color : 'var(--text-primary)' }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>
      )}
    </div>
    {selected && (
      <div style={{
        marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%',
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
      </div>
    )}
  </button>
);

// ── Day Card (results) ────────────────────────────────────────────────────────

const SessionCard: React.FC<{ dayData: AIProgramDay; phaseColor: string }> = ({ dayData, phaseColor }) => {
  const [open, setOpen] = useState(false);

  if (dayData.isRest) {
    return (
      <div style={{
        padding: '12px 16px', borderRadius: 12,
        background: 'rgba(87,96,56,0.04)',
        border: '1px solid rgba(87,96,56,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ fontSize: '1rem' }}>😴</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>{dayData.day}</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(26,26,26,0.35)' }}>Rest / Active Recovery</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      border: '1px solid rgba(87,96,56,0.10)',
      background: 'var(--bg-card)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '13px 16px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: phaseColor, flexShrink: 0,
          }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              {dayData.day}
            </div>
            <div style={{ fontSize: '0.71rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
              {dayData.name}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>
            {dayData.exercises.length} exercises
          </span>
          {open ? <ChevronUp size={14} color="#999" /> : <ChevronDown size={14} color="#999" />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(87,96,56,0.07)' }}>
          {dayData.exercises.map((ex, i) => (
            <div key={i} style={{
              padding: '10px 0',
              borderBottom: i < dayData.exercises.length - 1 ? '1px solid rgba(87,96,56,0.06)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)', flex: 1 }}>
                  {ex.name}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                  {[
                    { val: `${ex.sets} sets`, bg: `${phaseColor}15`, col: phaseColor },
                    { val: ex.reps, bg: 'rgba(87,96,56,0.08)', col: '#576038' },
                  ].map(({ val, bg, col }) => (
                    <span key={val} style={{
                      fontSize: '0.68rem', fontWeight: 700, color: col,
                      background: bg, padding: '2px 8px', borderRadius: 20,
                    }}>
                      {val}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                  <Clock size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                  {ex.rest}
                </span>
              </div>
              {ex.notes && (
                <div style={{
                  marginTop: 6, padding: '6px 10px', borderRadius: 8,
                  background: 'rgba(87,96,56,0.05)', borderLeft: `3px solid ${phaseColor}`,
                  fontSize: '0.72rem', color: 'var(--text-tertiary)', lineHeight: 1.5,
                }}>
                  {ex.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Macro Circle ──────────────────────────────────────────────────────────────

const MacroCircle: React.FC<{ label: string; value: number; unit: string; color: string }> = ({ label, value, unit, color }) => (
  <div style={{
    flex: 1, padding: '14px 10px', borderRadius: 14, textAlign: 'center',
    background: `${color}0D`, border: `1.5px solid ${color}25`,
  }}>
    <div style={{ fontSize: '1.3rem', fontWeight: 900, color, lineHeight: 1 }}>
      {value}
    </div>
    <div style={{ fontSize: '0.62rem', fontWeight: 700, color, opacity: 0.7, marginTop: 2 }}>{unit}</div>
    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export const AIProgram: React.FC = () => {
  const navigate = useNavigate();
  const { state, saveAIProgram, deleteAIProgram, showToast } = useApp();

  const existingProgram = state.aiPrograms[0] ?? null;

  const [view, setView] = useState<'wizard' | 'generating' | 'results'>(
    existingProgram ? 'results' : 'wizard'
  );
  const [step, setStep] = useState(0);
  const [wizard, setWizard] = useState<WizardState>(INITIAL_WIZARD);
  const [generating, setGenerating] = useState(false);
  const [activeProgram, setActiveProgram] = useState<AIProgramData | null>(existingProgram);

  // Results tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'training' | 'nutrition'>('overview');
  const [activePhase, setActivePhase] = useState(0);

  const totalSteps = 5;

  const canAdvance = useCallback(() => {
    if (step === 0) return wizard.level !== null;
    if (step === 1) return wizard.goal !== null;
    if (step === 2) return true; // days always has a default
    if (step === 3) return wizard.equipment !== null;
    return true; // step 4 = injuries, optional
  }, [step, wizard]);

  const handleGenerate = useCallback(async () => {
    if (!wizard.level || !wizard.goal || !wizard.equipment) return;
    const key = localStorage.getItem('bbc_gemini_api_key') ?? localStorage.getItem('bbc_claude_api_key');
    if (!key?.trim()) {
      showToast('Add a Gemini API key in Settings → AI Coach first', 'error');
      return;
    }
    setView('generating');
    setGenerating(true);
    try {
      const q: ProgramQuestionnaire = {
        level: wizard.level,
        goal: wizard.goal,
        daysPerWeek: wizard.daysPerWeek,
        equipment: wizard.equipment,
        injuries: wizard.injuries,
        weightKg: state.user?.weight ?? 75,
        calories: state.user?.targets.calories ?? 2200,
        protein: state.user?.targets.protein ?? 150,
      };
      const program = await generateAIProgram(q);
      saveAIProgram(program);
      setActiveProgram(program);
      setActiveTab('overview');
      setActivePhase(0);
      setView('results');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Generation failed. Try again.', 'error');
      setView('wizard');
    } finally {
      setGenerating(false);
    }
  }, [wizard, state.user, saveAIProgram, showToast]);

  const handleRegenerate = () => {
    setWizard(INITIAL_WIZARD);
    setStep(0);
    setView('wizard');
    setActiveProgram(null);
  };

  const handleDelete = () => {
    if (activeProgram) deleteAIProgram(activeProgram.id);
    setActiveProgram(null);
    setWizard(INITIAL_WIZARD);
    setStep(0);
    setView('wizard');
    showToast('Program deleted', 'info');
  };

  // ── Generating screen ──────────────────────────────────────────────────────

  if (view === 'generating') {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', padding: '2rem',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #576038, #8B9467)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
          boxShadow: '0 8px 32px rgba(87,96,56,0.30)',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <Sparkles size={32} color="#fff" />
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
          Building your 12-week program
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6, maxWidth: 260 }}>
          AI is designing your personalised training & nutrition plan. This takes ~15–20 seconds…
        </div>
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
          {['Analysing your profile…', 'Designing 3 progressive phases…', 'Calculating nutrition targets…', 'Writing coaching cues…'].map((msg, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              opacity: generating ? 1 : 0.4,
              animation: `fadeInUp 0.5s ease ${i * 0.3}s both`,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'linear-gradient(135deg, #576038, #8B9467)',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{msg}</span>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.7; transform:scale(0.96); } }
          @keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        `}</style>
      </div>
    );
  }

  // ── Results screen ─────────────────────────────────────────────────────────

  if (view === 'results' && activeProgram) {
    const phase = activeProgram.phases[activePhase];
    const nutPhase = activeProgram.nutrition.phases[activePhase];
    const phaseColor = PHASE_COLORS[activePhase] ?? '#576038';

    const levelConf = LEVELS.find(l => l.id === activeProgram.level) ?? LEVELS[0];

    return (
      <div className="animate-fade-in" style={{ paddingBottom: 120 }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 64, zIndex: 40,
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(87,96,56,0.08)',
          padding: '14px 20px',
        }}>
          <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#576038' }}
            >
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeProgram.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                12 weeks · {activeProgram.daysPerWeek}×/week
              </div>
            </div>
            <button
              onClick={handleRegenerate}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 20,
                border: '1.5px solid rgba(87,96,56,0.22)',
                background: 'transparent', color: '#576038',
                fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} /> New
            </button>
          </div>
        </div>

        <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

          {/* Hero card */}
          <div style={{
            borderRadius: 22, padding: '22px 20px', marginBottom: 20,
            background: 'linear-gradient(135deg, #576038, #8B9467)',
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(255,255,255,0.10) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.14em',
                  textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)',
                  padding: '3px 10px', borderRadius: 20,
                }}>
                  {levelConf.emoji} {levelConf.label}
                </span>
                <span style={{
                  fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.14em',
                  textTransform: 'uppercase', background: 'rgba(255,255,255,0.15)',
                  padding: '3px 10px', borderRadius: 20,
                }}>
                  {activeProgram.goal}
                </span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1.3, marginBottom: 12 }}>
                {activeProgram.name}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.85, lineHeight: 1.6 }}>
                {activeProgram.overview}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                {[
                  { label: 'Phases', val: '3' },
                  { label: 'Weeks',  val: '12' },
                  { label: 'Days/week', val: String(activeProgram.daysPerWeek) },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{val}</div>
                    <div style={{ fontSize: '0.62rem', opacity: 0.7 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(87,96,56,0.07)', borderRadius: 12, padding: 4 }}>
            {([
              { id: 'overview',  label: 'Overview',  Icon: Target },
              { id: 'training',  label: 'Training',  Icon: Dumbbell },
              { id: 'nutrition', label: 'Nutrition', Icon: Utensils },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 9, border: 'none',
                  background: activeTab === id ? 'var(--bg-card)' : 'transparent',
                  fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer',
                  color: activeTab === id ? '#576038' : 'var(--text-tertiary)',
                  boxShadow: activeTab === id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <Icon size={13} strokeWidth={2.2} />{label}
              </button>
            ))}
          </div>

          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.32)' }}>
                Programme Phases
              </div>
              {activeProgram.phases.map((ph, i) => (
                <div
                  key={i}
                  onClick={() => { setActivePhase(i); setActiveTab('training'); }}
                  style={{
                    borderRadius: 16, padding: '16px 18px',
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(87,96,56,0.08)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `${PHASE_COLORS[i]}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', fontWeight: 900, color: PHASE_COLORS[i],
                  }}>
                    {ph.phase}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {ph.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      Weeks {ph.weeks} · {ph.focus}
                    </div>
                  </div>
                  <ChevronRight size={15} color="#ccc" />
                </div>
              ))}

              {/* Key principles */}
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.32)', marginBottom: 12 }}>
                  Key Principles
                </div>
                <div style={{
                  background: 'var(--bg-card)', borderRadius: 16,
                  border: '1px solid rgba(87,96,56,0.08)', overflow: 'hidden',
                }}>
                  {activeProgram.nutrition.keyPrinciples.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px',
                      borderBottom: i < activeProgram.nutrition.keyPrinciples.length - 1
                        ? '1px solid rgba(87,96,56,0.06)' : 'none',
                    }}>
                      <Zap size={14} color="#8B9467" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={handleDelete}
                style={{
                  marginTop: 8, width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                  background: 'rgba(180,40,40,0.07)', color: '#c53030',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Trash2 size={14} /> Delete Program
              </button>
            </div>
          )}

          {/* ── Training Tab ── */}
          {activeTab === 'training' && (
            <div>
              {/* Phase selector */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                {activeProgram.phases.map((ph, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhase(i)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none',
                      background: activePhase === i ? PHASE_COLORS[i] : 'rgba(87,96,56,0.08)',
                      color: activePhase === i ? '#fff' : 'var(--text-tertiary)',
                      fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Phase {ph.phase}
                  </button>
                ))}
              </div>

              {/* Phase info */}
              <div style={{
                borderRadius: 14, padding: '14px 16px', marginBottom: 16,
                background: `${phaseColor}08`,
                border: `1.5px solid ${phaseColor}20`,
              }}>
                <div style={{ fontWeight: 900, fontSize: '0.9rem', color: phaseColor, marginBottom: 4 }}>
                  {phase.name} · Weeks {phase.weeks}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 8 }}>
                  {phase.focus}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <Trophy size={12} color={phaseColor} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: '0.73rem', fontWeight: 600, color: phaseColor, lineHeight: 1.5 }}>
                    {phase.progressionNote}
                  </span>
                </div>
              </div>

              {/* Weekly schedule */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {phase.weeklySchedule.map((day, i) => (
                  <SessionCard key={i} dayData={day} phaseColor={phaseColor} />
                ))}
              </div>
            </div>
          )}

          {/* ── Nutrition Tab ── */}
          {activeTab === 'nutrition' && (
            <div>
              {/* Phase selector */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                {activeProgram.phases.map((ph, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhase(i)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none',
                      background: activePhase === i ? PHASE_COLORS[i] : 'rgba(87,96,56,0.08)',
                      color: activePhase === i ? '#fff' : 'var(--text-tertiary)',
                      fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Phase {ph.phase}
                  </button>
                ))}
              </div>

              {nutPhase && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Macro targets */}
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.32)', marginBottom: 10 }}>
                      Daily Targets — {nutPhase.name}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <MacroCircle label="Calories" value={nutPhase.calories} unit="kcal" color="#974400" />
                      <MacroCircle label="Protein"  value={nutPhase.protein}  unit="g"    color="#576038" />
                      <MacroCircle label="Carbs"    value={nutPhase.carbs}    unit="g"    color="#8B9467" />
                      <MacroCircle label="Fats"     value={nutPhase.fats}     unit="g"    color="#3E4528" />
                    </div>
                  </div>

                  {/* Focus */}
                  <div style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: `${phaseColor}08`, borderLeft: `3px solid ${phaseColor}`,
                  }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 900, color: phaseColor, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>
                      Phase Focus
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {nutPhase.focus}
                    </div>
                  </div>

                  {/* Tips */}
                  {nutPhase.tips?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.32)', marginBottom: 10 }}>
                        Nutrition Tips
                      </div>
                      <div style={{
                        background: 'var(--bg-card)', borderRadius: 14,
                        border: '1px solid rgba(87,96,56,0.08)', overflow: 'hidden',
                      }}>
                        {nutPhase.tips.map((tip, i) => (
                          <div key={i} style={{
                            display: 'flex', gap: 12, padding: '11px 14px', alignItems: 'flex-start',
                            borderBottom: i < nutPhase.tips.length - 1 ? '1px solid rgba(87,96,56,0.06)' : 'none',
                          }}>
                            <BookOpen size={13} color="#8B9467" style={{ flexShrink: 0, marginTop: 1 }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meal timing */}
                  {activeProgram.nutrition.mealTiming?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.32)', marginBottom: 10 }}>
                        Meal Timing
                      </div>
                      <div style={{
                        background: 'var(--bg-card)', borderRadius: 14,
                        border: '1px solid rgba(87,96,56,0.08)', overflow: 'hidden',
                      }}>
                        {activeProgram.nutrition.mealTiming.map((t, i) => (
                          <div key={i} style={{
                            display: 'flex', gap: 12, padding: '11px 14px', alignItems: 'flex-start',
                            borderBottom: i < activeProgram.nutrition.mealTiming.length - 1 ? '1px solid rgba(87,96,56,0.06)' : 'none',
                          }}>
                            <Clock size={13} color="#576038" style={{ flexShrink: 0, marginTop: 1 }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nutrition overview */}
                  <div style={{
                    padding: '14px 16px', borderRadius: 14,
                    background: 'rgba(87,96,56,0.05)',
                    border: '1px solid rgba(87,96,56,0.10)',
                  }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.32)', marginBottom: 8 }}>
                      Nutrition Philosophy
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {activeProgram.nutrition.overview}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Wizard screen ──────────────────────────────────────────────────────────

  const stepTitles = [
    "What's your experience level?",
    'What is your primary goal?',
    'How many days can you train?',
    'What equipment do you have?',
    'Any injuries or limitations?',
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 64, zIndex: 40,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(87,96,56,0.08)',
        padding: '14px 20px',
      }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={step === 0 ? () => navigate('/') : () => setStep(s => s - 1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#576038' }}
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              AI Program Builder
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
              Step {step + 1} of {totalSteps}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '28px 16px', maxWidth: 480, margin: '0 auto' }}>
        <StepDots total={totalSteps} current={step} />

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 6 }}>
            {stepTitles[step]}
          </h2>
          {step === 4 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Optional — skip if none
            </p>
          )}
        </div>

        {/* Step 0 — Level */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {LEVELS.map(l => (
              <SelectCard
                key={l.id}
                selected={wizard.level === l.id}
                onClick={() => setWizard(w => ({ ...w, level: l.id }))}
                emoji={l.emoji}
                label={l.label}
                sub={l.sub}
                color={l.color}
              />
            ))}
          </div>
        )}

        {/* Step 1 — Goal */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {GOALS.map(g => (
              <SelectCard
                key={g.id}
                selected={wizard.goal === g.id}
                onClick={() => setWizard(w => ({ ...w, goal: g.id }))}
                emoji={g.emoji}
                label={g.id}
                color={g.color}
              />
            ))}
          </div>
        )}

        {/* Step 2 — Days */}
        {step === 2 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {DAYS_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setWizard(w => ({ ...w, daysPerWeek: d }))}
                  style={{
                    padding: '22px 16px', borderRadius: 16,
                    border: wizard.daysPerWeek === d
                      ? '2px solid #576038' : '2px solid rgba(87,96,56,0.12)',
                    background: wizard.daysPerWeek === d ? 'rgba(87,96,56,0.08)' : 'var(--bg-card)',
                    cursor: 'pointer', transition: 'all 0.18s',
                  } as React.CSSProperties}
                >
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: wizard.daysPerWeek === d ? '#576038' : 'var(--text-primary)', lineHeight: 1 }}>
                    {d}
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    days/week
                  </div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(87,96,56,0.05)', fontSize: '0.76rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              {wizard.daysPerWeek <= 3
                ? '3 days — ideal for beginners. Full body sessions with max recovery.'
                : wizard.daysPerWeek === 4
                ? '4 days — the sweet spot. Upper/lower or Push/Pull/Rest/Legs split.'
                : wizard.daysPerWeek === 5
                ? '5 days — advanced split. High volume with dedicated muscle groups.'
                : '6 days — high frequency. PPL or similar. Requires strong recovery.'}
            </div>
          </div>
        )}

        {/* Step 3 — Equipment */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {EQUIPMENT.map(eq => (
              <SelectCard
                key={eq.id}
                selected={wizard.equipment === eq.id}
                onClick={() => setWizard(w => ({ ...w, equipment: eq.id }))}
                emoji={eq.emoji}
                label={eq.label}
                sub={eq.sub}
              />
            ))}
          </div>
        )}

        {/* Step 4 — Injuries */}
        {step === 4 && (
          <div>
            <textarea
              value={wizard.injuries}
              onChange={e => setWizard(w => ({ ...w, injuries: e.target.value }))}
              placeholder="e.g. Lower back issues — avoid heavy deadlifts. Bad left knee."
              rows={4}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14,
                border: '1.5px solid rgba(87,96,56,0.18)',
                background: 'var(--bg-card)',
                fontSize: '0.88rem', color: 'var(--text-primary)',
                resize: 'none', outline: 'none', lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ marginTop: 10, fontSize: '0.74rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              The AI will use this to replace unsafe exercises and add appropriate modifications.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ marginTop: 32, display: 'flex', gap: 10 }}>
          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              style={{
                flex: 1, padding: '15px', borderRadius: 14, border: 'none',
                background: canAdvance()
                  ? 'linear-gradient(135deg, #576038, #8B9467)'
                  : 'rgba(87,96,56,0.25)',
                color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                cursor: canAdvance() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              Continue <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canAdvance()}
              style={{
                flex: 1, padding: '15px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #576038, #8B9467)',
                color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 6px 24px rgba(87,96,56,0.35)',
              }}
            >
              <Sparkles size={18} /> Build My Program
            </button>
          )}
        </div>

        {/* Summary preview (last step) */}
        {step === totalSteps - 1 && (
          <div style={{
            marginTop: 20, padding: '14px 16px', borderRadius: 14,
            background: 'rgba(87,96,56,0.05)', border: '1px solid rgba(87,96,56,0.12)',
          }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 10 }}>
              Your Program
            </div>
            {[
              { label: 'Level',     val: wizard.level ?? '—' },
              { label: 'Goal',      val: wizard.goal ?? '—' },
              { label: 'Days/week', val: String(wizard.daysPerWeek) },
              { label: 'Equipment', val: wizard.equipment === 'full_gym' ? 'Full Gym' : wizard.equipment === 'dumbbells' ? 'Dumbbells' : 'Bodyweight' },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(87,96,56,0.07)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 800, textTransform: 'capitalize' }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
