import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { calculateTargets } from '../utils/macroEngine';
import { ftInToCm, lbsToKg } from '../utils/units';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

// ── Total step count ──────────────────────────────────────────────────────────
const STEP_WELCOME = 0;
const FORM_STEPS = 7;
const STEP_CALCULATING = 8;
const STEP_PLAN = 9;

// ── Design tokens (Organic Performance) ──────────────────────────────────────
const C = {
  bgPrimary: '#FAF9F6',
  bgCard: '#FFFFFF',
  bgElevated: '#F4F3F1',
  accentBlue: '#576038',    // olive primary
  accentGreen: '#576038',   // olive
  accentOrange: '#974400',  // terracotta
  accentRed: '#974400',     // terracotta
  textPrimary: '#1B1C1A',
  textSecondary: '#564338',
  textTertiary: 'rgba(27,28,26,0.42)',
  border: 'rgba(87,96,56,0.08)',
  borderMd: 'rgba(87,96,56,0.14)',
};

// ── Form data shape ───────────────────────────────────────────────────────────
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

// ── Sub-components ────────────────────────────────────────────────────────────

const StepHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div style={{ marginBottom: '1.75rem' }}>
    <h1 style={{
      fontFamily: 'var(--font-sans)',
      fontSize: '1.625rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
      color: C.textPrimary,
      marginBottom: '0.5rem',
    }}>
      {title}
    </h1>
    <p style={{ fontSize: '0.875rem', color: 'rgba(87,96,56,0.65)', fontWeight: 500, lineHeight: 1.5 }}>
      {subtitle}
    </p>
  </div>
);

// Goal / selection card
const BigSelectionCard: React.FC<{
  title: string;
  desc: string;
  emoji?: string;
  selected: boolean;
  onClick: () => void;
}> = ({ title, desc, emoji, selected, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '1rem 1.125rem',
      cursor: 'pointer',
      borderRadius: 20,
      backgroundColor: selected ? 'rgba(87,96,56,0.08)' : C.bgCard,
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
      boxShadow: selected
        ? '0 0 0 2px #576038, 0 8px 24px rgba(87,96,56,0.12)'
        : '0 2px 12px rgba(27,28,26,0.05)',
    }}
  >
    {emoji && (
      <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0, width: 32, textAlign: 'center' as const }}>
        {emoji}
      </span>
    )}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: C.textPrimary, letterSpacing: '-0.01em' }}>
        {title}
      </span>
      <span style={{ fontSize: '0.775rem', color: C.textSecondary, fontWeight: 400, lineHeight: 1.4 }}>
        {desc}
      </span>
    </div>
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      backgroundColor: selected ? '#576038' : 'transparent',
      border: selected ? 'none' : `1.5px solid rgba(87,96,56,0.2)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background-color 0.15s ease',
    }}>
      {selected && <Check size={12} color="#FAF9F6" strokeWidth={3} />}
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
  hasError?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, inputMode, suffix, autoFocus, onEnter, hasError }) => {
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
        textTransform: floated ? 'uppercase' as const : 'none' as const,
        color: hasError ? '#f87171' : focused ? 'rgba(0,0,0,0.35)' : C.textTertiary,
        pointerEvents: 'none' as const,
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
        onChange={e => {
          const raw = e.target.value;
          onChange(inputMode === 'decimal' ? raw.replace(',', '.') : raw);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        style={{
          width: '100%',
          paddingTop: floated ? '1.5rem' : '0.875rem',
          paddingBottom: '0.5rem',
          paddingLeft: '1rem',
          paddingRight: suffix ? '3rem' : '1rem',
          border: `1.5px solid ${hasError ? '#f87171' : focused ? '#576038' : 'rgba(87,96,56,0.12)'}`,
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          color: C.textPrimary,
          fontSize: '1rem',
          fontWeight: 500,
          transition: 'border-color 0.2s ease',
          boxShadow: focused ? '0 0 0 3px rgba(87,96,56,0.08)' : '0 2px 8px rgba(27,28,26,0.04)',
          outline: 'none',
        }}
      />
      {suffix && (
        <span style={{
          position: 'absolute',
          right: '1rem',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '0.8rem',
          color: C.textTertiary,
          fontWeight: 600,
          pointerEvents: 'none',
        }}>
          {suffix}
        </span>
      )}
    </div>
  );
};

const FieldError: React.FC<{ msg: string | null }> = ({ msg }) =>
  msg ? (
    <p className="field-error" style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '5px' }}>
      {msg}
    </p>
  ) : null;

const UnitToggle: React.FC<{
  options: string[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div style={{
    display: 'flex',
    gap: 2,
    background: 'rgba(87,96,56,0.07)',
    borderRadius: 9999,
    padding: 2,
  }}>
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: 9999,
          border: 'none',
          background: value === opt ? '#576038' : 'transparent',
          color: value === opt ? '#FAF9F6' : C.textTertiary,
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
  const [step, setStep] = useState(STEP_WELCOME);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [calcProgress, setCalcProgress] = useState(0);
  const [targets, setTargets] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(null);
  const [calcError, setCalcError] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [attempted, setAttempted] = useState(false);

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

  const resolvedHeightCm = (): number => {
    if (formData.heightUnit === 'ft') return ftInToCm(parseFloat(formData.heightFt) || 0, parseFloat(formData.heightIn) || 0);
    return parseFloat(formData.height) || 0;
  };
  const resolvedWeightKg = (): number => {
    if (formData.weightUnit === 'lbs') return lbsToKg(parseFloat(formData.weight) || 0);
    return parseFloat(formData.weight) || 0;
  };
  const resolvedGoalWeightKg = (): number => {
    if (formData.weightUnit === 'lbs') return lbsToKg(parseFloat(formData.goalWeight) || 0);
    return parseFloat(formData.goalWeight) || 0;
  };

  const getFieldErrors = () => {
    const weightKg = resolvedWeightKg();
    const heightCm = resolvedHeightCm();
    const age = parseInt(formData.age);
    const goalWeightKg = resolvedGoalWeightKg();
    const currentWeightKg = resolvedWeightKg();

    const weightErr = formData.weight && (isNaN(weightKg) || weightKg < 30 || weightKg > 300)
      ? 'Enter a weight between 30–300 kg' : null;
    const heightErr = formData.height && formData.heightUnit === 'cm' && (isNaN(heightCm) || heightCm < 100 || heightCm > 250)
      ? 'Enter a height between 100–250 cm' : null;
    const ageErr = formData.age && (isNaN(age) || age < 13 || age > 100)
      ? 'Enter an age between 13–100' : null;
    const goalWeightErr = formData.goalWeight && goalWeightKg === currentWeightKg && currentWeightKg > 0
      ? 'Must be different from your current weight' : null;

    return { weightErr, heightErr, ageErr, goalWeightErr };
  };

  // Goals where a separate target weight doesn't apply
  const skipGoalWeight = formData.goalType === 'maintenance' || formData.goalType === 'recomposition';
  // Maintenance stays at TDEE — no deficit/surplus speed to pick
  const skipDietSpeed = formData.goalType === 'maintenance';

  const canProceed = (): boolean => {
    const { weightErr, heightErr, ageErr, goalWeightErr } = getFieldErrors();
    switch (step) {
      case 1: return true;
      case 2: return !!formData.goalType;
      case 3: return !!formData.sex;
      case 4: {
        const hasName = formData.name.trim().length > 0;
        const hasAge = parseInt(formData.age) >= 13 && parseInt(formData.age) <= 100;
        const hasHeight = formData.heightUnit === 'ft'
          ? (parseFloat(formData.heightFt) > 0)
          : (parseFloat(formData.height) >= 100 && parseFloat(formData.height) <= 250);
        const hasWeight = resolvedWeightKg() >= 30 && resolvedWeightKg() <= 300;
        return hasName && hasAge && hasHeight && hasWeight && !weightErr && !heightErr && !ageErr;
      }
      case 5: {
        if (skipGoalWeight) return true;
        const gw = parseFloat(formData.goalWeight);
        return gw > 0 && !goalWeightErr;
      }
      case 6: return !!formData.activityLevel;
      case 7: {
        if (skipDietSpeed) return true;
        return !!formData.preferredDietSpeed;
      }
      default: return true;
    }
  };

  const getMissingFieldName = (): string | null => {
    switch (step) {
      case 2: return !formData.goalType ? 'goal' : null;
      case 3: return !formData.sex ? 'biological sex' : null;
      case 4: {
        if (!formData.name.trim()) return 'name';
        if (!formData.age) return 'age';
        if (formData.heightUnit === 'cm' && !formData.height) return 'height';
        if (formData.heightUnit === 'ft' && !formData.heightFt) return 'height';
        if (!formData.weight) return 'weight';
        return null;
      }
      case 5: return !formData.goalWeight ? 'goal weight' : null;
      case 6: return !formData.activityLevel ? 'activity level' : null;
      case 7: return !formData.preferredDietSpeed ? 'diet approach' : null;
      default: return null;
    }
  };

  const goNext = () => {
    setAttempted(true);
    if (!canProceed()) return;
    setAttempted(false);
    setDirection('forward');
    if (step === 4 && skipGoalWeight) {
      // maintenance/recomp: jump over goal-weight step
      setStep(6);
    } else if (step === 6 && skipDietSpeed) {
      // maintenance: jump over diet-speed step
      setStep(STEP_CALCULATING);
    } else if (step < FORM_STEPS) {
      setStep(s => s + 1);
    } else if (step === FORM_STEPS) {
      setStep(STEP_CALCULATING);
    }
  };

  const goBack = () => {
    setAttempted(false);
    if (step <= 1) return;
    setDirection('back');
    if (step === STEP_CALCULATING || step === STEP_PLAN) {
      setStep(skipDietSpeed ? 6 : FORM_STEPS);
    } else if (step === 6 && skipGoalWeight) {
      setStep(4);
    } else {
      setStep(s => s - 1);
    }
  };

  // Auto-advance welcome screen
  useEffect(() => {
    if (step !== STEP_WELCOME) return;
    const timer = setTimeout(() => setStep(1), 2600);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== STEP_CALCULATING) return;
    setCalcError(false);

    const heightCm = resolvedHeightCm();
    const weightKg = resolvedWeightKg();
    const goalWeightKg = resolvedGoalWeightKg();

    // maintenance/recomp → goal weight = current weight; maintenance → diet speed = 'moderate'
    const effectiveGoalWeight = (formData.goalType === 'maintenance' || formData.goalType === 'recomposition')
      ? weightKg : (goalWeightKg || undefined);
    const effectiveDietSpeed = formData.goalType === 'maintenance'
      ? 'moderate' : (formData.preferredDietSpeed || 'moderate');

    const profile = {
      id: `user-${Date.now()}`,
      name: formData.name,
      age: parseInt(formData.age),
      sex: formData.sex as 'male' | 'female',
      height: heightCm,
      weight: weightKg,
      goalWeight: effectiveGoalWeight,
      bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined,
      goalType: formData.goalType as any,
      activityLevel: formData.activityLevel as any,
      trainingFrequency: parseInt(formData.trainingFrequency) || 3,
      stepsTarget: parseInt(formData.stepsTarget) || 8000,
      preferredDietSpeed: effectiveDietSpeed as any,
      onboarded: true,
    };

    let computed;
    try {
      computed = calculateTargets(profile);
    } catch (err) {
      console.error('calculateTargets failed:', err);
      computed = { calories: 2000, protein: 150, carbs: 200, fats: 67 };
      setCalcError(true);
    }
    setTargets(computed);

    setCalcProgress(0);
    const startTime = Date.now();
    const duration = 2200;
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / duration, 1);
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

  const finish = () => {
    if (!targets) return;
    const heightCm = resolvedHeightCm();
    const weightKg = resolvedWeightKg();
    const goalWeightKg = resolvedGoalWeightKg();

    const effectiveGoalWeight = (formData.goalType === 'maintenance' || formData.goalType === 'recomposition')
      ? weightKg : (goalWeightKg || undefined);
    const effectiveDietSpeed = formData.goalType === 'maintenance'
      ? 'moderate' : (formData.preferredDietSpeed || 'moderate');

    const profile = {
      id: `user-${Date.now()}`,
      name: formData.name,
      age: parseInt(formData.age),
      sex: formData.sex as 'male' | 'female',
      height: heightCm,
      weight: weightKg,
      goalWeight: effectiveGoalWeight,
      bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : undefined,
      goalType: formData.goalType as any,
      activityLevel: formData.activityLevel as any,
      trainingFrequency: parseInt(formData.trainingFrequency) || 3,
      stepsTarget: parseInt(formData.stepsTarget) || 8000,
      preferredDietSpeed: effectiveDietSpeed as any,
      onboarded: true,
      targets,
    };

    updateUser(profile);
    setAssignedProgram(profile.sex === 'male' ? 'male_phase2' : 'female_phase1');
    navigate('/');
  };

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

  const goalWeightTimeline = (): string | null => {
    const current = resolvedWeightKg();
    const goal = resolvedGoalWeightKg();
    if (!current || !goal || goal === current) return null;
    const speed = formData.preferredDietSpeed || 'moderate';
    const weeklyRateKg = speed === 'aggressive' ? 0.75 : speed === 'moderate' ? 0.5 : 0.25;
    const weightDelta = Math.abs(goal - current);
    const weeks = Math.round(weightDelta / weeklyRateKg);
    const speedLabel = speed === 'aggressive' ? 'Aggressive' : speed === 'moderate' ? 'Moderate' : 'Sustainable';
    return `~${weeks} weeks at ${speedLabel} pace`;
  };

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

  // ── Rendering ──────────────────────────────────────────────────────────────
  const showHeader = step >= 2 && step <= FORM_STEPS;
  const showFooter = step >= 1 && step <= FORM_STEPS;
  const { weightErr, heightErr, ageErr, goalWeightErr } = getFieldErrors();
  const missingField = getMissingFieldName();
  const showHelperText = attempted && !canProceed() && missingField;

  const renderContent = () => {
    switch (step) {

      // ── Step 0: Animated Welcome ──────────────────────────────────────────
      case STEP_WELCOME: return (
        <div
          key="step-welcome"
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '2rem', textAlign: 'center', gap: '1.75rem',
            background: 'linear-gradient(160deg, rgba(87,96,56,0.06) 0%, rgba(151,68,0,0.04) 100%)',
          }}
        >
          {/* Olive ring logo */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'linear-gradient(135deg, #576038, #3E4528)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 48px rgba(87,96,56,0.25)',
            animation: 'scaleIn 0.7s cubic-bezier(0.16,1,0.3,1) both',
          }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.1rem', fontWeight: 900,
              letterSpacing: '0.16em', color: '#FAF9F6',
            }}>
              VITALITY
            </span>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '0.625rem',
            animation: 'slideUp 0.7s 0.3s cubic-bezier(0.16,1,0.3,1) both',
          }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '2rem', fontWeight: 900,
              letterSpacing: '-0.02em', lineHeight: 1.1,
              color: '#1B1C1A',
            }}>
              Your Personal<br />Body Blueprint
            </div>
            <div style={{
              fontSize: '0.9rem', color: 'rgba(87,96,56,0.7)',
              fontWeight: 500, lineHeight: 1.5,
            }}>
              Science-backed fitness coaching
            </div>
          </div>
        </div>
      );

      // ── Step 1: Welcome ───────────────────────────────────────────────────
      case 1: return (
        <div
          key="step-1"
          className="animate-slide-up"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2.5rem 1.5rem', textAlign: 'center', gap: '2rem' }}
        >
          {/* Organic logo mark */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{
              width: 104, height: 104, borderRadius: '50%',
              background: 'linear-gradient(135deg, #576038 0%, #974400 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 20px 60px rgba(87,96,56,0.22), 0 4px 16px rgba(151,68,0,0.1)',
            }}>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 900,
                letterSpacing: '0.18em', color: '#FAF9F6',
              }}>
                VITALITY
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: '2.2rem', fontWeight: 900,
                letterSpacing: '-0.02em', lineHeight: 1,
                color: C.textPrimary,
              }}>
                Your Blueprint
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(87,96,56,0.65)', fontWeight: 600, marginTop: 8, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                Intelligent fitness coaching
              </div>
            </div>
          </div>

          {/* Feature badge pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
            {['Science-backed', 'AI-powered', 'Adaptive'].map(badge => (
              <span key={badge} style={{
                padding: '0.35rem 0.9rem', borderRadius: 9999,
                background: 'rgba(87,96,56,0.08)',
                fontSize: '0.68rem', fontWeight: 700, color: '#576038',
                letterSpacing: '0.04em', whiteSpace: 'nowrap' as const,
              }}>
                {badge}
              </span>
            ))}
          </div>
        </div>
      );

      // ── Step 2: Goal ──────────────────────────────────────────────────────
      case 2: return (
        <div key="step-2" className="animate-slide-up">
          <StepHeader title="What's your primary goal?" subtitle="This shapes your calorie and macro targets." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <BigSelectionCard emoji="🔥" title="Lose Fat" desc="Caloric deficit to reduce body fat while preserving muscle" selected={formData.goalType === 'fat_loss'} onClick={() => set('goalType', 'fat_loss')} />
            <BigSelectionCard emoji="💪" title="Build Muscle" desc="Caloric surplus to grow lean mass and get stronger" selected={formData.goalType === 'muscle_gain'} onClick={() => set('goalType', 'muscle_gain')} />
            <BigSelectionCard emoji="⚖️" title="Maintain" desc="Sustain your current weight and body composition" selected={formData.goalType === 'maintenance'} onClick={() => set('goalType', 'maintenance')} />
            <BigSelectionCard emoji="🔄" title="Recomposition" desc="Lose fat and build muscle at the same time" selected={formData.goalType === 'recomposition'} onClick={() => set('goalType', 'recomposition')} />
          </div>
        </div>
      );

      // ── Step 3: Biological Sex ────────────────────────────────────────────
      case 3: return (
        <div key="step-3" className="animate-slide-up">
          <StepHeader title="Biological sex" subtitle="Affects your metabolic rate, macro ratios, and calorie targets." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              onClick={() => set('sex', 'male')}
              style={{
                padding: '1.375rem 1.25rem',
                borderRadius: 20,
                background: formData.sex === 'male'
                  ? 'rgba(87,96,56,0.08)'
                  : C.bgCard,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                boxShadow: formData.sex === 'male'
                  ? '0 0 0 2px #576038, 0 8px 24px rgba(87,96,56,0.12)'
                  : '0 2px 12px rgba(27,28,26,0.05)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.015em', color: C.textPrimary }}>Male</span>
                <span style={{ fontSize: '0.775rem', color: C.textSecondary }}>Higher baseline metabolic rate</span>
              </div>
              <span style={{ fontSize: '2rem' }}>♂</span>
            </div>
            <div
              onClick={() => set('sex', 'female')}
              style={{
                padding: '1.375rem 1.25rem',
                borderRadius: 20,
                background: formData.sex === 'female'
                  ? 'rgba(151,68,0,0.07)'
                  : C.bgCard,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                boxShadow: formData.sex === 'female'
                  ? '0 0 0 2px #974400, 0 8px 24px rgba(151,68,0,0.10)'
                  : '0 2px 12px rgba(27,28,26,0.05)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.015em', color: C.textPrimary }}>Female</span>
                <span style={{ fontSize: '0.775rem', color: C.textSecondary }}>Optimized hormonal & metabolic calculations</span>
              </div>
              <span style={{ fontSize: '2rem' }}>♀</span>
            </div>
          </div>
        </div>
      );

      // ── Step 4: Body Stats ────────────────────────────────────────────────
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
            <div>
              <FloatingInput
                label="Age"
                value={formData.age}
                onChange={v => set('age', v)}
                type="number"
                inputMode="numeric"
                placeholder="30"
                hasError={attempted && !!ageErr}
              />
              {attempted && <FieldError msg={ageErr} />}
            </div>

            {/* Height */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: C.textTertiary }}>Height</span>
                <UnitToggle options={['cm', 'ft']} value={formData.heightUnit} onChange={v => set('heightUnit', v as 'cm' | 'ft')} />
              </div>
              {formData.heightUnit === 'cm' ? (
                <>
                  <FloatingInput label="Height" value={formData.height} onChange={v => set('height', v)} type="text" inputMode="decimal" placeholder="175" suffix="cm" hasError={attempted && !!heightErr} />
                  {attempted && <FieldError msg={heightErr} />}
                </>
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
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: C.textTertiary }}>Weight</span>
                <UnitToggle options={['kg', 'lbs']} value={formData.weightUnit} onChange={v => set('weightUnit', v as 'kg' | 'lbs')} />
              </div>
              <FloatingInput
                label="Current weight"
                value={formData.weight}
                onChange={v => set('weight', v)}
                type="text"
                inputMode="decimal"
                placeholder={formData.weightUnit === 'kg' ? '75' : '165'}
                suffix={formData.weightUnit}
                hasError={attempted && !!weightErr}
              />
              {attempted && <FieldError msg={weightErr} />}
            </div>
          </div>
        </div>
      );

      // ── Step 5: Goal Weight ───────────────────────────────────────────────
      case 5: {
        const deltaLabel = weightDeltaLabel();
        const timeline = goalWeightTimeline();
        return (
          <div key="step-5" className="animate-slide-up">
            <StepHeader title="Where do you want to be?" subtitle="Set your goal weight. This helps calculate realistic timelines." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <FloatingInput
                  label="Goal weight"
                  value={formData.goalWeight}
                  onChange={v => set('goalWeight', v)}
                  type="text"
                  inputMode="decimal"
                  placeholder={formData.weightUnit === 'kg' ? '70' : '154'}
                  suffix={formData.weightUnit}
                  autoFocus
                  hasError={attempted && !!goalWeightErr}
                />
                {attempted && <FieldError msg={goalWeightErr} />}
              </div>
              {/* Helper text */}
              {formData.goalType === 'fat_loss' && (
                <p style={{ fontSize: '0.78rem', color: C.textTertiary, margin: 0 }}>Recommended: 0.5–1 kg per week loss</p>
              )}
              {formData.goalType === 'muscle_gain' && (
                <p style={{ fontSize: '0.78rem', color: C.textTertiary, margin: 0 }}>Recommended: 0.25–0.5 kg per week gain</p>
              )}
              {deltaLabel && (
                <div style={{
                  padding: '0.875rem 1rem',
                  borderRadius: 16,
                  background: 'rgba(87,96,56,0.06)',
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                }}>
                  <span style={{ fontSize: '1.125rem' }}>
                    {resolvedGoalWeightKg() < resolvedWeightKg() ? '📉' : resolvedGoalWeightKg() > resolvedWeightKg() ? '📈' : '⚖️'}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: C.textSecondary, fontWeight: 500 }}>
                    {deltaLabel}
                  </span>
                </div>
              )}
              {timeline && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 16,
                  background: 'rgba(151,68,0,0.07)',
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                }}>
                  <span style={{ fontSize: '1rem' }}>📅</span>
                  <span style={{ fontSize: '0.825rem', color: '#974400', fontWeight: 600 }}>
                    {timeline}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      }

      // ── Step 6: Activity Level ────────────────────────────────────────────
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

      // ── Step 7: Diet Approach ─────────────────────────────────────────────
      case 7: {
        const isGain = formData.goalType === 'muscle_gain';
        const isRecomp = formData.goalType === 'recomposition';
        const getSpeedDesc = (speed: 'sustainable' | 'moderate' | 'aggressive') => {
          if (isRecomp) {
            return speed === 'sustainable' ? 'Low training volume · gradual fat loss with muscle preservation'
              : speed === 'moderate' ? 'Medium volume · best balance of fat loss and muscle retention'
              : 'High volume · maximise protein intake and training frequency';
          }
          if (isGain) {
            return speed === 'sustainable' ? '+150 kcal/day · ~0.25 kg/week'
              : speed === 'moderate' ? '+300 kcal/day · ~0.5 kg/week'
              : '+500 kcal/day · ~0.75 kg/week';
          }
          // fat_loss
          return speed === 'sustainable' ? '–250 kcal/day · ~0.25 kg/week'
            : speed === 'moderate' ? '–500 kcal/day · ~0.5 kg/week'
            : '–750 kcal/day · ~0.75 kg/week';
        };
        return (
          <div key="step-7" className="animate-slide-up">
            <StepHeader
              title={isRecomp ? 'Training commitment' : 'Diet approach'}
              subtitle={isRecomp
                ? 'Recomposition works at maintenance calories — choose your training intensity.'
                : 'How aggressively do you want to work toward your goal?'}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <BigSelectionCard
                emoji="🌱"
                title="Sustainable"
                desc={getSpeedDesc('sustainable')}
                selected={formData.preferredDietSpeed === 'sustainable'}
                onClick={() => set('preferredDietSpeed', 'sustainable')}
              />
              <BigSelectionCard
                emoji="⚡"
                title="Moderate"
                desc={getSpeedDesc('moderate')}
                selected={formData.preferredDietSpeed === 'moderate'}
                onClick={() => set('preferredDietSpeed', 'moderate')}
              />
              <BigSelectionCard
                emoji="🔥"
                title="Aggressive"
                desc={getSpeedDesc('aggressive')}
                selected={formData.preferredDietSpeed === 'aggressive'}
                onClick={() => set('preferredDietSpeed', 'aggressive')}
              />
            </div>
          </div>
        );
      }

      // ── Step 8: Calculating ───────────────────────────────────────────────
      case STEP_CALCULATING: return (
        <div
          key="step-calculating"
          className="animate-fade-in"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '2rem 1.5rem', textAlign: 'center' }}
        >
          {/* Olive spinning ring */}
          <div style={{ position: 'relative', width: 88, height: 88 }}>
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #576038, #C2CB9A, #974400, #576038)',
              animation: 'spin 1.4s linear infinite',
              opacity: 0.9,
            }} />
            <div style={{
              position: 'absolute', inset: 5,
              borderRadius: '50%',
              background: C.bgPrimary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem',
            }}>
              🌿
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1.375rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: C.textPrimary,
              margin: 0,
            }}>
              Building your blueprint...
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(87,96,56,0.65)', margin: 0 }}>
              Running metabolic calculations
            </p>
          </div>

          {/* Progress bar — olive */}
          <div style={{ width: '100%', maxWidth: 280 }}>
            <div style={{ height: 5, background: 'rgba(87,96,56,0.10)', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${calcProgress * 100}%`,
                background: 'linear-gradient(90deg, #576038, #C2CB9A)',
                borderRadius: 9999,
                transition: 'width 0.1s linear',
              }} />
            </div>
          </div>
        </div>
      );

      // ── Step 9: Your Plan ─────────────────────────────────────────────────
      case STEP_PLAN: return (
        <div
          key="step-plan"
          className="animate-slide-up"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem' }}
        >
          {/* Heading */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'rgba(87,96,56,0.55)', marginBottom: '0.375rem', margin: 0 }}>
              Your Blueprint
            </p>
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: C.textPrimary, marginTop: 6 }}>
              {formData.name ? `Ready, ${formData.name}.` : 'Your plan is ready.'}
            </h1>
            {calcError && (
              <p style={{ fontSize: '0.78rem', color: 'rgba(151,68,0,0.80)', fontWeight: 600, marginTop: 6 }}>
                Using estimated targets — update in Settings
              </p>
            )}
          </div>

          {/* Calories HERO — terracotta gradient card */}
          <div style={{
            padding: '1.5rem',
            borderRadius: 24,
            background: 'linear-gradient(135deg, #974400 0%, #B85200 100%)',
            marginBottom: '1rem',
            textAlign: 'center' as const,
            boxShadow: '0 12px 40px rgba(151,68,0,0.22)',
          }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(250,249,246,0.7)', margin: '0 0 0.375rem' }}>
              Daily Calorie Target
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.375rem' }}>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '3.5rem',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: '#FAF9F6',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {targets?.calories?.toLocaleString() ?? '—'}
              </span>
              <span style={{ fontSize: '1rem', color: 'rgba(250,249,246,0.75)', fontWeight: 600 }}>kcal</span>
            </div>
          </div>

          {/* 3 macro pills — olive tinted */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
            {[
              { label: 'Protein', value: targets?.protein, unit: 'g', color: '#974400', bg: 'rgba(151,68,0,0.08)' },
              { label: 'Carbs',   value: targets?.carbs,   unit: 'g', color: '#576038', bg: 'rgba(87,96,56,0.08)' },
              { label: 'Fats',    value: targets?.fats,    unit: 'g', color: '#46483d', bg: 'rgba(70,72,61,0.07)' },
            ].map(macro => (
              <div key={macro.label} style={{
                padding: '0.875rem 0.625rem',
                borderRadius: 16,
                background: macro.bg,
                textAlign: 'center' as const,
                display: 'flex', flexDirection: 'column', gap: '0.2rem',
              }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: macro.color, opacity: 0.8 }}>
                  {macro.label}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 800, color: C.textPrimary, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {macro.value ?? '—'}
                </span>
                <span style={{ fontSize: '0.7rem', color: C.textTertiary, fontWeight: 600 }}>{macro.unit}</span>
              </div>
            ))}
          </div>

          {/* Coaching paragraph — olive tint */}
          <div style={{
            padding: '1rem 1.125rem',
            borderRadius: 16,
            background: 'rgba(87,96,56,0.06)',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '1.125rem', flexShrink: 0, marginTop: 1 }}>🌿</span>
            <p style={{ fontSize: '0.8375rem', color: C.textSecondary, lineHeight: 1.55, fontWeight: 400, margin: 0 }}>
              {coachingCopy()}
            </p>
          </div>
        </div>
      );

      default: return null;
    }
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  const isFullscreen = step === STEP_WELCOME || step === 1 || step === STEP_CALCULATING || step === STEP_PLAN;

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: -120,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(87,96,56,0.08) 0%, rgba(151,68,0,0.04) 50%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Header — progress bar (thin line, no step counter) */}
      {showHeader && (
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
            <button
              onClick={goBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#576038',
                padding: '0.5rem',
                display: 'flex',
                cursor: 'pointer',
                marginLeft: '-0.5rem',
                opacity: 0.8,
              }}
            >
              <ArrowLeft size={20} />
            </button>
          </div>
          {/* Progress line — olive fill */}
          <div style={{ height: 4, background: 'rgba(87,96,56,0.10)', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${((step - 1) / (FORM_STEPS - 1)) * 100}%`,
              background: 'linear-gradient(90deg, #576038, #8B9467)',
              borderRadius: 9999,
              transition: 'width 0.3s ease',
            }} />
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
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: canProceed() ? 'linear-gradient(135deg, #576038, #3E4528)' : 'rgba(87,96,56,0.25)',
              color: '#FAF9F6',
              border: 'none',
              borderRadius: 9999,
              fontWeight: 800,
              fontSize: '0.9375rem',
              letterSpacing: '-0.01em',
              opacity: canProceed() ? 1 : 0.6,
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              transition: 'transform 0.12s ease, opacity 0.15s ease',
              boxShadow: canProceed() ? '0 8px 24px rgba(87,96,56,0.25)' : 'none',
            }}
            onMouseDown={e => { if (canProceed()) (e.currentTarget.style.transform = 'scale(0.97)'); }}
            onMouseUp={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
            onTouchStart={e => { if (canProceed()) (e.currentTarget.style.transform = 'scale(0.97)'); }}
            onTouchEnd={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
          >
            {step === 1 ? 'Get started →' : step === FORM_STEPS ? 'Calculate My Plan' : 'Continue'}
            {step !== 1 && <ArrowRight size={17} strokeWidth={2.5} />}
          </button>
          {showHelperText && (
            <p style={{
              textAlign: 'center',
              fontSize: '0.78rem',
              color: 'rgba(0,0,0,0.28)',
              fontWeight: 600,
              marginTop: 8,
            }}>
              Fill in your {missingField} above to continue
            </p>
          )}
        </div>
      )}

      {/* Plan screen CTA — "Begin →" */}
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
              background: 'linear-gradient(135deg, #576038, #3E4528)',
              color: '#FAF9F6',
              border: 'none',
              borderRadius: 9999,
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(87,96,56,0.28)',
            }}
            onMouseDown={e => { (e.currentTarget.style.transform = 'scale(0.97)'); }}
            onMouseUp={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
            onTouchStart={e => { (e.currentTarget.style.transform = 'scale(0.97)'); }}
            onTouchEnd={e => { (e.currentTarget.style.transform = 'scale(1)'); }}
          >
            Begin →
            <ArrowRight size={17} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
};
