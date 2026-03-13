import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/SharedUI';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, Scale, Plus } from 'lucide-react';

export const Progress: React.FC = () => {
  const { state, updateDailyLog, updateUser } = useApp();
  const { user, logs } = state;
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [newWeight, setNewWeight] = useState(user?.weight?.toString() || '');

  const todayDate = new Date().toISOString().split('T')[0];

  // Generate chart data from logs (mocking a few back days for visualization if empty)
  const chartData = Object.keys(logs).sort().map(date => {
    return {
      date: date.slice(5), // MM-DD
      weight: logs[date].weight || null,
      trend: logs[date].weight ? logs[date].weight! - 0.2 : null
    };
  });

  // If no historical data for chart, seed some mock data for visual demonstration
  if (chartData.length < 2 && user) {
    chartData.unshift(
      { date: '05-18', weight: user.weight + 0.6, trend: user.weight + 0.5 },
      { date: '05-19', weight: user.weight + 0.2, trend: user.weight + 0.3 }
    );
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

      {/* Main Chart Card */}
      <Card className="flex-col gap-4">
        <div className="flex-row justify-between">
          <div className="flex-col">
            <span className="text-h3">Weight Trend</span>
            <span className="text-subtitle flex-row gap-1" style={{ alignItems: 'center', color: 'var(--accent-primary)' }}>
              <TrendingDown size={14} /> -0.4kg this week
            </span>
          </div>
          <div className="flex-col align-end text-right">
            <span className="text-caption">Current Weight</span>
            <span className="text-h2" style={{ color: 'var(--text-main)' }}>{user?.weight} kg</span>
          </div>
        </div>

        <div style={{ height: '240px', width: '100%', marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-md)' }}
                labelStyle={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}
                itemStyle={{ color: 'var(--text-main)' }}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="var(--text-light)" 
                strokeWidth={2} 
                dot={{ r: 4, fill: 'var(--bg-card)', stroke: 'var(--text-light)', strokeWidth: 2 }} 
                activeDot={{ r: 6, fill: 'var(--text-main)' }} 
                name="Scale Weight"
              />
              <Line 
                type="monotone" 
                dataKey="trend" 
                stroke="var(--accent-primary)" 
                strokeWidth={3} 
                dot={false}
                name="Smoothed Trend"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex-row gap-4 mt-2 justify-center">
          <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
            <span className="text-caption">True Trend</span>
          </div>
          <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--text-light)' }} />
            <span className="text-caption">Scale Weight</span>
          </div>
        </div>
      </Card>

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
