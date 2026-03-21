import React, { useState } from 'react';
import { ChefHat, X, Flame } from 'lucide-react';
import { BottomSheet } from './MotionUI';
import { FoodItem, MealType } from '../types';

// ── Recipe data ────────────────────────────────────────────────────────────────

interface Recipe {
  id: string;
  emoji: string;
  name: string;
  tag: string;
  tagColor: string;
  description: string;
  ingredients: string[];
  nutrition: { calories: number; protein: number; carbs: number; fats: number };
}

const RECIPES: Recipe[] = [
  {
    id: 'greek-chicken-bowl',
    emoji: '🥗',
    name: 'Greek Chicken Bowl',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Lean chicken over rice with fresh cucumber, feta, and olives. A Mediterranean staple for muscle building.',
    ingredients: [
      '150g grilled chicken breast',
      '150g cooked jasmine rice',
      '60g cucumber, diced',
      '30g feta cheese, crumbled',
      '10g Kalamata olives',
      '1 tbsp olive oil & lemon dressing',
    ],
    nutrition: { calories: 548, protein: 52, carbs: 46, fats: 14 },
  },
  {
    id: 'overnight-oats',
    emoji: '🥣',
    name: 'High Protein Oats',
    tag: 'Breakfast',
    tagColor: '#576038',
    description: 'Prep-ahead overnight oats loaded with protein. Keeps you full and fuels morning training.',
    ingredients: [
      '80g rolled oats',
      '200g Greek yogurt (0% fat)',
      '1 scoop vanilla protein powder',
      '1 medium banana',
      '1 tbsp almond butter',
    ],
    nutrition: { calories: 522, protein: 46, carbs: 64, fats: 9 },
  },
  {
    id: 'salmon-sweet-potato',
    emoji: '🐟',
    name: 'Salmon & Sweet Potato',
    tag: 'Balanced',
    tagColor: '#8B9467',
    description: 'Omega-3 rich salmon with complex carbs and broccoli. Perfect post-training recovery meal.',
    ingredients: [
      '180g Atlantic salmon fillet',
      '200g sweet potato, roasted',
      '200g broccoli, steamed',
      '1 tbsp olive oil',
      'Lemon, herbs & garlic',
    ],
    nutrition: { calories: 578, protein: 48, carbs: 44, fats: 18 },
  },
  {
    id: 'tuna-rice-bowl',
    emoji: '🍚',
    name: 'Tuna Rice Bowl',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Quick and cheap high-protein bowl. Ideal for meal prep — scales up easily.',
    ingredients: [
      '150g canned tuna in spring water',
      '150g cooked jasmine rice',
      '60g frozen edamame, thawed',
      '60g cucumber, sliced',
      '1 tsp sesame oil',
      '1 tbsp low-sodium soy sauce',
    ],
    nutrition: { calories: 490, protein: 48, carbs: 52, fats: 8 },
  },
  {
    id: 'egg-white-omelette',
    emoji: '🍳',
    name: 'Egg White Omelette',
    tag: 'Low Carb',
    tagColor: '#3E4528',
    description: 'Light, fluffy, and packed with protein. Loaded with greens and feta for flavour.',
    ingredients: [
      '6 egg whites',
      '50g baby spinach',
      '80g mushrooms, sliced',
      '30g feta cheese',
      '1 tsp olive oil',
    ],
    nutrition: { calories: 252, protein: 33, carbs: 5, fats: 10 },
  },
  {
    id: 'turkey-stir-fry',
    emoji: '🥘',
    name: 'Turkey Stir Fry',
    tag: 'Balanced',
    tagColor: '#8B9467',
    description: 'Lean ground turkey stir-fried with colourful veg over brown rice. Big flavour, high protein.',
    ingredients: [
      '200g lean ground turkey',
      '1 cup mixed vegetables (capsicum, broccoli, snap peas)',
      '150g cooked brown rice',
      '1 tbsp sesame oil',
      '1 tbsp low-sodium soy sauce',
      'Garlic & ginger',
    ],
    nutrition: { calories: 518, protein: 45, carbs: 49, fats: 12 },
  },
  {
    id: 'cottage-cheese-bowl',
    emoji: '🫙',
    name: 'Cottage Cheese Bowl',
    tag: 'Breakfast',
    tagColor: '#576038',
    description: 'High-protein, low-effort bowl. Great for recovery mornings or a light snack.',
    ingredients: [
      '250g cottage cheese (low fat)',
      '100g mixed berries (blueberries, strawberries)',
      '30g granola',
      '1 tsp honey',
    ],
    nutrition: { calories: 378, protein: 33, carbs: 43, fats: 7 },
  },
  {
    id: 'steak-veg',
    emoji: '🥩',
    name: 'Sirloin & Sweet Potato',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Classic bodybuilder staple. Lean sirloin delivers creatine and iron alongside complex carbs.',
    ingredients: [
      '200g sirloin steak, grilled',
      '200g sweet potato, roasted',
      '150g asparagus, griddled',
      '1 tsp olive oil',
      'Salt, pepper & rosemary',
    ],
    nutrition: { calories: 553, protein: 56, carbs: 38, fats: 15 },
  },
  {
    id: 'smoothie-bowl',
    emoji: '🍇',
    name: 'Protein Smoothie Bowl',
    tag: 'Breakfast',
    tagColor: '#576038',
    description: 'Thick, creamy and vibrant. Blends protein powder with frozen fruit and nutritious toppings.',
    ingredients: [
      '1 scoop vanilla protein powder',
      '1 frozen banana',
      '100g frozen mixed berries',
      '120ml unsweetened almond milk',
      '30g granola',
      '1 tbsp chia seeds',
    ],
    nutrition: { calories: 418, protein: 32, carbs: 56, fats: 8 },
  },
  {
    id: 'smoked-salmon-scramble',
    emoji: '🥚',
    name: 'Salmon Scramble',
    tag: 'Low Carb',
    tagColor: '#3E4528',
    description: 'Omega-3s and complete protein in one pan. Elegant enough for brunch, quick enough for mornings.',
    ingredients: [
      '3 large whole eggs',
      '80g smoked salmon',
      '30g light cream cheese',
      '50g baby spinach',
      '1 tsp olive oil',
    ],
    nutrition: { calories: 422, protein: 42, carbs: 4, fats: 27 },
  },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface RecipeLibraryProps {
  activeMeal: MealType;
  selectedDate: string;
  onAdd: (food: FoodItem, amount: number) => void;
}

// ── Macro pill ─────────────────────────────────────────────────────────────────

const MacroPill: React.FC<{ label: string; value: number; unit: string; color: string; bg: string }> = ({ label, value, unit, color, bg }) => (
  <div style={{
    flex: 1,
    background: bg,
    borderRadius: 12,
    padding: '10px 8px',
    textAlign: 'center',
    border: '1px solid rgba(0,0,0,0.04)',
  }}>
    <div style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(0,0,0,0.25)', marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: '1.1rem', fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(0,0,0,0.20)', marginTop: 1 }}>{unit}</div>
  </div>
);

// ── Component ──────────────────────────────────────────────────────────────────

export const RecipeLibrary: React.FC<RecipeLibraryProps> = ({ activeMeal, selectedDate: _selectedDate, onAdd }) => {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleAdd = (recipe: Recipe) => {
    const food: FoodItem = {
      id: `recipe-${recipe.id}`,
      name: recipe.name,
      calories: recipe.nutrition.calories,
      protein: recipe.nutrition.protein,
      carbs: recipe.nutrition.carbs,
      fats: recipe.nutrition.fats,
      servingSize: 1,
      servingUnit: 'serving',
    };
    onAdd(food, 1);
    setSelectedRecipe(null);
  };

  return (
    <>
      {/* ── Section header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'rgba(0,0,0,0.20)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <ChefHat size={11} color="rgba(0,0,0,0.25)" />
          Recipe Library
        </div>
        <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'rgba(0,0,0,0.18)' }}>
          {RECIPES.length} healthy recipes
        </div>
      </div>

      {/* ── Horizontal scroll of recipe cards ── */}
      <div style={{
        display: 'flex', gap: 10,
        overflowX: 'auto', paddingBottom: 4,
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {RECIPES.map(recipe => (
          <button
            key={recipe.id}
            onClick={() => setSelectedRecipe(recipe)}
            style={{
              flexShrink: 0,
              width: 148,
              background: '#FFFFFF',
              borderRadius: 18,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 2px 12px rgba(26,28,26,0.05)',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              overflow: 'hidden',
            }}
          >
            {/* Card top – olive gradient bg with emoji */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(87,96,56,0.09) 0%, rgba(194,203,154,0.07) 100%)',
              padding: '14px 0 10px',
              textAlign: 'center',
              borderBottom: '1px solid rgba(87,96,56,0.08)',
            }}>
              <div style={{ fontSize: '2rem', lineHeight: 1 }}>{recipe.emoji}</div>
            </div>

            {/* Card body */}
            <div style={{ padding: '10px 11px 12px' }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 800, color: '#1A1A1A',
                lineHeight: 1.25, marginBottom: 5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              } as React.CSSProperties}>
                {recipe.name}
              </div>

              {/* Tag badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: '0.58rem', fontWeight: 800,
                color: recipe.tagColor,
                background: `${recipe.tagColor}18`,
                border: `1px solid ${recipe.tagColor}30`,
                borderRadius: 999, padding: '2px 7px',
                marginBottom: 8,
              }}>
                {recipe.tag}
              </div>

              {/* Calories + protein quick stats */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Flame size={10} color="#974400" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>
                    {recipe.nutrition.calories}
                  </span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(0,0,0,0.22)' }}>kcal</span>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#974400', fontVariantNumeric: 'tabular-nums' }}>
                  {recipe.nutrition.protein}g P
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Recipe detail bottom sheet ── */}
      <BottomSheet
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      >
        {selectedRecipe && (
          <div style={{ paddingTop: 4 }}>
            {/* Emoji + name header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>{selectedRecipe.emoji}</div>
              <h2 style={{
                fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A',
                margin: '0 0 6px', letterSpacing: '-0.02em',
              }}>
                {selectedRecipe.name}
              </h2>
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: '0.65rem', fontWeight: 800,
                color: selectedRecipe.tagColor,
                background: `${selectedRecipe.tagColor}18`,
                border: `1px solid ${selectedRecipe.tagColor}30`,
                borderRadius: 999, padding: '3px 10px',
              }}>
                {selectedRecipe.tag}
              </div>
            </div>

            {/* Description */}
            <p style={{
              fontSize: '0.82rem', color: 'rgba(26,26,26,0.58)', lineHeight: 1.55,
              textAlign: 'center', margin: '0 0 20px',
            }}>
              {selectedRecipe.description}
            </p>

            {/* Macro pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <MacroPill label="Calories" value={selectedRecipe.nutrition.calories} unit="kcal" color="#974400" bg="rgba(151,68,0,0.07)" />
              <MacroPill label="Protein"  value={selectedRecipe.nutrition.protein}  unit="g"    color="#974400" bg="rgba(151,68,0,0.05)" />
              <MacroPill label="Carbs"    value={selectedRecipe.nutrition.carbs}    unit="g"    color="#576038" bg="rgba(87,96,56,0.07)" />
              <MacroPill label="Fats"     value={selectedRecipe.nutrition.fats}     unit="g"    color="#3E4528" bg="rgba(87,96,56,0.05)" />
            </div>

            {/* Ingredients */}
            <div style={{
              background: 'rgba(87,96,56,0.04)',
              border: '1px solid rgba(87,96,56,0.10)',
              borderRadius: 18,
              padding: '14px 16px',
              marginBottom: 20,
            }}>
              <div style={{
                fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'rgba(0,0,0,0.25)', marginBottom: 10,
              }}>
                Ingredients (1 serving)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {selectedRecipe.ingredients.map((ingredient, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: '#576038', flexShrink: 0, marginTop: 5,
                    }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1A1A1A', lineHeight: 1.4 }}>
                      {ingredient}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Add to meal button */}
            <button
              onClick={() => handleAdd(selectedRecipe)}
              style={{
                width: '100%',
                padding: '1rem',
                background: '#576038',
                color: '#FCFFE2',
                border: 'none',
                borderRadius: 16,
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <ChefHat size={16} />
              Add to {activeMeal.charAt(0).toUpperCase() + activeMeal.slice(1)}
            </button>

            <p style={{
              fontSize: '0.65rem', color: 'rgba(0,0,0,0.22)', fontWeight: 600,
              textAlign: 'center', marginTop: 10,
            }}>
              Logged as 1 serving · {selectedRecipe.nutrition.calories} kcal · {selectedRecipe.nutrition.protein}g protein
            </p>
          </div>
        )}
      </BottomSheet>
    </>
  );
};
