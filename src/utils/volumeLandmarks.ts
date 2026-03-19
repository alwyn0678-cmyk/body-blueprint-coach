/**
 * Volume Landmarks — Jeff Nippard / RP Strength science-based approach
 *
 * MEV = Minimum Effective Volume (lowest sets/week that drive growth)
 * MAV = Maximum Adaptive Volume (optimal range for growth)
 * MRV = Maximum Recoverable Volume (limit before recovery breaks down)
 *
 * Values based on RP Strength volume landmarks research + Schoenfeld meta-analyses.
 * Ranges are for trained lifters; beginners recover from less and can do less.
 */

import { MuscleGroup, MuscleVolumeLandmarks, DailyLog, ExerciseEntry } from '../types';

// ─── Volume landmark data ─────────────────────────────────────────────────────

interface VolumeLandmark {
  mev: number; // sets/week
  mav: number; // peak adaptive sets/week
  mrv: number; // max recoverable sets/week
}

export const VOLUME_LANDMARKS: Record<MuscleGroup, VolumeLandmark> = {
  Chest:      { mev: 8,  mav: 16, mrv: 22 },
  Back:       { mev: 10, mav: 18, mrv: 25 },
  Shoulders:  { mev: 8,  mav: 16, mrv: 22 },
  Biceps:     { mev: 6,  mav: 14, mrv: 20 },
  Triceps:    { mev: 6,  mav: 14, mrv: 20 },
  Quads:      { mev: 8,  mav: 16, mrv: 20 },
  Hamstrings: { mev: 6,  mav: 12, mrv: 16 },
  Glutes:     { mev: 4,  mav: 12, mrv: 16 },
  Calves:     { mev: 8,  mav: 16, mrv: 22 },
  Core:       { mev: 8,  mav: 16, mrv: 25 },
  Traps:      { mev: 4,  mav: 12, mrv: 18 },
  'Rear Delts': { mev: 6, mav: 14, mrv: 20 },
};

// ─── Exercise → muscle group mapping ─────────────────────────────────────────

export const EXERCISE_MUSCLE_MAP: Record<string, MuscleGroup[]> = {
  // Chest
  'Barbell Bench Press':       ['Chest', 'Triceps'],
  'Incline Dumbbell Press':    ['Chest', 'Shoulders'],
  'Cable Fly':                 ['Chest'],
  'Pec Deck':                  ['Chest'],
  'Dumbbell Fly':              ['Chest'],
  'Push Up':                   ['Chest', 'Triceps'],

  // Back
  'Pull Ups':                  ['Back', 'Biceps'],
  'Barbell Row':               ['Back', 'Biceps'],
  'Cable Row':                 ['Back', 'Biceps'],
  'Lat Pulldown':              ['Back', 'Biceps'],
  'Deadlift':                  ['Back', 'Hamstrings'],
  'Romanian Deadlift':         ['Hamstrings', 'Glutes'],
  'Face Pull':                 ['Rear Delts', 'Traps'],
  'Dumbbell Row':              ['Back', 'Biceps'],
  'T-Bar Row':                 ['Back', 'Biceps'],

  // Shoulders
  'Overhead Press':            ['Shoulders', 'Triceps'],
  'Lateral Raise':             ['Shoulders'],
  'Dumbbell Shoulder Press':   ['Shoulders', 'Triceps'],
  'Arnold Press':              ['Shoulders'],
  'Cable Lateral Raise':       ['Shoulders'],

  // Arms
  'Dumbbell Curl':             ['Biceps'],
  'Barbell Curl':              ['Biceps'],
  'Hammer Curl':               ['Biceps'],
  'Preacher Curl':             ['Biceps'],
  'Tricep Pushdown':           ['Triceps'],
  'Overhead Tricep Extension': ['Triceps'],
  'Skull Crusher':             ['Triceps'],
  'Close Grip Bench Press':    ['Triceps', 'Chest'],

  // Legs
  'Squat (High Bar)':          ['Quads', 'Glutes'],
  'Squat (Low Bar)':           ['Quads', 'Glutes', 'Hamstrings'],
  'Leg Press':                 ['Quads', 'Glutes'],
  'Leg Extension':             ['Quads'],
  'Leg Curl':                  ['Hamstrings'],
  'Bulgarian Split Squat':     ['Quads', 'Glutes'],
  'Hip Thrust':                ['Glutes'],
  'Cable Pull Through':        ['Glutes', 'Hamstrings'],
  'Calf Raise':                ['Calves'],
  'Seated Calf Raise':         ['Calves'],
  'Glute Bridge':              ['Glutes'],

  // Core
  'Plank':                     ['Core'],
  'Cable Crunch':              ['Core'],
  'Ab Wheel':                  ['Core'],
  'Hanging Leg Raise':         ['Core'],
};

// ─── Calculate weekly volume from logs ───────────────────────────────────────

export const getWeeklySetsPerMuscle = (
  logs: Record<string, DailyLog>,
  weekStart: string
): Record<MuscleGroup, number> => {
  const result: Record<string, number> = {};
  const muscles: MuscleGroup[] = Object.keys(VOLUME_LANDMARKS) as MuscleGroup[];
  muscles.forEach(m => { result[m] = 0; });

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  for (const [date, log] of Object.entries(logs)) {
    if (date < weekStart || date > weekEndStr) continue;
    for (const workout of log.workouts) {
      for (const exercise of workout.exercises) {
        const muscles = EXERCISE_MUSCLE_MAP[exercise.name];
        if (!muscles) continue;
        const primaryMuscle = muscles[0]; // Count sets for primary muscle
        if (primaryMuscle && result[primaryMuscle] !== undefined) {
          result[primaryMuscle] += exercise.sets.filter(s => s.completed !== false).length;
        }
        // Secondary muscles get 0.5 sets
        if (muscles[1] && result[muscles[1]] !== undefined) {
          result[muscles[1]] += Math.round(
            exercise.sets.filter(s => s.completed !== false).length * 0.5
          );
        }
      }
    }
  }

  return result as Record<MuscleGroup, number>;
};

// ─── Build volume landmark data for display ───────────────────────────────────

export const buildVolumeLandmarks = (
  logs: Record<string, DailyLog>,
  weekStart: string,
  filterMuscles?: MuscleGroup[]
): MuscleVolumeLandmarks[] => {
  const weekly = getWeeklySetsPerMuscle(logs, weekStart);
  const muscles = (filterMuscles ?? Object.keys(VOLUME_LANDMARKS)) as MuscleGroup[];

  return muscles.map(muscle => ({
    muscle,
    ...VOLUME_LANDMARKS[muscle],
    currentVolume: weekly[muscle] ?? 0,
  }));
};

// ─── Volume status ────────────────────────────────────────────────────────────

export type VolumeStatus = 'below_mev' | 'in_mev' | 'in_mav' | 'approaching_mrv' | 'at_mrv';

export const getVolumeStatus = (current: number, mev: number, mav: number, mrv: number): VolumeStatus => {
  if (current === 0 || current < mev) return 'below_mev';
  if (current <= mav * 0.6) return 'in_mev';
  if (current <= mav) return 'in_mav';
  if (current < mrv) return 'approaching_mrv';
  return 'at_mrv';
};

export const VOLUME_STATUS_LABELS: Record<VolumeStatus, { label: string; color: string; description: string }> = {
  below_mev:      { label: 'Below MEV', color: '#FF453A', description: 'Below minimum to drive growth' },
  in_mev:         { label: 'MEV',       color: '#FF9F0A', description: 'Minimum effective — growing slowly' },
  in_mav:         { label: 'MAV',       color: '#32D74B', description: 'Maximum adaptive — optimal growth zone' },
  approaching_mrv: { label: 'Near MRV', color: '#5AC8FA', description: 'High volume — monitor recovery' },
  at_mrv:         { label: 'MRV',       color: '#BF5AF2', description: 'Max recoverable — deload soon' },
};

// ─── Auto-progression calculator ─────────────────────────────────────────────

export interface ProgressionSuggestion {
  exerciseId: string;
  exerciseName: string;
  currentBest: { weight: number; reps: number };
  suggestion: { weight: number; reps: number };
  type: 'weight_increase' | 'rep_increase' | 'maintain' | 'deload';
  reasoning: string;
}

export const calculateProgression = (
  exerciseName: string,
  exerciseId: string,
  history: Array<{ date: string; bestSet: { weight: number; reps: number }; rpe?: number }>,
  targetReps: { min: number; max: number } = { min: 8, max: 12 }
): ProgressionSuggestion | null => {
  if (history.length === 0) return null;

  const recent = history.slice(-4); // Last 4 sessions
  const last = recent[recent.length - 1];
  const { weight, reps } = last.bestSet;

  // Double progression: increase reps first, then weight
  if (reps >= targetReps.max) {
    // Can increase weight — typical increments
    const increment = weight >= 80 ? 2.5 : weight >= 40 ? 2 : 1;
    return {
      exerciseId, exerciseName,
      currentBest: { weight, reps },
      suggestion: { weight: weight + increment, reps: targetReps.min },
      type: 'weight_increase',
      reasoning: `Hit ${reps} reps — above the ${targetReps.max} rep ceiling. Add ${increment}kg and drop back to ${targetReps.min} reps.`,
    };
  }

  if (reps < targetReps.min && recent.length >= 2) {
    const prev = recent[recent.length - 2];
    if (prev.bestSet.weight === weight && prev.bestSet.reps <= reps) {
      // Stalled below target — deload or maintain
      return {
        exerciseId, exerciseName,
        currentBest: { weight, reps },
        suggestion: { weight: Math.round(weight * 0.9 * 2.5) / 2.5, reps: targetReps.max },
        type: 'deload',
        reasoning: `Stalled at ${weight}kg × ${reps} for 2+ sessions. Deload to 90% (${Math.round(weight * 0.9 * 2.5) / 2.5}kg) and rebuild reps.`,
      };
    }
  }

  // Still within rep range — aim for more reps
  return {
    exerciseId, exerciseName,
    currentBest: { weight, reps },
    suggestion: { weight, reps: Math.min(reps + 1, targetReps.max) },
    type: 'rep_increase',
    reasoning: `At ${weight}kg × ${reps}. Push for ${Math.min(reps + 1, targetReps.max)} reps today using double progression.`,
  };
};

// ─── Deload detection ─────────────────────────────────────────────────────────

export interface DeloadRecommendation {
  recommended: boolean;
  urgency: 'none' | 'consider' | 'strongly_recommended';
  reasons: string[];
  protocol: string;
}

export const assessDeloadNeed = (
  mesocycleWeek: number,
  totalMesocycleWeeks: number,
  avgSessionRPE?: number,
  musclesNearMRV?: number,
  weeklyWorkoutCount?: number
): DeloadRecommendation => {
  const reasons: string[] = [];
  let urgency: 'none' | 'consider' | 'strongly_recommended' = 'none';

  if (mesocycleWeek >= totalMesocycleWeeks) {
    reasons.push(`Reached end of ${totalMesocycleWeeks}-week mesocycle`);
    urgency = 'strongly_recommended';
  }

  if (avgSessionRPE && avgSessionRPE >= 9) {
    reasons.push(`Average session RPE ${avgSessionRPE.toFixed(1)} — high systemic fatigue`);
    urgency = urgency === 'strongly_recommended' ? 'strongly_recommended' : 'consider';
  }

  if (musclesNearMRV && musclesNearMRV >= 3) {
    reasons.push(`${musclesNearMRV} muscle groups at or near MRV`);
    urgency = 'strongly_recommended';
  }

  if (weeklyWorkoutCount !== undefined && weeklyWorkoutCount === 0) {
    reasons.push('No workouts logged this week — possible involuntary deload');
  }

  return {
    recommended: urgency !== 'none',
    urgency,
    reasons,
    protocol: urgency === 'strongly_recommended'
      ? 'Full deload: 40–50% volume reduction, keep weights same or reduce 10%. 1 week. Focus on form, mobility, and recovery.'
      : 'Optional deload: reduce volume by 20–30%, maintain load. Monitor how you feel.',
  };
};

// ─── Top muscle groups to prioritise ─────────────────────────────────────────

export const getMusclesPriority = (
  landmarks: MuscleVolumeLandmarks[],
  goalType: string
): MuscleGroup[] => {
  const hypertrophyPriority: MuscleGroup[] = goalType === 'fat_loss'
    ? ['Back', 'Chest', 'Quads', 'Hamstrings', 'Shoulders']
    : ['Chest', 'Back', 'Shoulders', 'Quads', 'Glutes', 'Biceps', 'Triceps', 'Hamstrings'];

  return hypertrophyPriority.filter(m =>
    landmarks.find(l => l.muscle === m && l.currentVolume < l.mev)
  );
};
