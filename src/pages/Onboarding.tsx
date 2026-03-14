import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { calculateTargets } from '../utils/macroEngine';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

// ── Total step count (excluding calculating/plan screens) ─────────────────────
const FORM_STEPS = 7;
const STEP_CALCULATING = 8;
const STEP_PLAN = 9;

// ── Form data shape ────────────────────────────────────────────────────────────
interface FormData {
  name: string;
  goalType: string;
  sex: string;
  age: string;
  height: string;
  weight: string;
  heightUnit: 'cm' | 'ft';
  weightUnit: 'kg' | 'lbs';
  heightFt: string;
  heightIn: string;
  goalWeight: string;
  activityLevel: string;
  preferredDietSpeed: string;
  trainingFrequency: string;
  stepsTarget: string;
  bodyFat: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ftInToCm = (ft: string, inch: string): number => {
  const f = parseFloat(ft) || 0;
  const i = parseFloat(inch) || 0;
  return Math.round((f * 30.48) + (i * 2.54));
};
const lbsToKg = (lbs: string): number => Math.round(parseFloat(lbs) * 0.453592 * 10) / 10;

// ── Shared sub-components ─────────────────────────────────────────────────────

const StepHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div style={{ marginBottom: '1.75rem' }}>
    <h1 style={{
      fontFamily: 'var(--font-display)',
      fontSize: '1.75rem',
      fontWeight: 800,
      letterSpacing: '-0.025em',
      lineHeight: 1.1,
      color: 'var(--text-primary)',
      marginBottom: '0.5rem',
    }}>
      {title}
    </h1>
    <p style={{
      fontSize: '0.875rem',
      color: 'var(--text-secondary)',
      fontWeight: 400,
      lineHeight: 1.5,
    }}>
      {subtitle}
    </p>
  </div>
);

const BigSelectionCard: React.FC<{
  title: string;
  desc: string;
  emoji?: string;
  selected: boolean;
  accentColor?: string;
  onClick: () => void;
}> = ({ title, desc, emoji, selected, accentColor = 'rgba(255,255,255,0.9)', onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '1rem 1.125rem',
      cursor: 'pointer',
      borderRadius: 'var(--radius-lg)',
      border: selected
        ? `1.5px solid ${accentColor}`
        : '1px solid var(--border-color)',
      backgroundColor: selected ? 'rgba(255,255,255,0.04)' : 'var(--bg-card)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'border-color 0.15s ease, background-color 0.15s ease, transform 0.1s ease',
      boxShadow: selected
        ? `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 3px ${accentColor}22`
        : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      transform: selected ? 'scale(1.005)' : 'scale(1)',
    }}
  >
    {emoji && (
      <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0, width: 32, textAlign: 'center' }}>
        {emoji}
      </span>
    )}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        {title}
      </span>
      <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 400, lineHeight: 1.4 }}>
        {desc}
      </span>
    </div>
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      backgroundColor: selected ? accentColor : 'transparent',
      border: selected ? 'none' : '1.5px solid rgba(255,255,255,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background-color 0.15s ease',
    }}>
      {selected && <Check size={12} color="#000" strokeWidth={3} />}
    </div>
  </div>
);

const FloatingInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  suffix?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}> = ({ label, value, onChange, type = 'text', placeholder, inputMode, suffix, autoFocus, onEnter }) => {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div style={{ position: 'relative' }}>
      <label style={{
        position: 'absolute',
        left: '1rem',
        top: floated ? '0.45rem' : '50%',
        transform: floated ? 'none' : 'translateY(-50%)',
        fontSize: floated ? '0.625rem' : '0.875rem',
        fontWeight: floated ? 700 : 400,
        letterSpacing: floated ? '0.06em' : 0,
        textTransform: floated ? 'uppercase' : 'none',
        color: focused ? 'rgba(255,255,255,0.5)' : 'var(--text-tertiary)',
        pointerEvents: 'none',
        transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
        zIndex: 1,
      }}>
        {label}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        placeholder={floated ? placeholder : undefined}
        value={value}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        style={{
          width: '100%',
          paddingTop: floated ? '1.5rem' : '0.875rem',
          paddingBottom: '0.5rem',
          paddingLeft: '1rem',
          paddingRight: suffix ? '3rem' : '1rem',
          border: `1px solid ${focused ? 'var(--border-strong)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-primary)',
          fontSize: '1rem',
          fontWeight: 500,
          transition: 'border-color 0.2s ease',
          boxShadow: focused ? '0 0 0 3px rgba(255,255,255,0.04)' : 'none',
        }}
      />
      {suffix && (
        <span style={{
          position: 'absolute',
          right: '1rem',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '0.8rem',
          color: 'var(--text-tertiary)',
          fontWeight: 600,
          pointerEvents: 'none',
        }}>
          {suffix}
        </span>
      )}
    </div>
  );
};

const UnitToggle: React.FC<{
  options: string[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div style={{
    display: 'flex',
    gap: 2,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 'var(--radius-full)',
    padding: 2,
    border: '1px solid var(--border-subtle)',
  }}>
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          border: 'none',
          background: value === opt ? 'rgba(255,255,255,0.12)' : 'transparent',
          color: value === opt ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.03em',
          transition: 'all 0.15s ease',
          cursor: 'pointer',
        }}
      >
        {opt}
      </button>
    ))}
  </div>
);

// ── Main Onboarding Component ─────────────────────────────────────────────────
export const Onboarding: React.FC = () => {
  const { updateUser, setAssignedProgram } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [calcProgress, setCalcProgress] = useState(0);
  const [targets, setTargets] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    goalType: '',
    sex: '',
    age: '',
    height: '',
    weight: '',
    heightUnit: 'cm',
    weightUnit: 'kg',
    heightFt: '',
    heightIn: '',
    goalWeight: '',
    activityLevel: '',
    preferredDietSpeed: '',
    trainingFrequency: '3',
    stepsTarget: '8000',
    bodyFat: '',
  });

  const set = (key: keyof FormData, val: string) => setFormData(p => ({ ...p, [key]: val }));

  // Resolve height/weight to metric for calculations
  const resolvedHeightCm = (): number => {
    if (formData.heightUnit === 'ft') return ftInToCm(formData.heightFt, formData.heightIn);
    return parseFloat(formData.height) || 0;
  };
  const resolvedWeightKg = (): number => {
    if (formData.weightUnit === 'lbs') return lbsToKg(formData.weight);
    return parseFloat(formData.weight) || 0;
  };
  const resolvedGoalWeightKg = (): number => {
    if (formData.weightUnit === 'lbs') return lbsToKg(formData.goalWeight);
    return parseFloat(formData.goalWeight) || 0;
  };

  // ── Validation per step ──────────────────────────────────────────────────────
  const canProceed = (): boolean => {
    switch (step) {
      case 1: return true; // welcome — always can proceed
      case 2: return !!formData.goalType;
      case 3: return !!formData.sex;
      case 4: {
        const hasName = formData.name.trim().length > 0;
        const hasAge = parseInt(formData.age) > 0;
        const hasHeight = formData.heightUnit === 'ft'
          ? (parseFloat(formData.heightFt) > 0)
          : (parseFloat(formData.height) > 0);
        const hasWeight = parseFloat(formData.weight) > 0;
        return hasName && hasAge && hasHeight && hasWeight;
      }
      case 5: return parseFloat(formData.goalWeight) > 0;
      case 6: return !!formData.activityLevel;
      case 7: return !!formData.preferredDietSpeed;
      default: return true;
    }
  };

  const goNext = () => {
    if (!canProceed()) return;
    setDirection('forward');
    if (step < FORM_STEPS) {
      setStep(s => s + 1);
    } else if (step === FORM_STEPS) {
      setStep(STEP_CALCULATING);
    }
  };

  const goBack = () => {
    if (step <= 1) return;
    setDirection('back');
    if (step === STEP_CALCULATING || step === STEP_PLAN) {
      setStep(FORM_STEPS);
    } else {
      setStep(s => s - 1);
    }
  };

  // ── Calculating screen: fill progress bar then advance ─────────────────────
  useEffect(() => {
    if (step !== STEP_CALCULATING) return;

    // Build profile and compute targets immediately
    const heightCm = resolvedHeightCm();
    const weightKg = resolvedWeightKg();
    const goalWeightKg = resolvedGoalWeightKg();

    const profile = {
      id: `user-${Date.now()}`,
      name: formData.name,
      age: parseInt(formData.age),
      sex: formData.sex as 'male' | 'female',
      height: heightCm,
      weight: weightKg,
      goalWeight: goalWeightKg || undefined,
      bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined,
      goalType: formData.goalType as any,
      activityLevel: formData.activityLevel as any,
      trainingFrequency: parseInt(formData.trainingFrequency) || 3,
      stepsTarget: parseInt(formData.stepsTarget) || 8000,
      preferredDietSpeed: formData.preferredDietSpeed as any,
      onboarded: true,
    };

    const computed = calculateTargets(profile);
    setTargets(computed);

    // Animate progress bar over ~2s, then advance
    setCalcProgress(0);
    const startTime = Date.now();
    const duration = 2200;
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / duration, 1);
      // ease-out curve
      const eased = 1 - Math.pow(1 - pct, 3);
      setCalcProgress(eased);

      if (pct < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setStep(STEP_PLAN), 150);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Finish: persist and navigate ────────────────────────────────────────────
  const finish = () => {
    if (!targets) return;
    const heightCm = resolvedHeightCm();
    const weightKg = resolvedWeightKg();
    const goalWeightKg = resolvedGoalWeightKg();

    const profile = {
      id: `user-${Date.now()}`,
      name: formData.name,
      age: parseInt(formData.age),
      sex: formData.sex as 'male' | 'female',
      height: heightCm,
      weight: weightKg,
      goalWeight: goalWeightKg || undefined,
      bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined,
      goalType: formData.goalType as any,
      activityLevel: formData.activityLevel as any,
      trainingFrequency: parseInt(formData.trainingFrequency) || 3,
      stepsTarget: parseInt(formData.stepsTarget) || 8000,
      preferredDietSpeed: formData.preferredDietSpeed as any,
      onboarded: true,
      targets,
    };

    updateUser(profile);
    setAssignedProgram(profile.sex === 'male' ? 'male_phase2' : 'female_phase1');
    navigate('/');
  };

  // ── Goal weight delta copy ───────────────────────────────────────────────────
  const weightDeltaLabel = (): string | null => {
    const current = resolvedWeightKg();
    const goal = resolvedGoalWeightKg();
    if (!current || !goal) return null;
    const diff = Math.abs(goal - current);
    const unit = formData.weightUnit;
    const displayDiff = unit === 'lbs'
      ? `${Math.round(diff / 0.453592 * 10) / 10} lbs`
      : `${Math.round(diff * 10) / 10} kg`;
    if (goal < current) return `You want to lose ${displayDiff}`;
    if (goal > current) return `You want to gain ${displayDiff}`;
    return 'Maintain your current weight';
  };

  // ── Coaching summary copy ────────────────────────────────────────────────────
  const coachingCopy = (): string => {
    if (!targets) return '';
    const speed = formData.preferredDietSpeed;
    const goal = formData.goalType;

    if (goal === 'maintenance') return `Your maintenance calories are ${targets.calories} kcal/day. Stay consistent and your body composition will stabilize.`;
    if (goal === 'recomposition') return `At ${targets.calories} kcal/day with high protein, your body will slowly shift fat for muscle.`;

    const weeklyChangeKg = speed === 'aggressive' ? 0.75 : speed === 'moderate' ? 0.5 : 0.25;
    const weeklyChangeLbs = Math.round(weeklyChangeKg / 0.453592 * 10) / 10;
    const changeDisplay = formData.weightUnit === 'lbs' ? `${weeklyChangeLbs} lbs` : `${weeklyChangeKg} kg`;
    const verb = goal === 'fat_loss' ? 'lose' : 'gain';
    return `You'll ${verb} ~${changeDisplay}/week eating ${targets.calories} kcal/day. High protein keeps you strong throughout.`;
  };

  // ── Rendering ────────────────────────────────────────────────────────────────
  const showHeader = step >= 2 && step <= FORM_STEPS;
  const showFooter = step >= 1 && step <= FORM_STEPS;

  const renderContent = () => {
    switch (step) {
      // ── Step 1: Welcome ─────────────────────────────────────────────────────
      case 1: return (
        <div
          key="step-1"
          className="animate-slide-up"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem 1.5rem', textAlign: 'center', gap: '2rem' }}
        >
          {/* App icon */}
          <div style={{
            width: 88, height: 88,
            borderRadius: 24,
            background: 'linear-gradient(145deg, #1c1c2e 0%, #12121e 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            💪
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.4rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.0,
              color: 'var(--text-primary)',
            }}>
              Body Blueprint
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400, lineHeight: 1.5 }}>
              Your intelligent fitness coach
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 320 }}>
            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center' }}>
              {['Science-backed', 'Personalized', 'Built for results'].map(badge => (
                <span key={badge} style={{
                  padding: '0.25rem 0.625rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}>
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

      // ── Step 2: Goal ─────────────────────────────────────────────────────────
      case 2: return (
        <div key="step-2" className="animate-slide-up">
          <StepHeader title="What's your primary goal?" subtitle="This shapes your calorie and macro targets." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <BigSelectionCard emoji="🔥" title="Lose Fat" desc="Caloric deficit to reduce body fat while preserving muscle" selected={formData.goalType === 'fat_loss'} accentColor="#FF375F" onClick={() => set('goalType', 'fat_loss')} />
            <BigSelectionCard emoji="💪" title="Build Muscle" desc="Caloric surplus to grow lean mass and get stronger" selected={formData.goalType === 'muscle_gain'} accentColor="#0A84FF" onClick={() => set('goalType', 'muscle_gain')} />
            <BigSelectionCard emoji="⚖️" title="Maintain" desc="Sustain your current weight and body composition" selected={formData.goalType === 'maintenance'} accentColor="#32D74B" onClick={() => set('goalType', 'maintenance')} />
            <BigSelectionCard emoji="🔄" title="Recomposition" desc="Lose fat and build muscle at the same time" selected={formData.goalType === 'recomposition'} accentColor="#BF5AF2" onClick={() => set('goalType', 'recomposition')} />
          </div>
        </div>
      );

      // ── Step 3: Biological Sex ───────────────────────────────────────────────
      case 3: return (
        <div key="step-3" className="animate-slide-up">
          <StepHeader title="Biological sex" subtitle="Affects your metabolic rate, macro ratios, and calorie targets." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              onClick={() => set('sex', 'male')}
              style={{
                padding: '1.375rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: formData.sex === 'male' ? '1.5px solid #0A84FF' : '1px solid var(--border-color)',
                background: formData.sex === 'male'
                  ? 'linear-gradient(135deg, rgba(10,132,255,0.12) 0%, rgba(94,92,230,0.08) 100%)'
                  : 'var(--bg-card)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                boxShadow: formData.sex === 'male' ? '0 0 0 3px rgba(10,132,255,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.015em' }}>Male</span>
                <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Higher baseline metabolic rate</span>
              </div>
              <span style={{ fontSize: '2rem' }}>♂</span>
            </div>
            <div
              onClick={() => set('sex', 'female')}
              style={{
                padding: '1.375rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: formData.sex === 'female' ? '1.5px solid #BF5AF2' : '1px solid var(--border-color)',
                background: formData.sex === 'female'
                  ? 'linear-gradient(135deg, rgba(191,90,242,0.12) 0%, rgba(255,55,95,0.08) 100%)'
                  : 'var(--bg-card)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                boxShadow: formData.sex === 'female' ? '0 0 0 3px rgba(191,90,242,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.015em' }}>Female</span>
                <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Optimized hormonal & metabolic calculations</span>
              </div>
              <span style={{ fontSize: '2rem' }}>♀</span>
            </div>
          </div>
        </div>
      );

      // ── Step 4: Body Stats ───────────────────────────────────────────────────
      case 4: return (
        <div key="step-4" className="animate-slide-up">
          <StepHeader title="Your body stats" subtitle="Accurate numbers mean precise macro targets. You can update these anytime." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FloatingInput
              label="Name"
              value={formData.name}
              onChange={v => set('name', v)}
              placeholder="e.g. Alex"
              autoFocus
            />
            <FloatingInput
              label="Age"
              value={formData.age}
              onChange={v => set('age', v)}
              type="number"
              inputMode="numeric"
              placeholder="30"
            />

            {/* Height */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>Height</span>
                <UnitToggle
                  options={['cm', 'ft']}
                  value={formData.heightUnit}
                  onChange={v => set('heightUnit', v as 'cm' | 'ft')}
                />
              </div>
              {formData.heightUnit === 'cm' ? (
                <FloatingInput label="Height" value={formData.height} onChange={v => set('height', v)} type="number" inputMode="decimal" placeholder="175" suffix="cm" />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                  <FloatingInput label="Feet" value={formData.heightFt} onChange={v => set('heightFt', v)} type="number" inputMode="numeric" placeholder="5" suffix="ft" />
                  <FloatingInput label="Inches" value={formData.heightIn} onChange={v => set('heightIn', v)} type="number" inputMode="numeric" placeholder="9" suffix="in" />
                </div>
              )}
            </div>

            {/* Weight */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>Weight</span>
                <UnitToggle
                  options={['kg', 'lbs']}
                  value={formData.weightUnit}
                  onChange={v => set('weightUnit', v as 'kg' | 'lbs')}
                />
              </div>
              <FloatingInput
                label="Current weight"
                value={formData.weight}
                onChange={v => set('weight', v)}
                type="number"
                inputMode="decimal"
                placeholder={formData.weightUnit === 'kg' ? '75' : '165'}
                suffix={formData.weightUnit}
              />
            </div>
          </div>
        </div>
      );

      // ── Step 5: Goal Weight ──────────────────────────────────────────────────
      case 5: {
        const deltaLabel = weightDeltaLabel();
        return (
          <div key="step-5" className="animate-slide-up">
            <StepHeader title="Where do you want to be?" subtitle="Set your goal weight. This helps calculate realistic timelines." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FloatingInput
                label="Goal weight"
                value={formData.goalWeight}
                onChange={v => set('goalWeight', v)}
                type="number"
                inputMode="decimal"
                placeholder={formData.weightUnit === 'kg' ? '70' : '154'}
                suffix={formData.weightUnit}
                autoFocus
              />
              {deltaLabel && (
                <div style={{
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                }}>
                  <span style={{ fontSize: '1.125rem' }}>
                    {resolvedGoalWeightKg() < resolvedWeightKg() ? '📉' : resolvedGoalWeightKg() > resolvedWeightKg() ? '📈' : '⚖️'}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {deltaLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      }

      // ── Step 6: Activity Level ───────────────────────────────────────────────
      case 6: return (
        <div key="step-6" className="animate-slide-up">
          <StepHeader title="Activity level" subtitle="How much do you move in a typical week?" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <BigSelectionCard emoji="🪑" title="Sedentary" desc="Desk job, little or no exercise" selected={formData.activityLevel === 'sedentary'} onClick={() => set('activityLevel', 'sedentary')} />
            <BigSelectionCard emoji="🚶" title="Lightly Active" desc="Light exercise 1–3 days per week" selected={formData.activityLevel === 'lightly_active'} onClick={() => set('activityLevel', 'lightly_active')} />
            <BigSelectionCard emoji="🏃" title="Moderately Active" desc="Moderate exercise 3–5 days per week" selected={formData.activityLevel === 'moderately_active'} onClick={() => set('activityLevel', 'moderately_active')} />
            <BigSelectionCard emoji="🏋️" title="Very Active" desc="Hard training 6–7 days per week" selected={formData.activityLevel === 'very_active'} onClick={() => set('activityLevel', 'very_active')} />
          </div>
        </div>
      );

      // ── Step 7: Diet Approach ────────────────────────────────────────────────
      case 7: return (
        <div key="step-7" className="animate-slide-up">
          <StepHeader title="Diet approach" subtitle="How aggressively do you want to work toward your goal?" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <BigSelectionCard
              emoji="🌱"
              title="Sustainable"
              desc={formData.goalType === 'muscle_gain' ? '+150 kcal/day · ~0.25 kg/week' : '–250 kcal/day · ~0.25 kg/week'}
              selected={formData.preferredDietSpeed === 'sustainable'}
              accentColor="#32D74B"
              onClick={() => set('preferredDietSpeed', 'sustainable')}
            />
            <BigSelectionCard
              emoji="⚡"
              title="Moderate"
              desc={formData.goalType === 'muscle_gain' ? '+300 kcal/day · ~0.5 kg/week' : '–500 kcal/day · ~0.5 kg/week'}
              selected={formData.preferredDietSpeed === 'moderate'}
              accentColor="#FF9F0A"
              onClick={() => set('preferredDietSpeed', 'moderate')}
            />
            <BigSelectionCard
              emoji="🔥"
              title="Aggressive"
              desc={formData.goalType === 'muscle_gain' ? '+500 kcal/day · ~0.75 kg/week' : '–750 kcal/day · ~0.75 kg/week'}
              selected={formData.preferredDietSpeed === 'aggressive'}
              accentColor="#FF375F"
              onClick={() => set('preferredDietSpeed', 'aggressive')}
            />
          </div>
        </div>
      );

      // ── Step 8: Calculating ──────────────────────────────────────────────────
      case STEP_CALCULATING: return (
        <div
          key="step-calculating"
          className="animate-fade-in"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '2rem 1.5rem', textAlign: 'center' }}
        >
          {/* Spinning orb */}
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #0A84FF, #BF5AF2, #32D74B, #0A84FF)',
              animation: 'spin 1.2s linear infinite',
              opacity: 0.9,
            }} />
            <div style={{
              position: 'absolute', inset: 4,
              borderRadius: '50%',
              background: 'var(--bg-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem',
            }}>
              🧮
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.375rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}>
              Calculating your plan...
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Running metabolic calculations
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', maxWidth: 280 }}>
            <div style={{
              height: 4,
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${calcProgress * 100}%`,
                background: 'linear-gradient(90deg, #0A84FF, #BF5AF2)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.1s linear',
              }} />
            </div>
          </div>
        </div>
      );

      // ── Step 9: Your Plan ────────────────────────────────────────────────────
      case STEP_PLAN: return (
        <div
          key="step-plan"
          className="animate-slide-up"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem' }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.375rem' }}>
              Your personalized plan
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
              {formData.name ? `Ready, ${formData.name}.` : 'Your plan is ready.'}
            </h1>
          </div>

          {/* Calorie hero */}
          <div style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, rgba(10,132,255,0.15) 0%, rgba(94,92,230,0.1) 100%)',
            border: '1px solid rgba(10,132,255,0.2)',
            marginBottom: '1rem',
            textAlign: 'center',
            boxShadow: '0 0 32px rgba(10,132,255,0.1)',
          }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(10,132,255,0.8)', marginBottom: '0.375rem' }}>
              Daily Calorie Target
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.375rem' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '3.5rem',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {targets?.calories?.toLocaleString() ?? '—'}
              </span>
              <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>kcal</span>
            </div>
          </div>

          {/* Macro pills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
            {[
              { label: 'Protein', value: targets?.protein, unit: 'g', color: '#FF9F0A', bg: 'rgba(255,159,10,0.1)', border: 'rgba(255,159,10,0.2)' },
              { label: 'Carbs', value: targets?.carbs, unit: 'g', color: '#0A84FF', bg: 'rgba(10,132,255,0.1)', border: 'rgba(10,132,255,0.2)' },
              { label: 'Fats', value: targets?.fats, unit: 'g', color: '#32D74B', bg: 'rgba(50,215,75,0.1)', border: 'rgba(50,215,75,0.2)' },
            ].map(macro => (
              <div key={macro.label} style={{
                padding: '0.875rem 0.625rem',
                borderRadius: 'var(--radius-md)',
                background: macro.bg,
                border: `1px solid ${macro.border}`,
                textAlign: 'center',
                display: 'flex', flexDirection: 'column', gap: '0.2rem',
              }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: macro.color, opacity: 0.8 }}>
                  {macro.label}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {macro.value ?? '—'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{macro.unit}</span>
              </div>
            ))}
          </div>

          {/* Coaching insight */}
          <div style={{
            padding: '1rem 1.125rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '1.125rem', flexShrink: 0, marginTop: 1 }}>💡</span>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text-secondary)', lineHeight: 1.55, fontWeight: 400 }}>
              {coachingCopy()}
            </p>
          </div>
        </div>
      );

      default: return null;
    }
  };

  // ── Layout ───────────────────────────────────────────────────────────────────
  const isFullscreen = step === 1 || step === STEP_CALCULATING || step === STEP_PLAN;

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background glow — subtle depth */}
      <div style={{
        position: 'absolute',
        top: -120,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(94,92,230,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Header — progress bar + back button */}
      {showHeader && (
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
            <button
              onClick={goBack}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                padding: '0.5rem',
                display: 'flex',
                cursor: 'pointer',
                marginLeft: '-0.5rem',
                opacity: 0.7,
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)' }}>
              Step {step - 1} of {FORM_STEPS - 1}
            </span>
          </div>

          {/* Segmented progress bar */}
          <div style={{ display: 'flex', gap: 4, height: 3 }}>
            {Array.from({ length: FORM_STEPS - 1 }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '100%',
                  borderRadius: 99,
                  backgroundColor: i < step - 1 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.1)',
                  transition: 'background-color 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div
        ref={contentRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: isFullscreen ? 0 : '0.75rem 1.25rem 0',
          overflowY: 'auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {renderContent()}
      </div>

      {/* Footer CTA */}
      {showFooter && (
        <div style={{
          padding: '1rem 1.25rem',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
          position: 'relative',
          zIndex: 1,
        }}>
          <button
            onClick={goNext}
            disabled={!canProceed()}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: '#FFFFFF',
              color: '#000000',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              fontWeight: 800,
              fontSize: '0.9375rem',
              letterSpacing: '-0.01em',
              opacity: canProceed() ? 1 : 0.35,
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              transition: 'transform 0.12s ease, opacity 0.15s ease',
            }}
            onMouseDown={e => { if (canProceed()) (e.currentTarget.style.transform = 'scale(0.97)'); }}
            onMouseUp={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
            onTouchStart={e => { if (canProceed()) (e.currentTarget.style.transform = 'scale(0.97)'); }}
            onTouchEnd={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
          >
            {step === 1 ? 'Get Started' : step === FORM_STEPS ? 'Calculate My Plan' : 'Continue'}
            <ArrowRight size={17} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Plan screen CTA */}
      {step === STEP_PLAN && (
        <div style={{
          padding: '1rem 1.5rem',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          position: 'relative',
          zIndex: 1,
        }}>
          <button
            onClick={finish}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: '#FFFFFF',
              color: '#000000',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(255,255,255,0.12)',
            }}
            onMouseDown={e => { (e.currentTarget.style.transform = 'scale(0.97)'); }}
            onMouseUp={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
            onTouchStart={e => { (e.currentTarget.style.transform = 'scale(0.97)'); }}
            onTouchEnd={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
          >
            Start your journey
            <ArrowRight size={17} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
};
