// ─── Primitives ───────────────────────────────────────────────────────────────

/**
 * Validates that a string is non-empty after trimming.
 * Returns null if valid, an error string if not.
 */
export function validateRequired(value: string, label: string): string | null {
  if (value.trim().length === 0) {
    return `${label} is required.`;
  }
  return null;
}

/**
 * Validates that a string represents a number within [min, max] (inclusive).
 * Returns null if valid, an error string if not.
 */
export function validateRange(
  value: string,
  min: number,
  max: number,
  label: string
): string | null {
  const required = validateRequired(value, label);
  if (required) return required;

  const num = parseFloat(value);
  if (isNaN(num)) return `${label} must be a number.`;
  if (num < min || num > max) return `${label} must be between ${min} and ${max}.`;
  return null;
}

/**
 * Validates that a string represents a number greater than zero.
 * Returns null if valid, an error string if not.
 */
export function validatePositiveNumber(value: string, label: string): string | null {
  const required = validateRequired(value, label);
  if (required) return required;

  const num = parseFloat(value);
  if (isNaN(num)) return `${label} must be a number.`;
  if (num <= 0) return `${label} must be greater than 0.`;
  return null;
}

// ─── Domain-specific validators ───────────────────────────────────────────────

/**
 * Weight validator.
 *   kg:  20 – 400
 *   lbs: 44 – 880
 */
export function validateWeight(value: string, unit: 'kg' | 'lbs'): string | null {
  const required = validateRequired(value, 'Weight');
  if (required) return required;

  const num = parseFloat(value);
  if (isNaN(num)) return 'Weight must be a number.';

  if (unit === 'kg') {
    if (num < 20 || num > 400) return 'Weight must be between 20 and 400 kg.';
  } else {
    if (num < 44 || num > 880) return 'Weight must be between 44 and 880 lbs.';
  }

  return null;
}

/**
 * Height validator.
 *   cm: 100 – 250
 *   in: 39 – 98
 */
export function validateHeight(value: string, unit: 'cm' | 'in'): string | null {
  const required = validateRequired(value, 'Height');
  if (required) return required;

  const num = parseFloat(value);
  if (isNaN(num)) return 'Height must be a number.';

  if (unit === 'cm') {
    if (num < 100 || num > 250) return 'Height must be between 100 and 250 cm.';
  } else {
    if (num < 39 || num > 98) return 'Height must be between 39 and 98 inches.';
  }

  return null;
}

/**
 * Age validator: 13 – 100.
 */
export function validateAge(value: string): string | null {
  const required = validateRequired(value, 'Age');
  if (required) return required;

  const num = parseInt(value, 10);
  if (isNaN(num) || String(num) !== value.trim()) return 'Age must be a whole number.';
  if (num < 13 || num > 100) return 'Age must be between 13 and 100.';

  return null;
}

// ─── Composite onboarding validator ──────────────────────────────────────────

/**
 * Validates all fields needed for the onboarding profile step.
 * All measurements are assumed to be in metric (kg / cm) at this point;
 * callers are responsible for converting if the user chose imperial.
 *
 * Returns an object mapping field name → error string.
 * An empty object means all fields are valid.
 */
export function validateProfile(data: {
  name: string;
  age: string;
  weight: string;
  height: string;
  goalWeight: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const nameError = validateRequired(data.name, 'Name');
  if (nameError) errors.name = nameError;
  else if (data.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';

  const ageError = validateAge(data.age);
  if (ageError) errors.age = ageError;

  const weightError = validateWeight(data.weight, 'kg');
  if (weightError) errors.weight = weightError;

  const heightError = validateHeight(data.height, 'cm');
  if (heightError) errors.height = heightError;

  // Goal weight: same range as regular weight, but also check it's plausible
  if (data.goalWeight.trim() !== '') {
    const goalError = validateWeight(data.goalWeight, 'kg');
    if (goalError) {
      errors.goalWeight = goalError;
    } else {
      const gw = parseFloat(data.goalWeight);
      const w = parseFloat(data.weight);
      if (!isNaN(w) && !isNaN(gw)) {
        const diff = Math.abs(gw - w);
        if (diff > 100) {
          errors.goalWeight = 'Goal weight seems unrealistic (more than 100 kg from current weight).';
        }
      }
    }
  }

  return errors;
}
