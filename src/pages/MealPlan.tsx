import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateMealPlan } from '../services/aiCoach';
import type { MealPlan as MealPlanType, PlannedMealItem, MealType } from '../types';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  dessert: 'Dessert',
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#974400',
  lunch: '#576038',
  dinner: '#3E4528',
  snacks: '#8B9467',
  dessert: '#7C3F8E',
};

const MacroBadge: React.FC<{ label: string; value: number; unit?: string; color: string }> = ({ label, value, unit = 'g', color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
    <span style={{ fontSize: '0.72rem', fontWeight: 700, color, letterSpacing: '0.04em' }}>{label}</span>
    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--text-primary)' }}>{Math.round(value)}{unit === 'kcal' ? '' : unit}</span>
  </div>
);

const MealItemRow: React.FC<{ item: PlannedMealItem }> = ({ item }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '10px 0', borderBottom: '1px solid rgba(87,96,56,0.07)',
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{item.foodName}</div>
      <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{item.servingNote}</div>
    </div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#974400' }}>{item.protein}g P</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#576038' }}>{item.calories} kcal</span>
    </div>
  </div>
);

const DayCard: React.FC<{
  day: MealPlanType['days'][0];
  targets: { calories: number; protein: number };
  onLogMeal: (mealType: MealType, items: PlannedMealItem[]) => void;
}> = ({ day, targets, onLogMeal }) => {
  const [expanded, setExpanded] = useState(false);
  const [openMeal, setOpenMeal] = useState<string | null>(null);

  const calPct = Math.min((day.totalCalories / targets.calories) * 100, 100);
  const proPct = Math.min((day.totalProtein / targets.protein) * 100, 100);

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 18,
      boxShadow: '0 2px 16px rgba(26,26,26,0.05)',
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden',
    }}>
      {/* Day header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', padding: '16px 18px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{day.dayLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <MacroBadge label="kcal" value={day.totalCalories} unit="kcal" color="#974400" />
              <MacroBadge label="protein" value={day.totalProtein} color="#576038" />
            </div>
            {expanded ? <ChevronUp size={16} color="#999" /> : <ChevronDown size={16} color="#999" />}
          </div>
        </div>

        {/* Progress bars */}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(26,26,26,0.4)', width: 40, flexShrink: 0 }}>CAL</span>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(151,68,0,0.12)' }}>
              <div style={{ width: `${calPct}%`, height: '100%', borderRadius: 4, background: '#974400', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(151,68,0,0.6)', width: 32, textAlign: 'right' }}>{Math.round(calPct)}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(26,26,26,0.4)', width: 40, flexShrink: 0 }}>PRO</span>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(87,96,56,0.12)' }}>
              <div style={{ width: `${proPct}%`, height: '100%', borderRadius: 4, background: '#576038', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(87,96,56,0.6)', width: 32, textAlign: 'right' }}>{Math.round(proPct)}%</span>
          </div>
        </div>
      </button>

      {/* Expanded meals */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(87,96,56,0.08)' }}>
          {(Object.entries(day.meals) as [string, PlannedMealItem[]][]).map(([mealKey, items]) => {
            if (!items.length) return null;
            const isOpen = openMeal === mealKey;
            const mealCalories = items.reduce((a, x) => a + x.calories, 0);
            const color = MEAL_COLORS[mealKey] ?? '#576038';

            return (
              <div key={mealKey} style={{ borderBottom: '1px solid rgba(87,96,56,0.06)' }}>
                <button
                  onClick={() => setOpenMeal(isOpen ? null : mealKey)}
                  style={{
                    width: '100%', padding: '12px 18px', background: 'none',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color }}>{MEAL_LABELS[mealKey]}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{Math.round(mealCalories)} kcal</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onLogMeal(mealKey as MealType, items);
                      }}
                      style={{
                        padding: '4px 10px', borderRadius: 20, border: `1px solid ${color}40`,
                        background: `${color}12`, color, fontWeight: 700, fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      Log
                    </button>
                    {isOpen ? <ChevronUp size={14} color="#999" /> : <ChevronDown size={14} color="#999" />}
                  </div>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 18px 12px' }}>
                    {items.map((item, idx) => <MealItemRow key={idx} item={item} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const MealPlan: React.FC = () => {
  const { state, saveMealPlan, deleteMealPlan, addFoodToLog, showToast } = useApp();
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'saved'>('current');

  const currentPlan = state.mealPlans[0] ?? null;
  const savedPlans = state.mealPlans.slice(1);

  const today = new Date().toISOString().split('T')[0];
  const todayDayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...
  const todayIndex = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1; // Convert to Mon=0
  const targets = {
    calories: state.user?.targets.calories ?? 2000,
    protein: state.user?.targets.protein ?? 150,
  };

  const handleGenerate = async () => {
    if (!state.user) return;
    setGenerating(true);
    try {
      const plan = await generateMealPlan(state.user);
      saveMealPlan(plan);
      showToast('Meal plan generated!', 'success');
      setActiveTab('current');
    } catch {
      showToast('Failed to generate plan. Try again.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleLogMeal = (mealType: MealType, items: PlannedMealItem[]) => {
    items.forEach(item => {
      const food = {
        id: `planned_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: item.foodName,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        fiber: 0,
        servingSize: 1,
        servingUnit: item.servingNote,
        source: 'custom' as const,
      };
      addFoodToLog(today, mealType, food, 1);
    });
    showToast(`${MEAL_LABELS[mealType]} logged to today!`, 'success');
  };

  const todayPlan = currentPlan?.days.find(d => d.dayIndex === todayIndex) ?? currentPlan?.days[0] ?? null;

  return (
    <div className="animate-fade-in" style={{ padding: '20px 16px', paddingBottom: 120, maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>Meal Plan</h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
          {state.user ? `${targets.calories} kcal · ${targets.protein}g protein target` : 'Set up your profile to personalise'}
        </p>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          width: '100%', padding: '16px 20px', borderRadius: 16, border: 'none',
          background: generating ? 'rgba(87,96,56,0.4)' : 'linear-gradient(135deg, #576038, #8B9467)',
          color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: generating ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginBottom: 24,
          boxShadow: '0 6px 24px rgba(87,96,56,0.3)',
        }}
      >
        {generating ? (
          <>
            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Generating your plan...
          </>
        ) : (
          <>
            <Sparkles size={18} />
            {currentPlan ? 'Regenerate Plan' : 'Generate My Meal Plan'}
          </>
        )}
      </button>

      {!currentPlan && !generating && (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'rgba(87,96,56,0.04)', borderRadius: 20,
          border: '2px dashed rgba(87,96,56,0.15)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🥗</div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#576038', marginBottom: 6 }}>No meal plan yet</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
            Tap the button above to generate a personalised 7-day plan based on your targets
          </div>
        </div>
      )}

      {currentPlan && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(87,96,56,0.07)', borderRadius: 12, padding: 4 }}>
            {(['current', 'saved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 9, border: 'none',
                  background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
                  fontWeight: 800, fontSize: '0.8rem', color: activeTab === tab ? '#576038' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'current' ? 'This Week' : `Saved (${savedPlans.length})`}
              </button>
            ))}
          </div>

          {activeTab === 'current' && (
            <>
              {/* Today's highlight */}
              {todayPlan && (
                <div style={{
                  background: 'linear-gradient(135deg, #576038, #8B9467)',
                  borderRadius: 18, padding: '16px 20px', marginBottom: 16,
                  color: '#fff',
                }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', opacity: 0.8, marginBottom: 6, textTransform: 'uppercase' }}>
                    Today — {todayPlan.dayLabel}
                  </div>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{todayPlan.totalCalories}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>kcal planned</div>
                    </div>
                    <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.2)' }} />
                    <div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{todayPlan.totalProtein}g</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>protein</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <button
                        onClick={() => Object.entries(todayPlan.meals).forEach(([mealKey, items]) => {
                          if (items.length) handleLogMeal(mealKey as MealType, items);
                        })}
                        style={{
                          padding: '8px 14px', borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.4)',
                          background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: '0.78rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <Plus size={14} /> Log All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* All days */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {currentPlan.days.map(day => (
                  <DayCard
                    key={day.dayIndex}
                    day={day}
                    targets={targets}
                    onLogMeal={(mealType, items) => handleLogMeal(mealType, items)}
                  />
                ))}
              </div>

              {/* Plan info */}
              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: 'rgba(87,96,56,0.05)', borderRadius: 12,
                fontSize: '0.75rem', color: 'rgba(26,26,26,0.5)', textAlign: 'center',
              }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Generated {new Date(currentPlan.createdAt).toLocaleDateString()}
                {' · '}Target: {currentPlan.targetCalories} kcal / {currentPlan.targetProtein}g protein
              </div>
            </>
          )}

          {activeTab === 'saved' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {savedPlans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(26,26,26,0.4)', fontSize: '0.85rem' }}>
                  Previous plans will appear here
                </div>
              ) : savedPlans.map(plan => (
                <div key={plan.id} style={{
                  background: '#fff', borderRadius: 16, padding: '16px 18px',
                  border: '1px solid rgba(87,96,56,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>{plan.name}</div>
                    <div style={{ fontSize: '0.73rem', color: 'rgba(26,26,26,0.5)', marginTop: 2 }}>
                      {plan.targetCalories} kcal · {plan.targetProtein}g protein
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMealPlan(plan.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#999' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
