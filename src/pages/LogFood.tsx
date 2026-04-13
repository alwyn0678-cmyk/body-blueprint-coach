import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, BookOpen, Pencil, Check, X, Plus, ChevronDown, Camera } from 'lucide-react';
import { MealType, FoodItem } from '../types';
import { FoodSearch } from './FoodSearch';
import { FoodScanner } from './FoodScanner';
import { getLocalISOString } from '../utils/dateUtils';
import { SwipeReveal, SlideOver } from '../components/MotionUI';
import { RecipeLibrary } from '../components/RecipeLibrary';
import { getMacrosFromLog } from '../utils/aiCoachingEngine';

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snacks: '🍎',
  dessert: '🍰',
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
  const isFuture = selectedDate > todayDate;
  const maxFutureDate = offsetDate(todayDate, 14); // allow up to 2 weeks ahead
  const canGoForward = selectedDate < maxFutureDate;

  const [activeMeal, setActiveMeal] = useState<MealType>(defaultMeal);
  const [showSearch, setShowSearch] = useState(false);
  const [showSavedMeals, setShowSavedMeals] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Partial<Record<MealType, boolean>>>({});
  const [editingEntry, setEditingEntry] = useState<{ id: string; mealType: MealType; amount: string; error?: string } | null>(null);
  const [saveMealName, setSaveMealName] = useState('');
  const [saveMealError, setSaveMealError] = useState('');
  const [savingMealType, setSavingMealType] = useState<MealType | null>(null);
  const [savedMealConfirm, setSavedMealConfirm] = useState<MealType | null>(null);
  const [showCopyYesterday, setShowCopyYesterday] = useState(false);
  const [copiedYesterday, setCopiedYesterday] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showRecipeLibrary, setShowRecipeLibrary] = useState(false);

  const prevDate = offsetDate(selectedDate, -1);
  const prevDateLog = state.logs[prevDate];
  const prevDateHasData = !!prevDateLog && (
    Object.values(prevDateLog.meals).some(entries => entries.length > 0)
  );

  const todayLog = state.logs[selectedDate] ?? {
    id: selectedDate, date: selectedDate, steps: 0, waterGlasses: 0,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [], dessert: [] },
    workouts: [], health: {}, adherenceScore: 0,
  };

  // Whether the currently-viewed date has any food logged (used for copy-to-next banner)
  const currentDayHasData = Object.values(todayLog.meals).some(entries => entries.length > 0);
  const nextDate = offsetDate(selectedDate, 1);
  const canCopyToNext = currentDayHasData && selectedDate < maxFutureDate;

  useEffect(() => {
    if (prevDateHasData) setShowCopyYesterday(true);
  }, [prevDateHasData]);

  const dayTotals = getMacrosFromLog(todayLog);
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

  const handleAddFood = (food: FoodItem, amount: number, mealType?: MealType) => {
    if (amount <= 0) {
      showToast('Amount must be greater than 0', 'error');
      return;
    }
    addFoodToLog(selectedDate, mealType ?? activeMeal, food, amount);
    showToast(`${food.name} added`, 'success');
    setShowSearch(false);
  };

  const handleEditConfirm = () => {
    if (!editingEntry) return;
    const newAmount = parseFloat(editingEntry.amount);
    if (!isFinite(newAmount) || newAmount <= 0) {
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
    const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'];
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
    const prevLabel = formatDateLabel(prevDate, todayDate).toLowerCase();
    showToast(`Copied ${count} items from ${prevLabel}`, 'success');
  };

  const handleCopyToNextDay = () => {
    const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'];
    let count = 0;
    meals.forEach(mealType => {
      const entries = todayLog.meals[mealType] || [];
      entries.forEach(item => {
        const food: FoodItem = {
          id: item.foodId, name: item.foodName,
          calories: item.nutrition.calories, protein: item.nutrition.protein,
          carbs: item.nutrition.carbs, fats: item.nutrition.fats,
          servingSize: item.servingSize, servingUnit: item.servingUnit,
        };
        addFoodToLog(nextDate, mealType, food, item.amount);
        count++;
      });
    });
    const nextLabel = formatDateLabel(nextDate, todayDate).toLowerCase();
    showToast(`Copied ${count} items to ${nextLabel}`, 'success');
    setSelectedDate(nextDate);
  };

  const dateLabel = formatDateLabel(selectedDate, todayDate);

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'rgba(0,0,0,0.20)',
  };

  const cardBase: React.CSSProperties = {
    // glass styles applied via className="meal-section-card"
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
        className="meal-section-card"
        style={{
          ...cardBase,
          borderLeft: isExpanded && hasItems ? '3px solid rgba(87,96,56,0.40)' : undefined,
          transition: 'border-left 0.2s ease',
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
            {/* Meal icon — glass badge */}
            <div style={{
              fontSize: '1.15rem', width: 40, height: 40,
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.88)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
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
                    {Math.round(mealCals)} <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(0,0,0,0.20)' }}>kcal</span>
                  </span>
                )}
              </div>
              {hasItems ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <span style={{ fontSize: '0.63rem', fontWeight: 800, color: 'var(--color-protein)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(mealPro)}P</span>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(0,0,0,0.08)' }}>·</span>
                  <span style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--color-carbs)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(mealCarbs)}C</span>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(0,0,0,0.08)' }}>·</span>
                  <span style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--color-fats)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(mealFats)}F</span>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(0,0,0,0.08)' }}>·</span>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(0,0,0,0.14)', fontWeight: 600 }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
              ) : (
                <span style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.13)', fontWeight: 600, marginTop: '2px', display: 'block' }}>Tap + to log food</span>
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
              color="rgba(0,0,0,0.13)"
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease',
              }}
            />
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.45)' }}>

            {/* Empty state */}
            {items.length === 0 && (
              <div style={{
                margin: '0.75rem',
                padding: '1rem',
                border: '1.5px dashed rgba(0,0,0,0.06)',
                borderRadius: '14px',
                textAlign: 'center',
                color: 'rgba(0,0,0,0.13)',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}>
                Tap + to add food
              </div>
            )}

            {/* Food entries */}
            {items.length > 0 && (
              <div style={{ padding: '6px 10px 2px' }}>
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
                      {/* Space handled by glass card margin — no divider needed */}

                      {isEditing ? (
                        <div style={{ marginBottom: '4px', paddingTop: idx > 0 ? '4px' : 0 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '0.6rem',
                            backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '12px',
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
                                textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.07)',
                                border: `1px solid ${hasError ? 'var(--accent-red)' : 'rgba(0,0,0,0.13)'}`,
                                borderRadius: '8px', color: 'var(--text-primary)', outline: 'none',
                              }}
                            />
                            <span style={{ fontSize: '0.68rem', color: 'rgba(0,0,0,0.24)' }}>srv</span>
                            <button
                              onClick={handleEditConfirm}
                              disabled={!editingEntry.amount || parseFloat(editingEntry.amount) <= 0}
                              style={{
                                background: (!editingEntry.amount || parseFloat(editingEntry.amount) <= 0)
                                  ? 'rgba(87,96,56,0.20)' : 'var(--accent-green)',
                                border: 'none', borderRadius: '7px', padding: '0.35rem',
                                display: 'flex', cursor: 'pointer',
                              }}
                            >
                              <Check size={14} color="#fff" />
                            </button>
                            <button
                              onClick={() => setEditingEntry(null)}
                              style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '7px', padding: '0.35rem', display: 'flex', cursor: 'pointer' }}
                            >
                              <X size={14} color="rgba(0,0,0,0.35)" />
                            </button>
                          </div>
                          {hasError && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--accent-red)', fontWeight: 600, marginTop: '4px', paddingLeft: '0.6rem' }}>
                              {editingEntry.error}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ── Glass food item card ── */
                        <div
                          className="food-item-card"
                          onClick={() => setEditingEntry({ id: item.id, mealType, amount: String(item.amount) })}
                        >
                          {/* Left: name + macro pills */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.86rem', fontWeight: 700,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              color: 'var(--text-primary)', marginBottom: 5,
                            }}>
                              {item.foodName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.6rem', fontWeight: 700,
                                color: 'var(--text-tertiary)',
                                background: 'rgba(0,0,0,0.05)',
                                padding: '2px 6px', borderRadius: 6,
                              }}>
                                {Math.round(item.amount * item.servingSize)}{item.servingUnit}
                              </span>
                              <span className="glass-badge macro-pill-protein" style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px' }}>
                                {Math.round(item.nutrition.protein * item.amount)}P
                              </span>
                              <span className="glass-badge macro-pill-carbs" style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px' }}>
                                {Math.round(item.nutrition.carbs * item.amount)}C
                              </span>
                              <span className="glass-badge macro-pill-fats" style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px' }}>
                                {Math.round(item.nutrition.fats * item.amount)}F
                              </span>
                            </div>
                          </div>

                          {/* Right: calories + edit icon */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, paddingLeft: '10px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{
                                fontSize: '1.05rem', fontWeight: 900,
                                fontVariantNumeric: 'tabular-nums',
                                color: 'var(--accent-orange)',
                                letterSpacing: '-0.02em', lineHeight: 1,
                              }}>
                                {Math.round(item.nutrition.calories * item.amount)}
                              </div>
                              <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>kcal</div>
                            </div>
                            <div style={{
                              width: 26, height: 26, borderRadius: 8,
                              background: 'rgba(87,96,56,0.08)',
                              border: '1px solid rgba(87,96,56,0.14)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <Pencil size={11} color="var(--accent-primary)" />
                            </div>
                          </div>
                        </div>
                      )}
                    </SwipeReveal>
                  );
                })}
              </div>
            )}

            {/* Action row */}
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: items.length > 0 ? '1px solid rgba(0,0,0,0.03)' : 'none' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { setActiveMeal(mealType); setShowSearch(true); }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', padding: '0.7rem',
                    background: 'linear-gradient(135deg, #576038, #8B9467)',
                    border: 'none',
                    borderRadius: '14px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                    color: '#fff',
                    boxShadow: '0 3px 12px rgba(87,96,56,0.30), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  <Plus size={15} color="#fff" /> Add Food
                </button>
                {state.savedMeals.length > 0 && (
                  <button
                    onClick={() => { setActiveMeal(mealType); setShowSavedMeals(true); }}
                    title="Saved meals"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0.7rem 1rem',
                      color: 'rgba(0,0,0,0.38)', background: 'rgba(0,0,0,0.04)',
                      border: '1px solid rgba(0,0,0,0.06)',
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
                    backgroundColor: 'rgba(87,96,56,0.07)',
                    border: '1px solid rgba(87,96,56,0.15)',
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
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          border: `1px solid ${saveMealError ? 'var(--accent-red)' : 'rgba(0,0,0,0.08)'}`,
                          borderRadius: '10px', color: 'var(--text-primary)', outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handleSaveMeal(mealType)}
                        disabled={saveMealName.trim().length < 3}
                        style={{
                          padding: '0.6rem 0.9rem', background: 'var(--accent-green)',
                          border: 'none', borderRadius: '10px', fontWeight: 800,
                          fontSize: '0.8rem', color: '#fff', cursor: 'pointer',
                          opacity: saveMealName.trim().length >= 3 ? 1 : 0.4,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setSavingMealType(null); setSaveMealName(''); setSaveMealError(''); }}
                        style={{ padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '10px', fontSize: '0.8rem', color: 'rgba(0,0,0,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
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
                      border: '1px dashed rgba(0,0,0,0.06)',
                      borderRadius: '10px',
                      color: 'rgba(0,0,0,0.16)', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
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

  const handleScanLog = (mealType: MealType, items: { food: FoodItem; amount: number }[]) => {
    items.forEach(({ food, amount }) => addFoodToLog(selectedDate, mealType, food, amount));
    showToast(`${items.length} item${items.length !== 1 ? 's' : ''} logged from scan`, 'success');
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
      {showScanner && (
        <FoodScanner
          defaultMealType={activeMeal}
          onLog={handleScanLog}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── DAILY SUMMARY HEADER ── */}
      <div style={{
        background: 'linear-gradient(160deg, #576038 0%, #3E4528 100%)',
        padding: '16px 18px 20px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle texture overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 0%, rgba(255,255,255,0.08) 0%, transparent 55%)', pointerEvents: 'none' }} />

        {/* Date navigation row */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => { setSelectedDate(d => offsetDate(d, -1)); setCopiedYesterday(false); }}
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
            >
              <ChevronLeft size={16} color="#FCFFE2" />
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FCFFE2', letterSpacing: '-0.01em' }}>{dateLabel}</div>
                {isFuture && (
                  <span style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(194,203,154,0.8)', background: 'rgba(255,255,255,0.10)', padding: '2px 6px', borderRadius: 6 }}>
                    Future
                  </span>
                )}
              </div>
              {!isToday && (
                <button onClick={() => setSelectedDate(todayDate)}
                  style={{ background: 'none', border: 'none', fontSize: '0.62rem', fontWeight: 700, color: 'rgba(194,203,154,0.85)', cursor: 'pointer', padding: '2px 0' }}>
                  Back to today
                </button>
              )}
            </div>
            <button
              onClick={() => { if (canGoForward) setSelectedDate(d => offsetDate(d, 1)); }}
              disabled={!canGoForward}
              style={{ background: canGoForward ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canGoForward ? 'pointer' : 'default' }}
            >
              <ChevronRight size={16} color={canGoForward ? '#FCFFE2' : 'rgba(252,255,226,0.25)'} />
            </button>
          </div>
          {/* Status badge */}
          <span style={{
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: 50,
            background: isOver ? 'rgba(220,38,38,0.25)' : calPct >= 90 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)',
            color: isOver ? '#FCA5A5' : '#FCFFE2',
            border: `1px solid ${isOver ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.2)'}`,
          }}>
            {isOver ? `+${Math.abs(Math.round(calRemaining))} over` : calPct >= 90 ? 'Almost there' : `${Math.round(calPct)}% done`}
          </span>
        </div>

        {/* ── Calorie hero ── */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(194,203,154,0.7)', marginBottom: 4 }}>
              Calories Today
            </div>
            <div style={{
              fontSize: '3.4rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1,
              color: isOver ? '#FCA5A5' : '#FCFFE2',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {calLogged.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'right', paddingBottom: 6 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'rgba(252,255,226,0.45)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
              {calTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(194,203,154,0.6)', marginTop: 2 }}>
              kcal goal
            </div>
          </div>
        </div>

        {/* Calorie progress bar — thicker */}
        <div style={{ position: 'relative', zIndex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{
            height: '100%', width: `${Math.min(calPct, 100)}%`,
            background: isOver
              ? 'linear-gradient(90deg, #EF4444, #FCA5A5)'
              : calPct > 80
                ? 'linear-gradient(90deg, #C2CB9A, #FCFFE2)'
                : 'linear-gradient(90deg, #8B9467, #C2CB9A)',
            borderRadius: 6, transition: 'width 0.6s cubic-bezier(0.25,1,0.5,1)',
          }} />
        </div>

        {/* ── Macro cards ── */}
        {targets && (
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 8 }}>
            {[
              { label: 'Protein', short: 'P', logged: Math.round(dayTotals.protein), target: proTarget, accent: '#FC9A77' },
              { label: 'Carbs',   short: 'C', logged: Math.round(dayTotals.carbs),   target: carbTarget, accent: '#C2CB9A' },
              { label: 'Fats',    short: 'F', logged: Math.round(dayTotals.fats),    target: fatTarget,  accent: '#8B9467' },
            ].map(m => {
              const pct = Math.min(100, (m.logged / Math.max(1, m.target)) * 100);
              const over = m.logged > m.target;
              return (
                <div key={m.short} style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 16,
                  padding: '12px 12px 10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
                  {/* Label */}
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(194,203,154,0.7)', marginBottom: 6 }}>
                    {m.label}
                  </div>
                  {/* Number */}
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: over ? '#FCA5A5' : '#FCFFE2', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 2 }}>
                    {m.logged}
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(252,255,226,0.45)', marginLeft: 2 }}>g</span>
                  </div>
                  {/* Target */}
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(194,203,154,0.55)', marginBottom: 8 }}>
                    of {m.target}g
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      backgroundColor: over ? '#FCA5A5' : m.accent,
                      borderRadius: 3, transition: 'width 0.5s ease',
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
          <div className="glass-card" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.7rem 1rem', borderRadius: 16,
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Removed <strong style={{ color: 'var(--text-primary)' }}>{pendingDelete.foodName}</strong>
            </span>
            <button
              onClick={handleUndoDelete}
              style={{
                padding: '0.4rem 1rem',
                background: 'linear-gradient(135deg, #576038, #8B9467)',
                border: 'none',
                borderRadius: '10px', fontWeight: 800, fontSize: '0.78rem',
                color: '#fff', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(87,96,56,0.30)',
              }}
            >
              Undo
            </button>
          </div>
        )}

        {/* ── AI Scan CTA ── */}
        <button
          onClick={() => setShowScanner(true)}
          className="glass-card"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 16px',
            cursor: 'pointer', textAlign: 'left', border: 'none',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #576038, #8B9467)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(87,96,56,0.30)',
          }}>
            <Camera size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Scan a meal
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 1 }}>
              Photo → AI estimates calories & macros
            </div>
          </div>
          <ChevronRight size={15} color="rgba(87,96,56,0.45)" />
        </button>

        {/* ── MEAL SECTIONS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'] as MealType[]).map(renderMealCard)}
        </div>

        {/* ── RECIPE LIBRARY ── */}
        <div style={{ marginTop: '4px' }}>
          <button
            onClick={() => setShowRecipeLibrary(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 16px', borderRadius: showRecipeLibrary ? '16px 16px 0 0' : '16px',
              background: showRecipeLibrary ? 'linear-gradient(135deg, #576038, #8B9467)' : 'rgba(87,96,56,0.07)',
              border: showRecipeLibrary ? 'none' : '1px solid rgba(87,96,56,0.12)',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1rem' }}>👨‍🍳</span>
              <span style={{
                fontSize: '0.85rem', fontWeight: 800,
                color: showRecipeLibrary ? '#fff' : '#576038',
                letterSpacing: '0.01em',
              }}>Recipe Library</span>
            </div>
            <ChevronDown
              size={16}
              color={showRecipeLibrary ? 'rgba(255,255,255,0.7)' : 'rgba(87,96,56,0.5)'}
              style={{ transform: showRecipeLibrary ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
            />
          </button>
          {showRecipeLibrary && (
            <div style={{
              borderRadius: '0 0 16px 16px',
              border: '1px solid rgba(87,96,56,0.12)',
              borderTop: 'none',
              overflow: 'hidden',
            }}>
              <RecipeLibrary
                activeMeal={activeMeal}
                selectedDate={selectedDate}
                onAdd={handleAddFood}
              />
            </div>
          )}
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
                    border: '1px solid rgba(0,0,0,0.06)',
                    padding: '10px 14px',
                    minWidth: '120px',
                    flexShrink: 0,
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                    {meal.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                    {Math.round(meal.totalNutrition.calories)} kcal
                  </div>
                  <button
                    onClick={() => {
                      logSavedMeal(selectedDate, activeMeal, meal.id);
                      showToast(`${meal.name} added to ${activeMeal}`, 'success');
                    }}
                    style={{
                      padding: '4px 0', background: 'rgba(87,96,56,0.10)',
                      border: '1px solid rgba(87,96,56,0.18)',
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

        {/* ── COPY FROM PREVIOUS DAY BANNER ── */}
        {showCopyYesterday && !copiedYesterday && prevDateHasData && (
          <div className="glass-card-warm" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: '48px', paddingLeft: '14px', paddingRight: '8px',
            borderRadius: '16px',
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📋 Copy from {formatDateLabel(prevDate, todayDate).toLowerCase()}
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
                style={{ padding: '0.35rem', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={13} color="rgba(0,0,0,0.28)" />
              </button>
            </div>
          </div>
        )}

        {/* ── COPY TO NEXT DAY BANNER ── */}
        {canCopyToNext && (
          <div className="glass-card" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: '48px', paddingLeft: '14px', paddingRight: '10px',
            borderRadius: '16px',
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ➡️ Copy to {formatDateLabel(nextDate, todayDate).toLowerCase()}
            </span>
            <button
              onClick={handleCopyToNextDay}
              style={{
                padding: '0.35rem 0.85rem',
                background: 'rgba(87,96,56,0.12)',
                border: '1px solid rgba(87,96,56,0.20)',
                borderRadius: '10px',
                fontWeight: 800, fontSize: '0.78rem', color: 'var(--accent-blue)', cursor: 'pointer',
              }}
            >
              Copy →
            </button>
          </div>
        )}

      </div>

      {/* ── Saved Meals Sheet ── */}
      <SlideOver isOpen={showSavedMeals} onClose={() => setShowSavedMeals(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowSavedMeals(false)}
              style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(28,28,46,0.72)', fontSize: '1rem' }}
            >
              ←
            </button>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Saved Meals</h2>
              <p style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.28)', fontWeight: 600, marginTop: '1px' }}>Tap to log to {activeMeal}</p>
            </div>
          </div>
          {state.savedMeals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(0,0,0,0.20)' }}>
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
                    <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.28)', marginTop: '3px' }}>
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
