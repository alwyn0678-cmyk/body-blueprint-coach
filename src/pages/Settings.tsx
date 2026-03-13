import React from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/SharedUI';
import { Settings as SettingsIcon, User, LogOut } from 'lucide-react';

export const Settings: React.FC = () => {
  const { state, resetApp } = useApp();
  const { user } = state;

  if (!user) return <div className="p-4">No profile found.</div>;

  return (
    <div className="flex-col gap-4 p-4 animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="flex-row gap-2 mb-2" style={{ alignItems: 'center' }}>
        <SettingsIcon size={24} color="var(--text-main)" />
        <h1 className="text-h2">Settings</h1>
      </div>

      <Card className="flex-row gap-4" style={{ alignItems: 'center' }}>
        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '50%', border: '1px solid var(--border-color)' }}>
          <User size={32} color="var(--accent-primary)" />
        </div>
        <div className="flex-col">
          <span className="text-h2">{user.name}</span>
          <span className="text-subtitle capitalize">{user.goalType.replace('_', ' ')}</span>
        </div>
      </Card>

      <div className="flex-col gap-3 mt-2">
        <h3 className="text-h3">Current Targets</h3>
        <Card className="flex-col gap-2">
          <div className="flex-row justify-between text-body border-b pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <span>Calories</span>
            <span className="font-semibold">{user.targets.calories} kcal</span>
          </div>
          <div className="flex-row justify-between text-body border-b pb-2 pt-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <span>Protein</span>
            <span className="font-semibold" style={{ color: 'var(--color-protein)' }}>{user.targets.protein} g</span>
          </div>
          <div className="flex-row justify-between text-body border-b pb-2 pt-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <span>Carbs</span>
            <span className="font-semibold" style={{ color: 'var(--color-carbs)' }}>{user.targets.carbs} g</span>
          </div>
          <div className="flex-row justify-between text-body pt-2">
            <span>Fats</span>
            <span className="font-semibold" style={{ color: 'var(--color-fats)' }}>{user.targets.fats} g</span>
          </div>
        </Card>
      </div>

      <div className="flex-col gap-3 mt-4">
        <button 
          onClick={resetApp}
          className="flex-row gap-2 justify-center"
          style={{ width: '100%', padding: '1rem', backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#EF4444', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(220, 38, 38, 0.2)', fontWeight: 600, alignItems: 'center' }}
        >
          <LogOut size={20} /> Reset App Data
        </button>
        <p className="text-caption text-center" style={{ color: 'var(--text-light)' }}>
          This will delete all local data and restart the onboarding process.
        </p>
      </div>
    </div>
  );
};
