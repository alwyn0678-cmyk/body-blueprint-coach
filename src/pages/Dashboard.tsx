import React from 'react';
import { useApp } from '../context/AppContext';
import { Card, ProgressBar } from '../components/SharedUI';
import { Activity, Droplets, Target, Utensils } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { state } = useApp();
  const { user, logs } = state;
  
  if (!user) {
    return <div className="p-4">Please complete onboarding...</div>;
  }

  // Get today's log or create a temporary empty one for display
  const todayDate = new Date().toISOString().split('T')[0];
  const todayLog = logs[todayDate] || {
    steps: 0,
    waterGlasses: 0,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    adherenceScore: 0
  };

  // Calculate consumed macros
  const consumed = Object.values(todayLog.meals).flat().reduce((acc, meal) => ({
    calories: acc.calories + (meal.nutrition.calories * meal.amount),
    protein: acc.protein + (meal.nutrition.protein * meal.amount),
    carbs: acc.carbs + (meal.nutrition.carbs * meal.amount),
    fats: acc.fats + (meal.nutrition.fats * meal.amount),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return (
    <div className="flex-col gap-6 p-4 animate-fade-in" style={{ paddingBottom: '2rem' }}>
      
      {/* Header section */}
      <div className="flex-row justify-between align-center" style={{ marginTop: '1rem' }}>
        <div>
          <h1 className="text-h2">Hello, {user.name}</h1>
          <p className="text-subtitle">Let's check in on your progress today.</p>
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '50%', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <Activity size={24} color="var(--accent-primary)" />
        </div>
      </div>

      {/* Main Calorie Ring / Card */}
      <Card className="flex-col gap-4" style={{ 
        background: 'linear-gradient(145deg, var(--bg-card) 0%, #15161A 100%)',
        borderTop: 'none',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle glow accent */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 100, height: 100, background: 'var(--accent-primary)', filter: 'blur(50px)', opacity: 0.15, borderRadius: '50%' }} />

        <div className="flex-row justify-between align-center">
          <div className="flex-col">
            <span className="text-subtitle" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calories</span>
            <span className="text-h1" style={{ color: 'var(--accent-primary)' }}>{Math.round(consumed.calories)}</span>
            <span className="text-subtitle">/ {user.targets.calories} kcal</span>
          </div>
          <div className="flex-col align-center justify-center p-3" style={{ backgroundColor: 'rgba(255, 90, 54, 0.1)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255, 90, 54, 0.2)' }}>
            <span className="text-h2">{user.targets.calories - Math.round(consumed.calories)}</span>
            <span className="text-caption">Remaining</span>
          </div>
        </div>
        <ProgressBar 
          current={consumed.calories} 
          max={user.targets.calories} 
          color="var(--accent-primary)" 
          showValues={false}
        />
      </Card>

      {/* Macros Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <Card className="flex-col gap-3 p-3 align-center" style={{ padding: '1.25rem 0.75rem', background: 'var(--bg-card)' }}>
          <span className="text-caption" style={{ color: 'var(--color-protein)' }}>Protein</span>
          <span className="text-h3">{Math.round(consumed.protein)}g <span className="text-caption" style={{ color: 'var(--text-muted)' }}>/ {user.targets.protein}g</span></span>
          <ProgressBar current={consumed.protein} max={user.targets.protein} color="var(--color-protein)" showValues={false} />
        </Card>
        
        <Card className="flex-col gap-3 p-3 align-center" style={{ padding: '1.25rem 0.75rem', background: 'var(--bg-card)' }}>
          <span className="text-caption" style={{ color: 'var(--color-carbs)' }}>Carbs</span>
          <span className="text-h3">{Math.round(consumed.carbs)}g <span className="text-caption" style={{ color: 'var(--text-muted)' }}>/ {user.targets.carbs}g</span></span>
          <ProgressBar current={consumed.carbs} max={user.targets.carbs} color="var(--color-carbs)" showValues={false} />
        </Card>
        
        <Card className="flex-col gap-3 p-3 align-center" style={{ padding: '1.25rem 0.75rem', background: 'var(--bg-card)' }}>
          <span className="text-caption" style={{ color: 'var(--color-fats)' }}>Fats</span>
          <span className="text-h3">{Math.round(consumed.fats)}g <span className="text-caption" style={{ color: 'var(--text-muted)' }}>/ {user.targets.fats}g</span></span>
          <ProgressBar current={consumed.fats} max={user.targets.fats} color="var(--color-fats)" showValues={false} />
        </Card>
      </div>

      {/* Coach Insight Card */}
      <Card style={{ 
        backgroundColor: 'rgba(41, 121, 255, 0.05)', 
        border: '1px solid rgba(41, 121, 255, 0.2)',
        backgroundImage: 'linear-gradient(145deg, rgba(41, 121, 255, 0.05) 0%, transparent 100%)'
      }}>
        <div className="flex-col gap-3">
          <div className="flex-row gap-2 align-center">
            <Target size={20} color="var(--accent-tertiary)" />
            <span className="text-h3" style={{ color: 'var(--accent-tertiary)' }}>Coach Insight</span>
          </div>
          <p className="text-body" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Your weight has remained stable over the last 4 days. Let's aim to hit your protein target of <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{user.targets.protein}g</span> today to support recovery from your training sessions.
          </p>
        </div>
      </Card>

      {/* Habits / Daily Micro-tracking */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card className="flex-row gap-4 align-center" style={{ padding: '1.25rem' }}>
          <div style={{ backgroundColor: 'rgba(41, 121, 255, 0.1)', padding: '0.75rem', borderRadius: '50%', display: 'flex' }}>
            <Droplets size={22} color="var(--accent-tertiary)" />
          </div>
          <div className="flex-col">
            <span className="text-caption text-muted">Water</span>
            <span className="text-h3">{todayLog.waterGlasses} <span className="text-body text-muted">/ 8</span></span>
          </div>
        </Card>
        
        <Card className="flex-row gap-4 align-center" style={{ padding: '1.25rem' }}>
          <div style={{ backgroundColor: 'rgba(255, 90, 54, 0.1)', padding: '0.75rem', borderRadius: '50%', display: 'flex' }}>
            <Utensils size={22} color="var(--accent-primary)" />
          </div>
          <div className="flex-col">
            <span className="text-caption text-muted">Meals</span>
            <span className="text-h3">
              {Object.values(todayLog.meals).filter(m => m.length > 0).length} <span className="text-body text-muted">logged</span>
            </span>
          </div>
        </Card>
      </div>

    </div>
  );
};
