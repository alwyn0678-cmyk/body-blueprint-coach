// ─── Storage ──────────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'bbc_state';
export const SCHEMA_VERSION = 4;

// ─── Macro colors (matches index.css CSS variables) ───────────────────────────

export const MACRO_COLORS = {
  calories: '#FF375F',
  protein: '#FF9F0A',
  carbs: '#0A84FF',
  fats: '#30D158',
} as const;

// ─── General accent palette ───────────────────────────────────────────────────

export const ACCENT_COLORS = {
  blue: '#0A84FF',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF453A',
  teal: '#64D2FF',
  indigo: '#5E5CE6',
  pink: '#FF375F',
} as const;

// ─── Movement pattern colors for training view ────────────────────────────────

export const PATTERN_COLORS = {
  push: '#60a5fa',
  pull: '#4ade80',
  legs: '#fb923c',
  core: '#a78bfa',
  all: '#ffffff',
} as const;

// ─── Meal type configuration ──────────────────────────────────────────────────

export const MEAL_CONFIG = {
  breakfast: { label: 'Breakfast', emoji: '🌅', order: 0 },
  lunch: { label: 'Lunch', emoji: '☀️', order: 1 },
  dinner: { label: 'Dinner', emoji: '🌙', order: 2 },
  snacks: { label: 'Snacks', emoji: '🍎', order: 3 },
} as const;

// ─── Recovery score thresholds ────────────────────────────────────────────────

export const RECOVERY_THRESHOLDS = {
  peak: 80,
  good: 60,
  moderate: 40,
  low: 0,
} as const;

// ─── Workout quick-start templates ────────────────────────────────────────────

export const WORKOUT_TEMPLATES = [
  { name: 'Push Day',         emoji: '💪', muscles: 'Chest · Shoulders · Triceps', color: '#60a5fa', pattern: 'push' as const },
  { name: 'Pull Day',         emoji: '🔄', muscles: 'Back · Biceps',               color: '#4ade80', pattern: 'pull' as const },
  { name: 'Leg Day',          emoji: '🦵', muscles: 'Quads · Glutes · Hamstrings', color: '#fb923c', pattern: 'legs' as const },
  { name: 'Upper Body',       emoji: '🏋️', muscles: 'Push + Pull combined',        color: '#a78bfa', pattern: 'push' as const },
  { name: 'Full Body',        emoji: '⚡', muscles: 'All muscle groups',            color: '#f9a8d4', pattern: 'all'  as const },
  { name: 'Arms & Shoulders', emoji: '💥', muscles: 'Biceps · Triceps · Delts',    color: '#fbbf24', pattern: 'push' as const },
] as const;

// ─── Activity level multipliers (Mifflin-St Jeor / Harris-Benedict) ──────────

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
} as const;

// ─── App connected integrations ───────────────────────────────────────────────

export const INTEGRATION_CONFIG = [
  { id: 'apple_health',  label: 'Apple Health',   icon: '❤️', platform: 'ios'     },
  { id: 'google_fit',    label: 'Google Fit',     icon: '🟢', platform: 'android' },
  { id: 'garmin',        label: 'Garmin Connect', icon: '⌚', platform: 'all'     },
  { id: 'whoop',         label: 'Whoop',          icon: '🔴', platform: 'all'     },
] as const;
