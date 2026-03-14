import { FoodItem } from '../types';
import { localFoodDatabase } from '../utils/foodDatabase';
import { searchOpenFoodFacts, lookupBarcode as lookupBarcodeOFF } from '../utils/openFoodFacts';
import { lookupBarcodeUSDA, searchUSDA } from '../utils/usdaFoodData';

// ─── Result shape ─────────────────────────────────────────────────────────────

export interface FoodSearchResult {
  local: FoodItem[];
  api: FoodItem[];
  combined: FoodItem[];
  apiError: boolean;
}

// ─── Retry wrapper ────────────────────────────────────────────────────────────

/**
 * Retries `fn` up to `retries` times with `delayMs` delay between attempts on failure.
 */
export async function retryFetch<T>(fn: () => Promise<T>, retries = 2, delayMs = 800): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Scores how well a FoodItem matches a query string.
 * exact name match = 100, starts-with = 80, contains = 60, word match = 40
 * Returns 0 if no match at all.
 */
export function scoreSearchResult(item: FoodItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 50; // no query → neutral, keep everything

  const name = item.name.toLowerCase();
  const brand = (item.brand ?? '').toLowerCase();

  // Exact match on name
  if (name === q) return 100;

  // Exact match on brand
  if (brand === q) return 95;

  // Name starts with query
  if (name.startsWith(q)) return 80;

  // Brand starts with query
  if (brand.startsWith(q)) return 75;

  // Name contains query as a substring
  if (name.includes(q)) return 60;

  // Brand contains query as a substring
  if (brand.includes(q)) return 55;

  // Any word in the name starts with any word in the query
  const queryWords = q.split(/\s+/).filter(Boolean);
  const nameWords = name.split(/\s+/).filter(Boolean);
  const brandWords = brand.split(/\s+/).filter(Boolean);
  const allItemWords = [...nameWords, ...brandWords];

  const wordMatch = queryWords.some(qw =>
    allItemWords.some(iw => iw.startsWith(qw) || iw.includes(qw))
  );
  if (wordMatch) return 40;

  return 0;
}

// ─── Filter + Sort ────────────────────────────────────────────────────────────

/**
 * Filters items to those with score > 0 and returns them sorted
 * highest-score first. Items with equal scores preserve original order.
 */
export function filterAndSort(items: FoodItem[], query: string): FoodItem[] {
  const q = query.trim();
  if (!q) return items;

  return items
    .map(item => ({ item, score: scoreSearchResult(item, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

// ─── Normalize raw API data ───────────────────────────────────────────────────

/**
 * Normalizes an arbitrary raw object from any food data source into a FoodItem.
 * Handles both OpenFoodFacts-shaped and flat ad-hoc shapes.
 * Never throws — returns a best-effort FoodItem or null on completely bad input.
 */
export function normalizeFoodItem(raw: any): FoodItem {
  if (!raw || typeof raw !== 'object') {
    throw new Error('normalizeFoodItem: raw must be a non-null object');
  }

  // Already a well-formed FoodItem (passed through from local db or cache)
  if (
    typeof raw.id === 'string' &&
    typeof raw.name === 'string' &&
    typeof raw.calories === 'number'
  ) {
    return raw as FoodItem;
  }

  // Handle OpenFoodFacts product shape
  const nutriments = raw.nutriments ?? {};
  const hasServing = nutriments['energy-kcal_serving'] !== undefined;

  const parseNum = (v: any): number => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : Math.round(n * 10) / 10;
  };

  const cal = hasServing
    ? parseNum(nutriments['energy-kcal_serving'])
    : parseNum(nutriments['energy-kcal_100g'] ?? nutriments.energy_value ?? raw.calories ?? 0);
  const protein = hasServing
    ? parseNum(nutriments['proteins_serving'])
    : parseNum(nutriments['proteins_100g'] ?? raw.protein ?? 0);
  const carbs = hasServing
    ? parseNum(nutriments['carbohydrates_serving'])
    : parseNum(nutriments['carbohydrates_100g'] ?? raw.carbs ?? 0);
  const fats = hasServing
    ? parseNum(nutriments['fat_serving'])
    : parseNum(nutriments['fat_100g'] ?? raw.fats ?? 0);

  const fiber = (() => {
    const v = hasServing
      ? nutriments['fiber_serving']
      : (nutriments['fiber_100g'] ?? raw.fiber);
    return v !== undefined ? parseNum(v) : undefined;
  })();

  const sugar = (() => {
    const v = hasServing
      ? nutriments['sugars_serving']
      : (nutriments['sugars_100g'] ?? raw.sugar);
    return v !== undefined ? parseNum(v) : undefined;
  })();

  const sodium = (() => {
    const v = hasServing
      ? nutriments['sodium_serving']
      : (nutriments['sodium_100g'] ?? raw.sodium);
    return v !== undefined ? parseNum(v) : undefined;
  })();

  const name = (raw.product_name_en ?? raw.product_name ?? raw.name ?? '').trim();
  const brand = raw.brands
    ? raw.brands.split(',')[0]?.trim()
    : raw.brand;

  // Parse serving size from string like "150g" or "1 cup (240ml)"
  let servingSize = 100;
  let servingUnit = 'g';
  if (raw.serving_quantity) {
    servingSize = parseNum(raw.serving_quantity);
  } else if (raw.servingSize) {
    servingSize = parseNum(raw.servingSize);
  }
  if (raw.servingUnit) {
    servingUnit = raw.servingUnit;
  } else if (raw.serving_size) {
    const match = String(raw.serving_size).match(/^[\d.]+\s*([a-zA-Z]+)/);
    if (match) servingUnit = match[1].toLowerCase();
  }

  const id = raw.id ?? (raw.code ? `off_${raw.code}` : `food_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  const rawServingSize = hasServing ? (raw.serving_quantity ?? servingSize) : 100;

  return {
    id,
    name: name || 'Unknown Food',
    brand,
    servingSize: clamp(parseNum(rawServingSize), 0.1, 9999),
    servingUnit: hasServing ? servingUnit : 'g',
    calories: clamp(Math.round(cal), 0, 9999),
    protein: clamp(protein, 0, 999),
    carbs: clamp(carbs, 0, 999),
    fats: clamp(fats, 0, 999),
    ...(fiber !== undefined && { fiber: clamp(fiber, 0, 999) }),
    ...(sugar !== undefined && { sugar: clamp(sugar, 0, 999) }),
    ...(sodium !== undefined && { sodium: clamp(sodium, 0, 9999) }),
    source: raw.source ?? 'openfoodfacts',
  };
}

// ─── Local search ─────────────────────────────────────────────────────────────

function searchLocal(query: string, customFoods: FoodItem[]): FoodItem[] {
  const pool = [...localFoodDatabase, ...customFoods];
  return filterAndSort(pool, query);
}

// ─── De-duplicate by id ───────────────────────────────────────────────────────

function deduplicateById(items: FoodItem[]): FoodItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// ─── Main search ─────────────────────────────────────────────────────────────

/**
 * Searches local database and customFoods instantly, then queries OpenFoodFacts.
 * Returns { local, api, combined } — combined deduplicates and puts local first.
 * Never throws; API errors return empty api array.
 */
export async function searchFoods(
  query: string,
  customFoods: FoodItem[]
): Promise<FoodSearchResult> {
  const trimmed = query.trim();

  if (!trimmed) {
    return { local: [], api: [], combined: [], apiError: false };
  }

  // Local is synchronous — run before kicking off the API call
  const local = searchLocal(trimmed, customFoods);

  // Fire both remote sources in parallel
  let api: FoodItem[] = [];
  let apiError = false;
  try {
    const [offResults, usdaResults] = await Promise.allSettled([
      searchOpenFoodFacts(trimmed),
      searchUSDA(trimmed),
    ]);

    const off  = offResults.status  === 'fulfilled' ? offResults.value  : [];
    const usda = usdaResults.status === 'fulfilled' ? usdaResults.value : [];

    if (offResults.status === 'rejected' && usdaResults.status === 'rejected') {
      apiError = true;
    }

    // Merge: interleave OFF + USDA results by score, then deduplicate
    const merged = deduplicateById([...off, ...usda]);
    api = filterAndSort(merged, trimmed);
  } catch (err) {
    console.warn('[foodService] Remote search failed:', err);
    api = [];
    apiError = true;
  }

  // Combined: local results first (already scored), then API results not already in local
  const localIds = new Set(local.map(f => f.id));
  const apiDeduped = api.filter(f => !localIds.has(f.id));
  const combined = deduplicateById([...local, ...apiDeduped]);

  return { local, api, combined, apiError };
}

// ─── Barcode lookup ───────────────────────────────────────────────────────────

/**
 * Looks up a food by barcode using a multi-source cascade:
 *   1. Open Food Facts  (world → us → uk endpoints in parallel)
 *   2. USDA FoodData Central (Branded foods — same database as MyFitnessPal)
 *
 * Returns the first successful result or null on total failure — never throws.
 */
export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  const clean = barcode?.trim();
  if (!clean) return null;

  // Race both sources in parallel — take whichever resolves first with a result
  try {
    const [offResult, usdaResult] = await Promise.allSettled([
      retryFetch(() => lookupBarcodeOFF(clean), 1, 600),
      retryFetch(() => lookupBarcodeUSDA(clean), 1, 600),
    ]);

    // Prefer OFF if it found something (generally richer serving data)
    if (offResult.status === 'fulfilled' && offResult.value) {
      return offResult.value;
    }
    if (usdaResult.status === 'fulfilled' && usdaResult.value) {
      return usdaResult.value;
    }

    console.warn('[foodService] Barcode not found in any database:', clean);
    return null;
  } catch (err) {
    console.warn('[foodService] Barcode lookup failed:', err);
    return null;
  }
}
