import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, UserProfile, DailyLog, FoodItem } from '../types';

interface AppContextType {
  state: AppState;
  updateUser: (user: Partial<UserProfile>) => void;
  updateDailyLog: (date: string, logUpdate: Partial<DailyLog>) => void;
  addCustomFood: (food: FoodItem) => void;
  resetApp: () => void;
}

const defaultState: AppState = {
  user: null,
  logs: {},
  customFoods: []
};

// Initial mock state for development without needing to onboard every refresh
const mockDevState: AppState = {
  user: {
    id: 'user-1',
    name: 'Alwyn',
    age: 30,
    sex: 'male',
    height: 180,
    weight: 80,
    goalType: 'fat_loss',
    activityLevel: 'moderately_active',
    trainingFrequency: 4,
    stepsTarget: 8000,
    targets: { calories: 2300, protein: 180, carbs: 220, fats: 70 },
    preferredDietSpeed: 'moderate',
    onboarded: true
  },
  logs: {
    '2024-05-20': {
      id: '2024-05-20',
      date: '2024-05-20',
      weight: 79.8,
      steps: 8500,
      waterGlasses: 4,
      meals: {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: []
      },
      adherenceScore: 90
    }
  },
  customFoods: []
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Try to load from local storage
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('bbc_state');
    if (saved) return JSON.parse(saved);
    // Use mock state during development to skip onboarding, switch to defaultState later
    return mockDevState; 
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
        id: date, date, steps: 0, waterGlasses: 0, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, adherenceScore: 0
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

  const addCustomFood = (food: FoodItem) => {
    setState(prev => ({
      ...prev,
      customFoods: [...prev.customFoods, food]
    }));
  };

  const resetApp = () => {
    setState(defaultState);
    localStorage.removeItem('bbc_state');
  }

  return (
    <AppContext.Provider value={{ state, updateUser, updateDailyLog, addCustomFood, resetApp }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
