import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AppState, AppSettings, UserProfile, DailyLog, FoodItem, MealType,
  MealEntry, WorkoutSession, HealthMetrics, SavedMeal, NutritionData
} from '../types';
import { additionalExercises } from '../data/workoutPrograms';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

interface AppContextType {
  state: AppState;
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
  trackRecentFood: (food: FoodItem) => void;
  toggleFavoriteFood: (food: FoodItem) => void;
  setAssignedProgram: (programId: 'male_phase2' | 'female_phase1' | null) => void;
  resetApp: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: AppSettings = {
  adaptiveCoaching: true,
  plateauDetection: true,
  weeklyCheckIn: true,
  connectedApps: {
    appleHealth: 'disconnected',
    googleFit: 'disconnected',
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
  settings: defaultSettings,
  recentFoods: [],
  favoriteFoods: [],
  assignedProgram: null,
};


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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('bbc_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration: ensure new fields exist
        if (!parsed.savedMeals) parsed.savedMeals = [];
        if (!parsed.settings) parsed.settings = defaultSettings;
        if (!parsed.settings.connectedApps) parsed.settings.connectedApps = defaultSettings.connectedApps;
        // Migrate: old shape stored string IDs, new shape stores FoodItem objects
        if (!parsed.recentFoods || (parsed.recentFoods.length > 0 && typeof parsed.recentFoods[0] === 'string')) parsed.recentFoods = [];
        if (!parsed.favoriteFoods || (parsed.favoriteFoods.length > 0 && typeof parsed.favoriteFoods[0] === 'string')) parsed.favoriteFoods = [];
        if (!('assignedProgram' in parsed)) parsed.assignedProgram = null;
        // Always use full library (includes newly added exercises)
        parsed.workoutLibrary = baseWorkoutLibrary;
        return parsed;
      }
    } catch {
      // Corrupted state — start fresh
    }
    return defaultState;
  });

  const [toast, setToast] = useState<ToastState>({ message: '', type: 'info', visible: false });

  useEffect(() => {
    localStorage.setItem('bbc_state', JSON.stringify(state));
  }, [state]);

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

  const addFoodToLog = (date: string, mealType: MealType, food: FoodItem, amount: number) => {
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

  const addWorkout = (date: string, workout: WorkoutSession) => {
    setState(prev => {
      const log = prev.logs[date] || emptyLog(date);
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [date]: { ...log, workouts: [...log.workouts, workout] }
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

  const addCustomFood = (food: FoodItem) => {
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

  const trackRecentFood = (food: FoodItem) => {
    setState(prev => {
      const filtered = prev.recentFoods.filter(f => f.id !== food.id);
      return { ...prev, recentFoods: [food, ...filtered].slice(0, 20) };
    });
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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const resetApp = () => {
    localStorage.removeItem('bbc_state');
    setState(defaultState);
  };

  return (
    <AppContext.Provider value={{
      state, updateUser, updateDailyLog, addFoodToLog, removeFoodEntry, editFoodEntry,
      addCustomFood, addWorkout, updateHealthMetrics, saveMeal, deleteSavedMeal,
      logSavedMeal, updateSettings, trackRecentFood, toggleFavoriteFood,
      setAssignedProgram, resetApp, showToast
    }}>
      {children}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </AppContext.Provider>
  );
};

const Toast: React.FC<ToastState> = ({ message, type, visible }) => {
  if (!visible || !message) return null;

  const bg = type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : '#333';

  return (
    <div className="animate-fade-in" style={{
      position: 'fixed',
      bottom: '100px',
      left: '20px',
      right: '20px',
      backgroundColor: bg,
      color: 'white',
      padding: '12px 20px',
      borderRadius: 'var(--radius-md)',
      zIndex: 9000,
      textAlign: 'center',
      boxShadow: 'var(--shadow-lg)',
      fontWeight: 600,
      fontSize: '0.9rem',
      maxWidth: '460px',
      margin: '0 auto'
    }}>
      {message}
    </div>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within AppProvider');
  return context;
};
