import { UserProfile, MacroTargets } from '../types';

// Mifflin-St Jeor BMR Equation (most validated for general population)
const calculateBMR = (weight: number, height: number, age: number, sex: 'male' | 'female'): number => {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
};

const getActivityMultiplier = (level: string): number => {
  switch (level) {
    case 'sedentary':         return 1.2;
    case 'lightly_active':    return 1.375;
    case 'moderately_active': return 1.55;
    case 'very_active':       return 1.725;
    case 'extra_active':      return 1.9;
    default:                  return 1.2;
  }
};

export interface TDEEBreakdown {
  bmr: number;
  tdee: number;
  targetCalories: number;
  deficit: number; // negative = deficit, positive = surplus
  leanBodyMass?: number;
  fatMass?: number;
}

/** Estimate lean body mass using body fat percentage */
export const estimateLeanBodyMass = (weight: number, bodyFat?: number): { lbm: number; fatMass: number } | null => {
  if (!bodyFat || bodyFat <= 0 || bodyFat >= 100) return null;
  const fatMass = weight * (bodyFat / 100);
  const lbm = weight - fatMass;
  return { lbm: parseFloat(lbm.toFixed(1)), fatMass: parseFloat(fatMass.toFixed(1)) };
};

/** Full TDEE breakdown for display in Settings/Dashboard */
export const calculateTDEEBreakdown = (profile: Partial<UserProfile>): TDEEBreakdown | null => {
  if (!profile.weight || !profile.height || !profile.age || !profile.sex || !profile.activityLevel) {
    return null;
  }
  const bmr = Math.round(calculateBMR(profile.weight, profile.height, profile.age, profile.sex));
  const tdee = Math.round(bmr * getActivityMultiplier(profile.activityLevel));
  const targets = calculateTargets(profile);
  const composition = estimateLeanBodyMass(profile.weight, profile.bodyFat);

  return {
    bmr,
    tdee,
    targetCalories: targets.calories,
    deficit: targets.calories - tdee,
    leanBodyMass: composition?.lbm,
    fatMass: composition?.fatMass,
  };
};

export const calculateTargets = (profile: Partial<UserProfile>): MacroTargets => {
  if (
    !profile.weight || !profile.height || !profile.age ||
    !profile.sex || !profile.activityLevel || !profile.goalType
  ) {
    return { calories: 2000, protein: 150, carbs: 200, fats: 66 };
  }

  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.sex);
  const tdee = bmr * getActivityMultiplier(profile.activityLevel);

  // Calorie target based on goal + diet speed
  let targetCalories = tdee;
  switch (profile.goalType) {
    case 'fat_loss':
      targetCalories =
        profile.preferredDietSpeed === 'aggressive' ? tdee - 750 :
        profile.preferredDietSpeed === 'moderate'   ? tdee - 500 : tdee - 250;
      break;
    case 'muscle_gain':
      targetCalories =
        profile.preferredDietSpeed === 'aggressive' ? tdee + 500 :
        profile.preferredDietSpeed === 'moderate'   ? tdee + 300 : tdee + 150;
      break;
    case 'recomposition':
      targetCalories = tdee * 0.97; // Very slight deficit for recomp
      break;
    // maintenance stays at TDEE
  }

  // Enforce minimums for safety
  targetCalories = Math.max(1200, targetCalories);

  // PROTEIN: 2.2g/kg body weight — science-backed for body recomposition
  // Use lean body mass if body fat is available for even more precision
  const composition = estimateLeanBodyMass(profile.weight, profile.bodyFat);
  const proteinBase = composition ? composition.lbm * 2.5 : profile.weight * 2.2;
  const protein = Math.round(proteinBase);

  // FATS: minimum threshold for hormonal health
  const fatsFromWeight = profile.weight * 0.8;
  const fatsFromCalories = (targetCalories * 0.25) / 9;
  const fats = Math.max(Math.round(fatsFromWeight), Math.round(fatsFromCalories));

  // CARBS: fill remaining calories
  const remainingCalories = targetCalories - protein * 4 - fats * 9;
  const carbs = Math.max(0, Math.round(remainingCalories / 4));

  return {
    calories: Math.round(targetCalories),
    protein,
    carbs,
    fats,
  };
};
