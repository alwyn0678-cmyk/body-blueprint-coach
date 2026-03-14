/**
 * USDA FoodData Central integration
 *
 * This is the same underlying database used by MyFitnessPal for US branded foods.
 * The DEMO_KEY is publicly available and allows 30 req/hour per IP — sufficient
 * for barcode lookups and supplementary text search.
 *
 * Docs: https://fdc.nal.usda.gov/api-guide.html
 */

import { FoodItem } from '../types';

const API_KEY = 'DEMO_KEY';
const BASE    = 'https://api.nal.usda.gov/fdc/v1';

// USDA nutrient IDs we care about
const NID = {
  calories:  1008,
  protein:   1003,
  carbs:     1005,
  fat:       1004,
  fiber:     1079,
  sugar:     2000,
  sodium:    1093,
} as const;

interface USDANutrient {
  nutrientId:   number;
  nutrientName: string;
  unitName:     string;
  value:        number;
}

interface USDAFood {
  fdcId:            number;
  description:      string;
  brandOwner?:      string;
  brandName?:       string;
  gtinUpc?:         string;
  servingSize?:     number;
  servingSizeUnit?: string;
  packageWeight?:   string;
  foodNutrients:    USDANutrient[];
}

interface USDASearchResponse {
  foods?:      USDAFood[];
  totalHits?:  number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getNutrient = (nutrients: USDANutrient[], id: number): number => {
  const n = nutrients.find(n => n.nutrientId === id);
  return n ? Math.round(n.value * 10) / 10 : 0;
};

const mapUSDAFood = (f: USDAFood): FoodItem | null => {
  const name = f.description?.trim();
  if (!name) return null;

  const cals    = getNutrient(f.foodNutrients, NID.calories);
  const protein = getNutrient(f.foodNutrients, NID.protein);
  const carbs   = getNutrient(f.foodNutrients, NID.carbs);
  const fat     = getNutrient(f.foodNutrients, NID.fat);
  const fiber   = getNutrient(f.foodNutrients, NID.fiber);
  const sugar   = getNutrient(f.foodNutrients, NID.sugar);
  const sodium  = getNutrient(f.foodNutrients, NID.sodium);

  // Skip entries with no meaningful nutrition data
  if (cals === 0 && protein === 0 && carbs === 0 && fat === 0) return null;

  const brand = f.brandOwner || f.brandName;

  // USDA nutrition is per 100g by default; use serving size if available
  const servingSize = f.servingSize ?? 100;
  const servingUnit = (f.servingSizeUnit ?? 'g').toLowerCase();

  // Scale nutrition to serving size if it's not 100g
  const scale = servingUnit === 'g' || servingUnit === 'ml'
    ? servingSize / 100
    : 1; // if unit is something else (oz, piece) keep as-is

  return {
    id:          `usda_${f.fdcId}`,
    name:        name,
    brand:       brand,
    barcode:     f.gtinUpc,
    servingSize: servingSize,
    servingUnit: servingUnit,
    calories:    Math.round(cals  * scale),
    protein:     Math.round(protein * scale * 10) / 10,
    carbs:       Math.round(carbs   * scale * 10) / 10,
    fats:        Math.round(fat     * scale * 10) / 10,
    fiber:       fiber  ? Math.round(fiber  * scale * 10) / 10 : undefined,
    sugar:       sugar  ? Math.round(sugar  * scale * 10) / 10 : undefined,
    sodium:      sodium ? Math.round(sodium * scale * 10) / 10 : undefined,
    source:      'openfoodfacts', // reuse existing source type
  };
};

// ─── Barcode lookup ───────────────────────────────────────────────────────────

/**
 * Looks up a food item by UPC/GTIN barcode in the USDA Branded Food database.
 * Returns the best match or null on failure / not found.
 */
export const lookupBarcodeUSDA = async (barcode: string): Promise<FoodItem | null> => {
  if (!barcode) return null;
  try {
    // USDA allows searching by GTIN/UPC directly via the query param
    const url = `${BASE}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(barcode)}&dataType=Branded&pageSize=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data: USDASearchResponse = await res.json();
    const foods = data.foods ?? [];

    // Prefer exact GTIN match
    const exact = foods.find(f => f.gtinUpc === barcode || f.gtinUpc === barcode.padStart(14, '0'));
    const target = exact ?? foods[0];
    if (!target) return null;

    return mapUSDAFood(target);
  } catch {
    return null;
  }
};

// ─── Text search ──────────────────────────────────────────────────────────────

const searchCache = new Map<string, FoodItem[]>();

/**
 * Searches the USDA Branded + Foundation food database by text query.
 * Results are per-serving when serving size is available, otherwise per 100g.
 */
export const searchUSDA = async (query: string): Promise<FoodItem[]> => {
  const key = query.toLowerCase().trim();
  if (!key) return [];
  if (searchCache.has(key)) return searchCache.get(key)!;

  try {
    const url = `${BASE}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&dataType=Branded,Foundation&pageSize=25&sortBy=score&sortOrder=desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];

    const data: USDASearchResponse = await res.json();
    const results = (data.foods ?? [])
      .map(mapUSDAFood)
      .filter((f): f is FoodItem => f !== null)
      .slice(0, 20);

    searchCache.set(key, results);
    return results;
  } catch {
    return [];
  }
};
