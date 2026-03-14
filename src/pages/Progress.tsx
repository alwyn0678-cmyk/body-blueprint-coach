import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/SharedUI';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, Scale, Plus } from 'lucide-react';
import { calculateWeightTrend } from '../utils/aiCoachingEngine';
import { getLocalISOString } from '../utils/dateUtils';

export const Progress: React.FC = () => {
  const { state, updateDailyLog, updateUser } = useApp();
  const { user, logs } = state;
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [newWeight, setNewWeight] = useState(user?.weight?.toString() || '');

  const todayDate = getLocalISOString();

  // Generate chart data using the EMA AI Engine
  let chartData = calculateWeightTrend(logs, user?.weight || 0);

  // If no historical data for chart, seed some mock data for visual demonstration
  if (chartData.length < 2 && user) {
    chartData = [
      { date: '05-18', weight: user.weight + 0.6, trend: user.weight + 0.5 },
      { date: '05-19', weight: user.weight + 0.2, trend: user.weight + 0.3 },
      ...chartData
    ];
  }

  const handleLogWeight = () => {
    const val = parseFloat(newWeight);
    if (!isNaN(val)) {
      updateDailyLog(todayDate, { weight: val });
      updateUser({ weight: val }); // update current profile weight
      setShowLogWeight(false);
    }
  };

  return (
    <div className="flex-col gap-4 p-4 animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="flex-row justify-between mb-2">
        <div>
          <h1 className="text-h2">Progress</h1>
          <p className="text-subtitle">Your weight trend & analytics.</p>
        </div>
        <button 
          onClick={() => setShowLogWeight(!showLogWeight)}
          className="flex-row gap-2"
          style={{ 
            backgroundColor: 'var(--accent-primary)', 
            color: 'white', 
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 1rem',
            fontWeight: 600,
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(255, 90, 54, 0.3)'
          }}
        >
          <Plus size={18} /> Log Weight
        </button>
      </div>

      {showLogWeight && (
        <Card className="flex-col gap-3 animate-fade-in" style={{ backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--accent-primary)' }}>
          <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
            <span className="text-body font-semibold flex-row gap-2"><Scale size={18} color="var(--accent-primary)" /> Log Today's Weight</span>
          </div>
          <div className="flex-row gap-2">
            <input 
              type="number" 
              step="0.1" 
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="e.g. 79.5"
              style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '1.1rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-main)' }}
            />
            <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>kg</span>
          </div>
          <button 
            onClick={handleLogWeight}
            className="btn-primary"
            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}
          >
            Save Entry
          </button>
        </Card>
      )}

      {/* Main Analytical Dashboard */}
      <div className="grid gap-4">
        
        {/* Weight Trend Chart */}
        <Card className="flex-col gap-4 p-4 card-glass">
          <div className="flex-row justify-between align-center mb-2">
            <div className="flex-col">
              <span className="text-h3">Weight Trend</span>
              <div className="flex-row gap-2 align-center mt-1">
                <span className="text-h2" style={{ color: 'var(--text-main)', fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}>{user?.weight} kg</span>
                <span className="text-caption font-semibold flex-row align-center gap-1" style={{ color: 'var(--accent-green)', backgroundColor: 'rgba(48, 209, 88, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                  <TrendingDown size={14} /> 0.4kg
                </span>
              </div>
            </div>
            <div className="flex-row gap-2">
              <span className="text-caption font-semibold" style={{ color: 'var(--text-main)', padding: '0.4rem 0.8rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>1W</span>
              <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)', padding: '0.4rem 0.8rem' }}>1M</span>
              <span className="text-caption font-semibold" style={{ color: 'var(--text-muted)', padding: '0.4rem 0.8rem' }}>3M</span>
            </div>
          </div>

          <div style={{ height: '220px', width: '100%', marginLeft: '-15px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 500 }} dy={10} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} orientation="right" dx={10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
                  labelStyle={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.8rem', textTransform: 'uppercase' }}
                  itemStyle={{ color: 'var(--text-main)', fontWeight: 700 }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="var(--text-muted)" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: 'var(--bg-secondary)', stroke: 'var(--text-muted)' }} 
                  activeDot={{ r: 5, fill: 'var(--text-main)' }} 
                  name="Scale Weight"
                />
                <Line 
                  type="monotone" 
                  dataKey="trend" 
                  stroke="var(--accent-primary)" 
                  strokeWidth={4} 
                  dot={false}
                  activeDot={{ r: 6, fill: 'var(--bg-primary)', stroke: 'var(--accent-primary)', strokeWidth: 3 }}
                  name="True Trend"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Nutritional Data Chart */}
        <Card className="flex-col gap-4 p-4 card-glass mt-2">
          <div className="flex-col mb-2">
             <span className="text-h3">Nutrition & Energy</span>
             <span className="text-caption text-muted mt-1">Average Daily Intake: <strong style={{color: 'var(--text-main)'}}>2,140 kcal</strong></span>
          </div>
          
          <div style={{ height: '180px', width: '100%', marginLeft: '-15px' }}>
            {/* Using arbitrary data array for mockup visualization of a Bar chart */}
            <ResponsiveContainer width="100%" height="100%">
              {/* @ts-ignore */}
              <LineChart data={[
                { name: 'Mon', cal: 2100, pro: 140 }, { name: 'Tue', cal: 2250, pro: 155 }, 
                { name: 'Wed', cal: 1950, pro: 130 }, { name: 'Thu', cal: 2150, pro: 145 }, 
                { name: 'Fri', cal: 2400, pro: 160 }, { name: 'Sat', cal: 2600, pro: 120 }, { name: 'Sun', cal: 2050, pro: 135 }
              ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} orientation="right" dx={10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
                  labelStyle={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}
                />
                {/* Visualizing calories as main line */}
                <Line type="monotone" dataKey="cal" stroke="var(--color-calories)" strokeWidth={3} dot={{r:4, fill: 'var(--color-calories)', strokeWidth: 0}} />
                {/* Visualizing protein as secondary line on same axis for demo */}
                <Line type="monotone" dataKey="pro" stroke="var(--color-protein)" strokeWidth={2} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex-row justify-center gap-6 mt-2">
             <div className="flex-row align-center gap-2">
               <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-calories)'}} />
               <span className="text-caption font-semibold">Calories</span>
             </div>
             <div className="flex-row align-center gap-2">
               <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-protein)'}} />
               <span className="text-caption font-semibold">Protein Trend</span>
             </div>
          </div>
        </Card>
      </div>

      <Card className="flex-col gap-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <h3 className="text-h3 pt-1 pb-1">Weekly Milestones</h3>
        <ul className="text-body" style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
          <li>Logged food 7 days in a row</li>
          <li>Hit protein target 5/7 days</li>
          <li>Averaged 8,206 steps this week</li>
        </ul>
      </Card>

    </div>
  );
};
