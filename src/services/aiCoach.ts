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

const CLAUDE_KEY_ENV = import.meta.env.VITE_CLAUDE_API_KEY as string | undefined;
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

const getClaudeKey = (): string | null => {
  if (CLAUDE_KEY_ENV) return CLAUDE_KEY_ENV;
  const runtime = localStorage.getItem('bbc_claude_api_key');
  return runtime && runtime.trim() ? runtime.trim() : null;
};

async function claudeComplete(
  systemPrompt: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  const key = getClaudeKey();
  if (!key) return '⚠️ No API key found. Go to Settings → AI Coach and paste your Claude key.';
  try {
    const messages = [
      ...history.slice(-8),
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
        max_tokens: 500,
        system: systemPrompt,
        messages,
      }),
    });
    const data = await res.json();
    if (data.error) return `⚠️ Claude error: ${data.error.message}`;
    const text = data.content?.[0]?.text;
    if (!text) return `⚠️ Empty response. Raw: ${JSON.stringify(data).slice(0, 200)}`;
    return text;
  } catch (e) {
    return `⚠️ Network error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

const buildSystemPrompt = (user: UserProfile, ctx?: Partial<CoachContext>): string => {
  const stats = ctx?.weeklyStats;
  const ema = ctx?.currentEma;
  const delta = ctx?.weightDelta7d;
  const tc = ctx?.trainingContext;

  const lines: string[] = [
    `You are a world-class evidence-based fitness coach combining Jeff Nippard's scientific approach with MacroFactor's adaptive nutrition methodology.`,
    ``,
    `CLIENT: ${user.name}`,
    `Goal: ${user.goalType.replace(/_/g, ' ')} | ${user.weight}kg${user.goalWeight ? ` → ${user.goalWeight}kg` : ''}`,
    `Targets: ${user.targets.calories} kcal / ${user.targets.protein}g protein / ${user.targets.carbs}g carbs / ${user.targets.fats}g fats`,
  ];

  if (stats) {
    lines.push(``, `THIS WEEK'S NUTRITION:`);
    lines.push(`- Calories: avg ${stats.avgCalories} kcal (${stats.calorieAdherence}% adherence to ${user.targets.calories} target)`);
    lines.push(`- Protein: avg ${stats.avgProtein}g (${stats.proteinAdherence}% adherence to ${user.targets.protein}g target)`);
    lines.push(`- Days logged: ${stats.daysLogged}/7 | Workouts: ${stats.workoutsCompleted} completed`);
  }

  if (ema !== undefined || delta !== undefined) {
    lines.push(``, `WEIGHT TREND:`);
    if (ema !== undefined) lines.push(`- Current EMA: ${ema.toFixed(1)}kg`);
    if (delta !== undefined) lines.push(`- 7-day change: ${delta > 0 ? '+' : ''}${delta.toFixed(2)}kg`);
  }

  if (tc?.recentSessions && tc.recentSessions.length > 0) {
    lines.push(``, `RECENT TRAINING (last ${tc.recentSessions.length} sessions):`);
    tc.recentSessions.forEach(s => {
      const exStr = s.exercises.map(e => `${e.name} ${e.sets}×${e.bestSet.weight}kg×${e.bestSet.reps}`).join(', ');
      lines.push(`- ${s.name} (${s.date}): ${s.durationMinutes}min${s.sessionRPE ? `, RPE ${s.sessionRPE}` : ''}. ${exStr}`);
    });
  }

  if (tc?.progressionReady && tc.progressionReady.length > 0) {
    lines.push(``, `EXERCISES READY FOR PROGRESSION:`);
    tc.progressionReady.forEach(p => lines.push(`- ${p.exerciseName}: ${p.reasoning}`));
  }

  if (tc?.musclesUnderMEV && tc.musclesUnderMEV.length > 0) {
    lines.push(``, `Muscle groups below minimum effective volume this week: ${tc.musclesUnderMEV.join(', ')}.`);
  }

  if (tc?.deloadRecommended && tc.deloadReasons.length > 0) {
    lines.push(``, `DELOAD SIGNAL: ${tc.deloadReasons.join('; ')}.`);
  }

  lines.push(``, `COMMUNICATION RULES:`);
  lines.push(`- Direct, confident, science-backed. Never vague or preachy.`);
  lines.push(`- Lead with the most actionable insight. Use real numbers from their data.`);
  lines.push(`- 2–4 sentences max. No bullet points unless asked.`);
  lines.push(`- Forward-looking only — no shame, no moralizing.`);
  lines.push(`- Reference their specific data (weights, adherence %, workout names) when relevant.`);
  lines.push(`- For exercise technique questions: give 3–5 key cues, common errors, and the primary muscle targeted.`);

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
      return claudeComplete(
        buildSystemPrompt(ctx.user, ctx),
        `Give a 3-sentence weekly review of this client's progress: what went well, the single highest priority for next week, and any specific calorie or macro adjustment with exact numbers.`
      );
    }
    return getWeeklyReview(ctx);
  }

  /** Workout feedback — uses Claude if available, otherwise free engine */
  async getWorkoutFeedback(user: UserProfile, workout: WorkoutSession): Promise<string> {
    if (getClaudeKey()) {
      const exerciseSummary = workout.exercises.map(ex =>
        `${ex.name}: ${ex.sets.map(s => `${s.weight}kg×${s.reps}${s.rpe ? ` @RPE${s.rpe}` : ''}`).join(', ')}`
      ).join('\n');
      return claudeComplete(
        buildSystemPrompt(user),
        `Workout just completed: ${workout.name}, ${workout.durationMinutes}min, session RPE: ${workout.sessionRPE ?? 'not set'}\n${exerciseSummary}\n\nGive 2 sentences of specific technical coaching feedback. Highlight any PRs or strong sets, note anything to watch, and give one concrete focus for the next session.`
      );
    }
    return getWorkoutFeedback(workout);
  }

  /** Free-form AI chat with the coach — uses Claude Haiku */
  async chat(ctx: CoachContext, userMessage: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    return claudeComplete(buildSystemPrompt(ctx.user, ctx), userMessage, history);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const coachService = new AICoachService();
