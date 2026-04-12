import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  AppState, AppSettings, UserProfile, DailyLog, FoodItem, MealType,
  MealEntry, WorkoutSession, HealthMetrics, SavedMeal, NutritionData,
  NutritionTotals, ProgressionRecord, ConnectionStatus,
  BodyMeasurement, ProgressPhoto, HabitDefinition, HabitLog,
  CoachInsight, WeeklyCheckIn, Mesocycle, Recipe, CustomProgram,
  MealPlan, XPEvent, XPEventType, Milestone, PersonalRecord, DailyCheckIn, AIProgram,
} from '../types';
import { additionalExercises } from '../data/workoutPrograms';
import { safeLoadState } from '../utils/persistence';
import { syncStateToCloud, loadStateFromCloud, isSupabaseConfigured } from '../lib/supabase';

const SCHEMA_VERSION = 5;
const APP_VERSION = '3.0.0';

// ─── Toast ────────────────────────────────────────────────────────────────────

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

// ─── Workout draft ────────────────────────────────────────────────────────────

interface WorkoutDraft {
  sessionName: string;
  exercises: any[];
  startedAt: string;
}

// ─── Default habit definitions ────────────────────────────────────────────────

const DEFAULT_HABITS: HabitDefinition[] = [
  { id: 'h_protein',  name: 'Hit protein target',   icon: '🥩', color: '#974400', category: 'nutrition' },
  { id: 'h_calories', name: 'Log all meals',         icon: '📱', color: '#576038', category: 'nutrition' },
  { id: 'h_water',    name: 'Drink 2L+ water',       icon: '💧', color: '#8B9467', category: 'nutrition' },
  { id: 'h_steps',    name: '8,000+ steps',          icon: '👟', color: '#576038', category: 'wellness' },
  { id: 'h_sleep',    name: '7–9h sleep',            icon: '🌙', color: '#3E4528', category: 'sleep' },
  { id: 'h_train',    name: 'Train today',           icon: '🏋️', color: '#C05200', category: 'training' },
  { id: 'h_stretch',  name: 'Stretch / mobility',    icon: '🧘', color: '#8B9467', category: 'wellness' },
];

// ─── Context interface ────────────────────────────────────────────────────────

interface AppContextType {
  state: AppState;
  toasts: ToastItem[];
  isCloudSynced: boolean;
  lastSavedAt: string | null;
  // User
  updateUser: (user: Partial<UserProfile>) => void;
  // Logs
  updateDailyLog: (date: string, logUpdate: Partial<DailyLog>) => void;
  addFoodToLog: (date: string, mealType: MealType, food: FoodItem, amount: number) => void;
  removeFoodEntry: (date: string, mealType: MealType, entryId: string) => void;
  editFoodEntry: (date: string, mealType: MealType, entryId: string, newAmount: number) => void;
  addCustomFood: (food: FoodItem) => void;
  addWorkout: (date: string, workout: WorkoutSession) => void;
  updateHealthMetrics: (date: string, metrics: HealthMetrics) => void;
  // Meals / recipes
  saveMeal: (name: string, mealType: MealType, entries: Array<{ food: FoodItem; amount: number }>) => void;
  deleteSavedMeal: (id: string) => void;
  logSavedMeal: (date: string, mealType: MealType, savedMealId: string) => void;
  addRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateConnectionStatus: (app: string, status: ConnectionStatus) => void;
  updateUnits: (units: 'metric' | 'imperial') => void;
  // Stats
  getNutritionTotals: (date: string) => NutritionTotals;
  getProgressionHistory: (exerciseId: string) => ProgressionRecord[];
  // Food preferences
  trackRecentFood: (food: FoodItem) => void;
  clearRecentFoods: () => void;
  toggleFavoriteFood: (food: FoodItem) => void;
  // Exercise favorites
  toggleFavoriteExercise: (id: string) => void;
  // Program
  setAssignedProgram: (programId: 'male_phase2' | 'female_phase1' | null) => void;
  // Custom programs
  saveCustomProgram: (program: CustomProgram) => void;
  deleteCustomProgram: (id: string) => void;
  activateCustomProgram: (id: string | null) => void;
  duplicateCustomProgram: (id: string) => void;
  // Mesocycle
  setActiveMesocycle: (meso: Mesocycle | undefined) => void;
  // Weight
  updateWeight: (weight: number, date: string) => void;
  // Workout draft
  saveWorkoutDraft: (draft: WorkoutDraft) => void;
  clearWorkoutDraft: () => void;
  getWorkoutDraft: () => WorkoutDraft | null;
  // Measurements
  addMeasurement: (m: BodyMeasurement) => void;
  deleteMeasurement: (id: string) => void;
  // Progress photos
  addProgressPhoto: (photo: ProgressPhoto) => void;
  deleteProgressPhoto: (id: string) => void;
  // Habits
  logHabit: (date: string, habitId: string, log: HabitLog) => void;
  addHabitDefinition: (habit: HabitDefinition) => void;
  removeHabitDefinition: (id: string) => void;
  // Coach
  addCoachInsight: (insight: CoachInsight) => void;
  dismissCoachInsight: (id: string) => void;
  saveWeeklyCheckIn: (checkIn: WeeklyCheckIn) => void;
  // Meal plans
  saveMealPlan: (plan: MealPlan) => void;
  deleteMealPlan: (id: string) => void;
  // AI Programs
  saveAIProgram: (program: AIProgram) => void;
  deleteAIProgram: (id: string) => void;
  // Gamification
  awardXP: (type: XPEventType, amount: number, label: string) => void;
  markMilestoneSeen: (id: string) => void;
  // Daily check-ins
  saveDailyCheckIn: (checkIn: DailyCheckIn) => void;
  // Toast
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  // Reset
  resetApp: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Default Settings ─────────────────────────────────────────────────────────

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

// ─── Exercise library ─────────────────────────────────────────────────────────

const baseWorkoutLibrary = [
  { id: '1',  name: 'Barbell Bench Press',        targetMuscles: ['Chest', 'Triceps'] },
  { id: '2',  name: 'Squat (High Bar)',            targetMuscles: ['Quads', 'Glutes'] },
  { id: '3',  name: 'Deadlift',                   targetMuscles: ['Back', 'Hamstrings'] },
  { id: '4',  name: 'Pull Ups',                   targetMuscles: ['Back', 'Biceps'] },
  { id: '5',  name: 'Overhead Press',             targetMuscles: ['Shoulders', 'Triceps'] },
  { id: '6',  name: 'Barbell Row',                targetMuscles: ['Back', 'Biceps'] },
  { id: '7',  name: 'Incline Dumbbell Press',     targetMuscles: ['Chest', 'Shoulders'] },
  { id: '8',  name: 'Romanian Deadlift',          targetMuscles: ['Hamstrings', 'Glutes'] },
  { id: '9',  name: 'Leg Press',                  targetMuscles: ['Quads', 'Glutes'] },
  { id: '10', name: 'Cable Row',                  targetMuscles: ['Back', 'Biceps'] },
  { id: '11', name: 'Dumbbell Curl',              targetMuscles: ['Biceps'] },
  { id: '12', name: 'Tricep Pushdown',            targetMuscles: ['Triceps'] },
  { id: '13', name: 'Lateral Raise',              targetMuscles: ['Shoulders'] },
  { id: '14', name: 'Leg Curl',                   targetMuscles: ['Hamstrings'] },
  { id: '15', name: 'Leg Extension',              targetMuscles: ['Quads'] },
  { id: '16', name: 'Hip Thrust',                 targetMuscles: ['Glutes', 'Hamstrings'] },
  { id: '17', name: 'Bulgarian Split Squat',      targetMuscles: ['Quads', 'Glutes'] },
  { id: '18', name: 'Lat Pulldown',               targetMuscles: ['Back', 'Biceps'] },
  { id: '19', name: 'Face Pull',                  targetMuscles: ['Rear Delts', 'Traps'] },
  { id: '20', name: 'Cable Fly',                  targetMuscles: ['Chest'] },
  { id: '21', name: 'Skull Crusher',              targetMuscles: ['Triceps'] },
  { id: '22', name: 'Preacher Curl',              targetMuscles: ['Biceps'] },
  { id: '23', name: 'Calf Raise',                 targetMuscles: ['Calves'] },
  { id: '24', name: 'Cable Crunch',               targetMuscles: ['Core'] },
  { id: '25', name: 'Hanging Leg Raise',          targetMuscles: ['Core'] },
  { id: '26', name: 'Dumbbell Shoulder Press',    targetMuscles: ['Shoulders', 'Triceps'] },
  { id: '27', name: 'Close Grip Bench Press',     targetMuscles: ['Triceps', 'Chest'] },
  { id: '28', name: 'Hammer Curl',                targetMuscles: ['Biceps'] },
  { id: '29', name: 'Squat (Low Bar)',             targetMuscles: ['Quads', 'Glutes', 'Hamstrings'] },
  { id: '30', name: 'Cable Lateral Raise',        targetMuscles: ['Shoulders'] },
  ...additionalExercises,
];

// ─── Default state ────────────────────────────────────────────────────────────

const defaultState: AppState = {
  user: null,
  logs: {},
  customFoods: [],
  savedMeals: [],
  recipes: [],
  workoutLibrary: baseWorkoutLibrary,
  settings: DEFAULT_SETTINGS,
  recentFoods: [],
  favoriteFoods: [],
  favoriteExerciseIds: [],
  assignedProgram: null,
  customPrograms: [],
  activeCustomProgramId: null,
  measurements: [],
  progressPhotos: [],
  habitDefinitions: DEFAULT_HABITS,
  coachInsights: [],
  weeklyCheckIns: [],
  mealPlans: [],
  aiPrograms: [],
  xp: 0,
  level: 1,
  xpHistory: [],
  milestones: [],
  personalRecords: [],
  dailyCheckIns: [],
};

function loadInitialState(): AppState {
  const loaded = safeLoadState('bbc_state', defaultState);
  // Migrate old logs that lack the dessert meal slot
  if (loaded.logs) {
    for (const dateKey of Object.keys(loaded.logs)) {
      const log = loaded.logs[dateKey];
      if (log && !log.meals.dessert) {
        log.meals.dessert = [];
      }
    }
  }
  return {
    ...loaded,
    workoutLibrary: baseWorkoutLibrary,
    habitDefinitions: loaded.habitDefinitions?.length
      ? loaded.habitDefinitions
      : DEFAULT_HABITS,
    measurements: loaded.measurements ?? [],
    progressPhotos: loaded.progressPhotos ?? [],
    coachInsights: loaded.coachInsights ?? [],
    weeklyCheckIns: loaded.weeklyCheckIns ?? [],
    recipes: loaded.recipes ?? [],
    customPrograms: loaded.customPrograms ?? [],
    activeCustomProgramId: loaded.activeCustomProgramId ?? null,
    favoriteExerciseIds: loaded.favoriteExerciseIds ?? [],
    mealPlans: loaded.mealPlans ?? [],
    aiPrograms: loaded.aiPrograms ?? [],
    xp: loaded.xp ?? 0,
    level: loaded.level ?? 1,
    xpHistory: loaded.xpHistory ?? [],
    milestones: loaded.milestones ?? [],
    personalRecords: loaded.personalRecords ?? [],
    dailyCheckIns: loaded.dailyCheckIns ?? [],
  };
}

// ─── XP / Leveling helpers ────────────────────────────────────────────────────

const XP_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000];

export const computeLevel = (xp: number): number => {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
};

export const xpToNextLevel = (xp: number): { current: number; needed: number; level: number } => {
  const level = computeLevel(xp);
  const currentThreshold = XP_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = XP_THRESHOLDS[level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  return { current: xp - currentThreshold, needed: nextThreshold - currentThreshold, level };
};

export const LEVEL_NAMES = [
  '', 'Beginner', 'Dedicated', 'Athlete', 'Warrior',
  'Champion', 'Elite', 'Legend', 'Master', 'Grand Master', 'Immortal',
];

// Estimate e1RM using Epley formula: weight * (1 + reps/30)
const estimateE1RM = (weight: number, reps: number): number =>
  reps === 1 ? weight : parseFloat((weight * (1 + reps / 30)).toFixed(1));

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
  meals: { breakfast: [], lunch: [], dinner: [], snacks: [], dessert: [] },
  workouts: [], health: {}, adherenceScore: 0, habits: {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [workoutDraft, setWorkoutDraftState] = useState<WorkoutDraft | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const lastSavedRef = useRef<string>('');
  const cloudSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Theme application ─────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  // ── Local persistence ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const serialized = JSON.stringify({
        ...state,
        _meta: { schemaVersion: SCHEMA_VERSION, lastSaved: new Date().toISOString(), appVersion: APP_VERSION },
      });
      if (serialized !== lastSavedRef.current) {
        try {
          localStorage.setItem('bbc_state', serialized);
          lastSavedRef.current = serialized;
          setLastSavedAt(new Date().toISOString());
        } catch (e) {
          if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            console.warn('[BBC] localStorage quota exceeded');
          }
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  // ── Cloud sync (debounced 5s) ──────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !state.user?.id) return;
    if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
    cloudSyncTimer.current = setTimeout(async () => {
      await syncStateToCloud(state.user!.id, state);
      setIsCloudSynced(true);
    }, 5000);
    return () => { if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current); };
  }, [state]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const updateUser = (updates: Partial<UserProfile>) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : updates as UserProfile,
    }));
  };

  const updateDailyLog = (date: string, logUpdate: Partial<DailyLog>) => {
    setState(prev => {
      const existing = prev.logs[date] || emptyLog(date);
      return { ...prev, logs: { ...prev.logs, [date]: { ...existing, ...logUpdate } } };
    });
  };

  const addFoodToLog = (date: string, mealType: MealType, food: FoodItem, amount: number) => {
    if (!isFinite(amount) || amount <= 0) { showToast('Amount must be greater than 0', 'error'); return; }
    const hasInvalidMacro = [food.calories, food.protein, food.carbs, food.fats].some(v => !isFinite(v) || v < 0);
    if (hasInvalidMacro) { showToast('Food has invalid nutrition values', 'error'); return; }

    const newEntry: MealEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      foodId: food.id, foodName: food.name, amount,
      servingSize: food.servingSize, servingUnit: food.servingUnit,
      nutrition: {
        calories: food.calories, protein: food.protein,
        carbs: food.carbs, fats: food.fats,
        fiber: food.fiber, sugar: food.sugar, sodium: food.sodium,
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
          [date]: { ...log, meals: { ...log.meals, [mealType]: [...log.meals[mealType], newEntry] } },
        },
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
            meals: { ...log.meals, [mealType]: log.meals[mealType].filter((i: MealEntry) => i.id !== entryId) },
          },
        },
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
              [mealType]: log.meals[mealType].map((i: MealEntry) =>
                i.id === entryId ? { ...i, amount: newAmount } : i
              ),
            },
          },
        },
      };
    });
  };

  const addWorkout = (date: string, workout: WorkoutSession) => {
    const clampedCalories = Math.max(0, Math.min(2000, workout.caloriesBurned || 0));
    setState(prev => {
      const log = prev.logs[date] || emptyLog(date);
      let newXP = prev.xp + 25;
      const xpEvent: XPEvent = {
        id: `xp_${Date.now()}`,
        type: 'workout_completed',
        amount: 25,
        label: `Completed workout: ${workout.name}`,
        date,
      };

      // ── PR detection ──────────────────────────────────────────────────────
      const newPRs: PersonalRecord[] = [];
      const newMilestones: Milestone[] = [...prev.milestones];
      const updatedRecords = [...prev.personalRecords];

      for (const exercise of workout.exercises) {
        if (!exercise.sets.length) continue;
        let bestE1RM = 0;
        let bestSet = { weight: 0, reps: 0 };
        for (const set of exercise.sets) {
          if (!set.completed) continue;
          const e1rm = estimateE1RM(set.weight, set.reps);
          if (e1rm > bestE1RM) {
            bestE1RM = e1rm;
            bestSet = { weight: set.weight, reps: set.reps };
          }
        }
        if (bestE1RM === 0) continue;

        const existing = updatedRecords.find(r => r.exerciseId === exercise.exerciseId);
        const existingE1RM = existing ? estimateE1RM(existing.weight, existing.reps) : 0;

        if (bestE1RM > existingE1RM) {
          const pr: PersonalRecord = {
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.name,
            weight: bestSet.weight,
            reps: bestSet.reps,
            volume: bestSet.weight * bestSet.reps,
            achievedAt: new Date().toISOString(),
          };
          newPRs.push(pr);
          const idx = updatedRecords.findIndex(r => r.exerciseId === exercise.exerciseId);
          if (idx >= 0) updatedRecords[idx] = pr;
          else updatedRecords.push(pr);
          newXP += 15;
          newMilestones.push({
            id: `ms_pr_${exercise.exerciseId}_${Date.now()}`,
            type: 'badge',
            label: 'New Personal Record!',
            description: `${exercise.name}: ${bestSet.weight}kg × ${bestSet.reps} reps`,
            icon: '🏆',
            achievedAt: new Date().toISOString(),
            seen: false,
          });
        }
      }

      // ── Workout count milestones ──────────────────────────────────────────
      const totalWorkouts = Object.values(prev.logs).reduce((a, l) => a + (l.workouts?.length ?? 0), 0) + 1;
      const workoutMilestones: Array<[number, string, string, string]> = [
        [1, 'First Workout!', 'You started your fitness journey', '🏋️'],
        [10, '10 Workouts!', 'A solid foundation is forming', '💪'],
        [25, '25 Workouts!', 'You are becoming unstoppable', '🔥'],
        [50, '50 Workouts!', 'Elite dedication achieved', '⚡'],
        [100, '100 Workouts!', 'You are a legend', '👑'],
      ];
      for (const [count, label, desc, icon] of workoutMilestones) {
        if (totalWorkouts === count) {
          newMilestones.push({
            id: `ms_wc_${count}`,
            type: 'workout_count',
            label,
            description: desc,
            icon,
            achievedAt: new Date().toISOString(),
            seen: false,
          });
          newXP += 50;
        }
      }

      // ── Level up check ────────────────────────────────────────────────────
      const oldLevel = computeLevel(prev.xp);
      const newLevel = computeLevel(newXP);
      if (newLevel > oldLevel) {
        newMilestones.push({
          id: `ms_lvl_${newLevel}_${Date.now()}`,
          type: 'level_up',
          label: `Level ${newLevel} — ${LEVEL_NAMES[newLevel] ?? 'Max'}!`,
          description: `You've reached a new power level`,
          icon: '⬆️',
          achievedAt: new Date().toISOString(),
          seen: false,
        });
      }

      return {
        ...prev,
        xp: newXP,
        level: newLevel,
        xpHistory: [xpEvent, ...prev.xpHistory].slice(0, 200),
        personalRecords: updatedRecords,
        milestones: newMilestones,
        logs: {
          ...prev.logs,
          [date]: { ...log, workouts: [...log.workouts, { ...workout, caloriesBurned: clampedCalories }] },
        },
      };
    });
  };

  const updateHealthMetrics = (date: string, metrics: HealthMetrics) => {
    setState(prev => {
      const log = prev.logs[date] || emptyLog(date);
      return { ...prev, logs: { ...prev.logs, [date]: { ...log, health: { ...log.health, ...metrics } } } };
    });
  };

  const addCustomFood = (food: FoodItem) => {
    if (!food.name?.trim()) { showToast('Food name cannot be empty', 'error'); return; }
    if ([food.calories, food.protein, food.carbs, food.fats].some(v => v < 0)) {
      showToast('Nutrition values cannot be negative', 'error'); return;
    }
    if (food.servingSize <= 0) { showToast('Serving size must be > 0', 'error'); return; }
    setState(prev => ({ ...prev, customFoods: [...prev.customFoods, { ...food, source: 'custom' }] }));
  };

  const saveMeal = (name: string, mealType: MealType, entries: Array<{ food: FoodItem; amount: number }>) => {
    const savedMeal: SavedMeal = {
      id: `sm_${Date.now()}`, name, mealType, entries,
      totalNutrition: computeNutritionTotal(entries),
      createdAt: new Date().toISOString(), timesUsed: 0,
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
        foodId: food.id, foodName: food.name, amount,
        servingSize: food.servingSize, servingUnit: food.servingUnit,
        nutrition: { calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats },
        timestamp: new Date().toISOString(),
      }));
      const log = prev.logs[date] || emptyLog(date);
      return {
        ...prev,
        savedMeals: prev.savedMeals.map(m => m.id === savedMealId ? { ...m, timesUsed: m.timesUsed + 1 } : m),
        logs: {
          ...prev.logs,
          [date]: { ...log, meals: { ...log.meals, [mealType]: [...log.meals[mealType], ...newEntries] } },
        },
      };
    });
  };

  const addRecipe = (recipe: Recipe) => {
    setState(prev => ({ ...prev, recipes: [...prev.recipes.filter(r => r.id !== recipe.id), recipe] }));
  };

  const deleteRecipe = (id: string) => {
    setState(prev => ({ ...prev, recipes: prev.recipes.filter(r => r.id !== id) }));
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates, connectedApps: { ...prev.settings.connectedApps, ...(updates.connectedApps || {}) } },
    }));
  };

  const updateConnectionStatus = (app: string, status: ConnectionStatus) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, connectedApps: { ...prev.settings.connectedApps, [app]: status } },
    }));
  };

  const updateUnits = (units: 'metric' | 'imperial') => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, units } }));
  };

  const updateWeight = (weight: number, date: string) => {
    setState(prev => {
      const log = prev.logs[date] || emptyLog(date);
      return {
        ...prev,
        user: prev.user ? { ...prev.user, weight } : prev.user,
        logs: { ...prev.logs, [date]: { ...log, weight } },
      };
    });
  };

  const getNutritionTotals = (date: string): NutritionTotals => {
    const log = state.logs[date];
    if (!log) return { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    const allEntries: MealEntry[] = [...log.meals.breakfast, ...log.meals.lunch, ...log.meals.dinner, ...log.meals.snacks, ...(log.meals.dessert ?? [])];
    const safeN = (v: any) => (typeof v === 'number' && isFinite(v) ? v : 0);
    return allEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + safeN(entry.nutrition.calories) * safeN(entry.amount),
        protein:  acc.protein  + safeN(entry.nutrition.protein)  * safeN(entry.amount),
        carbs:    acc.carbs    + safeN(entry.nutrition.carbs)    * safeN(entry.amount),
        fats:     acc.fats     + safeN(entry.nutrition.fats)     * safeN(entry.amount),
        fiber:    acc.fiber    + safeN(entry.nutrition.fiber)    * safeN(entry.amount),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );
  };

  const getProgressionHistory = (exerciseId: string): ProgressionRecord[] => {
    const records: ProgressionRecord[] = [];
    for (const [date, log] of Object.entries(state.logs)) {
      for (const workout of log.workouts) {
        for (const exercise of workout.exercises) {
          if (exercise.exerciseId !== exerciseId || exercise.sets.length === 0) continue;
          let maxWeight = 0, totalVolume = 0;
          let bestSet = { weight: 0, reps: 0 };
          for (const set of exercise.sets) {
            totalVolume += set.weight * set.reps;
            if (set.weight > maxWeight) maxWeight = set.weight;
            if (set.weight * set.reps > bestSet.weight * bestSet.reps) bestSet = { weight: set.weight, reps: set.reps };
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

  const clearRecentFoods = () => setState(prev => ({ ...prev, recentFoods: [] }));

  const toggleFavoriteFood = (food: FoodItem) => {
    setState(prev => {
      const exists = prev.favoriteFoods.some(f => f.id === food.id);
      return {
        ...prev,
        favoriteFoods: exists ? prev.favoriteFoods.filter(f => f.id !== food.id) : [food, ...prev.favoriteFoods],
      };
    });
  };

  const setAssignedProgram = (programId: 'male_phase2' | 'female_phase1' | null) => {
    setState(prev => ({ ...prev, assignedProgram: programId }));
  };

  const setActiveMesocycle = (meso: Mesocycle | undefined) => {
    setState(prev => ({ ...prev, activeMesocycle: meso }));
  };

  // ── Custom Programs ──────────────────────────────────────────────────────────

  const saveCustomProgram = (program: CustomProgram) => {
    setState(prev => ({
      ...prev,
      customPrograms: [program, ...prev.customPrograms.filter(p => p.id !== program.id)],
    }));
  };

  const deleteCustomProgram = (id: string) => {
    setState(prev => ({
      ...prev,
      customPrograms: prev.customPrograms.filter(p => p.id !== id),
      activeCustomProgramId: prev.activeCustomProgramId === id ? null : prev.activeCustomProgramId,
    }));
  };

  const activateCustomProgram = (id: string | null) => {
    setState(prev => ({
      ...prev,
      activeCustomProgramId: id,
      assignedProgram: id ? null : prev.assignedProgram,
    }));
  };

  const duplicateCustomProgram = (id: string) => {
    setState(prev => {
      const original = prev.customPrograms.find(p => p.id === id);
      if (!original) return prev;
      const copy: CustomProgram = {
        ...original,
        id: `cp_${Date.now()}`,
        name: `${original.name} (Copy)`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        days: original.days.map(d => ({
          ...d,
          id: `day_${Date.now()}_${d.dayNumber}`,
          exercises: d.exercises.map(e => ({ ...e, id: `ex_${Date.now()}_${Math.random().toString(36).slice(2)}` })),
        })),
      };
      return { ...prev, customPrograms: [copy, ...prev.customPrograms] };
    });
  };

  // ── Exercise favorites ───────────────────────────────────────────────────────

  const toggleFavoriteExercise = (id: string) => {
    setState(prev => {
      const fav = prev.favoriteExerciseIds ?? [];
      return {
        ...prev,
        favoriteExerciseIds: fav.includes(id) ? fav.filter(x => x !== id) : [id, ...fav],
      };
    });
  };

  // ── Measurements ────────────────────────────────────────────────────────────

  const addMeasurement = (m: BodyMeasurement) => {
    setState(prev => ({
      ...prev,
      measurements: [m, ...prev.measurements.filter(x => x.id !== m.id)],
    }));
  };

  const deleteMeasurement = (id: string) => {
    setState(prev => ({ ...prev, measurements: prev.measurements.filter(m => m.id !== id) }));
  };

  // ── Progress Photos ──────────────────────────────────────────────────────────

  const addProgressPhoto = (photo: ProgressPhoto) => {
    setState(prev => ({
      ...prev,
      progressPhotos: [photo, ...prev.progressPhotos.filter(p => p.id !== photo.id)],
    }));
  };

  const deleteProgressPhoto = (id: string) => {
    setState(prev => ({ ...prev, progressPhotos: prev.progressPhotos.filter(p => p.id !== id) }));
  };

  // ── Habits ──────────────────────────────────────────────────────────────────

  const logHabit = (date: string, habitId: string, log: HabitLog) => {
    setState(prev => {
      const dayLog = prev.logs[date] || emptyLog(date);
      const wasCompleted = dayLog.habits?.[habitId]?.completed;
      const nowCompleted = log.completed;
      let newXP = prev.xp;
      const newXPHistory = [...prev.xpHistory];
      const newMilestones = [...prev.milestones];

      if (nowCompleted && !wasCompleted) {
        newXP += 5;
        newXPHistory.unshift({
          id: `xp_h_${Date.now()}`,
          type: 'habit_completed',
          amount: 5,
          label: `Habit completed`,
          date,
        });

        // Level up check
        const oldLevel = computeLevel(prev.xp);
        const newLevel = computeLevel(newXP);
        if (newLevel > oldLevel) {
          newMilestones.push({
            id: `ms_lvl_${newLevel}_${Date.now()}`,
            type: 'level_up',
            label: `Level ${newLevel} — ${LEVEL_NAMES[newLevel] ?? 'Max'}!`,
            description: `You've reached a new power level`,
            icon: '⬆️',
            achievedAt: new Date().toISOString(),
            seen: false,
          });
        }
      }

      return {
        ...prev,
        xp: newXP,
        level: computeLevel(newXP),
        xpHistory: newXPHistory.slice(0, 200),
        milestones: newMilestones,
        logs: {
          ...prev.logs,
          [date]: { ...dayLog, habits: { ...(dayLog.habits ?? {}), [habitId]: log } },
        },
      };
    });
  };

  const addHabitDefinition = (habit: HabitDefinition) => {
    setState(prev => ({
      ...prev,
      habitDefinitions: [...prev.habitDefinitions.filter(h => h.id !== habit.id), habit],
    }));
  };

  const removeHabitDefinition = (id: string) => {
    setState(prev => ({ ...prev, habitDefinitions: prev.habitDefinitions.filter(h => h.id !== id) }));
  };

  // ── Coach ────────────────────────────────────────────────────────────────────

  const addCoachInsight = (insight: CoachInsight) => {
    setState(prev => ({
      ...prev,
      coachInsights: [insight, ...prev.coachInsights.filter(i => i.id !== insight.id)].slice(0, 50),
    }));
  };

  const dismissCoachInsight = (id: string) => {
    setState(prev => {
      const exists = prev.coachInsights.find(i => i.id === id);
      if (exists) {
        return {
          ...prev,
          coachInsights: prev.coachInsights.map(i => i.id === id ? { ...i, dismissed: true } : i),
        };
      }
      // Insight came from coachService (not yet in state) — add a dismissed stub so filter picks it up
      return {
        ...prev,
        coachInsights: [
          ...prev.coachInsights,
          { id, dismissed: true, type: 'nutrition' as const, title: '', message: '', priority: 'low' as const, generatedAt: new Date().toISOString() },
        ],
      };
    });
  };

  const saveWeeklyCheckIn = (checkIn: WeeklyCheckIn) => {
    setState(prev => ({
      ...prev,
      weeklyCheckIns: [checkIn, ...prev.weeklyCheckIns.filter(c => c.id !== checkIn.id)],
    }));
  };

  // ── Meal Plans ───────────────────────────────────────────────────────────────

  const saveMealPlan = (plan: MealPlan) => {
    setState(prev => ({
      ...prev,
      mealPlans: [plan, ...prev.mealPlans.filter(p => p.id !== plan.id)].slice(0, 20),
    }));
  };

  const deleteMealPlan = (id: string) => {
    setState(prev => ({ ...prev, mealPlans: prev.mealPlans.filter(p => p.id !== id) }));
  };

  const saveAIProgram = (program: AIProgram) => {
    setState(prev => ({
      ...prev,
      aiPrograms: [program, ...prev.aiPrograms.filter(p => p.id !== program.id)].slice(0, 10),
    }));
  };

  const deleteAIProgram = (id: string) => {
    setState(prev => ({ ...prev, aiPrograms: prev.aiPrograms.filter(p => p.id !== id) }));
  };

  // ── Gamification ─────────────────────────────────────────────────────────────

  const awardXP = (type: XPEventType, amount: number, label: string) => {
    setState(prev => {
      const newXP = prev.xp + amount;
      const oldLevel = computeLevel(prev.xp);
      const newLevel = computeLevel(newXP);
      const xpEvent: XPEvent = {
        id: `xp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type,
        amount,
        label,
        date: new Date().toISOString().split('T')[0],
      };
      const newMilestones = [...prev.milestones];
      if (newLevel > oldLevel) {
        newMilestones.push({
          id: `ms_lvl_${newLevel}_${Date.now()}`,
          type: 'level_up',
          label: `Level ${newLevel} — ${LEVEL_NAMES[newLevel] ?? 'Max'}!`,
          description: `You've reached a new power level`,
          icon: '⬆️',
          achievedAt: new Date().toISOString(),
          seen: false,
        });
      }
      return {
        ...prev,
        xp: newXP,
        level: newLevel,
        xpHistory: [xpEvent, ...prev.xpHistory].slice(0, 200),
        milestones: newMilestones,
      };
    });
  };

  const markMilestoneSeen = (id: string) => {
    setState(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => m.id === id ? { ...m, seen: true } : m),
    }));
  };

  const saveDailyCheckIn = (checkIn: DailyCheckIn) => {
    setState(prev => ({
      ...prev,
      dailyCheckIns: [checkIn, ...prev.dailyCheckIns.filter(c => c.date !== checkIn.date)].slice(0, 90),
    }));
  };

  // ── Workout draft ────────────────────────────────────────────────────────────

  const saveWorkoutDraft = (draft: WorkoutDraft) => {
    setWorkoutDraftState(draft);
    try { localStorage.setItem('bbc_workout_draft', JSON.stringify(draft)); } catch {}
  };

  const clearWorkoutDraft = () => {
    setWorkoutDraftState(null);
    localStorage.removeItem('bbc_workout_draft');
  };

  const getWorkoutDraft = (): WorkoutDraft | null => {
    if (workoutDraft) return workoutDraft;
    try {
      const raw = localStorage.getItem('bbc_workout_draft');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  // ── Toast ────────────────────────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const duration = type === 'error' ? 5000 : 3000;
    setToasts(prev => {
      if (prev.length >= 4) {
        const nonError = prev.findIndex(t => t.type !== 'error');
        const trimmed = nonError !== -1 ? [...prev.slice(0, nonError), ...prev.slice(nonError + 1)] : prev.slice(1);
        return [...trimmed, { id, message, type, duration }];
      }
      return [...prev, { id, message, type, duration }];
    });
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  // ── Reset ────────────────────────────────────────────────────────────────────

  const resetApp = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('bbc_')) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    lastSavedRef.current = '';
    setState(defaultState);
    setToasts([]);
    setWorkoutDraftState(null);
  };

  return (
    <AppContext.Provider value={{
      state, toasts, isCloudSynced, lastSavedAt,
      updateUser, updateDailyLog, addFoodToLog, removeFoodEntry, editFoodEntry,
      addCustomFood, addWorkout, updateHealthMetrics,
      saveMeal, deleteSavedMeal, logSavedMeal, addRecipe, deleteRecipe,
      updateSettings, updateConnectionStatus, updateUnits,
      getNutritionTotals, getProgressionHistory,
      trackRecentFood, clearRecentFoods, toggleFavoriteFood, toggleFavoriteExercise,
      setAssignedProgram, saveCustomProgram, deleteCustomProgram, activateCustomProgram, duplicateCustomProgram, setActiveMesocycle,
      updateWeight,
      saveWorkoutDraft, clearWorkoutDraft, getWorkoutDraft,
      addMeasurement, deleteMeasurement,
      addProgressPhoto, deleteProgressPhoto,
      logHabit, addHabitDefinition, removeHabitDefinition,
      addCoachInsight, dismissCoachInsight, saveWeeklyCheckIn,
      saveMealPlan, deleteMealPlan,
      saveAIProgram, deleteAIProgram,
      awardXP, markMilestoneSeen, saveDailyCheckIn,
      showToast, resetApp,
    }}>
      {children}
      <ToastStack toasts={toasts} />
    </AppContext.Provider>
  );
};

// ─── Toast renderer ───────────────────────────────────────────────────────────

const ToastStack: React.FC<{ toasts: ToastItem[] }> = ({ toasts }) => {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '100px', left: '20px', right: '20px',
      zIndex: 9000, display: 'flex', flexDirection: 'column', gap: '8px',
      alignItems: 'center', pointerEvents: 'none', maxWidth: '480px', margin: '0 auto',
    }}>
      {toasts.map(t => <ToastBubble key={t.id} toast={t} />)}
    </div>
  );
};

const TOAST_STYLES = {
  success: { bg: 'rgba(87,96,56,0.10)',  border: '#576038', icon: '✓' },
  error:   { bg: 'rgba(151,68,0,0.10)',  border: '#974400', icon: '!' },
  info:    { bg: 'rgba(87,96,56,0.07)',  border: 'rgba(87,96,56,0.25)', icon: 'i' },
};

const ToastBubble: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const s = TOAST_STYLES[toast.type];
  return (
    <div className="animate-slide-up" style={{
      background: s.bg, border: `1px solid ${s.border}`,
      backdropFilter: 'blur(16px)', color: '#1A1A1A',
      padding: '12px 16px', borderRadius: '14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      fontWeight: 600, fontSize: '0.875rem',
      width: '100%', maxWidth: '460px',
      display: 'flex', alignItems: 'center', gap: '10px',
      pointerEvents: 'auto',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: s.border, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, flexShrink: 0,
        color: '#FFFFFF',
      }}>{s.icon}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
    </div>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
