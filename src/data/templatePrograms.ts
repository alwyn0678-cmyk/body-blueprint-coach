/**
 * Workout Template Programs
 * Popular evidence-based programs available for users to clone & activate.
 * Exercise IDs reference the baseWorkoutLibrary in AppContext.tsx.
 */

import type { CustomProgram } from '../types';

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  goal: 'strength' | 'hypertrophy' | 'fat_loss' | 'general';
  daysPerWeek: number;
  sessionDuration: string; // e.g. "45–60 min"
  program: Omit<CustomProgram, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
}

// ─── Stronglifts 5×5 ─────────────────────────────────────────────────────────
const STRONGLIFTS_5X5: ProgramTemplate = {
  id: 'tpl_sl5x5',
  name: 'Stronglifts 5×5',
  description: 'Classic beginner strength program. 3 days/week alternating two full-body sessions. Add 2.5kg every session.',
  difficulty: 'beginner',
  goal: 'strength',
  daysPerWeek: 3,
  sessionDuration: '45–60 min',
  program: {
    name: 'Stronglifts 5×5',
    description: 'Classic linear progression. 3 days/week alternating two full-body sessions. Add 2.5kg every session.',
    goal: 'strength',
    days: [
      {
        id: 'day_sl_a',
        dayNumber: 1,
        name: 'Session A',
        focus: 'Full Body',
        exercises: [
          { id: 'ex_sl_a1', exerciseId: '2', name: 'Squat (High Bar)', sets: 5, reps: '5', rest: 180 },
          { id: 'ex_sl_a2', exerciseId: '1', name: 'Barbell Bench Press', sets: 5, reps: '5', rest: 180 },
          { id: 'ex_sl_a3', exerciseId: '6', name: 'Barbell Row', sets: 5, reps: '5', rest: 180 },
        ],
      },
      {
        id: 'day_sl_b',
        dayNumber: 2,
        name: 'Session B',
        focus: 'Full Body',
        exercises: [
          { id: 'ex_sl_b1', exerciseId: '2', name: 'Squat (High Bar)', sets: 5, reps: '5', rest: 180 },
          { id: 'ex_sl_b2', exerciseId: '5', name: 'Overhead Press', sets: 5, reps: '5', rest: 180 },
          { id: 'ex_sl_b3', exerciseId: '3', name: 'Deadlift', sets: 1, reps: '5', rest: 180 },
        ],
      },
    ],
  },
};

// ─── Push Pull Legs (PPL) ─────────────────────────────────────────────────────
const PUSH_PULL_LEGS: ProgramTemplate = {
  id: 'tpl_ppl',
  name: 'Push Pull Legs (PPL)',
  description: 'Intermediate hypertrophy program. 6 days/week, high volume, excellent muscle development.',
  difficulty: 'intermediate',
  goal: 'hypertrophy',
  daysPerWeek: 6,
  sessionDuration: '60–75 min',
  program: {
    name: 'Push Pull Legs (PPL)',
    description: 'High-volume hypertrophy split. 6 days/week with rest day.',
    goal: 'hypertrophy',
    days: [
      {
        id: 'day_ppl_push',
        dayNumber: 1,
        name: 'Push A',
        focus: 'Chest / Shoulders / Triceps',
        exercises: [
          { id: 'ex_ppl_p1', exerciseId: '1', name: 'Barbell Bench Press', sets: 4, reps: '6–8', rest: 180 },
          { id: 'ex_ppl_p2', exerciseId: '5', name: 'Overhead Press', sets: 3, reps: '8–10', rest: 150 },
          { id: 'ex_ppl_p3', exerciseId: '7', name: 'Incline Dumbbell Press', sets: 3, reps: '10–12', rest: 120 },
          { id: 'ex_ppl_p4', exerciseId: '13', name: 'Lateral Raise', sets: 3, reps: '15–20', rest: 60 },
          { id: 'ex_ppl_p5', exerciseId: '12', name: 'Tricep Pushdown', sets: 3, reps: '12–15', rest: 90, supersetGroup: 'A' },
          { id: 'ex_ppl_p6', exerciseId: '21', name: 'Skull Crusher', sets: 3, reps: '10–12', rest: 90, supersetGroup: 'A' },
        ],
      },
      {
        id: 'day_ppl_pull',
        dayNumber: 2,
        name: 'Pull A',
        focus: 'Back / Biceps',
        exercises: [
          { id: 'ex_ppl_l1', exerciseId: '3', name: 'Deadlift', sets: 3, reps: '5', rest: 240 },
          { id: 'ex_ppl_l2', exerciseId: '4', name: 'Pull Ups', sets: 4, reps: '6–10', rest: 150 },
          { id: 'ex_ppl_l3', exerciseId: '10', name: 'Cable Row', sets: 3, reps: '10–12', rest: 120 },
          { id: 'ex_ppl_l4', exerciseId: '11', name: 'Dumbbell Curl', sets: 3, reps: '12–15', rest: 60, supersetGroup: 'B' },
          { id: 'ex_ppl_l5', exerciseId: '28', name: 'Hammer Curl', sets: 3, reps: '12–15', rest: 60, supersetGroup: 'B' },
        ],
      },
      {
        id: 'day_ppl_legs',
        dayNumber: 3,
        name: 'Legs A',
        focus: 'Quads / Hamstrings / Glutes / Calves',
        exercises: [
          { id: 'ex_ppl_g1', exerciseId: '2', name: 'Squat (High Bar)', sets: 4, reps: '6–8', rest: 240 },
          { id: 'ex_ppl_g2', exerciseId: '8', name: 'Romanian Deadlift', sets: 3, reps: '10–12', rest: 150 },
          { id: 'ex_ppl_g3', exerciseId: '9', name: 'Leg Press', sets: 3, reps: '12–15', rest: 120 },
          { id: 'ex_ppl_g4', exerciseId: '15', name: 'Leg Extension', sets: 3, reps: '15–20', rest: 60, supersetGroup: 'C' },
          { id: 'ex_ppl_g5', exerciseId: '14', name: 'Leg Curl', sets: 3, reps: '15–20', rest: 60, supersetGroup: 'C' },
          { id: 'ex_ppl_g6', exerciseId: '23', name: 'Calf Raise', sets: 4, reps: '15–20', rest: 60 },
        ],
      },
      {
        id: 'day_ppl_push2',
        dayNumber: 4,
        name: 'Push B',
        focus: 'Chest / Shoulders / Triceps',
        exercises: [
          { id: 'ex_ppl_p7', exerciseId: '7', name: 'Incline Dumbbell Press', sets: 4, reps: '8–10', rest: 150 },
          { id: 'ex_ppl_p8', exerciseId: '26', name: 'Dumbbell Shoulder Press', sets: 3, reps: '10–12', rest: 120 },
          { id: 'ex_ppl_p9', exerciseId: '20', name: 'Cable Fly', sets: 3, reps: '12–15', rest: 90 },
          { id: 'ex_ppl_p10', exerciseId: '30', name: 'Cable Lateral Raise', sets: 3, reps: '15–20', rest: 60, supersetGroup: 'D' },
          { id: 'ex_ppl_p11', exerciseId: '12', name: 'Tricep Pushdown', sets: 3, reps: '15–20', rest: 60, supersetGroup: 'D' },
        ],
      },
      {
        id: 'day_ppl_pull2',
        dayNumber: 5,
        name: 'Pull B',
        focus: 'Back / Biceps',
        exercises: [
          { id: 'ex_ppl_l6', exerciseId: '18', name: 'Lat Pulldown', sets: 4, reps: '8–12', rest: 150 },
          { id: 'ex_ppl_l7', exerciseId: '6', name: 'Barbell Row', sets: 3, reps: '8–10', rest: 150 },
          { id: 'ex_ppl_l8', exerciseId: '19', name: 'Face Pull', sets: 3, reps: '15–20', rest: 60 },
          { id: 'ex_ppl_l9', exerciseId: '11', name: 'Dumbbell Curl', sets: 4, reps: '12–15', rest: 60 },
        ],
      },
      {
        id: 'day_ppl_legs2',
        dayNumber: 6,
        name: 'Legs B',
        focus: 'Quads / Hamstrings / Glutes / Calves',
        exercises: [
          { id: 'ex_ppl_g7', exerciseId: '17', name: 'Bulgarian Split Squat', sets: 4, reps: '8–12', rest: 150 },
          { id: 'ex_ppl_g8', exerciseId: '8', name: 'Romanian Deadlift', sets: 4, reps: '10–12', rest: 120 },
          { id: 'ex_ppl_g9', exerciseId: '16', name: 'Hip Thrust', sets: 3, reps: '10–15', rest: 120 },
          { id: 'ex_ppl_g10', exerciseId: '9', name: 'Leg Press', sets: 3, reps: '15–20', rest: 90 },
          { id: 'ex_ppl_g11', exerciseId: '23', name: 'Calf Raise', sets: 4, reps: '15–25', rest: 60 },
        ],
      },
    ],
  },
};

// ─── Upper / Lower (4-Day) ────────────────────────────────────────────────────
const UPPER_LOWER: ProgramTemplate = {
  id: 'tpl_ul',
  name: 'Upper / Lower (4-Day)',
  description: 'Balanced hypertrophy & strength. 4 days/week with alternating upper and lower body sessions.',
  difficulty: 'intermediate',
  goal: 'hypertrophy',
  daysPerWeek: 4,
  sessionDuration: '55–70 min',
  program: {
    name: 'Upper / Lower',
    description: 'Alternating upper/lower sessions. 4 days/week, excellent for natural trainees.',
    goal: 'hypertrophy',
    days: [
      {
        id: 'day_ul_ua',
        dayNumber: 1,
        name: 'Upper A (Strength)',
        focus: 'Back / Chest / Shoulders / Arms',
        exercises: [
          { id: 'ex_ul_u1', exerciseId: '1', name: 'Barbell Bench Press', sets: 4, reps: '4–6', rest: 210 },
          { id: 'ex_ul_u2', exerciseId: '6', name: 'Barbell Row', sets: 4, reps: '4–6', rest: 210 },
          { id: 'ex_ul_u3', exerciseId: '5', name: 'Overhead Press', sets: 3, reps: '6–8', rest: 150 },
          { id: 'ex_ul_u4', exerciseId: '4', name: 'Pull Ups', sets: 3, reps: '6–10', rest: 150 },
          { id: 'ex_ul_u5', exerciseId: '11', name: 'Dumbbell Curl', sets: 3, reps: '10–12', rest: 60, supersetGroup: 'A' },
          { id: 'ex_ul_u6', exerciseId: '12', name: 'Tricep Pushdown', sets: 3, reps: '10–12', rest: 60, supersetGroup: 'A' },
        ],
      },
      {
        id: 'day_ul_la',
        dayNumber: 2,
        name: 'Lower A (Strength)',
        focus: 'Quads / Hamstrings / Glutes',
        exercises: [
          { id: 'ex_ul_l1', exerciseId: '2', name: 'Squat (High Bar)', sets: 4, reps: '4–6', rest: 240 },
          { id: 'ex_ul_l2', exerciseId: '8', name: 'Romanian Deadlift', sets: 3, reps: '6–8', rest: 180 },
          { id: 'ex_ul_l3', exerciseId: '9', name: 'Leg Press', sets: 3, reps: '8–10', rest: 120 },
          { id: 'ex_ul_l4', exerciseId: '15', name: 'Leg Extension', sets: 3, reps: '10–15', rest: 60, supersetGroup: 'B' },
          { id: 'ex_ul_l5', exerciseId: '14', name: 'Leg Curl', sets: 3, reps: '10–15', rest: 60, supersetGroup: 'B' },
          { id: 'ex_ul_l6', exerciseId: '23', name: 'Calf Raise', sets: 3, reps: '15–20', rest: 60 },
        ],
      },
      {
        id: 'day_ul_ub',
        dayNumber: 3,
        name: 'Upper B (Volume)',
        focus: 'Back / Chest / Shoulders / Arms',
        exercises: [
          { id: 'ex_ul_u7', exerciseId: '7', name: 'Incline Dumbbell Press', sets: 4, reps: '8–12', rest: 120 },
          { id: 'ex_ul_u8', exerciseId: '18', name: 'Lat Pulldown', sets: 4, reps: '8–12', rest: 120 },
          { id: 'ex_ul_u9', exerciseId: '26', name: 'Dumbbell Shoulder Press', sets: 3, reps: '10–15', rest: 90 },
          { id: 'ex_ul_u10', exerciseId: '10', name: 'Cable Row', sets: 3, reps: '12–15', rest: 90 },
          { id: 'ex_ul_u11', exerciseId: '20', name: 'Cable Fly', sets: 3, reps: '12–15', rest: 60, supersetGroup: 'C' },
          { id: 'ex_ul_u12', exerciseId: '13', name: 'Lateral Raise', sets: 3, reps: '15–20', rest: 60, supersetGroup: 'C' },
        ],
      },
      {
        id: 'day_ul_lb',
        dayNumber: 4,
        name: 'Lower B (Volume)',
        focus: 'Quads / Hamstrings / Glutes / Calves',
        exercises: [
          { id: 'ex_ul_l7', exerciseId: '17', name: 'Bulgarian Split Squat', sets: 3, reps: '8–12', rest: 150 },
          { id: 'ex_ul_l8', exerciseId: '3', name: 'Deadlift', sets: 3, reps: '5', rest: 240 },
          { id: 'ex_ul_l9', exerciseId: '16', name: 'Hip Thrust', sets: 4, reps: '10–15', rest: 120 },
          { id: 'ex_ul_l10', exerciseId: '9', name: 'Leg Press', sets: 3, reps: '15–20', rest: 90 },
          { id: 'ex_ul_l11', exerciseId: '24', name: 'Cable Crunch', sets: 3, reps: '15–20', rest: 60 },
        ],
      },
    ],
  },
};

// ─── Full Body 3×/Week ────────────────────────────────────────────────────────
const FULL_BODY_3X: ProgramTemplate = {
  id: 'tpl_fb3',
  name: 'Full Body 3×/Week',
  description: 'Perfect for beginners and intermediates. High-frequency training hits each muscle 3×/week.',
  difficulty: 'beginner',
  goal: 'general',
  daysPerWeek: 3,
  sessionDuration: '45–55 min',
  program: {
    name: 'Full Body 3×/Week',
    description: 'High frequency, low volume per session. Excellent for beginners and those re-starting training.',
    goal: 'hypertrophy',
    days: [
      {
        id: 'day_fb_a',
        dayNumber: 1,
        name: 'Full Body A',
        focus: 'Squat / Push / Pull',
        exercises: [
          { id: 'ex_fb_a1', exerciseId: '2', name: 'Squat (High Bar)', sets: 3, reps: '8–10', rest: 180 },
          { id: 'ex_fb_a2', exerciseId: '1', name: 'Barbell Bench Press', sets: 3, reps: '8–10', rest: 150, supersetGroup: 'A' },
          { id: 'ex_fb_a3', exerciseId: '6', name: 'Barbell Row', sets: 3, reps: '8–10', rest: 150, supersetGroup: 'A' },
          { id: 'ex_fb_a4', exerciseId: '16', name: 'Hip Thrust', sets: 3, reps: '10–12', rest: 120 },
          { id: 'ex_fb_a5', exerciseId: '11', name: 'Dumbbell Curl', sets: 2, reps: '12–15', rest: 60, supersetGroup: 'B' },
          { id: 'ex_fb_a6', exerciseId: '12', name: 'Tricep Pushdown', sets: 2, reps: '12–15', rest: 60, supersetGroup: 'B' },
        ],
      },
      {
        id: 'day_fb_b',
        dayNumber: 2,
        name: 'Full Body B',
        focus: 'Hinge / Push / Pull',
        exercises: [
          { id: 'ex_fb_b1', exerciseId: '3', name: 'Deadlift', sets: 3, reps: '5', rest: 240 },
          { id: 'ex_fb_b2', exerciseId: '5', name: 'Overhead Press', sets: 3, reps: '8–10', rest: 150, supersetGroup: 'C' },
          { id: 'ex_fb_b3', exerciseId: '4', name: 'Pull Ups', sets: 3, reps: '6–10', rest: 150, supersetGroup: 'C' },
          { id: 'ex_fb_b4', exerciseId: '9', name: 'Leg Press', sets: 3, reps: '10–12', rest: 120 },
          { id: 'ex_fb_b5', exerciseId: '13', name: 'Lateral Raise', sets: 2, reps: '15–20', rest: 60 },
          { id: 'ex_fb_b6', exerciseId: '23', name: 'Calf Raise', sets: 2, reps: '15–20', rest: 60 },
        ],
      },
      {
        id: 'day_fb_c',
        dayNumber: 3,
        name: 'Full Body C',
        focus: 'Volume / Arms',
        exercises: [
          { id: 'ex_fb_c1', exerciseId: '17', name: 'Bulgarian Split Squat', sets: 3, reps: '8–12', rest: 150 },
          { id: 'ex_fb_c2', exerciseId: '7', name: 'Incline Dumbbell Press', sets: 3, reps: '10–12', rest: 120, supersetGroup: 'D' },
          { id: 'ex_fb_c3', exerciseId: '18', name: 'Lat Pulldown', sets: 3, reps: '10–12', rest: 120, supersetGroup: 'D' },
          { id: 'ex_fb_c4', exerciseId: '8', name: 'Romanian Deadlift', sets: 3, reps: '10–12', rest: 120 },
          { id: 'ex_fb_c5', exerciseId: '24', name: 'Cable Crunch', sets: 3, reps: '15–20', rest: 60 },
        ],
      },
    ],
  },
};

// ─── GZCLP (Linear Progression) ──────────────────────────────────────────────
const GZCLP: ProgramTemplate = {
  id: 'tpl_gzclp',
  name: 'GZCLP',
  description: 'Efficient 3-day strength program with linear progression. Tier 1–3 structure. Great for intermediates who want strength + size.',
  difficulty: 'intermediate',
  goal: 'strength',
  daysPerWeek: 3,
  sessionDuration: '50–65 min',
  program: {
    name: 'GZCLP',
    description: '3-tier linear progression. T1 = strength, T2 = size, T3 = accessory.',
    goal: 'strength',
    days: [
      {
        id: 'day_gz_a',
        dayNumber: 1,
        name: 'Day A',
        focus: 'Squat / OHP / Pull',
        exercises: [
          { id: 'ex_gz_a1', exerciseId: '2', name: 'Squat (High Bar)', sets: 5, reps: '3', rest: 180, notes: 'T1 — add 2.5kg each session' },
          { id: 'ex_gz_a2', exerciseId: '5', name: 'Overhead Press', sets: 3, reps: '10', rest: 120, notes: 'T2 — add 2.5kg every 2 sessions' },
          { id: 'ex_gz_a3', exerciseId: '4', name: 'Pull Ups', sets: 3, reps: 'AMRAP', rest: 90, notes: 'T3 accessory' },
          { id: 'ex_gz_a4', exerciseId: '19', name: 'Face Pull', sets: 3, reps: '15', rest: 60, notes: 'T3 accessory' },
        ],
      },
      {
        id: 'day_gz_b',
        dayNumber: 2,
        name: 'Day B',
        focus: 'Bench / Deadlift / Row',
        exercises: [
          { id: 'ex_gz_b1', exerciseId: '1', name: 'Barbell Bench Press', sets: 5, reps: '3', rest: 180, notes: 'T1 — add 2.5kg each session' },
          { id: 'ex_gz_b2', exerciseId: '3', name: 'Deadlift', sets: 3, reps: '10', rest: 150, notes: 'T2 — add 5kg every 2 sessions' },
          { id: 'ex_gz_b3', exerciseId: '6', name: 'Barbell Row', sets: 3, reps: '15', rest: 90, notes: 'T3 accessory' },
          { id: 'ex_gz_b4', exerciseId: '13', name: 'Lateral Raise', sets: 3, reps: '15', rest: 60, notes: 'T3 accessory' },
        ],
      },
      {
        id: 'day_gz_c',
        dayNumber: 3,
        name: 'Day C',
        focus: 'Squat / Bench / OHP / Row',
        exercises: [
          { id: 'ex_gz_c1', exerciseId: '2', name: 'Squat (High Bar)', sets: 5, reps: '3', rest: 180, notes: 'T1' },
          { id: 'ex_gz_c2', exerciseId: '1', name: 'Barbell Bench Press', sets: 3, reps: '10', rest: 120, notes: 'T2' },
          { id: 'ex_gz_c3', exerciseId: '5', name: 'Overhead Press', sets: 3, reps: '15', rest: 90, notes: 'T3 accessory' },
          { id: 'ex_gz_c4', exerciseId: '10', name: 'Cable Row', sets: 3, reps: '15', rest: 60, notes: 'T3 accessory' },
        ],
      },
    ],
  },
};

// ─── All templates ────────────────────────────────────────────────────────────
export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  FULL_BODY_3X,
  STRONGLIFTS_5X5,
  GZCLP,
  UPPER_LOWER,
  PUSH_PULL_LEGS,
];

export function cloneTemplateAsCustomProgram(template: ProgramTemplate): CustomProgram {
  const now = new Date().toISOString();
  const uid = Date.now();
  return {
    id: `cp_${uid}`,
    name: template.program.name,
    description: template.program.description,
    goal: template.program.goal,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    days: template.program.days.map((day, di) => ({
      ...day,
      id: `day_${uid}_${di}`,
      exercises: day.exercises.map((ex, ei) => ({
        ...ex,
        id: `ex_${uid}_${di}_${ei}`,
      })),
    })),
  };
}
