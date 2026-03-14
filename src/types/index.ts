export type GoalType = 'fat_loss' | 'maintenance' | 'muscle_gain' | 'recomposition';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  goalWeight?: number; // kg
  bodyFat?: number; // %
  goalType: GoalType;
  activityLevel: ActivityLevel;
  trainingFrequency: number; // sessions per week
  stepsTarget?: number;

  // Calculated targets
  targets: MacroTargets;

  // Preferences
  preferredDietSpeed: 'aggressive' | 'moderate' | 'sustainable';
  onboarded: boolean;
}

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sugar?: number;
  sodium?: number; // mg
}

export interface FoodItem extends NutritionData {
  id: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  barcode?: string;
  source?: 'local' | 'custom' | 'openfoodfacts';
}

export interface MealEntry {
  id: string;
  foodId: string;
  foodName: string;
  amount: number; // multiplier of servingSize
  servingSize: number;
  servingUnit: string;
  nutrition: NutritionData;
  timestamp: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface ExerciseSet {
  id: string;
  weight: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion 1-10
}

export interface ExerciseEntry {
  id: string;
  exerciseId: string;
  name: string;
  sets: ExerciseSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  name: string;
  timestamp: string;
  durationMinutes: number;
  exercises: ExerciseEntry[];
  caloriesBurned?: number;
}

export interface HealthMetrics {
  sleepScore?: number;
  sleepDurationMinutes?: number;
  recoveryScore?: number;
  restingHR?: number;
  hrv?: number;
}

export interface DailyLog {
  id: string; // YYYY-MM-DD
  date: string;
  weight?: number;
  steps: number;
  waterGlasses: number;
  meals: Record<MealType, MealEntry[]>;
  workouts: WorkoutSession[];
  health: HealthMetrics;
  adherenceScore: number;
}

export interface SavedMeal {
  id: string;
  name: string;
  mealType: MealType;
  entries: Array<{
    food: FoodItem;
    amount: number;
  }>;
  totalNutrition: NutritionData;
  createdAt: string;
  timesUsed: number;
}

export interface WeeklyStats {
  weekStart: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  calorieAdherence: number; // %
  proteinAdherence: number; // %
  daysLogged: number;
  weightChange: number | null;
  workoutsCompleted: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface AppSettings {
  adaptiveCoaching: boolean;
  plateauDetection: boolean;
  weeklyCheckIn: boolean;
  connectedApps: {
    appleHealth: ConnectionStatus;
    googleFit: ConnectionStatus;
    garmin: ConnectionStatus;
    whoop: ConnectionStatus;
  };
}

export interface AppState {
  user: UserProfile | null;
  logs: Record<string, DailyLog>; // Keyed by YYYY-MM-DD
  customFoods: FoodItem[];
  savedMeals: SavedMeal[];
  workoutLibrary: { id: string; name: string; targetMuscles: string[] }[];
  settings: AppSettings;
  recentFoods: FoodItem[]; // full objects, most recent first, max 20
  favoriteFoods: FoodItem[]; // full objects
  assignedProgram: 'male_phase2' | 'female_phase1' | null;
}
