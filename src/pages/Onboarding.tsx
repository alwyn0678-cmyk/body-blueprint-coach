import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateTargets } from '../utils/macroEngine';
import { useNavigate } from 'react-router-dom';

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
    goalType: 'fat_loss',
    activityLevel: 'moderately_active',
    preferredDietSpeed: 'moderate',
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else finishOnboarding();
  };

  const finishOnboarding = () => {
    const profile = {
      id: `user-${Date.now()}`,
      name: formData.name,
      age: parseInt(formData.age),
      sex: formData.sex as 'male' | 'female',
      height: parseFloat(formData.height),
      weight: parseFloat(formData.weight),
      goalType: formData.goalType as any,
      activityLevel: formData.activityLevel as any,
      trainingFrequency: 3,
      stepsTarget: 8000,
      preferredDietSpeed: formData.preferredDietSpeed as any,
      onboarded: true
    };

    const targets = calculateTargets(profile);
    updateUser({ ...profile, targets });
    navigate('/');
  };

  return (
    <div className="flex-col p-6 animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto', minHeight: '100vh', justifyContent: 'center' }}>
      <h1 className="text-h1 text-center mb-2" style={{ color: 'var(--accent-terracotta)' }}>Body Blueprint Coach</h1>
      <p className="text-subtitle text-center mb-6">Let's build your custom nutrition plan.</p>
      
      <div className="card flex-col gap-4">
        {step === 1 && (
          <div className="flex-col gap-3 animate-fade-in">
            <h2 className="text-h3">The Basics</h2>
            <input placeholder="First Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="p-2 border rounded" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} />
            <div className="flex-row gap-2">
              <input type="number" placeholder="Age" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} />
              <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div className="flex-row gap-2">
              <input type="number" placeholder="Height (cm)" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} />
              <input type="number" placeholder="Current Weight (kg)" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-col gap-3 animate-fade-in">
            <h2 className="text-h3">Your Goals</h2>
            <label className="text-body font-medium">Primary Goal</label>
            <select value={formData.goalType} onChange={e => setFormData({...formData, goalType: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}>
              <option value="fat_loss">Fat Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="maintenance">Maintenance</option>
              <option value="recomposition">Recomposition</option>
            </select>

            <label className="text-body font-medium mt-2">Activity Level</label>
            <select value={formData.activityLevel} onChange={e => setFormData({...formData, activityLevel: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}>
              <option value="sedentary">Sedentary (Desk job, little exercise)</option>
              <option value="lightly_active">Lightly Active (1-3 days/week)</option>
              <option value="moderately_active">Moderately Active (3-5 days/week)</option>
              <option value="very_active">Very Active (6-7 days/week)</option>
            </select>
          </div>
        )}

        {step === 3 && (
          <div className="flex-col gap-3 animate-fade-in">
            <h2 className="text-h3">Pacing</h2>
            <p className="text-subtitle mb-2">How aggressive do you want the diet target to be?</p>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
              <input type="radio" name="speed" value="sustainable" checked={formData.preferredDietSpeed === 'sustainable'} onChange={e => setFormData({...formData, preferredDietSpeed: e.target.value})} />
              <div className="flex-col"><span className="font-medium">Sustainable</span><span className="text-caption text-muted">Slower progress, easier adherence</span></div>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
              <input type="radio" name="speed" value="moderate" checked={formData.preferredDietSpeed === 'moderate'} onChange={e => setFormData({...formData, preferredDietSpeed: e.target.value})} />
              <div className="flex-col"><span className="font-medium">Moderate (Recommended)</span><span className="text-caption text-muted">Balanced progress and lifestyle</span></div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '8px' }}>
              <input type="radio" name="speed" value="aggressive" checked={formData.preferredDietSpeed === 'aggressive'} onChange={e => setFormData({...formData, preferredDietSpeed: e.target.value})} />
              <div className="flex-col"><span className="font-medium">Aggressive</span><span className="text-caption text-muted">Faster progress, very restrictive</span></div>
            </label>
          </div>
        )}

        <button 
          onClick={handleNext}
          disabled={step === 1 && (!formData.name || !formData.age || !formData.height || !formData.weight)}
          style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: 'var(--text-main)', 
            color: 'white', 
            borderRadius: 'var(--radius-sm)', 
            border: 'none', 
            fontWeight: 600,
            opacity: (step === 1 && (!formData.name || !formData.age || !formData.height || !formData.weight)) ? 0.5 : 1 
          }}
        >
          {step === 3 ? 'Generate Plan' : 'Next Step'}
        </button>
      </div>
    </div>
  );
};
