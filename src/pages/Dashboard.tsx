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
    <div className="flex-col gap-4 p-4 animate-fade-in" style={{ paddingBottom: '2rem' }}>
      
      {/* Header section */}
      <div className="flex-row justify-between" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="text-h2">Hello, {user.name}</h1>
          <p className="text-subtitle">Let's check in on your progress today.</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border-color)' }}>
          <Activity size={24} color="var(--accent-teal)" />
        </div>
      </div>

      {/* Main Calorie Card */}
      <Card className="flex-col gap-3" style={{ borderTop: '4px solid var(--accent-teal)' }}>
        <div className="flex-row justify-between">
          <span className="text-h3 font-semibold">Calories</span>
          <span className="text-subtitle">
            {Math.round(consumed.calories)} / {user.targets.calories} kcal
          </span>
        </div>
        <ProgressBar 
          current={consumed.calories} 
          max={user.targets.calories} 
          color="var(--accent-teal)" 
          showValues={false}
        />
        <p className="text-subtitle text-center" style={{ marginTop: '0.5rem' }}>
          {user.targets.calories - Math.round(consumed.calories)} remaining
        </p>
      </Card>

      {/* Macros Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <Card className="flex-col gap-2 p-3" style={{ padding: '1rem 0.75rem' }}>
          <span className="text-caption text-center">Protein</span>
          <ProgressBar current={consumed.protein} max={user.targets.protein} color="var(--color-protein)" showValues={false} />
          <span className="text-caption text-center">{Math.round(consumed.protein)}g / {user.targets.protein}g</span>
        </Card>
        
        <Card className="flex-col gap-2 p-3" style={{ padding: '1rem 0.75rem' }}>
          <span className="text-caption text-center">Carbs</span>
          <ProgressBar current={consumed.carbs} max={user.targets.carbs} color="var(--color-carbs)" showValues={false} />
          <span className="text-caption text-center">{Math.round(consumed.carbs)}g / {user.targets.carbs}g</span>
        </Card>
        
        <Card className="flex-col gap-2 p-3" style={{ padding: '1rem 0.75rem' }}>
          <span className="text-caption text-center">Fats</span>
          <ProgressBar current={consumed.fats} max={user.targets.fats} color="var(--color-fats)" showValues={false} />
          <span className="text-caption text-center">{Math.round(consumed.fats)}g / {user.targets.fats}g</span>
        </Card>
      </div>

      {/* Coach Insight Card */}
      <Card style={{ backgroundColor: 'var(--accent-beige)', border: 'none' }}>
        <div className="flex-col gap-2">
          <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
            <Target size={20} color="var(--accent-terracotta)" />
            <span className="text-h3" style={{ color: 'var(--text-main)' }}>Coach Insight</span>
          </div>
          <p className="text-body" style={{ color: 'var(--text-main)' }}>
            Your weight has remained stable over the last 4 days. Let's aim to hit your protein target of {user.targets.protein}g today to support recovery from your training sessions.
          </p>
        </div>
      </Card>

      {/* Habits / Daily Micro-tracking */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card className="flex-row gap-3" style={{ alignItems: 'center' }}>
          <div style={{ backgroundColor: '#F0F4F8', padding: '0.75rem', borderRadius: '50%' }}>
            <Droplets size={20} color="#5C808E" />
          </div>
          <div className="flex-col">
            <span className="text-caption">Water</span>
            <span className="text-body font-semibold">{todayLog.waterGlasses} / 8</span>
          </div>
        </Card>
        
        <Card className="flex-row gap-3" style={{ alignItems: 'center' }}>
          <div style={{ backgroundColor: '#FDF5F1', padding: '0.75rem', borderRadius: '50%' }}>
            <Utensils size={20} color="var(--accent-terracotta)" />
          </div>
          <div className="flex-col">
            <span className="text-caption">Meals</span>
            <span className="text-body font-semibold">
              {Object.values(todayLog.meals).filter(m => m.length > 0).length} logged
            </span>
          </div>
        </Card>
      </div>

    </div>
  );
};
