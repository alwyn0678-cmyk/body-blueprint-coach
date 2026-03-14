import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, UserProfile, DailyLog, FoodItem, MealType, MealEntry, WorkoutSession, HealthMetrics } from '../types';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

interface AppContextType {
  state: AppState;
  updateUser: (user: Partial<UserProfile>) => void;
  updateDailyLog: (date: string, logUpdate: Partial<DailyLog>) => void;
  addCustomFood: (food: FoodItem) => void;
  addWorkout: (date: string, workout: WorkoutSession) => void;
  updateHealthMetrics: (date: string, metrics: HealthMetrics) => void;
  resetApp: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeFoodEntry: (date: string, mealType: MealType, entryId: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultState: AppState = {
  user: null,
  logs: {},
  customFoods: [],
  workoutLibrary: [
    { id: '1', name: 'Barbell Bench Press', targetMuscles: ['Chest', 'Triceps'] },
    { id: '2', name: 'Squat (High Bar)', targetMuscles: ['Quads', 'Glutes'] },
    { id: '3', name: 'Deadlift', targetMuscles: ['Back', 'Hamstrings'] },
    { id: '4', name: 'Pull Ups', targetMuscles: ['Back', 'Biceps'] },
    { id: '5', name: 'Overhead Press', targetMuscles: ['Shoulders', 'Triceps'] }
  ]
};

// Seed some initial data for the user to experience immediately
const seedInitialData = (state: AppState): AppState => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const initialLogs = {
    ...state.logs,
    [yesterday]: {
      id: yesterday,
      date: yesterday,
      steps: 8400,
      waterGlasses: 8,
      meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
      workouts: [
        { 
          id: 'w1', name: 'Push Day A', timestamp: yesterday, durationMinutes: 55, 
          exercises: [
            { id: 'e1', exerciseId: '1', name: 'Barbell Bench Press', sets: [{ id: 's1', weight: 80, reps: 8 }] }
          ] 
        }
      ],
      health: { sleepScore: 82, recoveryScore: 75, restingHR: 52 },
      adherenceScore: 90
    },
    [today]: {
      id: today,
      date: today,
      steps: 4200,
      waterGlasses: 4,
      meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
      workouts: [],
      health: { sleepScore: 92, recoveryScore: 84, restingHR: 48 },
      adherenceScore: 0
    }
  };
  
  return { ...state, logs: initialLogs };
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('bbc_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure workoutLibrary exists for older saves
      if (!parsed.workoutLibrary) parsed.workoutLibrary = defaultState.workoutLibrary;
      return parsed;
    }
    return seedInitialData(defaultState); 
  });

  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    visible: false
  });

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
      const existingLog = prev.logs[date] || {
        id: date, date, steps: 0, waterGlasses: 0, 
        meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, 
        workouts: [], health: {}, adherenceScore: 0
      };
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [date]: { ...existingLog, ...logUpdate }
        }
      };
    });
  };

  const addWorkout = (date: string, workout: WorkoutSession) => {
    setState(prev => {
      const log = prev.logs[date] || {
        id: date, date, steps: 0, waterGlasses: 0, 
        meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, 
        workouts: [], health: {}, adherenceScore: 0
      };
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
      const log = prev.logs[date] || {
        id: date, date, steps: 0, waterGlasses: 0, 
        meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, 
        workouts: [], health: {}, adherenceScore: 0
      };
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
    setState(prev => ({
      ...prev,
      customFoods: [...prev.customFoods, food]
    }));
  };

  const resetApp = () => {
    setState(seedInitialData(defaultState));
    localStorage.removeItem('bbc_state');
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const removeFoodEntry = (date: string, mealType: MealType, entryId: string) => {
    setState(prev => {
      const log = prev.logs[date];
      if (!log) return prev;
      
      const updatedMeals = {
        ...log.meals,
        [mealType]: log.meals[mealType].filter((item: MealEntry) => item.id !== entryId)
      };
      
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [date]: { ...log, meals: updatedMeals }
        }
      };
    });
  };

  return (
    <AppContext.Provider value={{ state, updateUser, updateDailyLog, addCustomFood, addWorkout, updateHealthMetrics, resetApp, showToast, removeFoodEntry }}>
      {children}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </AppContext.Provider>
  );
};

// Internal Toast Component for AppContext usage
const Toast: React.FC<ToastState> = ({ message, type, visible }) => {
  if (!visible) return null;
  
  const colors = {
    success: 'var(--accent-secondary)',
    error: 'var(--accent-primary)',
    info: 'var(--text-main)'
  };
  
  return (
    <div className="animate-fade-in" style={{
      position: 'fixed',
      bottom: '100px',
      left: '20px',
      right: '20px',
      backgroundColor: colors[type],
      color: 'white',
      padding: '12px 20px',
      borderRadius: 'var(--radius-md)',
      zIndex: 1000,
      textAlign: 'center',
      boxShadow: 'var(--shadow-lg)',
      fontWeight: 600,
      fontSize: '0.9rem'
    }}>
      {message}
    </div>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
