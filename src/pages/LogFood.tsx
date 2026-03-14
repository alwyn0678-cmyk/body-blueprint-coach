import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, ChevronRight, BookOpen, Pencil, Check, X, Copy } from 'lucide-react';
import { MealType, FoodItem } from '../types';
import { FoodSearch } from './FoodSearch';
import { getLocalISOString } from '../utils/dateUtils';
import { SwipeReveal, SlideOver } from '../components/MotionUI';
import { getMacrosFromLog } from '../utils/aiCoachingEngine';

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snacks: '🍎',
};

const MEAL_ACCENT: Record<MealType, string> = {
  breakfast: '#fb923c',
  lunch: '#4ade80',
  dinner: '#60a5fa',
  snacks: '#f472b6',
};

// Determine which meal to auto-expand based on time of day
const getDefaultMeal = (): MealType => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  return 'dinner';
};

const MacroChip: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
    <span style={{ fontSize: '0.8rem', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{Math.round(value)}</span>
    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{label}</span>
  </div>
);

// Pill showing remaining macro — colored by how close to target
const MacroRemainingPill: React.FC<{ remaining: number; label: string; color: string; unit?: string }> = ({ remaining, label, color, unit = 'g' }) => {
  const isOver = remaining < 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '4px 10px', borderRadius: '99px',
      backgroundColor: isOver ? 'rgba(248,113,113,0.12)' : `${color}14`,
      border: `1px solid ${isOver ? 'rgba(248,113,113,0.25)' : `${color}30`}`,
    }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isOver ? '#f87171' : color, fontVariantNumeric: 'tabular-nums' }}>
        {isOver ? '+' : ''}{Math.abs(Math.round(remaining))}{unit}
      </span>
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{label}</span>
    </div>
  );
};

export const LogFood: React.FC = () => {
  const { state, addFoodToLog, removeFoodEntry, editFoodEntry, logSavedMeal, saveMeal, showToast } = useApp();

  const defaultMeal = getDefaultMeal();

  const [activeMeal, setActiveMeal] = useState<MealType>(defaultMeal);
  const [showSearch, setShowSearch] = useState(false);
  const [showSavedMeals, setShowSavedMeals] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Partial<Record<MealType, boolean>>>({ [defaultMeal]: true });
  const [editingEntry, setEditingEntry] = useState<{ id: string; mealType: MealType; amount: string; error?: string } | null>(null);
  const [saveMealName, setSaveMealName] = useState('');
  const [savingMealType, setSavingMealType] = useState<MealType | null>(null);
  const [savedMealConfirm, setSavedMealConfirm] = useState<MealType | null>(null);
  const [showCopyYesterday, setShowCopyYesterday] = useState(false);
  const [copiedYesterday, setCopiedYesterday] = useState(false);

  const todayDate = getLocalISOString();

  // Check if yesterday has data (for Copy from yesterday feature)
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  const yesterdayLog = state.logs[yesterday];
  const yesterdayHasData = yesterdayLog && (
    Object.values(yesterdayLog.meals).some(entries => entries.length > 0)
  );

  useEffect(() => {
    if (yesterdayHasData) setShowCopyYesterday(true);
  }, [yesterdayHasData]);

  const todayLog = state.logs[todayDate] || {
    id: todayDate, date: todayDate, steps: 0, waterGlasses: 0,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    workouts: [], health: {}, adherenceScore: 0,
  };

  const dayTotals = getMacrosFromLog(todayLog as any);
  const targets = state.user?.targets;
  const calTarget = targets?.calories ?? 2000;
  const proTarget = targets?.protein ?? 150;
  const carbTarget = targets?.carbs ?? 200;
  const fatTarget = targets?.fats ?? 65;

  const calLogged = Math.round(dayTotals.calories);
  const calRemaining = calTarget - calLogged;
  const proRemaining = proTarget - dayTotals.protein;
  const carbRemaining = carbTarget - dayTotals.carbs;
  const fatRemaining = fatTarget - dayTotals.fats;
  const isOver = calLogged > calTarget;
  const calPct = Math.min(100, (calLogged / calTarget) * 100);

  const handleAddFood = (food: FoodItem, amount: number) => {
    if (amount <= 0) {
      showToast('Amount must be greater than 0', 'error');
      return;
    }
    addFoodToLog(todayDate, activeMeal, food, amount);
    showToast(`${food.name} added`, 'success');
    setShowSearch(false);
  };

  const handleEditConfirm = () => {
    if (!editingEntry) return;
    const newAmount = parseFloat(editingEntry.amount);
    if (!newAmount || newAmount <= 0) {
      setEditingEntry(prev => prev ? { ...prev, error: 'Enter a value greater than 0' } : null);
      return;
    }
    editFoodEntry(todayDate, editingEntry.mealType, editingEntry.id, newAmount);
    showToast('Serving updated', 'success');
    setEditingEntry(null);
  };

  const handleSaveMeal = (mealType: MealType) => {
    const items = todayLog.meals[mealType] || [];
    if (!saveMealName.trim() || items.length === 0) return;
    const entries = items.map(item => ({
      food: {
        id: item.foodId, name: item.foodName, calories: item.nutrition.calories,
        protein: item.nutrition.protein, carbs: item.nutrition.carbs, fats: item.nutrition.fats,
        servingSize: item.servingSize, servingUnit: item.servingUnit,
      } as FoodItem,
      amount: item.amount,
    }));
    saveMeal(saveMealName.trim(), mealType, entries);
    showToast(`"${saveMealName.trim()}" saved`, 'success');
    setSaveMealName('');
    setSavingMealType(null);
    setSavedMealConfirm(mealType);
    setTimeout(() => setSavedMealConfirm(null), 2500);
  };

  const handleCopyFromYesterday = () => {
    if (!yesterdayLog) return;
    const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
    let count = 0;
    meals.forEach(mealType => {
      const entries = yesterdayLog.meals[mealType] || [];
      entries.forEach(item => {
        const food: FoodItem = {
          id: item.foodId, name: item.foodName,
          calories: item.nutrition.calories, protein: item.nutrition.protein,
          carbs: item.nutrition.carbs, fats: item.nutrition.fats,
          servingSize: item.servingSize, servingUnit: item.servingUnit,
        };
        addFoodToLog(todayDate, mealType, food, item.amount);
        count++;
      });
    });
    setCopiedYesterday(true);
    setShowCopyYesterday(false);
    showToast(`Copied ${count} items from yesterday`, 'success');
  };

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const renderMealCard = (mealType: MealType) => {
    const items = todayLog.meals[mealType] || [];
    const mealCals = items.reduce((s, i) => s + i.nutrition.calories * i.amount, 0);
    const mealPro = items.reduce((s, i) => s + i.nutrition.protein * i.amount, 0);
    const mealCarbs = items.reduce((s, i) => s + i.nutrition.carbs * i.amount, 0);
    const mealFats = items.reduce((s, i) => s + i.nutrition.fats * i.amount, 0);
    const isExpanded = !!expandedMeals[mealType];
    const accent = MEAL_ACCENT[mealType];
    const hasItems = items.length > 0;
    const allSetsDone = savedMealConfirm === mealType;

    return (
      <div key={mealType} style={{
        backgroundColor: 'var(--bg-card)', borderRadius: '20px',
        border: `1px solid ${isExpanded ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
        overflow: 'hidden', transition: 'border-color 0.2s', position: 'relative',
      }}>
        {hasItems && (
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px', background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
        )}

        {/* Card Header */}
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1rem', cursor: 'pointer' }}
          onClick={() => setExpandedMeals(prev => ({ ...prev, [mealType]: !prev[mealType] }))}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <div style={{ fontSize: '1.2rem', width: 38, height: 38, backgroundColor: `${accent}18`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {MEAL_ICONS[mealType]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasItems ? '5px' : 0 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'capitalize' }}>
                  {mealType}
                </span>
                {/* Always show meal calorie total on right of header */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  {hasItems ? (
                    <>
                      <span style={{ fontSize: '1rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{Math.round(mealCals)}</span>
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>kcal</span>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>0 kcal</span>
                  )}
                </div>
              </div>
              {hasItems ? (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <MacroChip value={mealPro} label="P" color="var(--color-protein)" />
                  <MacroChip value={mealCarbs} label="C" color="var(--color-carbs)" />
                  <MacroChip value={mealFats} label="F" color="var(--color-fats)" />
                  <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.22)', fontWeight: 600 }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
              ) : (
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)', fontWeight: 600 }}>Nothing logged yet</span>
              )}
            </div>
          </div>
          <ChevronRight size={16} color="rgba(255,255,255,0.22)" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.25s', marginLeft: '6px', flexShrink: 0 }} />
        </div>

        {/* Expanded Items */}
        {isExpanded && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Empty state placeholder */}
            {items.length === 0 && (
              <div style={{
                margin: '0.6rem 0.75rem',
                padding: '1rem',
                border: '1.5px dashed rgba(255,255,255,0.1)',
                borderRadius: '14px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.25)',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}>
                Tap + to add food
              </div>
            )}

            {items.length > 0 && (
              <div style={{ padding: '0.4rem 0.75rem 0' }}>
                {items.map(item => {
                  const isEditing = editingEntry?.id === item.id;
                  const hasError = editingEntry?.id === item.id && !!editingEntry?.error;
                  return (
                    <SwipeReveal
                      key={item.id}
                      onDelete={() => {
                        removeFoodEntry(todayDate, mealType, item.id);
                        showToast(`${item.foodName} removed`, 'info');
                      }}
                    >
                      {isEditing ? (
                        <div style={{ marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.foodName}</span>
                            <input
                              type="number" step="0.5" min="0.5" autoFocus
                              value={editingEntry.amount}
                              onChange={e => setEditingEntry(prev => prev ? { ...prev, amount: e.target.value, error: undefined } : null)}
                              onKeyDown={e => { if (e.key === 'Enter') handleEditConfirm(); if (e.key === 'Escape') setEditingEntry(null); }}
                              style={{
                                width: '64px', padding: '0.3rem 0.5rem', fontSize: '0.9rem', fontWeight: 700,
                                textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.1)',
                                border: `1px solid ${hasError ? '#f87171' : 'rgba(255,255,255,0.2)'}`,
                                borderRadius: '8px', color: '#fff', outline: 'none',
                              }}
                            />
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>srv</span>
                            <button onClick={handleEditConfirm} style={{ background: '#4ade80', border: 'none', borderRadius: '7px', padding: '0.35rem', display: 'flex', cursor: 'pointer' }}>
                              <Check size={14} color="#000" />
                            </button>
                            <button onClick={() => setEditingEntry(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '7px', padding: '0.35rem', display: 'flex', cursor: 'pointer' }}>
                              <X size={14} color="rgba(255,255,255,0.5)" />
                            </button>
                          </div>
                          {hasError && (
                            <div style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 600, marginTop: '4px', paddingLeft: '0.6rem' }}>
                              {editingEntry.error}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.5rem', borderRadius: '12px', marginBottom: '4px', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.02)' }}
                          onClick={() => setEditingEntry({ id: item.id, mealType, amount: String(item.amount) })}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.foodName}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginTop: '2px' }}>
                              {Math.round(item.amount * item.servingSize)}{item.servingUnit}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, paddingLeft: '8px' }}>
                            {/* Protein chip */}
                            <div style={{
                              padding: '2px 7px', borderRadius: '99px',
                              backgroundColor: 'rgba(251,146,60,0.12)',
                              border: '1px solid rgba(251,146,60,0.25)',
                            }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-protein)', fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round(item.nutrition.protein * item.amount)}P
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{Math.round(item.nutrition.calories * item.amount)}</div>
                              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>kcal</div>
                            </div>
                            <Pencil size={11} color="rgba(255,255,255,0.18)" />
                          </div>
                        </div>
                      )}
                    </SwipeReveal>
                  );
                })}
              </div>
            )}

            {/* Action row */}
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: items.length > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setActiveMeal(mealType); setShowSearch(true); }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.75rem', color: '#000', background: accent, border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <Search size={15} /> Add Food
                </button>
                {state.savedMeals.length > 0 && (
                  <button
                    onClick={() => { setActiveMeal(mealType); setShowSavedMeals(true); }}
                    title="Saved meals"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', cursor: 'pointer', gap: '5px', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    <BookOpen size={14} /> Meals
                  </button>
                )}
              </div>
              {items.length > 0 && (
                allSetsDone ? (
                  /* Confirmation state after saving */
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.55rem', backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px' }}>
                    <Check size={14} color="#4ade80" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4ade80' }}>Meal saved!</span>
                  </div>
                ) : savingMealType === mealType ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      autoFocus type="text" placeholder="Name this meal…"
                      value={saveMealName}
                      onChange={e => setSaveMealName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveMeal(mealType); if (e.key === 'Escape') setSavingMealType(null); }}
                      style={{ flex: 1, padding: '0.6rem 0.75rem', fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#fff', outline: 'none' }}
                    />
                    <button
                      onClick={() => handleSaveMeal(mealType)}
                      disabled={!saveMealName.trim()}
                      style={{ padding: '0.6rem 0.9rem', background: '#4ade80', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', color: '#000', cursor: 'pointer', opacity: saveMealName.trim() ? 1 : 0.4 }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setSavingMealType(null); setSaveMealName(''); }}
                      style={{ padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setSavingMealType(mealType); setSaveMealName(''); }}
                    style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    + Save as meal template
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '1rem', paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))', backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }} className="animate-fade-in">

      {/* ── Header ── */}
      <div style={{ paddingTop: '0.5rem', marginBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Food Log</h1>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '2px' }}>{dateLabel}</p>
          </div>
          {targets && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: isOver ? '#f87171' : '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {isOver ? `+${Math.abs(calRemaining)}` : calRemaining}
                <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, marginLeft: '4px' }}>kcal {isOver ? 'over' : 'left'}</span>
              </div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginTop: '2px' }}>{calLogged} / {calTarget} logged</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Macro remaining pills ── */}
      {targets && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <MacroRemainingPill remaining={proRemaining} label="P" color="var(--color-protein)" />
          <MacroRemainingPill remaining={carbRemaining} label="C" color="var(--color-carbs)" />
          <MacroRemainingPill remaining={fatRemaining} label="F" color="var(--color-fats)" />
        </div>
      )}

      {/* ── Copy from Yesterday Banner ── */}
      {showCopyYesterday && !copiedYesterday && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(96,165,250,0.08)',
          border: '1px solid rgba(96,165,250,0.2)',
          borderRadius: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Copy size={15} color="var(--accent-blue, #60a5fa)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>Yesterday's meals available</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleCopyFromYesterday}
              style={{ padding: '0.4rem 0.85rem', background: 'var(--accent-blue, #60a5fa)', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.78rem', color: '#000', cursor: 'pointer' }}
            >
              Copy
            </button>
            <button
              onClick={() => setShowCopyYesterday(false)}
              style={{ padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={13} color="rgba(255,255,255,0.4)" />
            </button>
          </div>
        </div>
      )}

      {/* ── Daily Summary Card ── */}
      {targets && (
        <div style={{
          backgroundColor: 'var(--bg-card)', borderRadius: '20px',
          border: `1px solid ${isOver ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.07)'}`,
          padding: '1rem 1.1rem 0.9rem', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: isOver ? 'linear-gradient(90deg, transparent, #f87171, transparent)' : 'linear-gradient(90deg, transparent, #60a5fa, transparent)' }} />

          {/* Progress bar */}
          <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{
              height: '100%', width: `${calPct}%`,
              background: isOver ? 'linear-gradient(90deg, #f87171, #ef4444)' : calPct > 80 ? 'linear-gradient(90deg, #60a5fa, #fb923c)' : 'linear-gradient(90deg, #60a5fa, #a78bfa)',
              borderRadius: '3px', transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Macro grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Protein', val: dayTotals.protein, target: proTarget, color: 'var(--color-protein)', unit: 'g' },
              { label: 'Carbs', val: dayTotals.carbs, target: carbTarget, color: 'var(--color-carbs)', unit: 'g' },
              { label: 'Fats', val: dayTotals.fats, target: fatTarget, color: 'var(--color-fats)', unit: 'g' },
              { label: isOver ? 'Over' : 'Left', val: Math.abs(calRemaining), target: calTarget, color: isOver ? '#f87171' : '#4ade80', unit: 'kcal' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: m.color, fontVariantNumeric: 'tabular-nums' }}>{Math.round(m.val)}</span>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{m.unit}</span>
                </div>
                <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (m.val / m.target) * 100)}%`, backgroundColor: m.color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Meal Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(renderMealCard)}
      </div>

      {/* ── Saved Meals Sheet ── */}
      <SlideOver isOpen={showSavedMeals} onClose={() => setShowSavedMeals(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <button onClick={() => setShowSavedMeals(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>←</button>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Saved Meals</h2>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: '1px' }}>Tap to log to {activeMeal}</p>
            </div>
          </div>
          {state.savedMeals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)' }}>
              <BookOpen size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.88rem' }}>No saved meals yet.</p>
              <p style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.7 }}>Log a full meal and tap "Save as meal template".</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {state.savedMeals.map(meal => (
                <div key={meal.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.1rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{meal.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                      {Math.round(meal.totalNutrition.calories)} kcal · {meal.entries.length} items · used {meal.timesUsed}×
                    </div>
                  </div>
                  <button
                    onClick={() => { logSavedMeal(todayDate, activeMeal, meal.id); showToast(`${meal.name} added`, 'success'); setShowSavedMeals(false); }}
                    style={{ padding: '0.55rem 1.1rem', backgroundColor: MEAL_ACCENT[activeMeal], color: '#000', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SlideOver>

      {/* ── Food Search Slide Over ── */}
      <SlideOver isOpen={showSearch} onClose={() => setShowSearch(false)}>
        {showSearch && (
          <FoodSearch mealType={activeMeal} onAdd={handleAddFood} onCancel={() => setShowSearch(false)} />
        )}
      </SlideOver>
    </div>
  );
};

export default LogFood;
