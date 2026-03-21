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
  targets: MacroTargets;
  preferredDietSpeed: 'aggressive' | 'moderate' | 'sustainable';
  onboarded: boolean;
  // Adaptive TDEE
  adaptiveTDEE?: number; // calculated from real weight data
  tdeeHistory?: TDEEDataPoint[]; // weekly TDEE estimates
}

// ─── Adaptive TDEE ───────────────────────────────────────────────────────────

export interface TDEEDataPoint {
  weekStart: string; // YYYY-MM-DD
  estimatedTDEE: number;
  avgCaloriesLogged: number;
  avgWeightEMA: number;
  weightDelta: number; // kg change over the week
  adjustedCalories: number; // recommended target after adjustment
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

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
  source?: 'local' | 'custom' | 'openfoodfacts' | 'usda';
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

// ─── Training ─────────────────────────────────────────────────────────────────

export interface ExerciseSet {
  id: string;
  weight: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion 1-10
  rir?: number; // Reps In Reserve 0-5
  completed?: boolean;
}

export interface ExerciseEntry {
  id: string;
  exerciseId: string;
  name: string;
  sets: ExerciseSet[];
  notes?: string;
  targetMuscles?: string[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  timestamp: string;
  durationMinutes: number;
  exercises: ExerciseEntry[];
  caloriesBurned?: number;
  mesocycleWeek?: number; // which week of the mesocycle
  sessionRPE?: number; // overall session RPE 1-10
  notes?: string;
}

// ─── Training Science: Volume Landmarks ──────────────────────────────────────

export type MuscleGroup =
  | 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps'
  | 'Quads' | 'Hamstrings' | 'Glutes' | 'Calves' | 'Core' | 'Traps' | 'Rear Delts';

export interface MuscleVolumeLandmarks {
  muscle: MuscleGroup;
  mev: number; // Minimum Effective Volume (sets/week)
  mav: number; // Maximum Adaptive Volume (sets/week)
  mrv: number; // Maximum Recoverable Volume (sets/week)
  currentVolume: number; // sets logged this week
}

// ─── Mesocycle ────────────────────────────────────────────────────────────────

export interface Mesocycle {
  id: string;
  name: string;
  goal: 'hypertrophy' | 'strength' | 'endurance' | 'deload';
  startDate: string;
  endDate: string;
  totalWeeks: number;
  currentWeek: number;
  sessions: MesocycleSession[];
  notes?: string;
}

export interface MesocycleSession {
  dayOfWeek: number; // 0=Sun...6=Sat
  name: string; // e.g. "Push A", "Upper", "Lower B"
  muscleGroups: MuscleGroup[];
  exerciseIds?: string[];
}

// ─── Health Metrics ───────────────────────────────────────────────────────────

export interface HealthMetrics {
  sleepScore?: number;
  sleepDurationMinutes?: number;
  recoveryScore?: number;
  restingHR?: number;
  hrv?: number;
  stressLevel?: number; // 1-10
  mood?: number; // 1-5
}

// ─── Body Measurements ────────────────────────────────────────────────────────

export interface BodyMeasurement {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  // Circumference measurements (cm or inches)
  neck?: number;
  chest?: number;
  leftArm?: number;
  rightArm?: number;
  waist?: number;
  hips?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
}

// ─── Progress Photos ──────────────────────────────────────────────────────────

export type PhotoAngle = 'front' | 'side' | 'back';

export interface ProgressPhoto {
  id: string;
  date: string;
  angle: PhotoAngle;
  localUri?: string; // local file URI (Capacitor)
  supabaseUrl?: string; // cloud URL after upload
  weight?: number;
  notes?: string;
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export interface HabitDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: 'nutrition' | 'training' | 'sleep' | 'wellness';
  targetValue?: number;
  unit?: string;
}

export interface HabitLog {
  habitId: string;
  completed: boolean;
  value?: number; // for quantitative habits (e.g. glasses of water)
  timestamp?: string;
}

// ─── Daily Log ────────────────────────────────────────────────────────────────

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
  habits?: Record<string, HabitLog>;
}

// ─── Saved Meals ──────────────────────────────────────────────────────────────

export interface SavedMeal {
  id: string;
  name: string;
  mealType: MealType;
  entries: Array<{ food: FoodItem; amount: number }>;
  totalNutrition: NutritionData;
  createdAt: string;
  timesUsed: number;
}

// ─── Recipe ───────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  food: FoodItem;
  amount: number;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  totalNutrition: NutritionData;
  perServingNutrition: NutritionData;
  instructions?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  tags?: string[];
  createdAt: string;
}

// ─── Weekly Stats ─────────────────────────────────────────────────────────────

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

// ─── AI Coach ─────────────────────────────────────────────────────────────────

export interface CoachInsight {
  id: string;
  type: 'nutrition' | 'training' | 'recovery' | 'mindset' | 'weekly_review';
  title: string;
  message: string;
  action?: string; // e.g. "Reduce calories by 100"
  priority: 'low' | 'medium' | 'high';
  generatedAt: string;
  dismissed?: boolean;
}

export interface WeeklyCheckIn {
  id: string;
  weekStart: string;
  completedAt?: string;
  weightLogged: boolean;
  avgCalories: number;
  avgProtein: number;
  calorieAdherence: number;
  proteinAdherence: number;
  workoutsCompleted: number;
  averageRPE?: number;
  sleepQuality?: number;
  energyLevel?: number;
  progressPhotos?: boolean;
  adjustmentMade?: {
    type: 'calories' | 'protein' | 'training_volume';
    delta: number;
    reason: string;
  };
  coachResponse?: string;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed' | 'disabled';

export interface AppSettings {
  adaptiveCoaching: boolean;
  plateauDetection: boolean;
  weeklyCheckIn: boolean;
  notificationsEnabled: boolean;
  units: 'metric' | 'imperial';
  theme?: 'light' | 'dark';
  connectedApps: {
    apple_health: ConnectionStatus;
    google_fit: ConnectionStatus;
    garmin: ConnectionStatus;
    whoop: ConnectionStatus;
  };
  claudeApiKey?: string; // user's own API key for AI coaching
}

// ─── Custom Programs ──────────────────────────────────────────────────────────

export type ProgramGoal = 'hypertrophy' | 'strength' | 'endurance' | 'fat_loss';

export interface CustomProgramExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  rest: number; // seconds
  notes?: string;
  supersetGroup?: string; // 'A', 'B', 'C', etc.
}

export interface CustomProgramDay {
  id: string;
  dayNumber: number;
  name: string;
  focus?: string;
  exercises: CustomProgramExercise[];
}

export interface CustomProgram {
  id: string;
  name: string;
  description?: string;
  goal?: ProgramGoal;
  days: CustomProgramDay[];
  status: 'draft' | 'active';
  createdAt: string;
  updatedAt: string;
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppState {
  user: UserProfile | null;
  logs: Record<string, DailyLog>; // Keyed by YYYY-MM-DD
  customFoods: FoodItem[];
  savedMeals: SavedMeal[];
  recipes: Recipe[];
  workoutLibrary: { id: string; name: string; targetMuscles: string[] }[];
  settings: AppSettings;
  recentFoods: FoodItem[];
  favoriteFoods: FoodItem[];
  favoriteExerciseIds: string[]; // pinned exercises in picker
  assignedProgram: 'male_phase2' | 'female_phase1' | null;
  // Custom programs
  customPrograms: CustomProgram[];
  activeCustomProgramId: string | null;
  // New state
  measurements: BodyMeasurement[];
  progressPhotos: ProgressPhoto[];
  habitDefinitions: HabitDefinition[];
  coachInsights: CoachInsight[];
  weeklyCheckIns: WeeklyCheckIn[];
  activeMesocycle?: Mesocycle;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface ProgressionRecord {
  date: string;
  exerciseId: string;
  maxWeight: number;
  totalVolume: number;
  bestSet: { weight: number; reps: number };
}

export interface AppMetadata {
  schemaVersion: number;
  lastSaved: string;
  appVersion: string;
}
