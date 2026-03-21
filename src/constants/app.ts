// ─── Storage ──────────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'bbc_state';
export const SCHEMA_VERSION = 4;

// ─── Macro colors (matches index.css CSS variables) ───────────────────────────

export const MACRO_COLORS = {
  calories: '#974400',
  protein:  '#974400',
  carbs:    '#8B9467',
  fats:     '#576038',
} as const;

// ─── General accent palette ───────────────────────────────────────────────────

export const ACCENT_COLORS = {
  blue:   '#576038',
  green:  '#576038',
  orange: '#974400',
  red:    '#DC2626',
  teal:   '#8B9467',
  indigo: '#576038',
  pink:   '#C05200',
} as const;

// ─── Movement pattern colors for training view ────────────────────────────────

export const PATTERN_COLORS = {
  push: '#576038',
  pull: '#8B9467',
  legs: '#974400',
  core: '#3E4528',
  all:  '#C2CB9A',
} as const;

// ─── Meal type configuration ──────────────────────────────────────────────────

export const MEAL_CONFIG = {
  breakfast: { label: 'Breakfast', emoji: '🌅', order: 0 },
  lunch:     { label: 'Lunch',     emoji: '☀️', order: 1 },
  dinner:    { label: 'Dinner',    emoji: '🌙', order: 2 },
  snacks:    { label: 'Snacks',    emoji: '🍎', order: 3 },
} as const;

// ─── Recovery score thresholds ────────────────────────────────────────────────

export const RECOVERY_THRESHOLDS = {
  peak:     80,
  good:     60,
  moderate: 40,
  low:       0,
} as const;

// ─── Workout quick-start templates ────────────────────────────────────────────

export const WORKOUT_TEMPLATES = [
  { name: 'Push Day',         emoji: '💪', muscles: 'Chest · Shoulders · Triceps', color: '#576038', pattern: 'push' as const },
  { name: 'Pull Day',         emoji: '🔄', muscles: 'Back · Biceps',               color: '#8B9467', pattern: 'pull' as const },
  { name: 'Leg Day',          emoji: '🦵', muscles: 'Quads · Glutes · Hamstrings', color: '#974400', pattern: 'legs' as const },
  { name: 'Upper Body',       emoji: '🏋️', muscles: 'Push + Pull combined',        color: '#3E4528', pattern: 'push' as const },
  { name: 'Full Body',        emoji: '⚡', muscles: 'All muscle groups',            color: '#C2CB9A', pattern: 'all'  as const },
  { name: 'Arms & Shoulders', emoji: '💥', muscles: 'Biceps · Triceps · Delts',    color: '#C05200', pattern: 'push' as const },
] as const;

// ─── Activity level multipliers (Mifflin-St Jeor / Harris-Benedict) ──────────

export const ACTIVITY_MULTIPLIERS = {
  sedentary:        1.2,
  lightly_active:   1.375,
  moderately_active: 1.55,
  very_active:      1.725,
  extra_active:     1.9,
} as const;

// ─── App connected integrations ───────────────────────────────────────────────

export const INTEGRATION_CONFIG = [
  { id: 'apple_health',  label: 'Apple Health',   icon: '❤️', platform: 'ios'     },
  { id: 'google_fit',    label: 'Google Fit',     icon: '🟢', platform: 'android' },
  { id: 'garmin',        label: 'Garmin Connect', icon: '⌚', platform: 'all'     },
  { id: 'whoop',         label: 'Whoop',          icon: '🔴', platform: 'all'     },
] as const;
