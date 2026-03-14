import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateTargets } from '../utils/macroEngine';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Activity, Target } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { updateUser } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: 'female',
    height: '',
    weight: '',
    goalWeight: '',
    bodyFat: '',
    goalType: 'fat_loss',
    activityLevel: 'moderately_active',
    trainingFrequency: '3',
    stepsTarget: '8000',
    preferredDietSpeed: 'moderate',
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else finishOnboarding();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const finishOnboarding = () => {
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
      onboarded: true
    };

    const targets = calculateTargets(profile);
    updateUser({ ...profile, targets });
    navigate('/');
  };

  const canProceed = () => {
    if (step === 1) return formData.name.length > 0;
    if (step === 2) return formData.age && formData.height && formData.weight && formData.goalWeight;
    return true;
  };

  const SelectionCard = ({ title, desc, selected, onClick, icon: Icon }: any) => (
    <div 
      onClick={onClick}
      className="card animate-fade-in"
      style={{
        padding: '1.25rem',
        cursor: 'pointer',
        border: selected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
        backgroundColor: selected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: selected ? '0 0 0 4px rgba(224, 122, 95, 0.1)' : 'var(--shadow-sm)'
      }}
    >
      {Icon && <div style={{ color: selected ? 'var(--accent-primary)' : 'var(--text-muted)' }}><Icon size={24} /></div>}
      <div className="flex-col" style={{ flex: 1 }}>
        <span className="text-body" style={{ fontWeight: 600, color: selected ? 'var(--accent-primary)' : 'var(--text-main)' }}>{title}</span>
        {desc && <span className="text-caption" style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{desc}</span>}
      </div>
      <div style={{ 
        width: '24px', height: '24px', borderRadius: '50%', 
        border: selected ? 'none' : '2px solid var(--border-color)',
        backgroundColor: selected ? 'var(--accent-primary)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {selected && <Check size={14} color="white" />}
      </div>
    </div>
  );

  return (
    <div className="flex-col animate-fade-in" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Progress Bar Header */}
      <div style={{ padding: '2rem 1.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {step > 1 ? (
          <button onClick={handleBack} style={{ background: 'none', border: 'none', color: 'var(--text-main)', padding: '0.5rem' }}>
            <ArrowLeft size={24} />
          </button>
        ) : <div style={{ width: '40px' }} />}
        
        <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-card)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${(step / totalSteps) * 100}%`, 
            backgroundColor: 'var(--accent-primary)',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span className="text-caption" style={{ width: '40px', textAlign: 'right' }}>{step}/{totalSteps}</span>
      </div>

      <div className="flex-col" style={{ flex: 1, padding: '1rem 1.5rem', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        
        {step === 1 && (
          <div className="flex-col gap-6 animate-fade-in">
            <div className="flex-col gap-2">
              <h1 className="text-h1">Welcome.</h1>
              <p className="text-subtitle" style={{ fontSize: '1.1rem' }}>Let's get to know you. What should we call you?</p>
            </div>
            <input 
              type="text" 
              placeholder="Your Name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              style={{ 
                padding: '1.25rem', fontSize: '1.25rem', borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)'
              }} 
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex-col gap-6 animate-fade-in">
            <div className="flex-col gap-2">
              <h1 className="text-h1">Your Metrics</h1>
              <p className="text-subtitle" style={{ fontSize: '1.1rem' }}>We need accurate data to calculate your metabolic rate.</p>
            </div>
            
            <div className="flex-row gap-4">
              <div className="flex-col gap-2" style={{ flex: 1 }}>
                <label className="text-caption">Age</label>
                <input type="number" placeholder="e.g. 30" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex-col gap-2" style={{ flex: 1 }}>
                <label className="text-caption">Biological Sex</label>
                <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>

            <div className="flex-row gap-4">
              <div className="flex-col gap-2" style={{ flex: 1 }}>
                <label className="text-caption">Height (cm)</label>
                <input type="number" placeholder="e.g. 175" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex-col gap-2" style={{ flex: 1 }}>
                <label className="text-caption">Current Weight (kg)</label>
                <input type="number" placeholder="e.g. 75" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
              </div>
            </div>

            <div className="flex-row gap-4">
              <div className="flex-col gap-2" style={{ flex: 1 }}>
                <label className="text-caption">Body Fat % (Optional)</label>
                <input type="number" placeholder="e.g. 15" value={formData.bodyFat} onChange={e => setFormData({...formData, bodyFat: e.target.value})} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex-col gap-2" style={{ flex: 1 }}>
                <label className="text-caption">Goal Weight (kg)</label>
                <input type="number" placeholder="e.g. 70" value={formData.goalWeight} onChange={e => setFormData({...formData, goalWeight: e.target.value})} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-col gap-6 animate-fade-in">
            <div className="flex-col gap-2">
              <h1 className="text-h1">Primary Goal</h1>
              <p className="text-subtitle" style={{ fontSize: '1.1rem' }}>What are we trying to achieve?</p>
            </div>
            
            <div className="flex-col gap-3">
              <SelectionCard title="Fat Loss" desc="Caloric deficit to drop body fat" icon={Target} selected={formData.goalType === 'fat_loss'} onClick={() => setFormData({...formData, goalType: 'fat_loss'})} />
              <SelectionCard title="Muscle Gain" desc="Caloric surplus to build lean mass" icon={Target} selected={formData.goalType === 'muscle_gain'} onClick={() => setFormData({...formData, goalType: 'muscle_gain'})} />
              <SelectionCard title="Maintenance" desc="Maintain current body composition" icon={Target} selected={formData.goalType === 'maintenance'} onClick={() => setFormData({...formData, goalType: 'maintenance'})} />
              <SelectionCard title="Recomposition" desc="Lose fat and build muscle simultaneously" icon={Target} selected={formData.goalType === 'recomposition'} onClick={() => setFormData({...formData, goalType: 'recomposition'})} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex-col gap-6 animate-fade-in">
            <div className="flex-col gap-2">
              <h1 className="text-h1">Activity Level</h1>
              <p className="text-subtitle" style={{ fontSize: '1.1rem' }}>How much do you move on an average week?</p>
            </div>
            
            <div className="flex-col gap-3">
              <SelectionCard title="Sedentary" desc="Desk job, little to no exercise" icon={Activity} selected={formData.activityLevel === 'sedentary'} onClick={() => setFormData({...formData, activityLevel: 'sedentary'})} />
              <SelectionCard title="Lightly Active" desc="1-3 days of light exercise/sports" icon={Activity} selected={formData.activityLevel === 'lightly_active'} onClick={() => setFormData({...formData, activityLevel: 'lightly_active'})} />
              <SelectionCard title="Moderately Active" desc="3-5 days of moderate exercise/sports" icon={Activity} selected={formData.activityLevel === 'moderately_active'} onClick={() => setFormData({...formData, activityLevel: 'moderately_active'})} />
              <SelectionCard title="Very Active" desc="6-7 days of hard exercise/sports" icon={Activity} selected={formData.activityLevel === 'very_active'} onClick={() => setFormData({...formData, activityLevel: 'very_active'})} />
            </div>

            <div className="flex-row gap-4 mt-2">
              <div className="flex-col gap-2" style={{ flex: 1 }}>
                <label className="text-caption">Training Days/Week</label>
                <input type="number" placeholder="e.g. 4" min="0" max="7" value={formData.trainingFrequency} onChange={e => setFormData({...formData, trainingFrequency: e.target.value})} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex-col gap-2" style={{ flex: 1 }}>
                <label className="text-caption">Daily Step Target</label>
                <input type="number" placeholder="e.g. 8000" value={formData.stepsTarget} onChange={e => setFormData({...formData, stepsTarget: e.target.value})} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
              </div>
            </div>

            <div className="flex-col gap-2 mt-2">
               <label className="text-caption">Diet Pacing</label>
               <select value={formData.preferredDietSpeed} onChange={e => setFormData({...formData, preferredDietSpeed: e.target.value})} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
                 <option value="sustainable">Sustainable (Slower, easier)</option>
                 <option value="moderate">Moderate (Recommended)</option>
                 <option value="aggressive">Aggressive (Faster, harder)</option>
               </select>
            </div>
          </div>
        )}

      </div>

      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <button 
          onClick={handleNext}
          disabled={!canProceed()}
          className="btn-primary"
          style={{ width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: !canProceed() ? 0.5 : 1 }}
        >
          {step === totalSteps ? 'Calculate Macros' : 'Continue'} <ArrowRight size={20} />
        </button>
      </div>

    </div>
  );
};

