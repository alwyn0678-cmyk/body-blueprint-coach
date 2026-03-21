/**
 * AI Coach Service
 *
 * FREE by default — uses a data-driven coaching engine with no API required.
 * Optional upgrade: set a Claude API key (https://console.anthropic.com)
 * for Claude Haiku 3.5 powered natural language responses.
 *
 * VITE_CLAUDE_API_KEY=your-key-here (in .env)
 */

import { UserProfile, DailyLog, WeeklyStats, WorkoutSession, CoachInsight, GoalType } from '../types';

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
