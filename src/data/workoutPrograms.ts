// Workout Programs: Male Phase 2 (4 Day) and Female Phase 1 (4 Day)
// Data extracted from official Excel program files

export interface ProgramExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  rest: number; // seconds
  notes?: string;
  supersetGroup?: string; // 'A','B','C','D','E' — paired exercises
  variations?: string[]; // alternative exercises the user can swap to
}

export interface ProgramDay {
  dayNumber: number;
  name: string;
  focus: string;
  exercises: ProgramExercise[];
}

export interface WorkoutProgram {
  id: 'male_phase2' | 'female_phase1';
  name: string;
  description: string;
  days: ProgramDay[];
  sex: 'male' | 'female';
  phase: number;
  weeklyFrequency: number;
}

// ── Shared exercise library additions ────────────────────────────────────────
export const additionalExercises = [
  { id: '16', name: 'Hip Thrust (Barbell)', targetMuscles: ['Glutes', 'Hamstrings'] },
  { id: '17', name: 'Bulgarian Split Squat', targetMuscles: ['Legs', 'Glutes'] },
  { id: '18', name: 'Sumo Deadlift', targetMuscles: ['Legs', 'Glutes', 'Back'] },
  { id: '19', name: 'Cable Kickback', targetMuscles: ['Glutes'] },
  { id: '20', name: 'Seated Leg Curl', targetMuscles: ['Hamstrings'] },
  { id: '21', name: 'Goblet Squat', targetMuscles: ['Legs', 'Glutes'] },
  { id: '34', name: 'Seated Calf Raise', targetMuscles: ['Calves'] },
  { id: '35', name: 'Standing Calf Raise (Single Leg)', targetMuscles: ['Calves'] },
  { id: '36', name: 'DB Forward Lunges', targetMuscles: ['Legs', 'Glutes'] },
  { id: '37', name: 'BB Glute Bridges', targetMuscles: ['Glutes', 'Hamstrings'] },
  { id: '38', name: '45° Back Extensions (BB)', targetMuscles: ['Hamstrings', 'Glutes', 'Back'] },
  { id: '39', name: 'Cable Abductions', targetMuscles: ['Glutes'] },
  { id: '40', name: 'Banded Abductions', targetMuscles: ['Glutes'] },
  { id: '41', name: 'Decline Bench Crunches', targetMuscles: ['Core'] },
  { id: '42', name: 'Hanging Knee Raises', targetMuscles: ['Core'] },
  { id: '43', name: 'Single Leg Curl', targetMuscles: ['Hamstrings'] },
  { id: '22', name: 'Chest Fly (Cable)', targetMuscles: ['Chest'] },
  { id: '44', name: '45° DB Press Neutral (1¼ rep)', targetMuscles: ['Chest', 'Shoulders'] },
  { id: '45', name: 'Pec Deck', targetMuscles: ['Chest'] },
  { id: '46', name: 'Arnold Press', targetMuscles: ['Delts', 'Triceps'] },
  { id: '47', name: '65° Incline DB Press', targetMuscles: ['Chest', 'Shoulders'] },
  { id: '48', name: 'Push-Ups', targetMuscles: ['Chest', 'Triceps', 'Shoulders'] },
  { id: '49', name: '45° Incline BB Bench (Smith)', targetMuscles: ['Chest', 'Shoulders'] },
  { id: '32', name: 'Machine Chest Press', targetMuscles: ['Chest', 'Triceps'] },
  { id: '33', name: 'DB Shoulder Press', targetMuscles: ['Delts', 'Triceps'] },
  { id: '23', name: 'Face Pull', targetMuscles: ['Delts', 'Back'] },
  { id: '24', name: 'Hammer Curl', targetMuscles: ['Arms'] },
  { id: '25', name: 'Incline DB Curl', targetMuscles: ['Arms'] },
  { id: '27', name: 'One Arm DB Row', targetMuscles: ['Back', 'Arms'] },
  { id: '28', name: 'Lat Pulldown', targetMuscles: ['Back', 'Arms'] },
  { id: '29', name: 'Lat Pulldown Supinated', targetMuscles: ['Back', 'Arms'] },
  { id: '50', name: '30° Prone DB Row (1¼ rep)', targetMuscles: ['Back', 'Arms'] },
  { id: '51', name: 'Lat Pulldown (Drop Set)', targetMuscles: ['Back', 'Arms'] },
  { id: '52', name: '30° Prone Reverse Flye', targetMuscles: ['Back', 'Delts'] },
  { id: '53', name: 'Reverse Pec Deck', targetMuscles: ['Back', 'Delts'] },
  { id: '54', name: '30° Prone Row Rear Delt', targetMuscles: ['Back', 'Delts'] },
  { id: '55', name: 'BB Upright Rows', targetMuscles: ['Delts', 'Traps'] },
  { id: '56', name: 'Lateral Raises', targetMuscles: ['Delts'] },
  { id: '57', name: '65° Prone Lateral Raises', targetMuscles: ['Delts'] },
  { id: '58', name: 'Pull-Ups Wide Pronated', targetMuscles: ['Back', 'Arms'] },
  { id: '59', name: 'Bent Over BB Row', targetMuscles: ['Back', 'Arms'] },
  { id: '12', name: 'Tricep Pushdown', targetMuscles: ['Triceps'] },
  { id: '60', name: 'Rope Tricep Pushdowns', targetMuscles: ['Triceps'] },
  { id: '61', name: 'Overhead Cable Extension', targetMuscles: ['Triceps'] },
  { id: '62', name: 'BB Preacher Curls', targetMuscles: ['Arms'] },
  { id: '63', name: 'Lying DB Tricep Extension', targetMuscles: ['Triceps'] },
  { id: '64', name: 'Spider Curls', targetMuscles: ['Arms'] },
  { id: '65', name: 'Incline Hammer Curls', targetMuscles: ['Arms'] },
  { id: '66', name: 'Cable Curls', targetMuscles: ['Arms'] },
  { id: '67', name: 'Cable Pushdowns', targetMuscles: ['Triceps'] },
  { id: '11', name: 'Dumbbell Curl', targetMuscles: ['Arms'] },
  { id: '26', name: 'Skull Crusher', targetMuscles: ['Triceps'] },
];

// ── Male Phase 3 — Push / Pull / Lower / Upper (Mark Carroll methodology) ─────
export const maleProgramPhase2: WorkoutProgram = {
  id: 'male_phase2',
  name: 'Phase 3 — Strength & Size',
  description: '4-day Push/Pull/Lower/Upper. High-frequency hypertrophy block: RPE 7–9, progressive overload each session. Supersets, 1.25 rep techniques, and drop sets for maximum muscle stimulus.',
  sex: 'male',
  phase: 2,
  weeklyFrequency: 4,
  days: [
    {
      dayNumber: 1,
      name: 'Push',
      focus: 'Chest, Shoulders, Triceps',
      exercises: [
        {
          exerciseId: '1', name: 'BB Bench Press',
          sets: 4, reps: '6', rest: 150,
          notes: 'Tempo 2110 — 2s down, 1s pause, explode up',
          variations: ['DB Bench Press', 'Smith Machine Bench Press', 'Machine Chest Press'],
        },
        {
          exerciseId: '44', name: '45° DB Press Neutral (1¼ rep)',
          sets: 3, reps: '6–8', rest: 120,
          notes: 'Lower to bottom, press ¼ up, return to bottom, then full press = 1 rep',
          variations: ['Incline DB Press', 'Incline Cable Fly', 'Incline Machine Press'],
        },
        {
          exerciseId: '13', name: 'Side Lying DB Lateral Raise (Single Arm)',
          sets: 3, reps: '8 each side', rest: 90,
          variations: ['Cable Lateral Raise', 'Machine Lateral Raise', 'Seated DB Lateral Raise'],
        },
        {
          exerciseId: '55', name: 'BB Upright Rows',
          sets: 2, reps: '10', rest: 90,
          variations: ['Cable Upright Row', 'DB Upright Row', 'Face Pull'],
        },
        {
          exerciseId: '60', name: 'Rope Tricep Pushdowns',
          sets: 3, reps: '10–12', rest: 15,
          notes: 'Superset — go straight to Overhead Cable Extension',
          supersetGroup: 'E',
          variations: ['Tricep Pushdown (Bar)', 'DB Kickback', 'Machine Pushdown'],
        },
        {
          exerciseId: '61', name: 'Overhead Cable Extension',
          sets: 3, reps: '10–12', rest: 120,
          notes: 'Superset — rest 120s after this exercise',
          supersetGroup: 'E',
          variations: ['DB Overhead Tricep Extension', 'Lying DB Tricep Extension', 'Skull Crusher'],
        },
      ],
    },
    {
      dayNumber: 2,
      name: 'Pull',
      focus: 'Back, Biceps, Rear Delts',
      exercises: [
        {
          exerciseId: '4', name: 'Pull-Ups Mid-Neutral (Weighted)',
          sets: 4, reps: '6', rest: 150,
          notes: 'Add load via belt or weighted vest',
          variations: ['Lat Pulldown Neutral Grip', 'Assisted Pull-Ups', 'Cable Straight-Arm Pulldown'],
        },
        {
          exerciseId: '50', name: '30° Prone DB Row (1¼ rep)',
          sets: 3, reps: '6–8', rest: 120,
          notes: 'Row to hip, lower ¼ of the way, row back to hip, lower fully = 1 rep',
          variations: ['Seated Cable Row', 'Chest-Supported Row', 'One-Arm DB Row'],
        },
        {
          exerciseId: '51', name: 'Lat Pulldown (Drop Set)',
          sets: 2, reps: '8–10', rest: 90,
          notes: 'Hit target reps, immediately drop 20–30% weight and continue to failure',
          variations: ['Seated Cable Row', 'Band Pulldown', 'Straight-Arm Pushdown'],
        },
        {
          exerciseId: '52', name: '30° Prone Reverse Flye',
          sets: 3, reps: '8–10', rest: 90,
          variations: ['Rear Delt Cable Fly', 'Face Pull', 'Machine Reverse Fly'],
        },
        {
          exerciseId: '64', name: 'Spider Curls',
          sets: 3, reps: '8–10', rest: 15,
          notes: 'Superset — go straight to Incline Hammer Curls',
          supersetGroup: 'E',
          variations: ['Preacher Curl', 'Concentration Curl', 'Cable Curl'],
        },
        {
          exerciseId: '65', name: 'Incline Hammer Curls',
          sets: 3, reps: '8–10', rest: 120,
          notes: 'Superset — rest 120s after this exercise',
          supersetGroup: 'E',
          variations: ['DB Hammer Curl', 'Cross-Body Hammer Curl', 'Rope Cable Curl'],
        },
      ],
    },
    {
      dayNumber: 3,
      name: 'Lower 1',
      focus: 'Quads, Hamstrings, Calves',
      exercises: [
        {
          exerciseId: '2', name: 'High Bar Squat (Heels Elevated)',
          sets: 3, reps: '6', rest: 180,
          notes: 'Elevate heels on 25kg plate — increases quad activation',
          variations: ['Leg Press', 'Goblet Squat', 'Smith Machine Squat'],
        },
        {
          exerciseId: '8', name: 'BB Romanian Deadlift',
          sets: 3, reps: '6', rest: 90,
          notes: 'Feel the hamstring stretch at the bottom before reversing',
          variations: ['DB Romanian Deadlift', 'Good Morning', 'Cable Pull-Through'],
        },
        {
          exerciseId: '15', name: 'Leg Extensions (Paused)',
          sets: 3, reps: '10–12', rest: 90,
          notes: '2-second pause at full extension each rep',
          variations: ['Step-Up', 'Wall Sit', 'Leg Press (High Foot)'],
        },
        {
          exerciseId: '9', name: 'Leg Press (Rest-Pause)',
          sets: 2, reps: '8–10', rest: 90,
          notes: 'Feet low. Hit target reps, rack, rest 15s, squeeze out 3–5 more reps',
          variations: ['Hack Squat', 'Bulgarian Split Squat', 'Goblet Squat'],
        },
        {
          exerciseId: '20', name: 'Seated Leg Curl',
          sets: 3, reps: '7', rest: 90,
          variations: ['Lying Leg Curl', 'Nordic Curl', 'Stiff-Leg Deadlift'],
        },
        {
          exerciseId: '35', name: 'Standing Calf Raise (Single Leg)',
          sets: 3, reps: '8–10 each', rest: 60,
          variations: ['Seated Calf Raise', 'Leg Press Calf Raise', 'Standing Calf Raise (Both Legs)'],
        },
      ],
    },
    {
      dayNumber: 4,
      name: 'Upper',
      focus: 'Chest, Back, Shoulders, Arms',
      exercises: [
        {
          exerciseId: '49', name: '45° Incline BB Bench (Smith)',
          sets: 3, reps: '8', rest: 90,
          notes: 'Superset — go straight to Pull-Ups Wide',
          supersetGroup: 'A',
          variations: ['Incline DB Press', 'Incline Machine Press', 'Incline Cable Fly'],
        },
        {
          exerciseId: '58', name: 'Pull-Ups Wide Pronated',
          sets: 3, reps: 'MAX', rest: 90,
          notes: 'Superset — rest 90s after this exercise',
          supersetGroup: 'A',
          variations: ['Wide-Grip Lat Pulldown', 'Assisted Pull-Up', 'Cable Pullover'],
        },
        {
          exerciseId: '46', name: 'Arnold Press',
          sets: 3, reps: '7–9', rest: 75,
          notes: 'Superset — go straight to Rear Delt Row',
          supersetGroup: 'B',
          variations: ['DB Shoulder Press', 'Machine Shoulder Press', 'Landmine Press'],
        },
        {
          exerciseId: '54', name: '30° Prone Row Rear Delt',
          sets: 3, reps: '7–9', rest: 75,
          notes: 'Superset — rest 75s after this exercise',
          supersetGroup: 'B',
          variations: ['Face Pull', 'Reverse Pec Deck', 'Bent-Over DB Lateral Raise'],
        },
        {
          exerciseId: '45', name: 'Pec Deck (Rest-Pause)',
          sets: 2, reps: '8–10', rest: 60,
          notes: 'Superset — rest-pause on final set; go straight to Reverse Pec Deck',
          supersetGroup: 'C',
          variations: ['Cable Chest Fly', 'DB Chest Fly', 'Machine Chest Press'],
        },
        {
          exerciseId: '53', name: 'Reverse Pec Deck',
          sets: 2, reps: '8–10', rest: 60,
          notes: 'Superset — rest 60s after this exercise',
          supersetGroup: 'C',
          variations: ['Rear Delt Cable Fly', 'Face Pull', 'Bent-Over DB Raise'],
        },
        {
          exerciseId: '62', name: 'BB Preacher Curls',
          sets: 3, reps: '12–15', rest: 90,
          variations: ['DB Preacher Curl', 'Cable Curl', 'Incline DB Curl'],
        },
        {
          exerciseId: '63', name: 'Lying DB Tricep Extension',
          sets: 3, reps: '12–15', rest: 90,
          variations: ['Cable Overhead Extension', 'Skull Crusher', 'Close-Grip Bench Press'],
        },
      ],
    },
  ],
};

// ── Female Phase 3 — Lower / Upper (Mark Carroll methodology) ─────────────────
export const femaleProgramPhase1: WorkoutProgram = {
  id: 'female_phase1',
  name: 'Phase 3 — Glute Focus',
  description: '4-day Lower/Upper split. Posterior chain priority block: glute-hamstring supersets, hip thrust progressions, 1.25 rep techniques. RPE 7–9 targeting for lean muscle development.',
  sex: 'female',
  phase: 1,
  weeklyFrequency: 4,
  days: [
    {
      dayNumber: 1,
      name: 'Lower 1',
      focus: 'Glutes, Hamstrings, Core',
      exercises: [
        {
          exerciseId: '8', name: 'BB Romanian Deadlift',
          sets: 4, reps: '9, 8, 7, 6', rest: 120,
          notes: 'Wave load — add a little weight each set. Feel the hamstring stretch.',
          variations: ['DB Romanian Deadlift', 'Cable Pull-Through', 'Good Morning'],
        },
        {
          exerciseId: '36', name: 'DB Forward Lunges',
          sets: 3, reps: '8–10 each', rest: 75,
          notes: 'Superset — go straight to BB Glute Bridges',
          supersetGroup: 'B',
          variations: ['Reverse Lunge', 'Walking Lunge', 'Step-Up'],
        },
        {
          exerciseId: '37', name: 'BB Glute Bridges',
          sets: 3, reps: '8–10', rest: 75,
          notes: 'Superset — rest 75s after this exercise',
          supersetGroup: 'B',
          variations: ['DB Glute Bridge', 'Hip Thrust Machine', 'Cable Pull-Through'],
        },
        {
          exerciseId: '15', name: 'Leg Extensions (Drop Set)',
          sets: 2, reps: '12–15', rest: 75,
          notes: 'Hit target reps, immediately drop 20–30% and continue to failure',
          variations: ['Leg Press', 'Wall Sit', 'Step-Up'],
        },
        {
          exerciseId: '20', name: 'Seated Leg Curl (Drop Set)',
          sets: 2, reps: '12–15', rest: 75,
          notes: 'Hit target reps, immediately drop 20–30% and continue to failure',
          variations: ['Lying Leg Curl', 'Nordic Curl', 'Good Morning'],
        },
        {
          exerciseId: '39', name: 'Cable Abductions',
          sets: 2, reps: '10–12 each', rest: 60,
          variations: ['Band Abduction (Standing)', 'Machine Hip Abduction', 'Side-Lying Hip Raise'],
        },
        {
          exerciseId: '41', name: 'Decline Bench Crunches',
          sets: 3, reps: '13–15', rest: 60,
          variations: ['Weighted Crunch', 'Cable Crunch', 'Hanging Leg Raise'],
        },
      ],
    },
    {
      dayNumber: 2,
      name: 'Upper 1',
      focus: 'Back, Shoulders, Arms',
      exercises: [
        {
          exerciseId: '28', name: 'Lat Pulldown',
          sets: 3, reps: '9, 8, 7', rest: 60,
          notes: 'Superset — go straight to Overhead Press',
          supersetGroup: 'A',
          variations: ['Assisted Pull-Ups', 'Straight-Arm Cable Pulldown', 'Seated Cable Row'],
        },
        {
          exerciseId: '5', name: 'Overhead Press',
          sets: 3, reps: '9, 8, 7', rest: 60,
          notes: 'Superset — rest 60s after this exercise',
          supersetGroup: 'A',
          variations: ['DB Shoulder Press', 'Machine Shoulder Press', 'Arnold Press'],
        },
        {
          exerciseId: '59', name: 'Bent Over BB Row',
          sets: 3, reps: '9, 8, 7', rest: 60,
          notes: 'Superset — go straight to Lateral Raises',
          supersetGroup: 'B',
          variations: ['Seated Cable Row', 'One-Arm DB Row', 'Chest-Supported Row'],
        },
        {
          exerciseId: '56', name: 'Lateral Raises',
          sets: 3, reps: '9, 8, 7', rest: 60,
          notes: 'Superset — rest 60s after this exercise',
          supersetGroup: 'B',
          variations: ['Cable Lateral Raise', 'Machine Lateral Raise', 'Upright Row'],
        },
        {
          exerciseId: '23', name: 'Face Pull (Paused)',
          sets: 2, reps: '13–15', rest: 75,
          notes: '2-second pause at full contraction each rep',
          variations: ['Rear Delt Cable Fly', 'Reverse Pec Deck', 'Band Pull-Apart'],
        },
        {
          exerciseId: '66', name: 'Cable Curls',
          sets: 3, reps: '13–15', rest: 15,
          notes: 'Superset — go straight to Cable Pushdowns',
          supersetGroup: 'D',
          variations: ['DB Curl', 'Incline DB Curl', 'Preacher Curl'],
        },
        {
          exerciseId: '67', name: 'Cable Pushdowns',
          sets: 3, reps: '13–15', rest: 60,
          notes: 'Superset — rest 60s after this exercise',
          supersetGroup: 'D',
          variations: ['Rope Pushdown', 'DB Overhead Extension', 'Bench Dip'],
        },
      ],
    },
    {
      dayNumber: 3,
      name: 'Lower 2',
      focus: 'Quads, Glutes, Core',
      exercises: [
        {
          exerciseId: '2', name: 'BB High Bar Squats',
          sets: 4, reps: '9, 8, 7, 6', rest: 150,
          notes: 'Wave load — add weight each set. Full depth, knees track over toes.',
          variations: ['Leg Press', 'Goblet Squat', 'Smith Machine Squat'],
        },
        {
          exerciseId: '43', name: 'Single Leg Curl',
          sets: 3, reps: '8–10 each', rest: 60,
          notes: 'Superset — go straight to Bulgarian Split Squat',
          supersetGroup: 'B',
          variations: ['Lying Leg Curl', 'Good Morning', 'Stiff-Leg Deadlift'],
        },
        {
          exerciseId: '17', name: 'Bulgarian Split Squat',
          sets: 3, reps: '8–10 each', rest: 60,
          notes: 'Superset — rest 60s after this exercise',
          supersetGroup: 'B',
          variations: ['DB Lunges', 'Step-Up', 'Reverse Lunge'],
        },
        {
          exerciseId: '16', name: 'BB Hip Thrusts (Smith)',
          sets: 3, reps: '12–15', rest: 90,
          notes: 'Full hip extension at top — squeeze hard for 1 second',
          variations: ['DB Hip Thrust', 'Glute Bridge', 'Cable Kickback'],
        },
        {
          exerciseId: '38', name: '45° Back Extensions (BB)',
          sets: 2, reps: '12–15', rest: 90,
          variations: ['Good Morning', 'Hyperextension (BW)', 'Romanian Deadlift'],
        },
        {
          exerciseId: '40', name: 'Banded Abductions',
          sets: 2, reps: '15–20', rest: 45,
          variations: ['Cable Abduction', 'Machine Hip Abduction', 'Side-Lying Hip Raise'],
        },
        {
          exerciseId: '42', name: 'Hanging Knee Raises',
          sets: 3, reps: '13–15', rest: 60,
          variations: ['Lying Leg Raise', 'Cable Crunch', 'Decline Sit-Up'],
        },
      ],
    },
    {
      dayNumber: 4,
      name: 'Upper 2',
      focus: 'Chest, Back, Arms',
      exercises: [
        {
          exerciseId: '47', name: '65° Incline DB Press',
          sets: 3, reps: '10, 9, 8', rest: 60,
          notes: 'Superset — go straight to One Arm DB Row',
          supersetGroup: 'A',
          variations: ['Incline Machine Press', 'Cable Incline Fly', 'Push-Ups'],
        },
        {
          exerciseId: '27', name: 'One Arm DB Row',
          sets: 3, reps: '10, 9, 8 each', rest: 60,
          notes: 'Superset — rest 60s after this exercise',
          supersetGroup: 'A',
          variations: ['Seated Cable Row', 'Chest-Supported Row', 'Machine Row'],
        },
        {
          exerciseId: '48', name: 'Push-Ups',
          sets: 3, reps: 'MAX', rest: 60,
          notes: 'Superset — go straight to Lat Pulldown Supinated. Full range, chest to floor.',
          supersetGroup: 'B',
          variations: ['Incline Push-Ups', 'Machine Chest Press', 'Cable Chest Fly'],
        },
        {
          exerciseId: '29', name: 'Lat Pulldown Supinated',
          sets: 3, reps: 'MAX', rest: 60,
          notes: 'Superset — rest 60s after this exercise. Underhand grip, squeeze at bottom.',
          supersetGroup: 'B',
          variations: ['Pull-Ups (Assisted)', 'Straight-Arm Cable Pulldown', 'DB Row'],
        },
        {
          exerciseId: '57', name: '65° Prone Lateral Raises',
          sets: 3, reps: '13–15', rest: 75,
          notes: 'Lie face-down on incline bench, raise DBs out to side',
          variations: ['Cable Lateral Raise', 'Machine Lateral Raise', 'Seated DB Lateral Raise'],
        },
        {
          exerciseId: '25', name: 'Incline DB Curls',
          sets: 2, reps: '13–15', rest: 15,
          notes: 'Superset — go straight to Lying Tricep Extensions',
          supersetGroup: 'D',
          variations: ['Preacher Curl', 'Cable Curl', 'Concentration Curl'],
        },
        {
          exerciseId: '63', name: 'Lying Tricep Extensions',
          sets: 2, reps: '13–15', rest: 60,
          notes: 'Superset — rest 60s after this exercise',
          supersetGroup: 'D',
          variations: ['Cable Overhead Extension', 'Skull Crusher', 'Close-Grip Bench Press'],
        },
      ],
    },
  ],
};

export const workoutPrograms: WorkoutProgram[] = [maleProgramPhase2, femaleProgramPhase1];
export const getProgramById = (id: string) => workoutPrograms.find(p => p.id === id) ?? null;
