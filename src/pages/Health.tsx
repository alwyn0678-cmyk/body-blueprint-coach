import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/SharedUI';
import { HeartPulse, Moon, Zap, Activity, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getLocalISOString } from '../utils/dateUtils';

export const Health: React.FC = () => {
  const { state, updateHealthMetrics, showToast } = useApp();
  const today = getLocalISOString();
  const log = state.logs[today] || { health: {} };
  const health = log.health || {};
  
  const [isLoggingVitals, setIsLoggingVitals] = useState(false);
  const [vitals, setVitals] = useState({
    sleepDuration: health.sleepDurationMinutes?.toString() || '480',
    hrv: health.hrv?.toString() || '65',
    restingHR: health.restingHR?.toString() || '52'
  });

  const saveVitals = () => {
    const sleepVal = parseInt(vitals.sleepDuration);
    const hrvVal = parseInt(vitals.hrv);
    const rhrVal = parseInt(vitals.restingHR);
    
    // Simple recovery algorithm simulation
    const sleepScore = Math.min(100, (sleepVal / 480) * 100);
    const recoveryScore = Math.round((sleepScore * 0.4) + (hrvVal * 0.6));
    
    updateHealthMetrics(today, {
      sleepDurationMinutes: sleepVal,
      sleepScore: Math.round(sleepScore),
      hrv: hrvVal,
      restingHR: rhrVal,
      recoveryScore: recoveryScore
    });
    
    setIsLoggingVitals(false);
    showToast('Morning Vitals Logged', 'success');
  };

  // Mock trend data for consistency chart
  const sleepTrend = Object.entries(state.logs)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([date, log]) => ({
      name: date.slice(8, 10), // Day only
      score: log.health?.sleepScore || 0
    }));

  return (
    <div className="flex-col gap-4 p-4 animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div className="flex-row justify-between align-center">
        <div>
          <h1 className="text-h2">Health Metrics</h1>
          <p className="text-subtitle">Your holistic recovery summary.</p>
        </div>
        <button 
          onClick={() => setIsLoggingVitals(true)}
          className="btn-primary flex-row gap-2 align-center"
          style={{ padding: '0.6rem 1.2rem', borderRadius: '14px', fontSize: '0.9rem', backgroundColor: 'var(--accent-primary)', color: 'black' }}
        >
          <Plus size={18} /> Log Vitals
        </button>
      </div>

      <Card className="flex-col gap-4 p-4 card-glass mt-2">
         <div className="flex-row justify-between align-center">
            <div className="flex-row gap-3 align-center">
              <div style={{ backgroundColor: 'rgba(48, 209, 88, 0.15)', padding: '0.75rem', borderRadius: '16px' }}>
                <HeartPulse size={24} color="var(--accent-green)" />
              </div>
              <div className="flex-col">
                <span className="text-caption font-semibold uppercase tracking-wider text-muted">Recovery Engine</span>
                <span className="text-h3">Readiness Score</span>
              </div>
            </div>
            <span className="text-h1" style={{ color: 'var(--accent-green)', fontFeatureSettings: '"tnum"' }}>{health.recoveryScore || '—'}%</span>
         </div>
         <p className="text-body text-muted mt-2">
            {health.recoveryScore ? (
                health.recoveryScore > 80 ? "Your physiological markers are optimal. You are primed for high strain today." :
                health.recoveryScore > 60 ? "Recovery is stable. Follow your scheduled training volume." :
                "Recovery is low. Consider a deload or active recovery session today."
            ) : "Log your morning vitals to calculate your daily readiness."}
         </p>
      </Card>

      <div className="grid gap-4 mt-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card className="flex-col p-4 gap-2 card-glass">
            <div className="flex-row justify-between align-start">
               <Moon size={20} color="var(--accent-blue)" />
               <TrendingUp size={14} color="var(--accent-green)" />
            </div>
            <span className="text-caption font-bold mt-1" style={{ fontSize: '0.65rem' }}>Sleep Performance</span>
            <span className="text-h2" style={{ fontFeatureSettings: '"tnum"' }}>{health.sleepScore || '—'}%</span>
            <span className="text-caption text-muted" style={{ textTransform: 'none' }}>{health.sleepDurationMinutes ? `${Math.floor(health.sleepDurationMinutes/60)}h ${health.sleepDurationMinutes%60}m` : 'No data'}</span>
        </Card>
        
        <Card className="flex-col p-4 gap-2 card-glass">
            <div className="flex-row justify-between align-start">
               <Zap size={20} color="var(--accent-orange)" />
               <TrendingDown size={14} color="var(--accent-green)" />
            </div>
            <span className="text-caption font-bold mt-1" style={{ fontSize: '0.65rem' }}>Resting Heart Rate</span>
            <span className="text-h2" style={{ fontFeatureSettings: '"tnum"' }}>{health.restingHR || '—'} <span className="text-caption" style={{ fontSize: '0.6rem' }}>bpm</span></span>
            <span className="text-caption text-muted" style={{ textTransform: 'none' }}>Avg: 51 bpm</span>
        </Card>
      </div>

      <Card className="flex-col gap-4 p-4 card-glass mt-2">
          <div className="flex-col mb-2">
             <span className="text-h3">Sleep Consistency</span>
          </div>
          <div style={{ height: '120px', width: '100%', marginLeft: '-20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {/* @ts-ignore */}
              <AreaChart data={sleepTrend.length > 0 ? sleepTrend : [
                { name: 'M', score: 85 }, { name: 'T', score: 92 }, 
                { name: 'W', score: 78 }, { name: 'T', score: 88 }
              ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={5} />
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="score" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
      </Card>

      {isLoggingVitals && (
        <div className="animate-slide-up" style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1000, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
           <div className="flex-row justify-between align-center mb-10">
              <h2 className="text-h1">Vitals Log</h2>
              <button onClick={() => setIsLoggingVitals(false)} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Close</button>
           </div>
           
           <div className="flex-col gap-6">
              <div className="flex-col gap-2">
                 <label className="text-caption text-muted">Sleep Duration (Minutes)</label>
                 <input 
                    type="number" 
                    value={vitals.sleepDuration} 
                    onChange={(e) => setVitals({...vitals, sleepDuration: e.target.value})}
                    className="input-field"
                    style={{ fontSize: '1.5rem', fontWeight: 600, fontFeatureSettings: '"tnum"' }}
                 />
              </div>
              <div className="flex-col gap-2">
                 <label className="text-caption text-muted">Morning HRV (ms)</label>
                 <input 
                    type="number" 
                    value={vitals.hrv} 
                    onChange={(e) => setVitals({...vitals, hrv: e.target.value})}
                    className="input-field"
                    style={{ fontSize: '1.5rem', fontWeight: 600, fontFeatureSettings: '"tnum"' }}
                 />
              </div>
              <div className="flex-col gap-2">
                 <label className="text-caption text-muted">Resting HR (bpm)</label>
                 <input 
                    type="number" 
                    value={vitals.restingHR} 
                    onChange={(e) => setVitals({...vitals, restingHR: e.target.value})}
                    className="input-field"
                    style={{ fontSize: '1.5rem', fontWeight: 600, fontFeatureSettings: '"tnum"' }}
                 />
              </div>
              
              <button onClick={saveVitals} className="btn-primary" style={{ marginTop: '2rem', padding: '1.2rem', backgroundColor: 'white', color: 'black' }}>
                 Calculate Readiness
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
