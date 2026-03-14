import { FoodItem } from '../types';

interface OFFNutriments {
  'energy-kcal_serving'?: number;
  'proteins_serving'?: number;
  'carbohydrates_serving'?: number;
  'fat_serving'?: number;
  'fiber_serving'?: number;
  'sugars_serving'?: number;
  'sodium_serving'?: number;
  'energy-kcal_100g'?: number;
  'proteins_100g'?: number;
  'carbohydrates_100g'?: number;
  'fat_100g'?: number;
  'fiber_100g'?: number;
  'sugars_100g'?: number;
  'sodium_100g'?: number;
}

interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments: OFFNutriments;
}

// In-memory cache to avoid repeat API calls per session
const searchCache = new Map<string, FoodItem[]>();

const parseServingSize = (raw?: string): { size: number; unit: string } => {
  if (!raw) return { size: 100, unit: 'g' };
  const match = raw.match(/^([\d.]+)\s*([a-zA-Z]*)/);
  if (match) {
    return {
      size: parseFloat(match[1]) || 100,
      unit: match[2]?.toLowerCase() || 'g',
    };
  }
  return { size: 100, unit: 'g' };
};

const mapOFFProduct = (p: OFFProduct): FoodItem | null => {
  const name = p.product_name_en || p.product_name;
  if (!name || name.trim() === '') return null;

  const n = p.nutriments;
  const hasServing = n['energy-kcal_serving'] !== undefined;

  const cal = hasServing ? (n['energy-kcal_serving'] ?? 0) : (n['energy-kcal_100g'] ?? 0);
  const prot = hasServing ? (n['proteins_serving'] ?? 0) : (n['proteins_100g'] ?? 0);
  const carb = hasServing ? (n['carbohydrates_serving'] ?? 0) : (n['carbohydrates_100g'] ?? 0);
  const fat = hasServing ? (n['fat_serving'] ?? 0) : (n['fat_100g'] ?? 0);
  const fiber = hasServing ? (n['fiber_serving'] ?? undefined) : (n['fiber_100g'] ?? undefined);
  const sugar = hasServing ? (n['sugars_serving'] ?? undefined) : (n['sugars_100g'] ?? undefined);
  const sodium = hasServing ? (n['sodium_serving'] ?? undefined) : (n['sodium_100g'] ?? undefined);

  // Skip if all macros are zero — bad data
  if (cal === 0 && prot === 0 && carb === 0 && fat === 0) return null;

  const { size, unit } = parseServingSize(p.serving_size);
  const servingSize = p.serving_quantity || size;

  return {
    id: `off_${p.code}`,
    name: name.trim(),
    brand: p.brands?.split(',')[0]?.trim(),
    servingSize: hasServing ? servingSize : 100,
    servingUnit: hasServing ? unit : 'g',
    calories: Math.round(cal),
    protein: Math.round(prot * 10) / 10,
    carbs: Math.round(carb * 10) / 10,
    fats: Math.round(fat * 10) / 10,
    fiber: fiber !== undefined ? Math.round(fiber * 10) / 10 : undefined,
    sugar: sugar !== undefined ? Math.round(sugar * 10) / 10 : undefined,
    sodium: sodium !== undefined ? Math.round(sodium * 10) / 10 : undefined,
    source: 'openfoodfacts',
  };
};

export const searchOpenFoodFacts = async (query: string): Promise<FoodItem[]> => {
  const cacheKey = query.toLowerCase().trim();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=30&fields=code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments&action=process`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const products: FoodItem[] = (data.products || [])
      .map(mapOFFProduct)
      .filter((p: FoodItem | null): p is FoodItem => p !== null)
      .slice(0, 25);

    searchCache.set(cacheKey, products);
    return products;
  } catch {
    return [];
  }
};

const OFF_FIELDS = 'code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments';

/**
 * Try a single OFF endpoint for a barcode. Returns null on any failure.
 */
const tryOFFEndpoint = async (url: string): Promise<FoodItem | null> => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return mapOFFProduct(data.product);
  } catch {
    return null;
  }
};

/**
 * Looks up a barcode in Open Food Facts.
 * Cascades through: world → us → uk → org v2 endpoints.
 */
export const lookupBarcode = async (barcode: string): Promise<FoodItem | null> => {
  if (!barcode) return null;

  // Try each OFF regional endpoint in order until one succeeds
  const endpoints = [
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=${OFF_FIELDS}`,
    `https://us.openfoodfacts.org/api/v0/product/${barcode}.json?fields=${OFF_FIELDS}`,
    `https://uk.openfoodfacts.org/api/v0/product/${barcode}.json?fields=${OFF_FIELDS}`,
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=${OFF_FIELDS}`,
  ];

  for (const url of endpoints) {
    const result = await tryOFFEndpoint(url);
    if (result) return result;
  }

  return null;
};
