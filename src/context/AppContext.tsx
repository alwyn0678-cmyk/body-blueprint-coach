import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  AppState, AppSettings, UserProfile, DailyLog, FoodItem, MealType,
  MealEntry, WorkoutSession, HealthMetrics, SavedMeal, NutritionData,
  NutritionTotals, ProgressionRecord, ConnectionStatus,
} from '../types';
import { additionalExercises } from '../data/workoutPrograms';
import { safeLoadState } from '../utils/persistence';

const SCHEMA_VERSION = 4;
const APP_VERSION = '2.0.0';

// ─── Toast queue types ────────────────────────────────────────────────────────

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number; // ms — defaults to 3000, errors use 5000
}

// ─── Workout draft type ───────────────────────────────────────────────────────

interface WorkoutDraft {
  sessionName: string;
  exercises: any[]; // ActiveExercise type from workout flow
  startedAt: string;
}

// ─── Context interface ────────────────────────────────────────────────────────

interface AppContextType {
  state: AppState;
  toasts: ToastItem[];
  updateUser: (user: Partial<UserProfile>) => void;
  updateDailyLog: (date: string, logUpdate: Partial<DailyLog>) => void;
  addFoodToLog: (date: string, mealType: MealType, food: FoodItem, amount: number) => void;
  removeFoodEntry: (date: string, mealType: MealType, entryId: string) => void;
  editFoodEntry: (date: string, mealType: MealType, entryId: string, newAmount: number) => void;
  addCustomFood: (food: FoodItem) => void;
  addWorkout: (date: string, workout: WorkoutSession) => void;
  updateHealthMetrics: (date: string, metrics: HealthMetrics) => void;
  saveMeal: (name: string, mealType: MealType, entries: Array<{ food: FoodItem; amount: number }>) => void;
  deleteSavedMeal: (id: string) => void;
  logSavedMeal: (date: string, mealType: MealType, savedMealId: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateConnectionStatus: (app: string, status: ConnectionStatus) => void;
  updateUnits: (units: 'metric' | 'imperial') => void;
  getNutritionTotals: (date: string) => NutritionTotals;
  getProgressionHistory: (exerciseId: string) => ProgressionRecord[];
  trackRecentFood: (food: FoodItem) => void;
  clearRecentFoods: () => void;
  toggleFavoriteFood: (food: FoodItem) => void;
  setAssignedProgram: (programId: 'male_phase2' | 'female_phase1' | null) => void;
  resetApp: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  // Weight
  updateWeight: (weight: number, date: string) => void;
  // Workout draft
  saveWorkoutDraft: (draft: WorkoutDraft) => void;
  clearWorkoutDraft: () => void;
  getWorkoutDraft: () => WorkoutDraft | null;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  adaptiveCoaching: true,
  plateauDetection: true,
  weeklyCheckIn: true,
  notificationsEnabled: false,
  units: 'metric',
  connectedApps: {
    apple_health: 'disconnected',
    google_fit: 'disconnected',
    garmin: 'disconnected',
    whoop: 'disconnected',
  },
};

const baseWorkoutLibrary = [
  { id: '1', name: 'Barbell Bench Press', targetMuscles: ['Chest', 'Triceps'] },
  { id: '2', name: 'Squat (High Bar)', targetMuscles: ['Legs', 'Glutes'] },
  { id: '3', name: 'Deadlift', targetMuscles: ['Back', 'Hamstrings'] },
  { id: '4', name: 'Pull Ups', targetMuscles: ['Back', 'Arms'] },
  { id: '5', name: 'Overhead Press', targetMuscles: ['Delts', 'Triceps'] },
  { id: '6', name: 'Barbell Row', targetMuscles: ['Back', 'Arms'] },
  { id: '7', name: 'Incline Dumbbell Press', targetMuscles: ['Chest', 'Delts'] },
  { id: '8', name: 'Romanian Deadlift', targetMuscles: ['Hamstrings', 'Glutes'] },
  { id: '9', name: 'Leg Press', targetMuscles: ['Legs'] },
  { id: '10', name: 'Cable Row', targetMuscles: ['Back', 'Arms'] },
  { id: '11', name: 'Dumbbell Curl', targetMuscles: ['Arms'] },
  { id: '12', name: 'Tricep Pushdown', targetMuscles: ['Triceps'] },
  { id: '13', name: 'Lateral Raise', targetMuscles: ['Delts'] },
  { id: '14', name: 'Leg Curl', targetMuscles: ['Hamstrings'] },
  { id: '15', name: 'Leg Extension', targetMuscles: ['Legs'] },
  ...additionalExercises,
];

const defaultState: AppState = {
  user: null,
  logs: {},
  customFoods: [],
  savedMeals: [],
  workoutLibrary: baseWorkoutLibrary,
  settings: DEFAULT_SETTINGS,
  recentFoods: [],
  favoriteFoods: [],
  assignedProgram: null,
};

// ─── Load initial state via persistence.ts (improvement #6) ──────────────────

function loadInitialState(): AppState {
  const loaded = safeLoadState('bbc_state', defaultState);
  // Always use the full in-memory library so newly added exercises are available
  return { ...loaded, workoutLibrary: baseWorkoutLibrary };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const computeNutritionTotal = (entries: Array<{ food: FoodItem; amount: number }>): NutritionData => {
  return entries.reduce(
    (acc, { food, amount }) => ({
      calories: acc.calories + food.calories * amount,
      protein: acc.protein + food.protein * amount,
      carbs: acc.carbs + food.carbs * amount,
      fats: acc.fats + food.fats * amount,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
};

const emptyLog = (date: string): DailyLog => ({
  id: date, date, steps: 0, waterGlasses: 0,
  meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
  workouts: [], health: {}, adherenceScore: 0
});

// ─── Provider ────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [workoutDraft, setWorkoutDraftState] = useState<WorkoutDraft | null>(null);

  // Improvement #1: Debounced localStorage save with change detection
  const lastSavedRef = useRef<string>('');
  useEffect(() => {
    const timer = setTimeout(() => {
      const serialized = JSON.stringify({
        ...state,
        _meta: {
          schemaVersion: SCHEMA_VERSION,
          lastSaved: new Date().toISOString(),
          appVersion: APP_VERSION,
        },
      });
      if (serialized !== lastSavedRef.current) {
        try {
          localStorage.setItem('bbc_state', serialized);
          lastSavedRef.current = serialized;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            console.warn('[BBC] localStorage quota exceeded');
          }
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const updateUser = (updates: Partial<UserProfile>) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : updates as UserProfile
    }));
  };

  const updateDailyLog = (date: string, logUpdate: Partial<DailyLog>) => {
    setState(prev => {
      const existing = prev.logs[date] || emptyLog(date);
      return {
        ...prev,
        logs: { ...prev.logs, [date]: { ...existing, ...logUpdate } }
      };
    });
  };

  // Improvement #5: Input validation in addFoodToLog
  const addFoodToLog = (date: string, mealType: MealType, food: FoodItem, amount: number) => {
    if (!isFinite(amount) || amount <= 0) {
      showToast('Amount must be greater than 0', 'error');
      return;
    }
    const hasInvalidMacro = [food.calories, food.protein, food.carbs, food.fats].some(
      v => !isFinite(v) || v < 0
    );
    if (hasInvalidMacro) {
      showToast('Food has invalid nutrition values', 'error');
      return;
    }

    const newEntry: MealEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      foodId: food.id,
      foodName: food.name,
      amount,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      nutrition: {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        fiber: food.fiber,
        sugar: food.sugar,
        sodium: food.sodium,
      },
      timestamp: new Date().toISOString(),
    };

    setState(prev => {
      const log = prev.logs[date] || emptyLog(date);
      const filtered = prev.recentFoods.filter(f => f.id !== food.id);
      return {
        ...prev,
        recentFoods: [food, ...filtered].slice(0, 20),
        logs: {
          ...prev.logs,
          [date]: {
            ...log,
            meals: { ...log.meals, [mealType]: [...log.meals[mealType], newEntry] }
          }
        }
      };
    });
  };

  const removeFoodEntry = (date: string, mealType: MealType, entryId: string) => {
    setState(prev => {
      const log = prev.logs[date];
      if (!log) return prev;
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [date]: {
            ...log,
            meals: {
              ...log.meals,
              [mealType]: log.meals[mealType].filter((item: MealEntry) => item.id !== entryId)
            }
          }
        }
      };
    });
  };

  const editFoodEntry = (date: string, mealType: MealType, entryId: string, newAmount: number) => {
    setState(prev => {
      const log = prev.logs[date];
      if (!log) return prev;
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [date]: {
            ...log,
            meals: {
              ...log.meals,
              [mealType]: log.meals[mealType].map((item: MealEntry) =>
                item.id === entryId ? { ...item, amount: newAmount } : item
              )
            }
          }
        }
      };
    });
  };

  // Improvement #8: Clamp caloriesBurned in addWorkout
  const addWorkout = (date: string, workout: WorkoutSession) => {
    const clampedCalories = Math.max(0, Math.min(2000, workout.caloriesBurned || 0));
    const safeWorkout: WorkoutSession = { ...workout, caloriesBurned: clampedCalories };

    setState(prev => {
      const log = prev.logs[date] || emptyLog(date);
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [date]: { ...log, workouts: [...log.workouts, safeWorkout] }
        }
      };
    });
  };

  const updateHealthMetrics = (date: string, metrics: HealthMetrics) => {
    setState(prev => {
      const log = prev.logs[date] || emptyLog(date);
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [date]: { ...log, health: { ...log.health, ...metrics } }
        }
      };
    });
  };

  // Improvement #7: Validate addCustomFood
  const addCustomFood = (food: FoodItem) => {
    if (!food.name || food.name.trim() === '') {
      showToast('Food name cannot be empty', 'error');
      return;
    }
    if (food.calories < 0 || food.protein < 0 || food.carbs < 0 || food.fats < 0) {
      showToast('Nutrition values cannot be negative', 'error');
      return;
    }
    if (food.servingSize <= 0) {
      showToast('Serving size must be greater than 0', 'error');
      return;
    }
    setState(prev => ({ ...prev, customFoods: [...prev.customFoods, { ...food, source: 'custom' }] }));
  };

  const saveMeal = (name: string, mealType: MealType, entries: Array<{ food: FoodItem; amount: number }>) => {
    const savedMeal: SavedMeal = {
      id: `sm_${Date.now()}`,
      name,
      mealType,
      entries,
      totalNutrition: computeNutritionTotal(entries),
      createdAt: new Date().toISOString(),
      timesUsed: 0,
    };
    setState(prev => ({ ...prev, savedMeals: [...prev.savedMeals, savedMeal] }));
  };

  const deleteSavedMeal = (id: string) => {
    setState(prev => ({ ...prev, savedMeals: prev.savedMeals.filter(m => m.id !== id) }));
  };

  const logSavedMeal = (date: string, mealType: MealType, savedMealId: string) => {
    setState(prev => {
      const meal = prev.savedMeals.find(m => m.id === savedMealId);
      if (!meal) return prev;

      const newEntries: MealEntry[] = meal.entries.map(({ food, amount }) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        foodId: food.id,
        foodName: food.name,
        amount,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        nutrition: { calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats },
        timestamp: new Date().toISOString(),
      }));

      const log = prev.logs[date] || emptyLog(date);
      const updatedSavedMeals = prev.savedMeals.map(m =>
        m.id === savedMealId ? { ...m, timesUsed: m.timesUsed + 1 } : m
      );

      return {
        ...prev,
        savedMeals: updatedSavedMeals,
        logs: {
          ...prev.logs,
          [date]: {
            ...log,
            meals: { ...log.meals, [mealType]: [...log.meals[mealType], ...newEntries] }
          }
        }
      };
    });
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...updates,
        connectedApps: {
          ...prev.settings.connectedApps,
          ...(updates.connectedApps || {}),
        },
      },
    }));
  };

  const updateConnectionStatus = (app: string, status: ConnectionStatus) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        connectedApps: {
          ...prev.settings.connectedApps,
          [app]: status,
        },
      },
    }));
  };

  const updateUnits = (units: 'metric' | 'imperial') => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, units },
    }));
  };

  // Improvement #4: Atomic weight update — single setState call
  const updateWeight = (weight: number, date: string) => {
    setState(prev => {
      const log = prev.logs[date] || emptyLog(date);
      return {
        ...prev,
        user: prev.user ? { ...prev.user, weight } : prev.user,
        logs: {
          ...prev.logs,
          [date]: { ...log, weight },
        },
      };
    });
  };

  const getNutritionTotals = (date: string): NutritionTotals => {
    const log = state.logs[date];
    if (!log) return { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

    const allEntries: MealEntry[] = [
      ...log.meals.breakfast,
      ...log.meals.lunch,
      ...log.meals.dinner,
      ...log.meals.snacks,
    ];

    const safeN = (v: any) => (typeof v === 'number' && isFinite(v) ? v : 0);
    return allEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + safeN(entry.nutrition.calories) * safeN(entry.amount),
        protein: acc.protein + safeN(entry.nutrition.protein) * safeN(entry.amount),
        carbs: acc.carbs + safeN(entry.nutrition.carbs) * safeN(entry.amount),
        fats: acc.fats + safeN(entry.nutrition.fats) * safeN(entry.amount),
        fiber: acc.fiber + safeN(entry.nutrition.fiber) * safeN(entry.amount),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );
  };

  const getProgressionHistory = (exerciseId: string): ProgressionRecord[] => {
    const records: ProgressionRecord[] = [];

    for (const [date, log] of Object.entries(state.logs)) {
      for (const workout of log.workouts) {
        for (const exercise of workout.exercises) {
          if (exercise.exerciseId !== exerciseId) continue;
          if (exercise.sets.length === 0) continue;

          let maxWeight = 0;
          let totalVolume = 0;
          let bestSet = { weight: 0, reps: 0 };

          for (const set of exercise.sets) {
            totalVolume += set.weight * set.reps;
            if (set.weight > maxWeight) {
              maxWeight = set.weight;
            }
            if (set.weight * set.reps > bestSet.weight * bestSet.reps) {
              bestSet = { weight: set.weight, reps: set.reps };
            }
          }

          records.push({ date, exerciseId, maxWeight, totalVolume, bestSet });
        }
      }
    }

    return records.sort((a, b) => a.date.localeCompare(b.date));
  };

  const trackRecentFood = (food: FoodItem) => {
    setState(prev => {
      const filtered = prev.recentFoods.filter(f => f.id !== food.id);
      return { ...prev, recentFoods: [food, ...filtered].slice(0, 20) };
    });
  };

  const clearRecentFoods = () => {
    setState(prev => ({ ...prev, recentFoods: [] }));
  };

  const toggleFavoriteFood = (food: FoodItem) => {
    setState(prev => {
      const exists = prev.favoriteFoods.some(f => f.id === food.id);
      return {
        ...prev,
        favoriteFoods: exists
          ? prev.favoriteFoods.filter(f => f.id !== food.id)
          : [food, ...prev.favoriteFoods],
      };
    });
  };

  const setAssignedProgram = (programId: 'male_phase2' | 'female_phase1' | null) => {
    setState(prev => ({ ...prev, assignedProgram: programId }));
  };

  // Improvement #2: Toast queue (max 4, errors persist 5s, others 3s)
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const duration = type === 'error' ? 5000 : 3000;
    setToasts(prev => {
      // Keep max 4; on overflow drop oldest non-error toast first
      if (prev.length >= 4) {
        const nonError = prev.findIndex(t => t.type !== 'error');
        const trimmed = nonError !== -1
          ? [...prev.slice(0, nonError), ...prev.slice(nonError + 1)]
          : prev.slice(1);
        return [...trimmed, { id, message, type, duration }];
      }
      return [...prev, { id, message, type, duration }];
    });
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const resetApp = () => {
    // Clear all BBC-owned localStorage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bbc_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    lastSavedRef.current = '';
    setState(defaultState);
    setToasts([]);
    setWorkoutDraftState(null);
  };

  // Improvement #3: Workout draft actions
  const saveWorkoutDraft = (draft: WorkoutDraft) => {
    setWorkoutDraftState(draft);
    try {
      localStorage.setItem('bbc_workout_draft', JSON.stringify(draft));
    } catch (e) {
      console.warn('[BBC] Failed to save workout draft to localStorage', e);
    }
  };

  const clearWorkoutDraft = () => {
    setWorkoutDraftState(null);
    localStorage.removeItem('bbc_workout_draft');
  };

  const getWorkoutDraft = (): WorkoutDraft | null => {
    if (workoutDraft) return workoutDraft;
    try {
      const raw = localStorage.getItem('bbc_workout_draft');
      if (!raw) return null;
      return JSON.parse(raw) as WorkoutDraft;
    } catch {
      return null;
    }
  };

  return (
    <AppContext.Provider value={{
      state, toasts, updateUser, updateDailyLog, addFoodToLog, removeFoodEntry, editFoodEntry,
      addCustomFood, addWorkout, updateHealthMetrics, saveMeal, deleteSavedMeal,
      logSavedMeal, updateSettings, updateConnectionStatus, updateUnits,
      getNutritionTotals, getProgressionHistory,
      trackRecentFood, clearRecentFoods, toggleFavoriteFood,
      setAssignedProgram, resetApp, showToast,
      updateWeight,
      saveWorkoutDraft, clearWorkoutDraft, getWorkoutDraft,
    }}>
      {children}
      <ToastStack toasts={toasts} />
    </AppContext.Provider>
  );
};

// ─── Toast stack renderer (improvement #2) ───────────────────────────────────

const ToastStack: React.FC<{ toasts: ToastItem[] }> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '100px',
      left: '20px',
      right: '20px',
      zIndex: 9000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'center',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const styles: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg: 'rgba(48,209,88,0.15)', border: 'var(--accent-green, #30D158)', icon: '✓' },
    error:   { bg: 'rgba(255,69,58,0.15)',  border: 'var(--accent-red, #FF453A)',   icon: '!' },
    info:    { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)',       icon: 'ℹ' },
  };
  const s = styles[toast.type];

  return (
    <div className="animate-fade-in" style={{
      backgroundColor: s.bg,
      border: `1px solid ${s.border}`,
      backdropFilter: 'blur(12px)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      fontWeight: 600,
      fontSize: '0.875rem',
      width: '100%',
      maxWidth: '460px',
      textAlign: 'left',
      pointerEvents: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        backgroundColor: s.border,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 900, flexShrink: 0,
      }}>{s.icon}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
    </div>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within AppProvider');
  return context;
};
