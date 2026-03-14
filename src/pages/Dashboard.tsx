import { useApp } from '../context/AppContext';
import { Card, ProgressBar } from '../components/SharedUI';
import { ProgressRing } from '../components/ProgressRings';
import { Activity, Droplets, Target, Utensils, Calendar, Zap, ChevronLeft, ChevronRight, TrendingUp, CheckCircle2, Plus, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area } from 'recharts';
import { evaluateWeeklyCheckIn, calculateWeightTrend } from '../utils/aiCoachingEngine';
import { getLocalISOString, formatReadableDate } from '../utils/dateUtils';
import { BottomSheet } from '../components/MotionUI';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import React, { useState } from 'react';

export const Dashboard: React.FC = () => {
  const { state, updateUser, showToast, updateDailyLog } = useApp() as any;
  const { user, logs } = state;
  const [selectedDate, setSelectedDate] = useState(getLocalISOString());
  const [isWaterSheetOpen, setIsWaterSheetOpen] = useState(false);
  const [isWeightSheetOpen, setIsWeightSheetOpen] = useState(false);
  const [tempWeight, setTempWeight] = useState(user?.weight || 0);

  if (!user) {
    return null;
  }

  // Get today's log or create a temporary empty one for display
  const todayDate = getLocalISOString();
  const todayLog = logs[selectedDate] || { 
    id: selectedDate, date: selectedDate, steps: 0, waterGlasses: 0, 
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    adherenceScore: 0
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(getLocalISOString(d));
  };

  // Calculate consumed macros
  const consumed = Object.values(todayLog.meals).flat().reduce((acc: any, meal: any) => ({
    calories: acc.calories + (meal.nutrition.calories * (meal.amount || 0)),
    protein: acc.protein + (meal.nutrition.protein * (meal.amount || 0)),
    carbs: acc.carbs + (meal.nutrition.carbs * (meal.amount || 0)),
    fats: acc.fats + (meal.nutrition.fats * (meal.amount || 0)),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  // Calculate weekly adherence data relative to the selected date (7 days ending on selectedDate)
  const weeklyData: Array<{day: string, dateStr: string, calories: number, protein: number, target: number, isToday: boolean, isFuture: boolean}> = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (6 - i)); 
    const dateStr = getLocalISOString(d);
    
    const log = logs[dateStr];
    let calConsumed = 0;
    let proConsumed = 0;
    if (log && log.meals) {
      calConsumed = Object.values(log.meals).flat().reduce((sum: number, m: any) => sum + (m.nutrition.calories * (m.amount || 0)), 0);
      proConsumed = Object.values(log.meals).flat().reduce((sum: number, m: any) => sum + (m.nutrition.protein * (m.amount || 0)), 0);
    }
    
    return {
      day: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()],
      dateStr: dateStr,
      calories: Math.round(calConsumed),
      protein: Math.round(proConsumed),
      target: user.targets.calories,
      isToday: dateStr === todayDate,
      isFuture: d > new Date()
    };
  });

  // Get AI Insight
  const trendData = calculateWeightTrend(logs, user.weight);
  const currentEma = trendData.length > 0 ? trendData[trendData.length - 1].trend : null;
  const evaluation = evaluateWeeklyCheckIn(user, logs, currentEma);

  const handleWaterUpdate = (amount: number) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    const newWater = Math.max(0, todayLog.waterGlasses + amount);
    updateDailyLog(todayDate, { waterGlasses: newWater });
  };

  const handleWeightSave = () => {
    updateUser({ weight: tempWeight });
    showToast("Weight logged successfully", "success");
    setIsWeightSheetOpen(false);
  };

  return (
    <div className="flex-col gap-6 p-4 animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* Carbon Style Premium Header */}
      <div className="flex-col pb-6" style={{ backgroundColor: 'var(--bg-card)', margin: '-1rem -1rem 0 -1rem', padding: '1rem 1rem 0 1rem', borderBottom: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        
        {/* Date Selector */}
        <div className="flex-row justify-between align-center mb-6">
          <button className="flex-row align-center justify-center p-2" onClick={() => changeDate(-1)} style={{ background: 'var(--bg-primary)', border: 'none', color: 'var(--text-main)', borderRadius: '50%' }}>
            <ChevronLeft size={20} />
          </button>
          <div className="flex-row gap-2 align-center px-4 py-2" style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-full)' }}>
            <Calendar size={16} color="var(--accent-primary)" />
            <span className="text-body font-bold">{formatReadableDate(selectedDate)}</span>
          </div>
          <button className="flex-row align-center justify-center p-2" onClick={() => changeDate(1)} style={{ background: 'var(--bg-primary)', border: 'none', color: 'var(--text-main)', borderRadius: '50%' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Top-Level Energy Focus and Progress Rings */}
        <div className="flex-col align-center mt-6 mb-8 gap-6">
          
          <div className="flex-row justify-center align-center w-full relative">
            {/* Calories Ring */}
            <ProgressRing 
              radius={110} 
              strokeWidth={12} 
              progress={((consumed as any).calories / user.targets.calories) * 100} 
              color="var(--color-calories)"
              trackColor="rgba(255, 255, 255, 0.05)"
            >
              <div className="flex-col align-center justify-center">
                <span className="text-caption font-semibold uppercase tracking-widest mb-1 text-muted">Remaining</span>
                <span className="text-h1 tabular-nums" style={{ fontSize: '4.2rem', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {Math.max(0, user.targets.calories - Math.round((consumed as any).calories))}
                </span>
                <span className="text-subtitle font-bold mt-1" style={{ color: 'var(--color-calories)', fontSize: '0.9rem', letterSpacing: '0.1em' }}>CALS</span>
              </div>
            </ProgressRing>

            {/* Metabolic Status HUD Element */}
            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
               <span className="text-caption" style={{ fontSize: '0.6rem', color: 'var(--accent-green)', letterSpacing: '1px' }}>METABOLIC_PRIME</span>
               <div style={{ padding: '0.3rem 0.6rem', backgroundColor: 'rgba(48, 209, 88, 0.1)', border: '1px solid rgba(48, 209, 88, 0.3)', borderRadius: '6px', marginTop: '2px' }}>
                  <span className="text-caption font-bold" style={{ color: 'var(--accent-green)', fontSize: '0.7rem' }}>ADAPTIVE</span>
               </div>
            </div>
          </div>

          {/* Macro Rings Row */}
          <div className="flex-row justify-around w-full px-2 mt-4">
            <div className="flex-col align-center gap-2">
              <ProgressRing 
                radius={40} 
                strokeWidth={5} 
                progress={((consumed as any).protein / user.targets.protein) * 100} 
                color="var(--color-protein)"
                trackColor="rgba(255, 255, 255, 0.05)"
              >
                <div className="flex-col align-center p-1">
                  <span className="text-body font-bold tabular-nums" style={{ fontSize: '1rem', color: 'var(--text-main)', lineHeight: 1 }}>{Math.round((consumed as any).protein)}<span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginLeft: '1px' }}>g</span></span>
                </div>
              </ProgressRing>
              <span className="text-caption font-semibold mt-1" style={{ color: 'var(--color-protein)', fontSize: '0.65rem', textAlign: 'center' }}>Protein</span>

            </div>
            
            <div className="flex-col align-center gap-2">
              <ProgressRing 
                radius={40} 
                strokeWidth={5} 
                progress={((consumed as any).carbs / user.targets.carbs) * 100} 
                color="var(--color-carbs)"
                trackColor="rgba(255, 255, 255, 0.05)"
              >
                <div className="flex-col align-center p-1">
                  <span className="text-body font-bold" style={{ fontSize: '1rem', color: 'var(--text-main)', fontFeatureSettings: '"tnum"', lineHeight: 1 }}>{Math.round((consumed as any).carbs)}<span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginLeft: '1px' }}>g</span></span>
                </div>
              </ProgressRing>
              <span className="text-caption font-semibold mt-1" style={{ color: 'var(--color-carbs)', fontSize: '0.65rem', textAlign: 'center' }}>Carbs</span>
            </div>

            <div className="flex-col align-center gap-2">
              <ProgressRing 
                radius={40} 
                strokeWidth={5} 
                progress={((consumed as any).fats / user.targets.fats) * 100} 
                color="var(--color-fats)"
                trackColor="rgba(255, 255, 255, 0.05)"
              >
                <div className="flex-col align-center p-1">
                  <span className="text-body font-bold" style={{ fontSize: '1rem', color: 'var(--text-main)', fontFeatureSettings: '"tnum"', lineHeight: 1 }}>{Math.round((consumed as any).fats)}<span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginLeft: '1px' }}>g</span></span>
                </div>
              </ProgressRing>
              <span className="text-caption font-semibold mt-1" style={{ color: 'var(--color-fats)', fontSize: '0.65rem', textAlign: 'center' }}>Fats</span>
            </div>
          </div>
        </div>
      </div>

      {/* Habits & Quick Insights */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="flex-col gap-3 p-4" onClick={() => setIsWeightSheetOpen(true)} style={{ cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
           <div className="flex-row justify-between align-center">
             <div style={{ padding: '0.6rem', borderRadius: '12px' }}>
                <TrendingUp size={20} color="var(--accent-blue)" />
             </div>
             <span className="text-caption font-bold" style={{ color: 'var(--accent-blue)' }}>+2.1%</span>
           </div>
           <div className="flex-col mt-1">
             <span className="text-h3" style={{ fontSize: '1.5rem', color: '#FFFFFF' }}>{user.weight}kg</span>
             <span className="text-caption font-semibold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Current Weight</span>
           </div>
        </div>

        <div className="flex-col gap-3 p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
           <div className="flex-row justify-between align-center">
             <div style={{ padding: '0.6rem', borderRadius: '12px' }}>
                <CheckCircle2 size={20} color="var(--accent-green)" />
             </div>
             <span className="text-caption font-bold" style={{ color: 'var(--accent-green)' }}>{todayLog.adherenceScore}%</span>
           </div>
           <div className="flex-col mt-1">
             <span className="text-h3" style={{ fontSize: '1.5rem', color: '#FFFFFF' }}>14 Days</span>
             <span className="text-caption font-semibold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Active Streak</span>
           </div>
        </div>
      </div>

      {/* Weekly Compliance Chart */}
      <div className="flex-col gap-4 p-5 mt-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex-row justify-between align-center">
           <div className="flex-col">
             <span className="text-body font-bold" style={{ color: '#FFFFFF', letterSpacing: '0.05em' }}>Performance Trends</span>
             <span className="text-caption" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Last 7 Days</span>
           </div>
           <div className="flex-row gap-2">
             <div className="flex-row align-center gap-1"><div style={{ width: 8, height: 8, borderRadius: '2px', background: 'var(--accent-primary)' }} /><span className="text-caption" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem' }}>CALS</span></div>
             <div className="flex-row align-center gap-1"><div style={{ width: 8, height: 8, borderRadius: '2px', background: 'var(--accent-orange)' }} /><span className="text-caption" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem' }}>PRO</span></div>
           </div>
        </div>

        <div style={{ height: '200px', width: '100%', marginLeft: '-20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#000000', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}
                itemStyle={{ fontWeight: 700, fontSize: '12px' }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '4px' }}
              />
              <Bar dataKey="calories" radius={[2, 2, 0, 0]} barSize={8}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-cal-${index}`} fill={entry.calories > entry.target ? 'var(--accent-red)' : 'var(--accent-primary)'} />
                ))}
              </Bar>
              <Bar dataKey="protein" radius={[2, 2, 0, 0]} barSize={8} fill="var(--accent-orange)" />
              <ReferenceLine y={user.targets.calories} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Coaching Insight */}
      <div className="mt-4" style={{ 
        backgroundColor: '#000000',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle glowing inset */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent-orange), transparent)', opacity: 0.5 }} />

        <div className="flex-row gap-4 align-center mb-4">
          <div style={{ padding: '0.5rem' }}>
            <Zap size={28} color="var(--accent-orange)" style={{ filter: 'drop-shadow(0 0 8px var(--accent-orange))' }} />
          </div>
          <div className="flex-col">
            <span className="text-body font-bold" style={{ color: '#FFFFFF', letterSpacing: '0.05em' }}>AI Intelligence</span>
            <span className="text-caption font-semibold mt-1" style={{ color: 'var(--accent-orange)' }}>System Analysis</span>
          </div>
        </div>
        <p className="text-body" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, fontWeight: 500 }}>
          "{evaluation.reasoning}"
        </p>
        
        {evaluation.newTargets && (
          <button 
            className="w-full mt-6" 
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              color: '#FFFFFF', 
              border: '1px solid rgba(255,255,255,0.2)', 
              padding: '1rem', 
              borderRadius: '16px', 
              fontWeight: 700,
              fontSize: '1rem' 
            }}
            onClick={() => {
              updateUser({ targets: evaluation.newTargets });
              showToast("Targets updated for next week!", "success");
            }}
          >
            Adjust Caloric Intake
          </button>
        )}
      </div>

      {/* Habits / Daily Micro-tracking */}
      <h3 className="text-body font-bold mt-6 mb-3 px-1" style={{ color: '#FFFFFF', letterSpacing: '0.05em' }}>Daily Vitals</h3>
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="flex-row gap-4 align-center" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'pointer', borderRadius: '16px' }} onClick={() => setIsWaterSheetOpen(true)}>
          <div style={{ backgroundColor: 'transparent', padding: '0.4rem', borderRadius: '12px', display: 'flex' }}>
            <Droplets size={26} color="var(--accent-blue)" />
          </div>
          <div className="flex-col">
            <span className="text-h3" style={{ fontSize: '1.2rem', color: '#FFFFFF' }}>{todayLog.waterGlasses} <span className="text-caption" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>/ 8</span></span>
            <span className="text-caption font-semibold uppercase tracking-widest mt-1" style={{ color: 'var(--accent-blue)', fontSize: '0.65rem' }}>Hydration</span>
          </div>
        </div>
        
        <div className="flex-row gap-4 align-center" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
          <div style={{ backgroundColor: 'transparent', padding: '0.4rem', borderRadius: '12px', display: 'flex' }}>
            <Utensils size={26} color="var(--accent-orange)" />
          </div>
          <div className="flex-col">
            <span className="text-h3" style={{ fontSize: '1.2rem', color: '#FFFFFF' }}>
              {Object.values(todayLog.meals).filter(m => m.length > 0).length} <span className="text-caption" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Meals</span>
            </span>
            <span className="text-caption font-semibold uppercase tracking-widest mt-1" style={{ color: 'var(--accent-orange)', fontSize: '0.65rem' }}>Feedings</span>
          </div>
        </div>
      </div>

      {/* Water Bottom Sheet */}
      <BottomSheet isOpen={isWaterSheetOpen} onClose={() => setIsWaterSheetOpen(false)}>
        <div className="flex-col align-center gap-6 mt-4 pb-4">
          <div style={{ backgroundColor: 'rgba(242, 204, 143, 0.15)', padding: '1.5rem', borderRadius: '50%' }}>
            <Droplets size={48} color="var(--accent-tertiary)" />
          </div>
          <div className="text-center">
            <h2 className="text-h2">Hydration</h2>
            <p className="text-body text-muted mt-1">Daily Target: 8 Glasses</p>
          </div>
          
          <div className="flex-row justify-center align-center gap-6 mt-2">
            <button 
              onClick={() => handleWaterUpdate(-1)}
              style={{ padding: '1rem', borderRadius: '50%', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', display: 'flex' }}
            >
              <Minus size={24} color="var(--text-main)" />
            </button>
            <span style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--text-main)', fontFeatureSettings: '"tnum"', width: '60px', textAlign: 'center' }}>
              {todayLog.waterGlasses}
            </span>
            <button 
              onClick={() => handleWaterUpdate(1)}
              style={{ padding: '1rem', borderRadius: '50%', border: 'none', backgroundColor: 'var(--accent-tertiary)', display: 'flex' }}
            >
              <Plus size={24} color="white" />
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Weight Bottom Sheet */}
      <BottomSheet isOpen={isWeightSheetOpen} onClose={() => setIsWeightSheetOpen(false)}>
        <div className="flex-col align-center gap-6 mt-2 pb-4">
          <div className="text-center">
            <h2 className="text-h2">Log Weight</h2>
            <p className="text-body text-muted mt-1">Keep track of your physical progress.</p>
          </div>
          
          <div className="flex-row justify-center align-baseline gap-2 mt-4">
            <input 
              type="number" 
              value={tempWeight} 
              onChange={(e) => setTempWeight(Number(e.target.value))}
              style={{ 
                fontSize: '4rem', fontWeight: 800, color: 'var(--text-main)', 
                fontFeatureSettings: '"tnum"', width: '140px', textAlign: 'center',
                background: 'transparent', border: 'none', borderBottom: '2px solid var(--border-color)', outline: 'none'
              }}
            />
            <span className="text-h2 text-light">kg</span>
          </div>

          <button className="btn-primary w-full mt-6 py-4" onClick={handleWeightSave}>
            Save Weight Entry
          </button>
        </div>
      </BottomSheet>

    </div>
  );
};
