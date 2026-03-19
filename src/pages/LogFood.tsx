import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, BookOpen, Pencil, Check, X, Plus, ChevronDown } from 'lucide-react';
import { MealType, FoodItem } from '../types';
import { FoodSearch } from './FoodSearch';
import { getLocalISOString } from '../utils/dateUtils';
import { SwipeReveal, SlideOver } from '../components/MotionUI';
import { getMacrosFromLog } from '../utils/aiCoachingEngine';

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snacks: '🍎',
};

// Determine which meal to auto-expand based on time of day
const getDefaultMeal = (): MealType => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  return 'dinner';
};

interface PendingDelete {
  entryId: string;
  mealType: MealType;
  foodName: string;
  food: FoodItem;
  amount: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

// ─── date helpers ────────────────────────────────────────────────────────────

const offsetDate = (base: string, delta: number): string => {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
};

const formatDateLabel = (dateStr: string, todayDate: string): string => {
  const yesterday = offsetDate(todayDate, -1);
  if (dateStr === todayDate) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
};

export const LogFood: React.FC = () => {
  const { state, addFoodToLog, removeFoodEntry, editFoodEntry, logSavedMeal, saveMeal, showToast } = useApp();

  const defaultMeal = getDefaultMeal();
  const todayDate = getLocalISOString();

  // ── Date navigation ──────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const isToday = selectedDate === todayDate;
  const canGoForward = selectedDate < todayDate;

  const [activeMeal, setActiveMeal] = useState<MealType>(defaultMeal);
  const [showSearch, setShowSearch] = useState(false);
  const [showSavedMeals, setShowSavedMeals] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Partial<Record<MealType, boolean>>>({ [defaultMeal]: true });
  const [editingEntry, setEditingEntry] = useState<{ id: string; mealType: MealType; amount: string; error?: string } | null>(null);
  const [saveMealName, setSaveMealName] = useState('');
  const [saveMealError, setSaveMealError] = useState('');
  const [savingMealType, setSavingMealType] = useState<MealType | null>(null);
  const [savedMealConfirm, setSavedMealConfirm] = useState<MealType | null>(null);
  const [showCopyYesterday, setShowCopyYesterday] = useState(false);
  const [copiedYesterday, setCopiedYesterday] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const prevDate = offsetDate(selectedDate, -1);
  const prevDateLog = state.logs[prevDate];
  const prevDateHasData = isToday && prevDateLog && (
    Object.values(prevDateLog.meals).some(entries => entries.length > 0)
  );

  useEffect(() => {
    if (prevDateHasData) setShowCopyYesterday(true);
  }, [prevDateHasData]);

  const todayLog = state.logs[selectedDate] || {
    id: selectedDate, date: selectedDate, steps: 0, waterGlasses: 0,
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
    addFoodToLog(selectedDate, activeMeal, food, amount);
    showToast(`${food.name} added`, 'success');
    setShowSearch(false);
  };

  const handleEditConfirm = () => {
    if (!editingEntry) return;
    const newAmount = parseFloat(editingEntry.amount);
    if (!newAmount || newAmount <= 0) {
      setEditingEntry(prev => prev ? { ...prev, error: 'Amount must be greater than 0' } : null);
      return;
    }
    editFoodEntry(selectedDate, editingEntry.mealType, editingEntry.id, newAmount);
    showToast('Serving updated', 'success');
    setEditingEntry(null);
  };

  const handleSaveMeal = (mealType: MealType) => {
    const items = todayLog.meals[mealType] || [];
    if (saveMealName.trim().length < 3) {
      setSaveMealError('Enter a name with at least 3 characters');
      return;
    }
    if (items.length === 0) return;
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
    setSaveMealError('');
    setSavingMealType(null);
    setSavedMealConfirm(mealType);
    setTimeout(() => setSavedMealConfirm(null), 2500);
  };

  const handleDeleteEntry = (mealType: MealType, entryId: string, foodName: string, food: FoodItem, amount: number) => {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timeoutId);
      removeFoodEntry(selectedDate, pendingDelete.mealType, pendingDelete.entryId);
    }
    const timeoutId = setTimeout(() => {
      removeFoodEntry(selectedDate, mealType, entryId);
      setPendingDelete(null);
    }, 4000);
    setPendingDelete({ entryId, mealType, foodName, food, amount, timeoutId });
  };

  const handleUndoDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeoutId);
    addFoodToLog(todayDate, pendingDelete.mealType, pendingDelete.food, pendingDelete.amount);
    setPendingDelete(null);
  };

  const handleCopyFromYesterday = () => {
    if (!prevDateLog) return;
    const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
    let count = 0;
    meals.forEach(mealType => {
      const entries = prevDateLog.meals[mealType] || [];
      entries.forEach(item => {
        const food: FoodItem = {
          id: item.foodId, name: item.foodName,
          calories: item.nutrition.calories, protein: item.nutrition.protein,
          carbs: item.nutrition.carbs, fats: item.nutrition.fats,
          servingSize: item.servingSize, servingUnit: item.servingUnit,
        };
        addFoodToLog(selectedDate, mealType, food, item.amount);
        count++;
      });
    });
    setCopiedYesterday(true);
    setShowCopyYesterday(false);
    showToast(`Copied ${count} items from yesterday`, 'success');
  };

  const dateLabel = formatDateLabel(selectedDate, todayDate);

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.3)',
  };

  const cardBase: React.CSSProperties = {
    background: 'var(--bg-card)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    overflow: 'hidden',
  };

  const renderMealCard = (mealType: MealType) => {
    const items = todayLog.meals[mealType] || [];
    const mealCals = items.reduce((s, i) => s + i.nutrition.calories * i.amount, 0);
    const mealPro = items.reduce((s, i) => s + i.nutrition.protein * i.amount, 0);
    const mealCarbs = items.reduce((s, i) => s + i.nutrition.carbs * i.amount, 0);
    const mealFats = items.reduce((s, i) => s + i.nutrition.fats * i.amount, 0);
    const isExpanded = !!expandedMeals[mealType];
    const hasItems = items.length > 0;
    const allSetsDone = savedMealConfirm === mealType;

    return (
      <div
        key={mealType}
        style={{
          ...cardBase,
          borderLeft: isExpanded && hasItems ? '3px solid rgba(10,132,255,0.35)' : undefined,
          transition: 'border 0.2s ease',
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.85rem 0.9rem', cursor: 'pointer',
          }}
          onClick={() => setExpandedMeals(prev => ({ ...prev, [mealType]: !prev[mealType] }))}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            {/* Meal icon */}
            <div style={{
              fontSize: '1.1rem', width: 36, height: 36,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              {MEAL_ICONS[mealType]}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                  {mealType}
                </span>
                {hasItems && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(mealCals)} <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>kcal</span>
                  </span>
                )}
              </div>
              {hasItems ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <span style={{ fontSize: '0.63rem', fontWeight: 800, color: 'var(--color-protein)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(mealPro)}P</span>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.12)' }}>·</span>
                  <span style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--color-carbs)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(mealCarbs)}C</span>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.12)' }}>·</span>
                  <span style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--color-fats)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(mealFats)}F</span>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.12)' }}>·</span>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.22)', fontWeight: 600 }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
              ) : (
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, marginTop: '2px', display: 'block' }}>Tap + to log food</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Add button */}
            <button
              onClick={e => { e.stopPropagation(); setActiveMeal(mealType); setExpandedMeals(prev => ({ ...prev, [mealType]: true })); setShowSearch(true); }}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                backgroundColor: 'var(--accent-blue)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Plus size={15} color="#fff" />
            </button>
            {/* Collapse chevron */}
            <ChevronDown
              size={16}
              color="rgba(255,255,255,0.2)"
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease',
              }}
            />
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

            {/* Empty state */}
            {items.length === 0 && (
              <div style={{
                margin: '0.75rem',
                padding: '1rem',
                border: '1.5px dashed rgba(255,255,255,0.08)',
                borderRadius: '14px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.2)',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}>
                Tap + to add food
              </div>
            )}

            {/* Food entries */}
            {items.length > 0 && (
              <div style={{ padding: '0.4rem 0.75rem 0' }}>
                {items.map((item, idx) => {
                  const isEditing = editingEntry?.id === item.id;
                  const hasError = editingEntry?.id === item.id && !!editingEntry?.error;
                  const isPendingDelete = pendingDelete?.entryId === item.id;

                  if (isPendingDelete) return null;

                  return (
                    <SwipeReveal
                      key={item.id}
                      onDelete={() => {
                        const food: FoodItem = {
                          id: item.foodId, name: item.foodName,
                          calories: item.nutrition.calories, protein: item.nutrition.protein,
                          carbs: item.nutrition.carbs, fats: item.nutrition.fats,
                          servingSize: item.servingSize, servingUnit: item.servingUnit,
                        };
                        handleDeleteEntry(mealType, item.id, item.foodName, food, item.amount);
                      }}
                    >
                      {/* Thin divider between entries (not above first) */}
                      {idx > 0 && !isEditing && (
                        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)', margin: '0 0.25rem' }} />
                      )}

                      {isEditing ? (
                        <div style={{ marginBottom: '4px', paddingTop: idx > 0 ? '4px' : 0 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '0.6rem',
                            backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '12px',
                          }}>
                            <span style={{
                              fontSize: '0.85rem', fontWeight: 600,
                              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{item.foodName}</span>
                            <input
                              type="number" step="0.5" min="0.5" autoFocus
                              value={editingEntry.amount}
                              onChange={e => setEditingEntry(prev => prev ? { ...prev, amount: e.target.value, error: undefined } : null)}
                              onKeyDown={e => { if (e.key === 'Enter') handleEditConfirm(); if (e.key === 'Escape') setEditingEntry(null); }}
                              style={{
                                width: '64px', padding: '0.3rem 0.5rem', fontSize: '0.9rem', fontWeight: 700,
                                textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.1)',
                                border: `1px solid ${hasError ? 'var(--accent-red)' : 'rgba(255,255,255,0.2)'}`,
                                borderRadius: '8px', color: '#fff', outline: 'none',
                              }}
                            />
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>srv</span>
                            <button
                              onClick={handleEditConfirm}
                              disabled={!editingEntry.amount || parseFloat(editingEntry.amount) <= 0}
                              style={{
                                background: (!editingEntry.amount || parseFloat(editingEntry.amount) <= 0)
                                  ? 'rgba(50,215,75,0.3)' : 'var(--accent-green)',
                                border: 'none', borderRadius: '7px', padding: '0.35rem',
                                display: 'flex', cursor: 'pointer',
                              }}
                            >
                              <Check size={14} color="#000" />
                            </button>
                            <button
                              onClick={() => setEditingEntry(null)}
                              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '7px', padding: '0.35rem', display: 'flex', cursor: 'pointer' }}
                            >
                              <X size={14} color="rgba(255,255,255,0.5)" />
                            </button>
                          </div>
                          {hasError && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--accent-red)', fontWeight: 600, marginTop: '4px', paddingLeft: '0.6rem' }}>
                              {editingEntry.error}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.55rem 0.25rem', cursor: 'pointer',
                          }}
                          onClick={() => setEditingEntry({ id: item.id, mealType, amount: String(item.amount) })}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.87rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                              {item.foodName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                {Math.round(item.amount * item.servingSize)}{item.servingUnit}
                              </span>
                              <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.12)' }}>·</span>
                              <span style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--color-protein)', fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round(item.nutrition.protein * item.amount)}P
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, paddingLeft: '8px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.92rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                                {Math.round(item.nutrition.calories * item.amount)}
                              </div>
                              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.22)', fontWeight: 700 }}>kcal</div>
                            </div>
                            <Pencil size={11} color="rgba(255,255,255,0.15)" />
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
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', padding: '0.7rem',
                    color: '#fff', background: 'rgba(10,132,255,0.15)',
                    border: '1px solid rgba(10,132,255,0.25)',
                    borderRadius: '14px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                  }}
                >
                  <Plus size={15} color="var(--accent-blue)" /> Add Food
                </button>
                {state.savedMeals.length > 0 && (
                  <button
                    onClick={() => { setActiveMeal(mealType); setShowSavedMeals(true); }}
                    title="Saved meals"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0.7rem 1rem',
                      color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px', cursor: 'pointer', gap: '5px',
                      fontSize: '0.78rem', fontWeight: 700,
                    }}
                  >
                    <BookOpen size={14} /> Meals
                  </button>
                )}
              </div>

              {items.length > 0 && (
                allSetsDone ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '0.55rem',
                    backgroundColor: 'rgba(50,215,75,0.08)',
                    border: '1px solid rgba(50,215,75,0.18)',
                    borderRadius: '10px',
                  }}>
                    <Check size={14} color="var(--accent-green)" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-green)' }}>Meal saved!</span>
                  </div>
                ) : savingMealType === mealType ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        autoFocus type="text" placeholder="Name this meal…"
                        value={saveMealName}
                        onChange={e => { setSaveMealName(e.target.value); setSaveMealError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveMeal(mealType); if (e.key === 'Escape') { setSavingMealType(null); setSaveMealError(''); } }}
                        style={{
                          flex: 1, padding: '0.6rem 0.75rem', fontSize: '0.85rem',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          border: `1px solid ${saveMealError ? 'var(--accent-red)' : 'rgba(255,255,255,0.12)'}`,
                          borderRadius: '10px', color: '#fff', outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handleSaveMeal(mealType)}
                        disabled={saveMealName.trim().length < 3}
                        style={{
                          padding: '0.6rem 0.9rem', background: 'var(--accent-green)',
                          border: 'none', borderRadius: '10px', fontWeight: 800,
                          fontSize: '0.8rem', color: '#000', cursor: 'pointer',
                          opacity: saveMealName.trim().length >= 3 ? 1 : 0.4,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setSavingMealType(null); setSaveMealName(''); setSaveMealError(''); }}
                        style={{ padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    {saveMealError && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--accent-red)', fontWeight: 600, paddingLeft: '2px' }}>
                        {saveMealError}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { setSavingMealType(mealType); setSaveMealName(''); setSaveMealError(''); }}
                    style={{
                      width: '100%', padding: '0.5rem',
                      background: 'transparent',
                      border: '1px dashed rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      color: 'rgba(255,255,255,0.25)', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
                    }}
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
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
        paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
      }}
      className="animate-fade-in"
    >

      {/* ── DAILY SUMMARY HEADER ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(10,132,255,0.09) 0%, transparent 100%)',
        padding: '14px 16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Date navigation row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { setSelectedDate(d => offsetDate(d, -1)); setCopiedYesterday(false); }}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{dateLabel}</div>
              {!isToday && (
                <button onClick={() => setSelectedDate(todayDate)}
                  style={{ background: 'none', border: 'none', fontSize: '0.62rem', fontWeight: 700, color: 'var(--accent-blue)', cursor: 'pointer', padding: '2px 0' }}>
                  Back to today
                </button>
              )}
            </div>
            <button
              onClick={() => { if (canGoForward) setSelectedDate(d => offsetDate(d, 1)); }}
              disabled={!canGoForward}
              style={{ background: canGoForward ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${canGoForward ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`, borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canGoForward ? 'pointer' : 'default', color: canGoForward ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <span style={{
            fontSize: '0.65rem', fontWeight: 800,
            color: isOver ? 'var(--accent-red)' : calPct >= 90 ? '#fbbf24' : 'var(--accent-blue)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '3px 9px', borderRadius: '50px',
            backgroundColor: isOver ? 'rgba(255,69,58,0.1)' : calPct >= 90 ? 'rgba(251,191,36,0.1)' : 'rgba(10,132,255,0.1)',
            border: `1px solid ${isOver ? 'rgba(255,69,58,0.2)' : calPct >= 90 ? 'rgba(251,191,36,0.2)' : 'rgba(10,132,255,0.2)'}`,
          }}>
            {isOver ? 'Over' : calPct >= 90 ? 'Nearly there' : `${Math.round(calPct)}% logged`}
          </span>
        </div>

        {/* Calorie row: logged / target */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div style={{
              fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
              color: isOver ? 'var(--accent-red)' : 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {calLogged.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: '4px' }}>
              kcal logged
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {isOver
                ? <span style={{ color: 'var(--accent-red)' }}>+{Math.abs(calRemaining).toLocaleString()}</span>
                : calRemaining.toLocaleString()
              }
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', fontWeight: 700, marginTop: '3px' }}>
              {isOver ? 'over' : 'remaining'} · {calTarget.toLocaleString()} goal
            </div>
          </div>
        </div>

        {/* Calorie progress bar */}
        <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '14px' }}>
          <div style={{
            height: '100%', width: `${Math.min(calPct, 100)}%`,
            background: isOver
              ? 'linear-gradient(90deg, #ef4444, var(--accent-red))'
              : calPct > 80
                ? 'linear-gradient(90deg, var(--accent-blue), #fbbf24)'
                : 'linear-gradient(90deg, var(--accent-blue), #5AC8FA)',
            borderRadius: '3px', transition: 'width 0.5s ease',
          }} />
        </div>

        {/* Macro bars */}
        {targets && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'Protein', key: 'P', logged: Math.round(dayTotals.protein), target: proTarget, color: 'var(--color-protein)', bg: 'rgba(255,159,10,0.15)' },
              { label: 'Carbs',   key: 'C', logged: Math.round(dayTotals.carbs),   target: carbTarget, color: 'var(--color-carbs)',   bg: 'rgba(48,209,88,0.12)' },
              { label: 'Fats',    key: 'F', logged: Math.round(dayTotals.fats),    target: fatTarget,  color: 'var(--color-fats)',    bg: 'rgba(255,69,58,0.12)' },
            ].map(m => {
              const pct = Math.min(100, (m.logged / Math.max(1, m.target)) * 100);
              const over = m.logged > m.target;
              return (
                <div key={m.key} style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  padding: '8px 10px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.key}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: over ? 'var(--accent-red)' : m.color, fontVariantNumeric: 'tabular-nums' }}>
                      {m.logged}<span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>/{m.target}g</span>
                    </span>
                  </div>
                  <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      backgroundColor: over ? 'var(--accent-red)' : m.color,
                      borderRadius: '2px', transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Page content ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px' }}>

        {/* ── Undo delete banner ── */}
        {pendingDelete && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.65rem 0.9rem',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              Removed {pendingDelete.foodName}
            </span>
            <button
              onClick={handleUndoDelete}
              style={{
                padding: '0.35rem 0.85rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '8px', fontWeight: 800, fontSize: '0.78rem', color: '#fff', cursor: 'pointer',
              }}
            >
              Undo
            </button>
          </div>
        )}

        {/* ── MEAL SECTIONS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(renderMealCard)}
        </div>

        {/* ── SAVED MEALS SECTION ── */}
        {state.savedMeals.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <div style={{ ...sectionLabel, marginBottom: '10px', paddingLeft: '2px' }}>Saved Meals</div>
            <div style={{
              display: 'flex', gap: '10px',
              overflowX: 'auto', paddingBottom: '4px',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}>
              {state.savedMeals.map(meal => (
                <div
                  key={meal.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    padding: '10px 14px',
                    minWidth: '120px',
                    flexShrink: 0,
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                    {meal.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                    {Math.round(meal.totalNutrition.calories)} kcal
                  </div>
                  <button
                    onClick={() => { setActiveMeal(activeMeal); setShowSavedMeals(true); }}
                    style={{
                      padding: '4px 0', background: 'rgba(10,132,255,0.12)',
                      border: '1px solid rgba(10,132,255,0.2)',
                      borderRadius: '8px', color: 'var(--accent-blue)',
                      fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer',
                    }}
                  >
                    Add +
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COPY FROM YESTERDAY BANNER ── */}
        {showCopyYesterday && !copiedYesterday && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: '44px', paddingLeft: '14px', paddingRight: '8px',
            backgroundColor: 'rgba(10,132,255,0.08)',
            border: '1px solid rgba(10,132,255,0.15)',
            borderRadius: '14px',
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📋 Copy meals from {formatDateLabel(prevDate, todayDate).toLowerCase()}
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                onClick={handleCopyFromYesterday}
                style={{
                  padding: '0.35rem 0.85rem',
                  background: 'var(--accent-blue)',
                  border: 'none', borderRadius: '10px',
                  fontWeight: 800, fontSize: '0.78rem', color: '#fff', cursor: 'pointer',
                }}
              >
                Copy →
              </button>
              <button
                onClick={() => setShowCopyYesterday(false)}
                style={{ padding: '0.35rem', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={13} color="rgba(255,255,255,0.4)" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Saved Meals Sheet ── */}
      <SlideOver isOpen={showSavedMeals} onClose={() => setShowSavedMeals(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowSavedMeals(false)}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}
            >
              ←
            </button>
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
                <div
                  key={meal.id}
                  style={{
                    ...cardBase,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1rem 1.1rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{meal.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                      {Math.round(meal.totalNutrition.calories)} kcal · {meal.entries.length} items · used {meal.timesUsed}×
                    </div>
                  </div>
                  <button
                    onClick={() => { logSavedMeal(selectedDate, activeMeal, meal.id); showToast(`${meal.name} added`, 'success'); setShowSavedMeals(false); }}
                    style={{
                      padding: '0.55rem 1.1rem',
                      backgroundColor: 'var(--accent-blue)',
                      color: '#fff', border: 'none', borderRadius: '12px',
                      fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                    }}
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
