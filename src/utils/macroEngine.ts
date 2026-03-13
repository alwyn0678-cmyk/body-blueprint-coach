import { UserProfile, MacroTargets } from '../types';

// Mifflin-St Jeor Equation for BMR
const calculateBMR = (weight: number, height: number, age: number, sex: 'male' | 'female'): number => {
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  return sex === 'male' ? bmr + 5 : bmr - 161;
};

// Activity Multiplier
const getActivityMultiplier = (level: string): number => {
  switch (level) {
    case 'sedentary': return 1.2;
    case 'lightly_active': return 1.375;
    case 'moderately_active': return 1.55;
    case 'very_active': return 1.725;
    case 'extra_active': return 1.9;
    default: return 1.2;
  }
};

export const calculateTargets = (profile: Partial<UserProfile>): MacroTargets => {
  if (!profile.weight || !profile.height || !profile.age || !profile.sex || !profile.activityLevel || !profile.goalType) {
    // Default fallback if incomplete
    return { calories: 2000, protein: 150, carbs: 200, fats: 66 };
  }

  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.sex);
  let tdee = bmr * getActivityMultiplier(profile.activityLevel);
  
  // Adjust for goal
  let targetCalories = tdee;
  if (profile.goalType === 'fat_loss') {
    targetCalories = profile.preferredDietSpeed === 'aggressive' ? tdee - 750 : 
                     profile.preferredDietSpeed === 'moderate' ? tdee - 500 : tdee - 250;
  } else if (profile.goalType === 'muscle_gain') {
    targetCalories = profile.preferredDietSpeed === 'aggressive' ? tdee + 500 : 
                     profile.preferredDietSpeed === 'moderate' ? tdee + 300 : tdee + 150;
  }
  // Recomposition and maintenance stay close to TDEE

  // Calculate Macros
  // Protein: Higher for fat loss to preserve muscle, adequate for gain
  const proteinPerKg = profile.goalType === 'fat_loss' ? 2.2 : 1.8;
  const protein = Math.round(profile.weight * proteinPerKg);
  
  // Fats: Minimum threshold for hormones (approx 0.8g per kg or 25% of calories)
  const fats = Math.max(Math.round(profile.weight * 0.8), Math.round((targetCalories * 0.25) / 9));
  
  // Carbs: Fill the rest
  const remainingCalories = targetCalories - (protein * 4) - (fats * 9);
  const carbs = Math.max(0, Math.round(remainingCalories / 4));

  return {
    calories: Math.round(targetCalories),
    protein,
    carbs,
    fats
  };
};
