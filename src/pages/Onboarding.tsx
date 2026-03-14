import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateTargets } from '../utils/macroEngine';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

// ── Selection Card ─────────────────────────────────────────────────────────────
const SelectionCard = ({ title, desc, emoji, selected, onClick }: {
  title: string;
  desc?: string;
  emoji?: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    style={{
      padding: '0.875rem 1.125rem',
      cursor: 'pointer',
      boxShadow: selected
        ? 'inset 0 0 0 2px rgba(255,255,255,0.8)'
        : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
      backgroundColor: selected ? 'rgba(255,255,255,0.05)' : 'var(--bg-card)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.875rem',
      transition: 'box-shadow 0.15s ease, background-color 0.15s ease',
    }}
  >
    {emoji && (
      <span style={{ fontSize: '1.375rem', lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
    )}

    <div className="flex-col" style={{ flex: 1, gap: '2px' }}>
      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{title}</span>
      {desc && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{desc}</span>
      )}
    </div>

    {/* Check indicator */}
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      backgroundColor: selected ? '#FFFFFF' : 'transparent',
      boxShadow: selected ? 'none' : 'inset 0 0 0 1.5px rgba(255,255,255,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background-color 0.15s ease',
    }}>
      {selected && <Check size={13} color="#000000" strokeWidth={2.5} />}
    </div>
  </div>
);

// ── Field Label ────────────────────────────────────────────────────────────────
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--text-tertiary)', display: 'block',
    marginBottom: '0.375rem',
  }}>
    {children}
  </span>
);

// ── Text Input ────────────────────────────────────────────────────────────────
const FieldInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    style={{
      width: '100%', padding: '0.875rem 1rem',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--bg-input)',
      color: 'var(--text-primary)', fontSize: '0.9375rem',
      transition: 'border-color 0.2s',
      ...props.style,
    }}
  />
);

// ── Select ────────────────────────────────────────────────────────────────────
const FieldSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }> = ({ children, ...props }) => (
  <select
    {...props}
    style={{
      width: '100%', padding: '0.875rem 1rem',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--bg-card)',
      color: 'var(--text-primary)', fontSize: '0.9375rem',
      appearance: 'none', WebkitAppearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.3)' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 1rem center',
      ...props.style,
    }}
  >
    {children}
  </select>
);

// ── Main Onboarding Component ─────────────────────────────────────────────────
export const Onboarding: React.FC = () => {
  const { updateUser, setAssignedProgram } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    name: '',
    age: '', sex: 'female', height: '', weight: '', goalWeight: '', bodyFat: '',
    goalType: 'fat_loss',
    activityLevel: 'moderately_active',
    trainingFrequency: '3', stepsTarget: '8000', preferredDietSpeed: 'moderate',
  });

  const set = (key: string, val: string) => setFormData(p => ({ ...p, [key]: val }));

  const canProceed = () => {
    if (step === 1) return formData.name.length > 0;
    if (step === 2) return !!(formData.age && formData.height && formData.weight && formData.goalWeight);
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(s => s + 1);
    else finish();
  };

  const finish = () => {
    const profile = {
      id: `user-${Date.now()}`,
      name: formData.name,
      age: parseInt(formData.age),
      sex: formData.sex as 'male' | 'female',
      height: parseFloat(formData.height),
      weight: parseFloat(formData.weight),
      goalWeight: formData.goalWeight ? parseFloat(formData.goalWeight) : undefined,
      bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined,
      goalType: formData.goalType as any,
      activityLevel: formData.activityLevel as any,
      trainingFrequency: parseInt(formData.trainingFrequency) || 3,
      stepsTarget: parseInt(formData.stepsTarget) || 8000,
      preferredDietSpeed: formData.preferredDietSpeed as any,
      onboarded: true,
    };
    const targets = calculateTargets(profile);
    updateUser({ ...profile, targets });
    setAssignedProgram(profile.sex === 'male' ? 'male_phase2' : 'female_phase1');
    navigate('/');
  };

  // ── Step content ──────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="flex-col gap-8 animate-fade-in">
          {/* Branded splash */}
          <div className="flex-col align-center" style={{ paddingTop: '1.5rem', gap: '1rem' }}>
            <div style={{
              width: 72, height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            }}>
              💪
            </div>
            <div className="flex-col align-center" style={{ gap: '0.375rem' }}>
              <span style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Body Blueprint</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Your personal coach. Built around you.</span>
            </div>
          </div>

          <div className="flex-col" style={{ gap: '0.375rem' }}>
            <FieldLabel>What should we call you?</FieldLabel>
            <FieldInput
              autoFocus
              type="text"
              placeholder="e.g. Alex"
              value={formData.name}
              onChange={e => set('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canProceed() && handleNext()}
              style={{ fontSize: '1.125rem' }}
            />
          </div>
        </div>
      );

      case 2: return (
        <div className="flex-col gap-5 animate-fade-in">
          <div className="flex-col gap-2">
            <h1 className="text-h1">Your Metrics</h1>
            <p className="text-subtitle">Accurate data for precise metabolic calculations.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <FieldLabel>Age</FieldLabel>
              <FieldInput type="number" placeholder="30" inputMode="numeric" value={formData.age} onChange={e => set('age', e.target.value)} onKeyDown={e => e.key === 'Enter' && canProceed() && handleNext()} />
            </div>
            <div>
              <FieldLabel>Biological sex</FieldLabel>
              <FieldSelect value={formData.sex} onChange={e => set('sex', e.target.value)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </FieldSelect>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <FieldLabel>Height (cm)</FieldLabel>
              <FieldInput type="number" placeholder="175" inputMode="decimal" value={formData.height} onChange={e => set('height', e.target.value)} onKeyDown={e => e.key === 'Enter' && canProceed() && handleNext()} />
            </div>
            <div>
              <FieldLabel>Current weight (kg)</FieldLabel>
              <FieldInput type="number" placeholder="75" inputMode="decimal" value={formData.weight} onChange={e => set('weight', e.target.value)} onKeyDown={e => e.key === 'Enter' && canProceed() && handleNext()} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <FieldLabel>Goal weight (kg)</FieldLabel>
              <FieldInput type="number" placeholder="70" inputMode="decimal" value={formData.goalWeight} onChange={e => set('goalWeight', e.target.value)} onKeyDown={e => e.key === 'Enter' && canProceed() && handleNext()} />
            </div>
            <div>
              <FieldLabel>Body fat % <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, opacity: 0.6 }}>(optional)</span></FieldLabel>
              <FieldInput type="number" placeholder="15" inputMode="decimal" value={formData.bodyFat} onChange={e => set('bodyFat', e.target.value)} onKeyDown={e => e.key === 'Enter' && canProceed() && handleNext()} />
            </div>
          </div>
        </div>
      );

      case 3: return (
        <div className="flex-col gap-5 animate-fade-in">
          <div className="flex-col gap-2">
            <h1 className="text-h1">Primary Goal</h1>
            <p className="text-subtitle">This shapes your calorie and macro targets.</p>
          </div>
          <div className="flex-col gap-2">
            <SelectionCard emoji="🔥" title="Fat Loss" desc="Caloric deficit to reduce body fat" selected={formData.goalType === 'fat_loss'} onClick={() => set('goalType', 'fat_loss')} />
            <SelectionCard emoji="💪" title="Muscle Gain" desc="Caloric surplus to build lean mass" selected={formData.goalType === 'muscle_gain'} onClick={() => set('goalType', 'muscle_gain')} />
            <SelectionCard emoji="⚖️" title="Maintenance" desc="Sustain current body composition" selected={formData.goalType === 'maintenance'} onClick={() => set('goalType', 'maintenance')} />
            <SelectionCard emoji="🔄" title="Recomposition" desc="Lose fat and build muscle simultaneously" selected={formData.goalType === 'recomposition'} onClick={() => set('goalType', 'recomposition')} />
          </div>
        </div>
      );

      case 4: return (
        <div className="flex-col gap-5 animate-fade-in">
          <div className="flex-col gap-2">
            <h1 className="text-h1">Activity Level</h1>
            <p className="text-subtitle">How much do you move on a typical week?</p>
          </div>

          <div className="flex-col gap-2">
            <SelectionCard emoji="🪑" title="Sedentary" desc="Desk job, little to no exercise" selected={formData.activityLevel === 'sedentary'} onClick={() => set('activityLevel', 'sedentary')} />
            <SelectionCard emoji="🚶" title="Lightly Active" desc="1–3 days of light exercise" selected={formData.activityLevel === 'lightly_active'} onClick={() => set('activityLevel', 'lightly_active')} />
            <SelectionCard emoji="🏃" title="Moderately Active" desc="3–5 days of moderate exercise" selected={formData.activityLevel === 'moderately_active'} onClick={() => set('activityLevel', 'moderately_active')} />
            <SelectionCard emoji="🏋️" title="Very Active" desc="6–7 days of hard training" selected={formData.activityLevel === 'very_active'} onClick={() => set('activityLevel', 'very_active')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <FieldLabel>Training days / week</FieldLabel>
              <FieldInput type="number" placeholder="4" min="0" max="7" inputMode="numeric" value={formData.trainingFrequency} onChange={e => set('trainingFrequency', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNext()} />
            </div>
            <div>
              <FieldLabel>Daily step target</FieldLabel>
              <FieldInput type="number" placeholder="8000" inputMode="numeric" value={formData.stepsTarget} onChange={e => set('stepsTarget', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNext()} />
            </div>
          </div>

          <div>
            <FieldLabel>Diet pacing</FieldLabel>
            <FieldSelect value={formData.preferredDietSpeed} onChange={e => set('preferredDietSpeed', e.target.value)}>
              <option value="sustainable">Sustainable — slower, easier to maintain</option>
              <option value="moderate">Moderate — recommended balance</option>
              <option value="aggressive">Aggressive — faster, more demanding</option>
            </FieldSelect>
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="flex-col animate-fade-in" style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)' }}>

      {/* Progress Header */}
      <div style={{ padding: '1.25rem 1.25rem 0.75rem' }}>
        <div className="flex-row align-center" style={{ gap: '0.875rem', marginBottom: '0.875rem' }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', padding: '0.5rem', display: 'flex', cursor: 'pointer', marginLeft: '-0.5rem' }}
            >
              <ArrowLeft size={22} />
            </button>
          ) : (
            <div style={{ width: 30 }} />
          )}
          <div className="flex-col" style={{ flex: 1 }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)' }}>
              Step {step} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Segmented progress bar */}
        <div className="flex-row gap-1" style={{ height: 3 }}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '100%',
                borderRadius: 99,
                backgroundColor: i < step ? 'var(--text-primary)' : 'rgba(255,255,255,0.1)',
                transition: 'background-color 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1rem 1.25rem', overflowY: 'auto' }}>
        {renderStep()}
      </div>

      {/* CTA Button */}
      <div style={{ padding: '1rem 1.25rem', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="btn-primary"
          style={{
            width: '100%',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
            padding: '0.9375rem',
            opacity: canProceed() ? 1 : 0.4,
            fontSize: '0.9375rem',
            borderRadius: 'var(--radius-full)',
          }}
        >
          {step === totalSteps ? 'Calculate My Targets' : 'Continue'}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
