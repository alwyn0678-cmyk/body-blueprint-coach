/**
 * AI Coach Service
 *
 * FREE by default — uses a data-driven coaching engine with no API required.
 * Optional upgrade: set a Claude API key (https://console.anthropic.com)
 * for Claude Haiku 3.5 powered natural language responses.
 *
 * VITE_CLAUDE_API_KEY=your-key-here (in .env)
 */

import { UserProfile, DailyLog, WeeklyStats, WorkoutSession, CoachInsight, GoalType, MealPlan, PlannedDay, PlannedMealItem } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrainingContext {
  recentSessions: Array<{
    name: string;
    date: string;
    durationMinutes: number;
    sessionRPE?: number;
    exercises: Array<{ name: string; sets: number; bestSet: { weight: number; reps: number } }>;
  }>;
  progressionReady: Array<{ exerciseName: string; reasoning: string; type: string }>;
  deloadRecommended: boolean;
  deloadReasons: string[];
  musclesUnderMEV: string[];
  musclesAboveMEV: string[];
}

export interface CoachContext {
  user: UserProfile;
  todayLog?: DailyLog;
  weeklyStats: WeeklyStats;
  recentWorkouts: WorkoutSession[];
  weightTrend?: 'gaining' | 'losing' | 'maintaining' | 'unknown';
  weightDelta7d?: number; // kg change over 7 days
  currentEma?: number;
  trainingContext?: TrainingContext; // enriched training intelligence
}

// ─── Claude API ───────────────────────────────────────────────────────────────

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

const getClaudeKey = (): string | null => {
  const runtime = localStorage.getItem('bbc_claude_api_key');
  return runtime && runtime.trim() ? runtime.trim() : null;
};

async function claudeComplete(
  systemPrompt: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[] = [],
  maxTokens = 700
): Promise<string> {
  const key = getClaudeKey();
  if (!key) return 'No API key set. Go to **Settings → AI Coach** and paste your Claude key.';
  try {
    const messages = [
      ...history.slice(-10),
      { role: 'user' as const, content: userMessage },
    ];
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    });
    const data = await res.json();
    if (data.error) {
      if (data.error.type === 'authentication_error') return 'Invalid API key. Double-check your key in **Settings → AI Coach**.';
      if (data.error.type === 'rate_limit_error') return 'Rate limit hit. Wait 60 seconds and try again.';
      return `API error: ${data.error.message}`;
    }
    const text = data.content?.[0]?.text;
    if (!text) return 'Empty response from AI. Try again.';
    return text;
  } catch (e) {
    return `Network error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ─── Affirmation generation ───────────────────────────────────────────────────

const FALLBACK_AFFIRMATIONS = [
  "I am stronger than yesterday and building the body I deserve.",
  "Every rep, every meal, every choice is shaping the best version of me.",
  "I show up consistently because I respect my goals.",
  "My body is capable of incredible things when I fuel it right.",
  "Progress over perfection — I celebrate every step forward.",
  "I am disciplined, focused, and unstoppable.",
  "My commitment to health is the greatest investment I make daily.",
  "I trust the process and embrace the journey.",
  "Every workout is a promise kept to myself.",
  "I choose strength, I choose health, I choose me.",
];

let _fallbackIdx = new Date().getDay() % FALLBACK_AFFIRMATIONS.length;

export async function generateAffirmation(userName?: string): Promise<string> {
  const key = getClaudeKey();
  if (!key) {
    const text = FALLBACK_AFFIRMATIONS[_fallbackIdx % FALLBACK_AFFIRMATIONS.length];
    _fallbackIdx++;
    return text;
  }
  const firstName = userName ? userName.split(' ')[0] : 'you';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 100,
        system: `You are a motivational coach for ${firstName}, a woman on a personal fitness and self-improvement journey. Generate exactly one powerful, unique fitness affirmation that feels personal, energising, and focused on strength, discipline, and progress. Make it different each time — vary the theme: mindset, nutrition, training, self-belief, resilience. Output only the affirmation text itself, no quotes, no explanation, no trailing punctuation beyond a period.`,
        messages: [{ role: 'user', content: 'Generate a fresh affirmation for today.' }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim();
    if (text && text.length > 10 && !text.includes('API') && !text.includes('key')) return text;
    // Fallback if response looks like an error
    const fb = FALLBACK_AFFIRMATIONS[_fallbackIdx % FALLBACK_AFFIRMATIONS.length];
    _fallbackIdx++;
    return fb;
  } catch {
    const fb = FALLBACK_AFFIRMATIONS[_fallbackIdx % FALLBACK_AFFIRMATIONS.length];
    _fallbackIdx++;
    return fb;
  }
}

const buildSystemPrompt = (user: UserProfile, ctx?: Partial<CoachContext>): string => {
  const stats = ctx?.weeklyStats;
  const ema = ctx?.currentEma;
  const delta = ctx?.weightDelta7d;
  const tc = ctx?.trainingContext;
  const firstName = user.name.split(' ')[0];
  const unitLabel = 'kg';

  const goalLabel = user.goalType === 'fat_loss' ? 'fat loss'
    : user.goalType === 'muscle_gain' ? 'muscle gain'
    : user.goalType === 'recomposition' ? 'body recomposition'
    : 'maintenance';

  const lines: string[] = [
    `You are an elite evidence-based fitness coach — think Jeff Nippard meets Renaissance Periodization meets MacroFactor. You speak directly, use real data, and never give generic advice.`,
    ``,
    `YOUR CLIENT: ${firstName} (${user.name})`,
    `Primary goal: ${goalLabel}${user.goalWeight ? ` | target weight: ${user.goalWeight}${unitLabel}` : ''}`,
    `Current weight: ${user.weight}${unitLabel} | Training: ${user.trainingFrequency}x/week`,
    `Daily targets: ${user.targets.calories} kcal | ${user.targets.protein}g protein (${(user.targets.protein / user.weight).toFixed(1)}g/kg) | ${user.targets.carbs}g carbs | ${user.targets.fats}g fats`,
    `Diet pace: ${user.preferredDietSpeed}`,
  ];

  if (stats && stats.daysLogged > 0) {
    lines.push(``, `THIS WEEK (${stats.daysLogged}/7 days logged):`);
    lines.push(`- Calories: avg ${stats.avgCalories} kcal vs ${user.targets.calories} target → ${stats.calorieAdherence}% adherence`);
    lines.push(`- Protein: avg ${stats.avgProtein}g vs ${user.targets.protein}g target → ${stats.proteinAdherence}% adherence`);
    lines.push(`- Workouts completed: ${stats.workoutsCompleted}`);

    if (stats.calorieAdherence < 80) {
      lines.push(`  ↳ Calorie adherence is below target — identify and address the gap`);
    }
    if (stats.proteinAdherence < 80) {
      lines.push(`  ↳ Protein adherence is below target — highest priority fix`);
    }
  }

  if (ema !== undefined || delta !== undefined) {
    lines.push(``, `WEIGHT TREND:`);
    if (ema !== undefined) lines.push(`- 7-day EMA: ${ema.toFixed(1)}${unitLabel}`);
    if (delta !== undefined) {
      const direction = delta < -0.05 ? 'losing ✓' : delta > 0.05 ? 'gaining' : 'stable';
      lines.push(`- 7-day change: ${delta > 0 ? '+' : ''}${delta.toFixed(2)}${unitLabel} (${direction})`);
      if (user.goalType === 'fat_loss' && delta > 0.1) {
        lines.push(`  ↳ Weight trending up despite cut — likely a logging accuracy or adherence issue`);
      }
      if (user.goalType === 'fat_loss' && delta < -0.5) {
        lines.push(`  ↳ Losing faster than ideal — monitor for muscle loss risk`);
      }
    }
  }

  if (tc?.recentSessions && tc.recentSessions.length > 0) {
    lines.push(``, `RECENT TRAINING (${tc.recentSessions.length} sessions):`);
    tc.recentSessions.slice(0, 3).forEach(s => {
      const exStr = s.exercises
        .slice(0, 4)
        .map(e => `${e.name} ${e.sets}×${e.bestSet.weight}kg×${e.bestSet.reps}`)
        .join(', ');
      lines.push(`- ${s.name} (${s.date}): ${s.durationMinutes}min${s.sessionRPE ? ` @RPE${s.sessionRPE}` : ''}${exStr ? ` | ${exStr}` : ''}`);
    });
  }

  if (tc?.progressionReady && tc.progressionReady.length > 0) {
    lines.push(``, `READY TO PROGRESS:`);
    tc.progressionReady.slice(0, 4).forEach(p => lines.push(`- ${p.exerciseName}: ${p.reasoning}`));
  }

  if (tc?.musclesUnderMEV && tc.musclesUnderMEV.length > 0) {
    lines.push(``, `UNDER-TRAINED MUSCLES (below MEV this week): ${tc.musclesUnderMEV.join(', ')}`);
  }

  if (tc?.deloadRecommended && tc.deloadReasons && tc.deloadReasons.length > 0) {
    lines.push(``, `DELOAD SIGNAL: ${tc.deloadReasons.join('; ')}`);
  }

  lines.push(``, `─── RESPONSE RULES ───`);
  lines.push(`- Always reference ${firstName}'s actual data — never give generic advice`);
  lines.push(`- Lead with the single most actionable point. Be direct, not diplomatic.`);
  lines.push(`- For chat questions: 2–4 sentences unless the question genuinely needs more depth`);
  lines.push(`- Use **bold** for key numbers, key terms, or critical actions`);
  lines.push(`- Use bullet points only when listing 3+ discrete items`);
  lines.push(`- No preamble ("Great question!"), no moralizing, no shame`);
  lines.push(`- For technique questions: primary muscle → 3 key cues → 1 most common error`);
  lines.push(`- If data is sparse, say so and give the best advice possible with what's available`);

  return lines.join('\n');
};

// ─── Smart data-driven coaching engine (100% free, no API) ───────────────────

function getDailyInsight(ctx: CoachContext): CoachInsight {
  const { user, weeklyStats, weightTrend, weightDelta7d, todayLog } = ctx;
  const todayKcal = todayLog
    ? Object.values(todayLog.meals).flat().reduce(
        (s, e) => s + e.nutrition.calories * e.amount, 0
      )
    : 0;
  const todayProtein = todayLog
    ? Object.values(todayLog.meals).flat().reduce(
        (s, e) => s + e.nutrition.protein * e.amount, 0
      )
    : 0;
  const calTarget = user.targets.calories;
  const proTarget = user.targets.protein;
  const calPct = calTarget > 0 ? (todayKcal / calTarget) * 100 : 0;
  const proPct = proTarget > 0 ? (todayProtein / proTarget) * 100 : 0;
  const now = new Date().toISOString();

  // Priority: protein gap > calorie surplus > weight trend alerts > general
  if (proPct < 50 && new Date().getHours() >= 14) {
    return {
      id: 'daily_protein', type: 'nutrition', priority: 'high',
      generatedAt: now,
      title: 'Protein deficit — act now',
      message: `You've hit ${Math.round(todayProtein)}g of your ${proTarget}g protein target. With ${proTarget - Math.round(todayProtein)}g still to go, prioritise a high-protein meal or shake in the next 2 hours. Protein is the single most important lever for your ${user.goalType === 'muscle_gain' ? 'muscle gain' : user.goalType === 'fat_loss' ? 'muscle retention in a cut' : 'recomposition'} goal.`,
      action: `Add ${Math.round(proTarget - todayProtein)}g protein now`,
    };
  }

  if (calPct > 110 && user.goalType === 'fat_loss') {
    return {
      id: 'daily_cal_over', type: 'nutrition', priority: 'high',
      generatedAt: now,
      title: 'Over target today',
      message: `At ${Math.round(todayKcal)} kcal you're ${Math.round(todayKcal - calTarget)} kcal above target. One over-target day won't break your cut — but make the rest of the day zero-calorie-dense (leafy veg, water) and protect protein. Weekly average is what drives results.`,
    };
  }

  if (weightTrend === 'gaining' && user.goalType === 'fat_loss' && weeklyStats.daysLogged >= 5) {
    return {
      id: 'daily_trend_alert', type: 'nutrition', priority: 'high',
      generatedAt: now,
      title: `Trend moving wrong direction`,
      message: `Your 7-day EMA shows +${(weightDelta7d ?? 0).toFixed(2)}kg. The adaptive engine will flag this in your weekly check-in — in the meantime, review your calorie logging accuracy (oils, sauces, and drinks are the most common hidden sources).`,
      action: 'Audit your food logging accuracy',
    };
  }

  if (weeklyStats.workoutsCompleted === 0 && weeklyStats.daysLogged >= 3) {
    return {
      id: 'daily_no_training', type: 'training', priority: 'medium',
      generatedAt: now,
      title: 'Training drives the adaptation',
      message: `No workouts logged this week yet. Regardless of your nutrition, resistance training is the stimulus for the adaptation you're chasing. Even 30 minutes of focused, progressive work beats perfect nutrition with zero training.`,
      action: 'Schedule today\'s session',
    };
  }

  if (weeklyStats.proteinAdherence < 60 && weeklyStats.daysLogged >= 3) {
    return {
      id: 'daily_protein_week', type: 'nutrition', priority: 'medium',
      generatedAt: now,
      title: `${weeklyStats.proteinAdherence}% protein adherence this week`,
      message: `Avg ${weeklyStats.avgProtein}g vs ${proTarget}g target — you're leaving ${proTarget - weeklyStats.avgProtein}g/day on the table. The research is consistent: suboptimal protein is the most common limiting factor for body composition change. Build a protein-first meal plan and stop letting it be the afterthought.`,
    };
  }

  // Positive reinforcement
  if (weeklyStats.calorieAdherence >= 85 && weeklyStats.proteinAdherence >= 80) {
    return {
      id: 'daily_positive', type: 'nutrition', priority: 'low',
      generatedAt: now,
      title: `Executing at ${weeklyStats.calorieAdherence}% — elite consistency`,
      message: `${weeklyStats.daysLogged} days logged, ${weeklyStats.calorieAdherence}% calorie adherence, ${weeklyStats.avgProtein}g protein average. At this standard, the results are a mathematical certainty — the body adapts to consistent stimuli. Keep the standard.`,
    };
  }

  // Default: goal-specific daily tip
  const tips: Record<GoalType, CoachInsight> = {
    fat_loss: {
      id: 'daily_tip_fl', type: 'nutrition', priority: 'low', generatedAt: now,
      title: 'Volume eating protects adherence',
      message: 'High-volume, low-calorie foods (leafy greens, cucumber, bone broth, sparkling water) dramatically increase satiety without touching your calorie budget. This is the biggest quality-of-life upgrade for fat loss adherence.',
    },
    muscle_gain: {
      id: 'daily_tip_mg', type: 'training', priority: 'low', generatedAt: now,
      title: 'Volume load is your north star',
      message: `Track total volume load per muscle group each week (sets × reps × kg). If it's not trending up across a mesocycle, you're not progressively overloading — and growth will stall. Beat last week's numbers by any amount.`,
    },
    maintenance: {
      id: 'daily_tip_ma', type: 'nutrition', priority: 'low', generatedAt: now,
      title: 'Your TDEE updates weekly',
      message: 'The adaptive engine compares your calorie intake vs. weight change each week to calculate your real TDEE. Daily weight fluctuations are noise — the EMA trend over 14+ days is the signal. Stay consistent with weigh-ins.',
    },
    recomposition: {
      id: 'daily_tip_rc', type: 'training', priority: 'low', generatedAt: now,
      title: 'Recomp demands training quality',
      message: 'Recomposition is driven by progressive overload with adequate protein — not by the calorie deficit alone. Prioritise lifting performance above all else. Fat loss will follow naturally from the training stimulus and protein intake.',
    },
  };

  return tips[user.goalType] ?? tips.maintenance;
}

function getGoalInsights(user: UserProfile, stats: WeeklyStats): CoachInsight[] {
  const now = new Date().toISOString();

  const shared: CoachInsight[] = [
    {
      id: 'insight_sleep', type: 'recovery', priority: 'medium', generatedAt: now,
      title: 'Sleep is a performance drug',
      message: 'Restricting sleep to <7h increases ghrelin (+15%), reduces leptin, impairs glucose metabolism, and reduces testosterone. It directly undermines fat loss and muscle gain. 7–9h is training-critical infrastructure.',
    },
    {
      id: 'insight_steps', type: 'recovery', priority: 'low', generatedAt: now,
      title: 'NEAT is your largest calorie variable',
      message: `Non-exercise activity (steps, fidgeting, posture) can vary by 800–2000 kcal/day between individuals. Hitting ${(user.stepsTarget ?? 8000).toLocaleString()} steps/day is the highest-leverage low-effort tool to keep TDEE elevated during a diet.`,
    },
  ];

  const byGoal: Record<GoalType, CoachInsight[]> = {
    fat_loss: [
      {
        id: 'fl_a', type: 'nutrition', priority: 'high', generatedAt: now,
        title: 'Protein retention shield',
        message: `At ${user.targets.protein}g protein (${(user.targets.protein / user.weight).toFixed(1)}g/kg), you're in the range shown to maximally attenuate muscle loss in a deficit. Miss protein and you're dieting off muscle, not just fat.`,
      },
      {
        id: 'fl_b', type: 'training', priority: 'high', generatedAt: now,
        title: 'Train heavy in a cut',
        message: 'The signal to retain muscle is mechanical tension from heavy resistance training. In a deficit, reduce training volume by 20–30% but keep intensity (load) identical. Never reduce the weight on the bar — reduce sets instead.',
        action: 'Keep weights the same, reduce sets if fatigued',
      },
      {
        id: 'fl_c', type: 'nutrition', priority: 'medium', generatedAt: now,
        title: 'Refeed strategy',
        message: 'A weekly high-carb refeed day (calories at maintenance, carbs at 150–200% normal) restores muscle glycogen, temporarily boosts leptin, and dramatically improves gym performance. It doesn\'t affect the weekly calorie deficit if executed correctly.',
      },
      {
        id: 'fl_d', type: 'recovery', priority: 'medium', generatedAt: now,
        title: 'Rate of loss matters',
        message: `Your target of ${user.preferredDietSpeed === 'aggressive' ? '0.75–1%' : user.preferredDietSpeed === 'moderate' ? '0.5–0.75%' : '0.25–0.5%'} body weight per week is the ${user.preferredDietSpeed} approach. Faster than 1% BW/week and muscle loss accelerates significantly. The adaptive engine will flag if you're losing too fast.`,
      },
    ],
    muscle_gain: [
      {
        id: 'mg_a', type: 'training', priority: 'high', generatedAt: now,
        title: 'Progressive overload is mandatory',
        message: 'Hypertrophy requires increasing mechanical tension over time. Track volume load (sets × reps × kg) per muscle group weekly — it must trend upward across a mesocycle. If it\'s flat, you\'re maintaining, not growing.',
        action: 'Beat last week\'s volume on your top exercises',
      },
      {
        id: 'mg_b', type: 'nutrition', priority: 'high', generatedAt: now,
        title: 'Lean bulk precision',
        message: 'A 200–300 kcal surplus maximises muscle gain while minimising fat accumulation. Larger surpluses don\'t build more muscle — research shows MPS saturates well below aggressive surpluses. The adaptive TDEE engine tracks your real surplus.',
      },
      {
        id: 'mg_c', type: 'training', priority: 'medium', generatedAt: now,
        title: 'MEV → MAV → deload',
        message: 'Start mesocycles near your Minimum Effective Volume per muscle group, add sets each week toward Maximum Adaptive Volume, then deload. This periodisation structure drives the accumulation → adaptation cycle that research consistently supports.',
      },
      {
        id: 'mg_d', type: 'nutrition', priority: 'medium', generatedAt: now,
        title: 'Peri-workout nutrition',
        message: '0.5g/kg carbs + 0.3g/kg protein pre-workout optimises training performance and MPS. Post-workout within 2h maintains an elevated anabolic state. The window is more flexible than bro-science suggests, but for muscle gain it\'s worth executing consistently.',
      },
    ],
    maintenance: [
      {
        id: 'ma_a', type: 'nutrition', priority: 'medium', generatedAt: now,
        title: 'Your TDEE is dynamic',
        message: 'TDEE changes with body weight, body composition, activity, and metabolic adaptation. The adaptive engine estimates it weekly from your real weight data. This is more accurate than any formula — but it requires consistent daily weigh-ins.',
      },
    ],
    recomposition: [
      {
        id: 'rc_a', type: 'training', priority: 'high', generatedAt: now,
        title: 'Training drives recomp',
        message: 'Body recomposition (simultaneous fat loss + muscle gain) is achievable but slower than dedicated cutting or bulking phases. The research confirms it works best with: high protein (2.5g/kg), slight deficit (200 kcal), and progressive resistance training.',
      },
      {
        id: 'rc_b', type: 'nutrition', priority: 'high', generatedAt: now,
        title: 'Protein distribution is critical',
        message: 'Distribute protein across 4–6 meals (25–40g per meal) to maximise MPS across the day. This matters more during recomp than any other goal because you\'re simultaneously trying to synthesise muscle and oxidise fat.',
      },
    ],
  };

  return [...(byGoal[user.goalType] ?? []), ...shared];
}

function getWeeklyReview(ctx: CoachContext): string {
  const { user, weeklyStats, weightTrend, weightDelta7d } = ctx;
  const calOk = weeklyStats.calorieAdherence >= 80;
  const proOk = weeklyStats.proteinAdherence >= 80;
  const weightStr = weightDelta7d !== undefined
    ? `${weightDelta7d > 0 ? '+' : ''}${weightDelta7d.toFixed(2)}kg`
    : 'tracking...';

  if (calOk && proOk && weeklyStats.workoutsCompleted >= user.trainingFrequency * 0.75) {
    return `Excellent week. ${weeklyStats.calorieAdherence}% calorie adherence, ${weeklyStats.avgProtein}g avg protein, ${weeklyStats.workoutsCompleted} sessions. Weight trend: ${weightStr}. You're executing at a high level — no adjustments needed. Maintain this standard.`;
  }
  if (!proOk) {
    return `Protein at ${weeklyStats.proteinAdherence}% adherence (avg ${weeklyStats.avgProtein}g vs ${user.targets.protein}g target) — this is the priority fix for next week. Plan protein sources first in every meal. Everything else is secondary.`;
  }
  if (!calOk && user.goalType === 'fat_loss') {
    return `Calorie adherence at ${weeklyStats.calorieAdherence}%. The deficit creates the environment, but consistency creates the result. Identify the 1-2 meals or situations that caused the drift and create a specific plan for them next week.`;
  }
  if (weeklyStats.workoutsCompleted < user.trainingFrequency * 0.5) {
    return `Only ${weeklyStats.workoutsCompleted} workouts logged vs ${user.trainingFrequency} target. Training is the stimulus — nutrition is the fuel. Both must be in place. Identify what blocked training this week and remove that obstacle.`;
  }
  return `Week ${weeklyStats.daysLogged}/7 days logged, ${weeklyStats.workoutsCompleted} workouts, weight: ${weightStr}. Avg: ${weeklyStats.avgCalories} kcal / ${weeklyStats.avgProtein}g protein. Focus on consistency — every logged day compounds.`;
}

function getWorkoutFeedback(workout: WorkoutSession): string {
  const sets = workout.exercises.reduce((s, e) => s + e.sets.length, 0);
  const avgRPE = workout.sessionRPE;
  const rpeNote = avgRPE
    ? avgRPE >= 9 ? 'High intensity — excellent effort. Monitor recovery this week.'
      : avgRPE <= 6 ? 'Session RPE was low — consider pushing closer to technical failure next time (RPE 7–9 for hypertrophy).'
      : 'Good intensity range for hypertrophy adaptations.'
    : '';
  return `${workout.name}: ${sets} total sets, ${workout.durationMinutes}min. ${rpeNote} Focus on beating today's performance in the next similar session.`.trim();
}

// ─── AI Coach Service ─────────────────────────────────────────────────────────

export class AICoachService {
  /** Get today's priority coaching insight (data-driven, free) */
  getDailyInsight(ctx: CoachContext): CoachInsight {
    return getDailyInsight(ctx);
  }

  /** Get the full library of goal-specific insights (free) */
  getInsights(user: UserProfile, stats: WeeklyStats): CoachInsight[] {
    return getGoalInsights(user, stats);
  }

  /** Generate weekly review text — uses Claude if API key set, otherwise free engine */
  async getWeeklyReview(ctx: CoachContext): Promise<string> {
    if (getClaudeKey()) {
      const { user, weeklyStats: stats, weightDelta7d: delta } = ctx;
      const firstName = user.name.split(' ')[0];
      const weightNote = delta !== undefined
        ? `Weight trend: ${delta > 0 ? '+' : ''}${delta.toFixed(2)}kg over 7 days.`
        : '';
      return claudeComplete(
        buildSystemPrompt(user, ctx),
        `Write ${firstName}'s weekly coaching review. Data: ${stats.calorieAdherence}% calorie adherence (avg ${stats.avgCalories} kcal), ${stats.proteinAdherence}% protein adherence (avg ${stats.avgProtein}g), ${stats.workoutsCompleted} workouts completed. ${weightNote}

Structure the response as:
1. A direct assessment of this week (what the numbers actually mean for their goal)
2. The single most important priority for next week (specific, actionable, with exact numbers if relevant)
3. Any calorie or macro adjustment recommendation — either confirm targets are correct or state the specific change and why

3–5 sentences total. Reference their actual numbers. No filler phrases.`,
        [],
        600
      );
    }
    return getWeeklyReview(ctx);
  }

  /** Workout feedback — uses Claude if available, otherwise free engine */
  async getWorkoutFeedback(user: UserProfile, workout: WorkoutSession, prevSessionVolumeKg?: number): Promise<string> {
    if (getClaudeKey()) {
      const totalVolume = workout.exercises.reduce(
        (a, ex) => a + ex.sets.reduce((b, s) => b + s.weight * s.reps, 0), 0
      );
      const exerciseSummary = workout.exercises.map(ex => {
        const completedSets = ex.sets.filter(s => s.weight > 0 && s.reps > 0);
        const vol = completedSets.reduce((a, s) => a + s.weight * s.reps, 0);
        const best = completedSets.reduce<{ weight: number; reps: number } | null>((b, s) =>
          !b || s.weight * s.reps > b.weight * b.reps ? { weight: s.weight, reps: s.reps } : b, null);
        return `${ex.name}: ${completedSets.map(s => `${s.weight}kg×${s.reps}${s.rpe ? ` @RPE${s.rpe}` : ''}`).join(', ')}${best ? ` [best: ${best.weight}×${best.reps}]` : ''} — ${Math.round(vol)}kg volume`;
      }).filter(Boolean).join('\n');

      const vsLast = prevSessionVolumeKg && prevSessionVolumeKg > 0
        ? `\nVolume vs last session: ${Math.round(totalVolume)}kg vs ${Math.round(prevSessionVolumeKg)}kg (${totalVolume >= prevSessionVolumeKg ? '+' : ''}${(((totalVolume - prevSessionVolumeKg) / prevSessionVolumeKg) * 100).toFixed(0)}%)`
        : '\nFirst time logging this session.';

      return claudeComplete(
        buildSystemPrompt(user),
        `Workout completed: **${workout.name}** | ${workout.durationMinutes} minutes | Session RPE: ${workout.sessionRPE ?? 'not recorded'}${vsLast}

Exercises:
${exerciseSummary}

Give 2–3 sentences of coaching feedback:
- Name the single best lift or strongest set from today (specific numbers)
- If volume is down vs last session or any RPE is high, flag it plainly
- Give one concrete target for the next identical session (specific exercise, weight, rep goal)

Be direct. Reference actual numbers. No generic praise.`,
        [],
        450
      );
    }
    return getWorkoutFeedback(workout);
  }

  /** Free-form AI chat with the coach — uses Claude Haiku */
  async chat(ctx: CoachContext, userMessage: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    return claudeComplete(buildSystemPrompt(ctx.user, ctx), userMessage, history, 700);
  }
}

// ─── Food Scanner ─────────────────────────────────────────────────────────────

export interface DetectedFood {
  name: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Analyse a meal image using Claude Vision and return estimated nutrition.
 * Requires a Claude API key in localStorage.
 */
export async function analyzeFoodImage(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
): Promise<{ foods: DetectedFood[]; disclaimer: string } | { error: string }> {
  const key = getClaudeKey();
  if (!key) return { error: 'No API key set. Add your Claude key in Settings → AI Coach.' };

  const systemPrompt = `You are a nutrition estimation assistant. When given a photo of food, you identify each visible food item and estimate its nutritional content based on visual portion assessment. Always respond with valid JSON only — no markdown, no explanations outside the JSON.`;

  const userPrompt = `Analyse this meal photo. Identify each distinct food item visible on the plate/in the image.

For each food, estimate:
- The portion size in grams (visual assessment)
- Calories, protein, carbs, and fats for that portion
- Your confidence level

Respond ONLY with this exact JSON structure (no other text):
{
  "foods": [
    {
      "name": "food name",
      "estimatedGrams": 150,
      "calories": 200,
      "protein": 25,
      "carbs": 10,
      "fats": 6,
      "confidence": "high"
    }
  ],
  "disclaimer": "These are visual estimates. Actual values may vary based on preparation method and exact portion size."
}

Confidence levels: "high" = clearly identifiable food with well-known macros, "medium" = recognisable but portion uncertain, "low" = unclear or mixed item.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            { type: 'text', text: userPrompt },
          ],
        }],
      }),
    });

    const data = await res.json();
    if (data.error) {
      if (data.error.type === 'authentication_error') return { error: 'Invalid API key.' };
      return { error: `API error: ${data.error.message}` };
    }

    const text = data.content?.[0]?.text ?? '';
    // Extract JSON from the response (handle potential markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: 'Could not parse AI response. Try again.' };

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.foods)) return { error: 'Unexpected response format.' };

    return {
      foods: parsed.foods as DetectedFood[],
      disclaimer: parsed.disclaimer ?? 'These are visual estimates — actual values may vary.',
    };
  } catch (e) {
    return { error: `Network error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ─── AI Workout Generator ─────────────────────────────────────────────────────

export interface AIGeneratedExercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes?: string;
}

export interface AIGeneratedWorkout {
  name: string;
  exercises: AIGeneratedExercise[];
}

export async function generateWorkout(params: {
  muscleGroup: string;
  durationMinutes: number;
  level: string;
  notes?: string;
}): Promise<AIGeneratedWorkout> {
  const key = getClaudeKey();
  if (!key) throw new Error('No Claude API key. Set it in Settings → AI Coach.');

  const exerciseCount =
    params.durationMinutes <= 20 ? 4
    : params.durationMinutes <= 35 ? 5
    : params.durationMinutes <= 50 ? 6
    : 8;

  const userMessage = `Generate a ${params.durationMinutes}-minute ${params.muscleGroup} workout for a ${params.level} trainee.${params.notes ? ` Notes: ${params.notes}` : ''}

Return ONLY a JSON object — no markdown, no explanation:
{
  "name": "short descriptive workout name",
  "exercises": [
    { "name": "Exercise Name", "sets": 3, "reps": "8-12", "rest": 90, "notes": "brief coaching cue or null" }
  ]
}

Rules:
- Exactly ${exerciseCount} exercises
- Real gym exercises (barbells, dumbbells, cables, machines, bodyweight)
- Rest in seconds (45–180)
- Reps as a range string like "8-12" or single number like "10"
- Beginner: simple compound moves, 3 sets, 10-15 reps, longer rest
- Intermediate: compound + isolation mix, 3-4 sets
- Advanced: 4 sets, drop sets / superset notes welcome`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      system: 'You are an expert personal trainer. Output only valid JSON, nothing else.',
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const data = await res.json();
  const text: string = data.content?.[0]?.text?.trim() ?? '';
  // Strip markdown code fences if Claude wraps the JSON
  const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonStr) as AIGeneratedWorkout;
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const coachService = new AICoachService();

// ─── Meal Plan Generator ──────────────────────────────────────────────────────

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Fallback algorithmic meal plan when no API key is set */
function buildFallbackMealPlan(
  targetCalories: number,
  targetProtein: number,
  goalType: GoalType,
): PlannedDay[] {
  const isLoss = goalType === 'fat_loss';
  const templates: Record<string, { breakfast: PlannedMealItem[]; lunch: PlannedMealItem[]; dinner: PlannedMealItem[]; snacks: PlannedMealItem[] }> = {
    A: {
      breakfast: [
        { foodName: 'Oats with whey protein', calories: 380, protein: 32, carbs: 50, fats: 6, servingNote: '80g oats + 1 scoop' },
        { foodName: 'Banana', calories: 90, protein: 1, carbs: 23, fats: 0, servingNote: '1 medium' },
      ],
      lunch: [
        { foodName: 'Grilled chicken breast', calories: 250, protein: 48, carbs: 0, fats: 5, servingNote: '200g' },
        { foodName: 'Brown rice', calories: 220, protein: 5, carbs: 46, fats: 2, servingNote: '150g cooked' },
        { foodName: 'Broccoli (steamed)', calories: 55, protein: 4, carbs: 10, fats: 1, servingNote: '200g' },
      ],
      dinner: [
        { foodName: 'Salmon fillet', calories: 350, protein: 40, carbs: 0, fats: 20, servingNote: '200g' },
        { foodName: 'Sweet potato', calories: 130, protein: 2, carbs: 30, fats: 0, servingNote: '150g' },
        { foodName: 'Mixed salad + olive oil', calories: 80, protein: 2, carbs: 6, fats: 5, servingNote: '1 tbsp oil' },
      ],
      snacks: [
        { foodName: isLoss ? 'Greek yogurt (low-fat)' : 'Greek yogurt + honey', calories: isLoss ? 130 : 200, protein: isLoss ? 18 : 17, carbs: isLoss ? 9 : 28, fats: isLoss ? 0 : 0, servingNote: '200g' },
        { foodName: 'Almonds', calories: 170, protein: 6, carbs: 6, fats: 15, servingNote: '30g' },
      ],
    },
    B: {
      breakfast: [
        { foodName: 'Whole eggs scrambled', calories: 280, protein: 21, carbs: 2, fats: 20, servingNote: '4 eggs' },
        { foodName: 'Whole grain toast', calories: 140, protein: 6, carbs: 26, fats: 2, servingNote: '2 slices' },
      ],
      lunch: [
        { foodName: 'Tuna (canned in water)', calories: 130, protein: 29, carbs: 0, fats: 1, servingNote: '150g drained' },
        { foodName: 'Whole wheat wrap', calories: 200, protein: 7, carbs: 38, fats: 3, servingNote: '1 large wrap' },
        { foodName: 'Avocado', calories: 160, protein: 2, carbs: 8, fats: 15, servingNote: '½ medium' },
      ],
      dinner: [
        { foodName: 'Lean ground beef (90%)', calories: 300, protein: 42, carbs: 0, fats: 14, servingNote: '200g cooked' },
        { foodName: 'Pasta (whole wheat)', calories: 210, protein: 8, carbs: 42, fats: 2, servingNote: '120g dry' },
        { foodName: 'Tomato sauce (low sugar)', calories: 60, protein: 2, carbs: 12, fats: 1, servingNote: '150ml' },
      ],
      snacks: [
        { foodName: 'Cottage cheese', calories: 150, protein: 22, carbs: 6, fats: 4, servingNote: '200g' },
        { foodName: 'Rice cakes', calories: 70, protein: 1, carbs: 15, fats: 0, servingNote: '2 cakes' },
      ],
    },
    C: {
      breakfast: [
        { foodName: 'Protein pancakes (mix)', calories: 350, protein: 30, carbs: 44, fats: 6, servingNote: '3 pancakes' },
        { foodName: 'Berries (mixed)', calories: 60, protein: 1, carbs: 14, fats: 0, servingNote: '100g' },
      ],
      lunch: [
        { foodName: 'Turkey breast sliced', calories: 200, protein: 38, carbs: 0, fats: 4, servingNote: '160g' },
        { foodName: 'Quinoa cooked', calories: 185, protein: 7, carbs: 34, fats: 3, servingNote: '150g' },
        { foodName: 'Spinach + cherry tomatoes', calories: 40, protein: 3, carbs: 6, fats: 0, servingNote: '150g' },
      ],
      dinner: [
        { foodName: 'Chicken thigh (skinless)', calories: 270, protein: 35, carbs: 0, fats: 14, servingNote: '200g' },
        { foodName: 'Roasted vegetables (mixed)', calories: 120, protein: 4, carbs: 22, fats: 3, servingNote: '300g' },
        { foodName: 'Brown rice', calories: 180, protein: 4, carbs: 38, fats: 1, servingNote: '120g cooked' },
      ],
      snacks: [
        { foodName: 'Protein shake (whey)', calories: 130, protein: 25, carbs: 5, fats: 2, servingNote: '1 scoop in water' },
        { foodName: 'Apple', calories: 80, protein: 0, carbs: 21, fats: 0, servingNote: '1 medium' },
      ],
    },
  };

  const rotation = ['A', 'B', 'C', 'A', 'B', 'C', 'A'];

  return rotation.map((key, i) => {
    const t = templates[key];
    const allItems = [...t.breakfast, ...t.lunch, ...t.dinner, ...t.snacks];
    const totalCalories = allItems.reduce((a, x) => a + x.calories, 0);
    const totalProtein = allItems.reduce((a, x) => a + x.protein, 0);
    const totalCarbs = allItems.reduce((a, x) => a + x.carbs, 0);
    const totalFats = allItems.reduce((a, x) => a + x.fats, 0);

    // Scale to hit calorie target
    const scale = targetCalories / Math.max(totalCalories, 1);
    const scaledItems = (items: PlannedMealItem[]): PlannedMealItem[] =>
      items.map(item => ({
        ...item,
        calories: Math.round(item.calories * scale),
        protein: Math.round(item.protein * scale),
        carbs: Math.round(item.carbs * scale),
        fats: Math.round(item.fats * scale),
      }));

    return {
      dayIndex: i,
      dayLabel: DAY_NAMES[i],
      meals: {
        breakfast: scaledItems(t.breakfast),
        lunch: scaledItems(t.lunch),
        dinner: scaledItems(t.dinner),
        snacks: scaledItems(t.snacks),
      },
      totalCalories: Math.round(totalCalories * scale),
      totalProtein: Math.round(totalProtein * scale),
      totalCarbs: Math.round(totalCarbs * scale),
      totalFats: Math.round(totalFats * scale),
    };
  });
}

export async function generateMealPlan(user: UserProfile): Promise<MealPlan> {
  const { calories, protein, carbs, fats } = user.targets;
  const weekStart = (() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().split('T')[0];
  })();

  const key = getClaudeKey();
  let days: PlannedDay[];

  if (key) {
    const prompt = `Create a 7-day meal plan for a ${user.sex}, age ${user.age}, goal: ${user.goalType}.
Daily targets: ${calories} kcal, ${protein}g protein, ${carbs}g carbs, ${fats}g fat.

Return ONLY a JSON array of 7 objects with this exact structure:
[{
  "dayIndex": 0,
  "dayLabel": "Monday",
  "meals": {
    "breakfast": [{"foodName":"...","calories":0,"protein":0,"carbs":0,"fats":0,"servingNote":"..."}],
    "lunch": [...],
    "dinner": [...],
    "snacks": [...]
  },
  "totalCalories": 0,
  "totalProtein": 0,
  "totalCarbs": 0,
  "totalFats": 0
}]

Rules:
- Each day should total approximately ${calories} kcal and ${protein}g protein
- Use realistic, whole foods available in most supermarkets
- Vary meals across days (no exact repeats on consecutive days)
- Include serving amounts in "servingNote" (e.g. "150g", "1 cup")
- Breakfast: 25-30% calories, Lunch: 30-35%, Dinner: 30-35%, Snacks: 10-15%
- Output ONLY the JSON array, no markdown, no explanation`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 4000,
          system: 'You are a nutrition expert. Output only valid JSON arrays, nothing else.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text: string = data.content?.[0]?.text?.trim() ?? '';
      const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      days = JSON.parse(jsonStr) as PlannedDay[];
    } catch {
      days = buildFallbackMealPlan(calories, protein, user.goalType);
    }
  } else {
    days = buildFallbackMealPlan(calories, protein, user.goalType);
  }

  return {
    id: `mp_${Date.now()}`,
    name: `Week of ${weekStart}`,
    createdAt: new Date().toISOString(),
    weekStart,
    days,
    targetCalories: calories,
    targetProtein: protein,
  };
}

// ─── Exercise Form Tips ────────────────────────────────────────────────────────

export interface FormTip {
  cues: string[];
  commonError: string;
  primaryMuscle: string;
}

const EXERCISE_FORM_TIPS: Record<string, FormTip> = {
  'barbell bench press': {
    primaryMuscle: 'Chest',
    cues: ['Retract & depress scapulae before unracking — creates a stable shelf', 'Grip ~1.5–2× shoulder width; elbows at 45–65° from torso (not 90°)', 'Drive feet into the floor; bar touches lower chest, not sternum'],
    commonError: 'Elbows flaring to 90° — increases shoulder impingement risk and reduces pec loading significantly',
  },
  'squat': {
    primaryMuscle: 'Quads / Glutes',
    cues: ['360° brace before descent — breathe into your belly, not your chest', 'Knees track over toes; chest stays upright through the hole', 'Drive the floor away — lead with hips and chest simultaneously on ascent'],
    commonError: '"Morning sickness" (chest drops, hips shoot up) — signals weak upper back or quad-to-posterior-chain imbalance',
  },
  'deadlift': {
    primaryMuscle: 'Back / Hamstrings',
    cues: ['Push the floor away — think "leg press", not "pick it up"', 'Bar over mid-foot; engage lats ("protect your armpits"); neutral spine', 'Lock hips and glutes at top — avoid hyperextending the lumbar'],
    commonError: 'Jerking the bar off the floor — you lose leg drive; take the slack out first by creating tension before pulling',
  },
  'pull ups': {
    primaryMuscle: 'Back / Biceps',
    cues: ['Dead hang start — depress and retract scapulae before rep 1', 'Drive elbows toward your back pockets — chest to the bar', 'Full range every rep: dead hang at bottom, chin above bar at top'],
    commonError: 'Half-reps or kipping — cuts lat time under tension in half and trains momentum, not strength',
  },
  'overhead press': {
    primaryMuscle: 'Shoulders / Triceps',
    cues: ['Elbows just slightly in front of the bar in the rack position', 'Tuck chin as bar passes face; re-extend neck when locked out overhead', 'Hard brace throughout — a soft core leaks force and strains lumbar'],
    commonError: 'Bar drifting forward on the way up — keep bar path vertical directly over mid-foot/base of spine',
  },
  'barbell row': {
    primaryMuscle: 'Back / Biceps',
    cues: ['Hip hinge ~45°; let the bar hang from your lats, not your arms', 'Row to lower chest/upper abs; elbows drive straight back', 'Control the eccentric — 2 seconds down for maximum lat time under tension'],
    commonError: 'Jerking with the lower back to initiate — turns a lat exercise into a lower-back strain risk',
  },
  'romanian deadlift': {
    primaryMuscle: 'Hamstrings / Glutes',
    cues: ['Push hips back first (hinge, not squat); spine stays neutral', 'Feel the hamstring stretch before reversing — bar stays close to legs the whole way', 'Squeeze glutes at top; avoid hyperextending lumbar'],
    commonError: 'Bending knees too much and converting it into a conventional deadlift — kills the hamstring stretch reflex',
  },
  'hip thrust': {
    primaryMuscle: 'Glutes',
    cues: ['Shoulder blades on bench edge (not neck); chin tucked throughout', 'Drive through heels; squeeze glutes hard — hips fully extended at top', 'Pause 1–2 sec at top for maximum glute activation (avoids momentum)'],
    commonError: 'Hyperextending the lumbar at the top — the pelvis should posteriorly tilt; not the lower back extend',
  },
  'incline dumbbell press': {
    primaryMuscle: 'Upper Chest',
    cues: ['30–45° incline — above this shifts load heavily to anterior delt', 'Dumbbells start at shoulder height, palms facing forward or neutral grip', 'Control descent to full chest stretch; drive up and slightly inward at top'],
    commonError: 'Elbows too wide (90°) — shifts load to front delts; keep at 45–60° for maximum upper pec engagement',
  },
  'lat pulldown': {
    primaryMuscle: 'Back / Biceps',
    cues: ['Lean back ~10–15°; retract and depress scapulae before pulling', 'Drive elbows down to your sides — bar to upper chest', 'Full stretch at top — feel the lats lengthen with each rep'],
    commonError: 'Pulling behind the neck — stresses the cervical spine with zero lat benefit; always pull to the front',
  },
  'leg press': {
    primaryMuscle: 'Quads / Glutes',
    cues: ['Feet hip-width or slightly wider; toes slightly turned out', 'Lower to ~90° knee angle — stop before lower back peels off the pad', "Don't lock knees at top — keep slight tension to protect the joint"],
    commonError: 'Lower back rounding off the pad at the bottom — reduce range of motion until hip flexibility improves',
  },
  'lateral raise': {
    primaryMuscle: 'Lateral Delts',
    cues: ['Slight forward lean (~10°); elbows slightly bent throughout', 'Lead with elbows, not hands — raise to just below shoulder height', 'Slow 2–3 sec eccentric — this is where most growth stimulus occurs'],
    commonError: 'Shrugging traps to compensate for too much weight — depress shoulders before each rep to reset',
  },
  'bulgarian split squat': {
    primaryMuscle: 'Quads / Glutes',
    cues: ['Front foot far enough forward that shin stays vertical at the bottom', 'Vertical torso = more quad emphasis; forward lean = more glute emphasis', 'Drive through the front heel — keep 90%+ of weight on the front leg'],
    commonError: 'Front knee caving inward — cue "knee out" and use a light resistance band above knees to build awareness',
  },
  'face pull': {
    primaryMuscle: 'Rear Delts / External Rotators',
    cues: ['Set cable at eye level or above; pull rope to your face (not neck)', 'External rotate at end: "show your biceps to the ceiling" at peak contraction', 'Light weight, slow control — this is corrective work, not an ego lift'],
    commonError: 'Too much weight turning it into a row — use light resistance and feel rear delts and rotator cuff, not traps',
  },
  'dumbbell curl': {
    primaryMuscle: 'Biceps',
    cues: ['Elbows pinned to your sides throughout — only forearms move', 'Supinate fully at top (pinky side up) for peak bicep contraction', 'Full stretch at bottom — partial reps at the top halve the stimulus'],
    commonError: 'Swinging torso to initiate the rep — momentum bypasses the bicep; reduce weight and control every inch',
  },
  'tricep pushdown': {
    primaryMuscle: 'Triceps',
    cues: ['Elbows pinned to sides; only forearms move', 'Fully extend at bottom and squeeze; controlled flex at top', 'Both directions count — control the ascent as much as the press'],
    commonError: 'Elbows drifting forward — involves shoulder flexion to assist; elbows stay fixed at the sides',
  },
};

export function getFormTipsForExercise(exerciseName: string): FormTip | null {
  const key = exerciseName.toLowerCase().trim();
  if (EXERCISE_FORM_TIPS[key]) return EXERCISE_FORM_TIPS[key];
  // Partial match: check if the exercise name contains a known key or vice versa
  const match = Object.keys(EXERCISE_FORM_TIPS).find(k =>
    key.includes(k) || k.split(' ').every(word => key.includes(word))
  );
  return match ? EXERCISE_FORM_TIPS[match] : null;
}

// ─── Proactive Pattern Insights ───────────────────────────────────────────────

export function getProactiveInsights(
  logs: Record<string, DailyLog>,
  user: UserProfile,
  weeklyStats: WeeklyStats,
): CoachInsight[] {
  const insights: CoachInsight[] = [];
  const now = new Date().toISOString();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const recentDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  const recentLogs = recentDates.map(d => logs[d]).filter(Boolean);

  // Pattern: Under protein N days in a row
  let underProteinDays = 0;
  for (const log of recentLogs) {
    const protein = Object.values(log.meals).flat().reduce((s, e) => s + e.nutrition.protein * e.amount, 0);
    if (protein < user.targets.protein * 0.75) underProteinDays++;
    else break;
  }
  if (underProteinDays >= 2) {
    insights.push({
      id: 'proactive_protein_streak',
      type: 'nutrition',
      priority: underProteinDays >= 4 ? 'high' : 'medium',
      generatedAt: now,
      title: `Under protein ${underProteinDays} days in a row`,
      message: `You've been more than 25% under your ${user.targets.protein}g protein target for ${underProteinDays} consecutive days. This directly limits ${user.goalType === 'fat_loss' ? 'muscle retention in your cut' : 'muscle growth'}. Add a protein shake, Greek yogurt, or chicken breast to each main meal.`,
      action: 'Prioritise a high-protein meal or shake today',
    });
  }

  // Pattern: Calorie over target N days in a row (fat loss only)
  if (user.goalType === 'fat_loss') {
    let overCalsDays = 0;
    for (const log of recentLogs) {
      const cals = Object.values(log.meals).flat().reduce((s, e) => s + e.nutrition.calories * e.amount, 0);
      if (cals > user.targets.calories * 1.08) overCalsDays++;
      else break;
    }
    if (overCalsDays >= 3) {
      insights.push({
        id: 'proactive_cal_over_streak',
        type: 'nutrition',
        priority: 'high',
        generatedAt: now,
        title: `Over calories ${overCalsDays} days running`,
        message: `${overCalsDays} consecutive days above your calorie target is erasing your deficit. Find the recurring trigger — a specific meal, time of day, or social situation — and make a specific plan for it.`,
        action: "Audit yesterday's meals to find the pattern",
      });
    }
  }

  // Pattern: No workouts this week when several training days should have passed
  const dayOfWeek = today.getDay(); // 0=Sun
  const workoutsExpectedByNow = dayOfWeek <= 1 ? 0
    : dayOfWeek <= 3 ? Math.ceil(user.trainingFrequency * 0.35)
    : Math.ceil(user.trainingFrequency * 0.6);

  if (weeklyStats.workoutsCompleted === 0 && workoutsExpectedByNow >= 1) {
    insights.push({
      id: 'proactive_no_workouts',
      type: 'training',
      priority: 'high',
      generatedAt: now,
      title: 'No workouts logged yet this week',
      message: `Based on your ${user.trainingFrequency}x/week target, you should have ${workoutsExpectedByNow} session${workoutsExpectedByNow > 1 ? 's' : ''} done by now. The training stimulus is non-negotiable for ${user.goalType === 'fat_loss' ? 'preserving muscle in a cut' : 'driving hypertrophy'}.`,
      action: "Log today's session",
    });
  }

  // Pattern: Consistent logging streak + good adherence (positive reinforcement)
  let loggingStreak = 0;
  for (const d of recentDates) {
    const log = logs[d];
    if (!log || Object.values(log.meals).flat().length === 0) break;
    loggingStreak++;
  }
  if (loggingStreak >= 5 && weeklyStats.calorieAdherence >= 80) {
    insights.push({
      id: 'proactive_logging_streak',
      type: 'nutrition',
      priority: 'low',
      generatedAt: now,
      title: `${loggingStreak}-day logging streak — elite consistency`,
      message: `${loggingStreak} consecutive days of logging with ${weeklyStats.calorieAdherence}% calorie adherence. Data quality is coaching quality — you can only optimise what you measure. Keep this standard.`,
    });
  }

  // Pattern: High RPE trend across recent sessions (overreaching signal)
  const recentRPEs = recentLogs
    .flatMap(l => l.workouts.map(w => w.sessionRPE))
    .filter((r): r is number => typeof r === 'number' && r > 0);
  if (recentRPEs.length >= 3) {
    const avgRecentRPE = recentRPEs.reduce((a, b) => a + b, 0) / recentRPEs.length;
    if (avgRecentRPE >= 8.5) {
      insights.push({
        id: 'proactive_high_rpe',
        type: 'recovery',
        priority: 'medium',
        generatedAt: now,
        title: `Average RPE ${avgRecentRPE.toFixed(1)} — monitor fatigue`,
        message: `Your last ${recentRPEs.length} sessions averaged RPE ${avgRecentRPE.toFixed(1)}. Sustained high-RPE training without adequate recovery accumulates fatigue faster than adaptation. If performance is flat or declining, reduce volume 20–30% for one week.`,
        action: 'Consider reducing sets by 20% this week',
      });
    }
  }

  // Pattern: Weight logged but not in recent days (missing data for trend)
  const logsWithWeight = recentLogs.filter(l => l.weight && l.weight > 0);
  const hasWeightGap = recentLogs.length >= 4 && logsWithWeight.length === 0;
  if (hasWeightGap && weeklyStats.daysLogged >= 3) {
    insights.push({
      id: 'proactive_no_weight',
      type: 'recovery',
      priority: 'low',
      generatedAt: now,
      title: 'No weight logged this week',
      message: `The adaptive TDEE engine needs consistent weight data to give you accurate calorie adjustments. Log your weight daily (morning, fasted, after bathroom) — the 7-day EMA smooths out daily fluctuations.`,
      action: 'Log your weight this morning',
    });
  }

  return insights;
}

// ─── Daily Check-In Response ──────────────────────────────────────────────────

export interface DailyCheckInInput {
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  soreness: 1 | 2 | 3 | 4 | 5;
}

const MOOD_LABELS = ['', 'Struggling', 'Below average', 'Okay', 'Good', 'Great'];
const ENERGY_LABELS = ['', 'Drained', 'Tired', 'Moderate', 'Energised', 'Fired up'];
const SORENESS_LABELS = ['', 'None', 'Mild', 'Moderate', 'Significant', 'Very sore'];

function buildCheckInResponse(checkIn: DailyCheckInInput, user: UserProfile, weeklyStats: WeeklyStats): string {
  const firstName = user.name.split(' ')[0];
  const { mood, energy, soreness } = checkIn;

  if (soreness >= 4 && energy <= 2) {
    return `${firstName}, high soreness + low energy is your body signalling it needs a recovery day. Active recovery (walk, mobility, light stretching) is the right call — not a hard session. Make sure you're hitting ${user.targets.protein}g protein today; it's the primary recovery driver.`;
  }
  if (energy >= 4 && mood >= 4) {
    const nutriNote = weeklyStats.proteinAdherence >= 80
      ? 'Your nutrition has been dialled this week — use that fuel.'
      : `Push hard, but lock in your ${user.targets.protein}g protein target post-session.`;
    return `High energy and solid mood — capitalise on this. ${nutriNote} Attack your session with intent and push for a rep PR where it feels right. Days like this are where progress accelerates.`;
  }
  if (energy <= 2 && mood <= 2) {
    return `Low energy and mood can come from accumulated fatigue, poor sleep, or under-eating. Check calories and sleep first. If nutrition is on track, train at 70% intensity — it's still a stimulus, and consistency beats motivation every time.`;
  }
  if (soreness >= 3) {
    return `Moderate soreness is normal DOMS — it tells you which muscles got the most stimulus last session. Prioritise different muscle groups today and hit ${user.targets.protein}g protein; it's the primary driver of muscle repair.`;
  }
  return `Average day — that's fine. Show up, train at a reasonable intensity, and log it. Consistency across average days is what separates results from goals.`;
}

export async function getDailyCheckInResponse(
  checkIn: DailyCheckInInput,
  user: UserProfile,
  weeklyStats: WeeklyStats,
): Promise<string> {
  const key = getClaudeKey();
  if (!key) return buildCheckInResponse(checkIn, user, weeklyStats);

  const firstName = user.name.split(' ')[0];
  const goalLabel = user.goalType === 'fat_loss' ? 'fat loss'
    : user.goalType === 'muscle_gain' ? 'muscle gain'
    : user.goalType;

  const prompt = `Daily check-in from ${firstName}:
- Mood: ${MOOD_LABELS[checkIn.mood]} (${checkIn.mood}/5)
- Energy: ${ENERGY_LABELS[checkIn.energy]} (${checkIn.energy}/5)
- Soreness: ${SORENESS_LABELS[checkIn.soreness]} (${checkIn.soreness}/5)

Goal: ${goalLabel} | This week: ${weeklyStats.calorieAdherence}% calorie adherence, ${weeklyStats.avgProtein}g avg protein, ${weeklyStats.workoutsCompleted} workouts.

Give ${firstName} a 2–3 sentence personalised coaching response: acknowledge how they're feeling, give one specific actionable recommendation for today (training modification, nutrition focus, or recovery), and close with a brief motivating line. Be direct. No filler.`;

  return claudeComplete(
    `You are an elite personal fitness coach. Give brief, direct, data-driven check-in responses. Reference the person's name and actual numbers.`,
    prompt,
    [],
    200,
  );
}
