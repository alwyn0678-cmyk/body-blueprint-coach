import { DailyLog, UserProfile, MacroTargets, WeeklyStats } from '../types';

/**
 * Calculate Exponential Moving Average (EMA) for weight trend.
 * Alpha of 0.15 gives 7-day smoothing — same approach as MacroFactor.
 */
export const calculateWeightTrend = (
  logs: Record<string, DailyLog>,
  _currentWeight: number
): { date: string; weight: number | null; trend: number | null }[] => {
  const sortedDates = Object.keys(logs).sort();
  const alpha = 0.15;
  let lastEma: number | null = null;

  return sortedDates.map(date => {
    const log = logs[date];
    const weight = log.weight ?? null;

    if (weight !== null) {
      lastEma = lastEma === null ? weight : weight * alpha + lastEma * (1 - alpha);
    }

    return {
      date: date.slice(5), // MM-DD
      weight,
      trend: lastEma !== null ? parseFloat(lastEma.toFixed(2)) : null,
    };
  });
};

/** Sum macros from a DailyLog */
export const getMacrosFromLog = (
  log: DailyLog
): { calories: number; protein: number; carbs: number; fats: number } => {
  return Object.values(log.meals)
    .flat()
    .reduce(
      (acc, item) => ({
        calories: acc.calories + item.nutrition.calories * item.amount,
        protein: acc.protein + item.nutrition.protein * item.amount,
        carbs: acc.carbs + item.nutrition.carbs * item.amount,
        fats: acc.fats + item.nutrition.fats * item.amount,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
};

/** Returns the last N date strings (YYYY-MM-DD) ending today */
const lastNDays = (n: number): string[] => {
  const dates: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() - 1);
  }
  return dates;
};

/**
 * Calculate streak of consecutive days with any food logged.
 * Today is allowed to be empty — we look backwards from yesterday.
 */
export const calculateStreak = (logs: Record<string, DailyLog>): number => {
  let streak = 0;
  const d = new Date();
  // Start from today, allow empty today (i === 0)
  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().split('T')[0];
    const log = logs[dateStr];
    const hasFood = log && Object.values(log.meals).some(entries => entries.length > 0);

    if (hasFood) {
      streak++;
    } else if (i > 0) {
      break; // Gap found
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

/**
 * Detect weight plateau: EMA moved <0.3 kg over last 14 days.
 */
export const detectPlateau = (
  logs: Record<string, DailyLog>,
  currentWeight: number
): boolean => {
  const trend = calculateWeightTrend(logs, currentWeight);
  const withTrend = trend.filter(t => t.trend !== null);
  if (withTrend.length < 14) return false;

  const recent = withTrend.slice(-14);
  const first = recent[0].trend!;
  const last = recent[recent.length - 1].trend!;
  return Math.abs(last - first) < 0.3;
};

/**
 * Compute weekly stats from the last 7 days of logs.
 */
export const computeWeeklyStats = (
  logs: Record<string, DailyLog>,
  targets: MacroTargets
): WeeklyStats => {
  const days = lastNDays(7);
  let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
  let calDays = 0, proDays = 0, loggedDays = 0, workouts = 0;
  const weights: number[] = [];

  for (const dateStr of days) {
    const log = logs[dateStr];
    if (!log) continue;
    const macros = getMacrosFromLog(log);
    if (macros.calories > 0) {
      loggedDays++;
      totalCal += macros.calories;
      totalPro += macros.protein;
      totalCarb += macros.carbs;
      totalFat += macros.fats;
      const calRatio = macros.calories / targets.calories;
      if (calRatio >= 0.85 && calRatio <= 1.15) calDays++;
      if (macros.protein / targets.protein >= 0.85) proDays++;
    }
    workouts += (log.workouts || []).length;
    if (log.weight) weights.push(log.weight);
  }

  const n = loggedDays || 1;
  return {
    weekStart: days[days.length - 1],
    avgCalories: Math.round(totalCal / n),
    avgProtein: Math.round(totalPro / n),
    avgCarbs: Math.round(totalCarb / n),
    avgFats: Math.round(totalFat / n),
    calorieAdherence: loggedDays > 0 ? Math.round((calDays / loggedDays) * 100) : 0,
    proteinAdherence: loggedDays > 0 ? Math.round((proDays / loggedDays) * 100) : 0,
    daysLogged: loggedDays,
    weightChange: weights.length >= 2 ? parseFloat((weights[weights.length - 1] - weights[0]).toFixed(2)) : null,
    workoutsCompleted: workouts,
  };
};

/**
 * Core weekly check-in evaluation.
 * Analyses weight velocity vs. goal and generates intelligent coaching.
 */
export const evaluateWeeklyCheckIn = (
  user: UserProfile,
  logs: Record<string, DailyLog>,
  currentEma: number | null,
  options?: { plateauDetection?: boolean }
): {
  recommendation: 'decrease_calories' | 'increase_calories' | 'maintain';
  reasoning: string;
  newTargets?: MacroTargets;
  urgency: 'low' | 'medium' | 'high';
} => {
  if (!user.targets || currentEma === null || !user.goalWeight) {
    return {
      recommendation: 'maintain',
      reasoning: 'Log your weight daily for AI-driven target adjustments. Consistency is the foundation of every successful transformation.',
      urgency: 'low',
    };
  }

  const sortedDates = Object.keys(logs).sort();
  const lwDate = new Date();
  lwDate.setDate(lwDate.getDate() - 7);
  const lwString = lwDate.toISOString().split('T')[0];

  const oldLogIndex = sortedDates.findIndex(d => d >= lwString);
  if (oldLogIndex === -1 || sortedDates.length < 5) {
    return {
      recommendation: 'maintain',
      reasoning: 'Need at least 5 days of data to make accurate adjustments. Keep logging — the more data, the smarter your coaching gets.',
      urgency: 'low',
    };
  }

  const trendData = calculateWeightTrend(logs, user.weight);
  const oldEma = trendData[oldLogIndex]?.trend;
  if (!oldEma) {
    return {
      recommendation: 'maintain',
      reasoning: 'Insufficient trend data. Log your weight each morning for precise adaptive adjustments.',
      urgency: 'low',
    };
  }

  const stats = computeWeeklyStats(logs, user.targets);
  const weightDiff = currentEma - oldEma;
  const isPlateau = (options?.plateauDetection !== false) ? detectPlateau(logs, user.weight) : false;
  const isLowAdherence = stats.calorieAdherence < 50 && stats.daysLogged >= 3;
  const distanceToGoal = Math.abs(currentEma - user.goalWeight);

  // ── FAT LOSS ─────────────────────────────────────────────────────────────
  if (user.goalType === 'fat_loss') {
    const targetLossMin = user.weight * -0.005; // 0.5% body weight per week
    const targetLossMax = user.weight * -0.012; // 1.2% body weight per week

    if (isPlateau && stats.daysLogged >= 5) {
      return {
        recommendation: 'decrease_calories',
        reasoning: `Trend stalled at ~${currentEma.toFixed(1)}kg for 14 days — classic metabolic adaptation. Reducing by 100 kcal. Tip: add a higher-carb refeed day this weekend to reset leptin and boost adherence.`,
        newTargets: { ...user.targets, calories: user.targets.calories - 100, carbs: Math.max(50, user.targets.carbs - 25) },
        urgency: 'medium',
      };
    }

    if (weightDiff > targetLossMin) {
      if (isLowAdherence) {
        return {
          recommendation: 'maintain',
          reasoning: `Trend moved ${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(2)}kg, but calorie adherence is only ${stats.calorieAdherence}%. Before cutting further, hit your targets 5/7 days. The issue is consistency, not the target.`,
          urgency: 'medium',
        };
      }
      return {
        recommendation: 'decrease_calories',
        reasoning: `Trend shifted ${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(2)}kg — slower than the ${(targetLossMin * -1).toFixed(2)}kg/week target. Adherence at ${stats.calorieAdherence}%. Reducing by 100 kcal to re-establish deficit.`,
        newTargets: { ...user.targets, calories: user.targets.calories - 100, carbs: Math.max(50, user.targets.carbs - 25) },
        urgency: 'medium',
      };
    }

    if (weightDiff < targetLossMax) {
      return {
        recommendation: 'increase_calories',
        reasoning: `Trend dropped ${weightDiff.toFixed(2)}kg — too aggressive. Losing this fast risks muscle loss. Adding 100 kcal back to protect lean tissue. Sustainable fat loss wins long-term.`,
        newTargets: { ...user.targets, calories: user.targets.calories + 100, carbs: user.targets.carbs + 25 },
        urgency: 'high',
      };
    }

    if (distanceToGoal < 2) {
      return {
        recommendation: 'maintain',
        reasoning: `Only ${distanceToGoal.toFixed(1)}kg from your goal of ${user.goalWeight}kg. Trend moving at ${weightDiff.toFixed(2)}kg/week. Perfect execution — continue current protocol.`,
        urgency: 'low',
      };
    }

    return {
      recommendation: 'maintain',
      reasoning: `Trend moved ${weightDiff.toFixed(2)}kg — right in the optimal range. Cal adherence: ${stats.calorieAdherence}%. Avg protein: ${stats.avgProtein}g. No adjustments needed. Keep executing.`,
      urgency: 'low',
    };
  }

  // ── MUSCLE GAIN ──────────────────────────────────────────────────────────
  if (user.goalType === 'muscle_gain') {
    const targetGain = user.weight * 0.0025;

    if (weightDiff < targetGain * 0.3) {
      return {
        recommendation: 'increase_calories',
        reasoning: `Trend gained only ${weightDiff.toFixed(2)}kg vs. ${targetGain.toFixed(2)}kg target. Bumping 100 kcal via carbs. Protein avg: ${stats.avgProtein}g/${user.targets.protein}g. Surplus drives growth.`,
        newTargets: { ...user.targets, calories: user.targets.calories + 100, carbs: user.targets.carbs + 25 },
        urgency: weightDiff < 0 ? 'high' : 'medium',
      };
    }

    if (weightDiff > targetGain * 3) {
      return {
        recommendation: 'decrease_calories',
        reasoning: `Trend gained ${weightDiff.toFixed(2)}kg — above target for lean bulk. Excess accelerates fat accumulation. Reducing 100 kcal to keep the surplus clean. Steady wins.`,
        newTargets: { ...user.targets, calories: user.targets.calories - 100, carbs: Math.max(50, user.targets.carbs - 25) },
        urgency: 'medium',
      };
    }

    return {
      recommendation: 'maintain',
      reasoning: `Lean bulk executing cleanly. Trend gained ${weightDiff.toFixed(2)}kg. Avg protein: ${stats.avgProtein}g. ${stats.workoutsCompleted} workouts logged. Keep progressive overload high.`,
      urgency: 'low',
    };
  }

  // ── MAINTENANCE ──────────────────────────────────────────────────────────
  if (user.goalType === 'maintenance') {
    const drift = Math.abs(weightDiff);
    if (drift > 0.5) {
      const gaining = weightDiff > 0;
      return {
        recommendation: gaining ? 'decrease_calories' : 'increase_calories',
        reasoning: `${gaining ? 'Gaining' : 'Losing'} ${drift.toFixed(2)}kg/week — outside maintenance range. ${gaining ? 'Trimming' : 'Adding'} 100 kcal to re-center. Current avg: ${stats.avgCalories} kcal/day.`,
        newTargets: { ...user.targets, calories: user.targets.calories + (gaining ? -100 : 100), carbs: user.targets.carbs + (gaining ? -25 : 25) },
        urgency: 'medium',
      };
    }
    return {
      recommendation: 'maintain',
      reasoning: `Weight stable at ${currentEma.toFixed(1)}kg. Avg intake: ${stats.avgCalories} kcal / ${stats.avgProtein}g protein. Maintenance executing precisely.`,
      urgency: 'low',
    };
  }

  // ── RECOMPOSITION ────────────────────────────────────────────────────────
  return {
    recommendation: 'maintain',
    reasoning: `Recomposition is driven by training quality and protein adequacy, not rapid weight change. Avg protein: ${stats.avgProtein}g/${user.targets.protein}g target. ${stats.workoutsCompleted} sessions this week. Body composition is shifting.`,
    urgency: 'low',
  };
};
