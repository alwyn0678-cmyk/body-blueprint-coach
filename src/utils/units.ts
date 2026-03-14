// Shared unit conversion utilities — used by Onboarding and Settings

export const kgToLbs = (kg: number): number => Math.round(kg * 2.2046);
export const lbsToKg = (lbs: number): number => Math.round((lbs / 2.2046) * 10) / 10;

export const cmToFtIn = (cm: number): { ft: number; inches: number } => {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft, inches };
};

export const ftInToCm = (ft: number, inches: number): number =>
  Math.round(ft * 30.48 + inches * 2.54);
