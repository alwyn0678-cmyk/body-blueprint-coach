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
  goalType: GoalType;
  activityLevel: ActivityLevel;
  trainingFrequency: number; // sessions per week
  stepsTarget: number;
  
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
}

export interface FoodItem extends NutritionData {
  id: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  barcode?: string;
}

export interface MealEntry {
  id: string;
  foodId: string;
  foodName: string;
  amount: number; // multiplier of servingSize
  nutrition: NutritionData;
  timestamp: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface DailyLog {
  id: string; // YYYY-MM-DD
  date: string;
  weight?: number;
  steps: number;
  waterGlasses: number;
  meals: Record<MealType, MealEntry[]>;
  adherenceScore: number;
}

export interface AppState {
  user: UserProfile | null;
  logs: Record<string, DailyLog>; // Keyed by YYYY-MM-DD
  customFoods: FoodItem[];
}
