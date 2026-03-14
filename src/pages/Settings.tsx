import React from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/SharedUI';
import { Settings as SettingsIcon, User, LogOut, Download, Bell, Moon, Activity } from 'lucide-react';

export const Settings: React.FC = () => {
  const { state, resetApp, showToast } = useApp();
  const { user } = state;

  if (!user) return <div className="p-4">No profile found.</div>;

  return (
    <div className="flex-col gap-4 p-4 animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="flex-row gap-2 mb-2" style={{ alignItems: 'center' }}>
        <SettingsIcon size={24} color="var(--text-main)" />
        <h1 className="text-h2">Settings</h1>
      </div>

      {/* Profile Header */}
      <div className="flex-row gap-4 p-4 mt-2" style={{ alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
        <div style={{ padding: '1rem', backgroundColor: '#000000', borderRadius: '50%', border: '1px solid var(--accent-primary)', boxShadow: '0 0 15px rgba(10, 132, 255, 0.3)' }}>
          <User size={32} color="var(--accent-primary)" />
        </div>
        <div className="flex-col">
          <span className="text-h2" style={{ color: '#FFFFFF', letterSpacing: '0.02em' }}>{user.name}</span>
          <span className="text-caption font-semibold uppercase tracking-widest mt-1" style={{ color: 'var(--accent-primary)' }}>{user.goalType.replace('_', ' ')} Focus</span>
        </div>
      </div>

      <div className="flex-col gap-3 mt-4">
        <h3 className="text-caption font-semibold uppercase tracking-widest px-2 text-muted">Current Targets</h3>
        <div className="flex-col gap-2 p-4" style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
          <div className="flex-row justify-between align-center pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-body font-semibold" style={{ color: '#FFFFFF' }}>Calories</span>
            <span className="text-h3" style={{ fontFeatureSettings: '"tnum"', color: 'var(--text-main)' }}>{user.targets.calories} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>kcal</span></span>
          </div>
          <div className="flex-row justify-between align-center pb-3 pt-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-body font-semibold" style={{ color: '#FFFFFF' }}>Protein</span>
            <span className="text-h3" style={{ color: 'var(--color-protein)', fontFeatureSettings: '"tnum"' }}>{user.targets.protein} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>g</span></span>
          </div>
          <div className="flex-row justify-between align-center pb-3 pt-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-body font-semibold" style={{ color: '#FFFFFF' }}>Carbs</span>
            <span className="text-h3" style={{ color: 'var(--color-carbs)', fontFeatureSettings: '"tnum"' }}>{user.targets.carbs} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>g</span></span>
          </div>
          <div className="flex-row justify-between align-center pt-3">
            <span className="text-body font-semibold" style={{ color: '#FFFFFF' }}>Fats</span>
            <span className="text-h3" style={{ color: 'var(--color-fats)', fontFeatureSettings: '"tnum"' }}>{user.targets.fats} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>g</span></span>
          </div>
        </div>
      </div>

      <div className="flex-col gap-3 mt-6">
        <h3 className="text-caption font-semibold uppercase tracking-widest px-2 text-muted">Intelligent Engine (Pro)</h3>
        <div className="flex-col gap-2 p-4" style={{ backgroundColor: '#0A0A0A', border: '1px solid var(--accent-orange)', borderRadius: '24px', position: 'relative', overflow: 'hidden', boxShadow: '0 0 20px rgba(255, 159, 10, 0.1)' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at top right, rgba(255, 159, 10, 0.1), transparent 70%)', pointerEvents: 'none' }} />

          <div className="flex-row justify-between align-center pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
            <div className="flex-col">
              <span className="text-body font-bold" style={{ color: '#FFFFFF' }}>Adaptive Coaching</span>
              <span className="text-caption" style={{ fontSize: '0.65rem', textTransform: 'none', color: 'rgba(255,255,255,0.4)' }}>Auto-adjust macros based on weight trends</span>
            </div>
            <div style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: 'var(--accent-orange)', position: 'relative', border: '1px solid rgba(255,255,255,0.2)' }}>
               <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', position: 'absolute', right: 1, top: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} />
            </div>
          </div>
          
          <div className="flex-row justify-between align-center pt-5 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
            <div className="flex-col">
              <span className="text-body font-bold" style={{ color: '#FFFFFF' }}>Metabolic Tracking</span>
              <span className="text-caption" style={{ fontSize: '0.65rem', textTransform: 'none', color: 'rgba(255,255,255,0.4)' }}>Real-time metabolic rate simulation</span>
            </div>
            <div style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: 'var(--accent-orange)', position: 'relative', border: '1px solid rgba(255,255,255,0.2)' }}>
               <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', position: 'absolute', right: 1, top: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} />
            </div>
          </div>

          <div className="flex-row justify-between align-center pt-5" style={{ position: 'relative' }}>
             <div className="flex-col">
              <span className="text-body font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>Smart Grocery Sync</span>
              <span className="text-caption" style={{ fontSize: '0.65rem', textTransform: 'none', color: 'rgba(255,255,255,0.2)' }}>Auto-generate lists from weekly meal plans</span>
            </div>
            <div style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', position: 'relative', border: '1px solid rgba(255,255,255,0.02)' }}>
               <div style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', position: 'absolute', left: 1, top: 1 }} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-col gap-3 mt-6">
        <h3 className="text-caption font-semibold uppercase tracking-widest px-2 text-muted">Connected Systems</h3>
        <div className="flex-col gap-3 p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px' }}>
          <div className="flex-row justify-between align-center">
            <div className="flex-row gap-3 align-center">
               <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" width="18" alt="Apple Health" />
               </div>
               <span className="text-body font-bold">Apple Health</span>
            </div>
            <span className="text-caption font-bold" style={{ color: 'var(--accent-green)' }}>CONNECTED</span>
          </div>
          <div className="flex-row justify-between align-center mt-2">
            <div className="flex-row gap-3 align-center">
               <div style={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={18} color="white" />
               </div>
               <span className="text-body font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Google Fit</span>
            </div>
            <button className="text-caption font-bold" style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', padding: 0 }}>CONNECT</button>
          </div>
        </div>
      </div>

      <div className="flex-col gap-3 mt-6">
        <h3 className="text-caption font-semibold uppercase tracking-widest px-2 text-muted">Preferences</h3>
        <div className="flex-col gap-2 p-4" style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
          <div className="flex-row justify-between align-center pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex-row gap-3 align-center">
              <Bell size={20} color="var(--text-light)" />
              <span className="text-body font-semibold">Reminders</span>
            </div>
            {/* Active Toggle */}
            <div style={{ width: 48, height: 26, borderRadius: 13, backgroundColor: 'var(--accent-primary)', position: 'relative' }}>
               <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', position: 'absolute', right: 2, top: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }} />
            </div>
          </div>
          <div className="flex-row justify-between align-center pt-3">
            <div className="flex-row gap-3 align-center">
              <Moon size={20} color="var(--text-light)" />
              <span className="text-body font-semibold">Dark Mode</span>
            </div>
            {/* Active Toggle (Locked On for this theme) */}
            <div style={{ width: 48, height: 26, borderRadius: 13, backgroundColor: 'var(--accent-primary)', position: 'relative' }}>
               <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', position: 'absolute', right: 2, top: 2, opacity: 0.5 }} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-col gap-3 mt-8">
        <h3 className="text-caption font-semibold uppercase tracking-widest px-2 text-muted">Data & Privacy</h3>
        <button 
          onClick={() => {
            const data = localStorage.getItem('nutrition-coach-state');
            const blob = new Blob([data || '{}'], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `blueprint-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            showToast("JSON Export successful", "success");
          }}
          className="flex-row gap-2 justify-center"
          style={{ width: '100%', padding: '1.2rem', backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, alignItems: 'center' }}
        >
          <Download size={20} /> Export JSON Data
        </button>

        <button 
          onClick={() => {
            showToast("CSV History prepared", "success");
          }}
          className="flex-row gap-2 justify-center mt-2"
          style={{ width: '100%', padding: '1.2rem', backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, alignItems: 'center' }}
        >
          <Download size={20} /> Export CSV History
        </button>

        <button 
          onClick={() => {
            if (window.confirm("Are you sure you want to delete all data? This cannot be undone.")) {
              resetApp();
            }
          }}
          className="flex-row gap-2 justify-center mt-2"
          style={{ width: '100%', padding: '1.2rem', backgroundColor: 'transparent', color: 'var(--accent-red)', borderRadius: '16px', border: '1px solid rgba(255, 69, 58, 0.3)', fontWeight: 600, alignItems: 'center' }}
        >
          <LogOut size={20} /> Reset App Data
        </button>
        <p className="text-caption text-center mt-2" style={{ color: 'rgba(255,255,255,0.4)', padding: '0 2rem' }}>
          Resetting will delete all local data and restart the onboarding process.
        </p>
      </div>
    </div>
  );
};
