import { DailyLog, UserProfile, MacroTargets } from '../types';

/**
 * Calculate Exponential Moving Average (EMA) for weight trend
 * Standard smooth factor (alpha) for 7-day smoothing is ~0.2
 * Formula: EMA_today = (Weight_today * alpha) + (EMA_yesterday * (1 - alpha))
 */
export const calculateWeightTrend = (logs: Record<string, DailyLog>, currentWeight: number): { date: string, weight: number | null, trend: number | null }[] => {
  const sortedDates = Object.keys(logs).sort();
  const alpha = 0.15; // Smooth factor
  let lastEma: number | null = null;
  
  return sortedDates.map(date => {
    const log = logs[date];
    const weight = log.weight || null;
    
    if (weight !== null) {
      if (lastEma === null) {
        lastEma = weight; // Initialize with first weight
      } else {
        lastEma = (weight * alpha) + (lastEma * (1 - alpha));
      }
    }
    
    return {
      date: date.slice(5), // MM-DD
      weight,
      trend: lastEma ? parseFloat(lastEma.toFixed(2)) : null
    };
  });
};

/**
 * Evaluates the weekly weight trend against the goal and suggests a macro adjustment.
 * This is the core "AI Coaching Engine" logic.
 */
export const evaluateWeeklyCheckIn = (
  user: UserProfile, 
  logs: Record<string, DailyLog>, 
  currentEma: number | null
): {
  recommendation: 'decrease_calories' | 'increase_calories' | 'maintain';
  reasoning: string;
  newTargets?: MacroTargets;
} => {
  if (!user.targets || currentEma === null || !user.goalWeight) {
    return { recommendation: 'maintain', reasoning: 'Not enough data to make an adjustment.' };
  }

  // Get trend velocity over the last 7 days
  const sortedDates = Object.keys(logs).sort();
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lwString = lastWeekDate.toISOString().split('T')[0];
  
  // Find closest log from 7 days ago
  const oldLogIndex = sortedDates.findIndex(d => d >= lwString);
  if (oldLogIndex === -1 || sortedDates.length < 7) {
    return { recommendation: 'maintain', reasoning: 'We need a full week of data to evaluate your progress. Keep tracking!' };
  }
  
  // Calculate raw EMA
  const trendData = calculateWeightTrend(logs, user.weight);
  const oldEma = trendData[oldLogIndex]?.trend;
  
  if (!oldEma) {
    return { recommendation: 'maintain', reasoning: 'Missing historical trend data.' };
  }

  const weightDiff = currentEma - oldEma;
  
  if (user.goalType === 'fat_loss') {
    // Target loss: ~0.5% to 1% of body weight per week
    const targetLossMin = user.weight * -0.005;
    const targetLossMax = user.weight * -0.01;
    
    if (weightDiff > targetLossMin) { // Losing too slowly or gaining
      return {
        recommendation: 'decrease_calories',
        reasoning: `Your trend weight shifted by ${weightDiff.toFixed(2)}kg this week, which is slower than our target. Let's create a slightly larger deficit.`,
        newTargets: { ...user.targets, calories: user.targets.calories - 100, carbs: Math.max(50, user.targets.carbs - 25) }
      };
    } else if (weightDiff < targetLossMax) { // Losing too fast
      return {
        recommendation: 'increase_calories',
        reasoning: `Your trend weight dropped by ${weightDiff.toFixed(2)}kg this week! This is very fast. Let's add some calories back to protect muscle mass.`,
        newTargets: { ...user.targets, calories: user.targets.calories + 100, carbs: user.targets.carbs + 25 }
      };
    }
  } else if (user.goalType === 'muscle_gain') {
    // Target gain: ~0.25% of body weight per week
    const targetGain = user.weight * 0.0025;
    if (weightDiff < targetGain) {
      return {
        recommendation: 'increase_calories',
        reasoning: `Your trend weight shifted by ${weightDiff.toFixed(2)}kg. We want a slight steady increase for muscle gain. Let's bump calories slightly.`,
        newTargets: { ...user.targets, calories: user.targets.calories + 100, carbs: user.targets.carbs + 25 }
      };
    }
  }
  
  return { recommendation: 'maintain', reasoning: `Your trend weight changed by ${weightDiff.toFixed(2)}kg. You are right on track! No changes needed.` };
};
