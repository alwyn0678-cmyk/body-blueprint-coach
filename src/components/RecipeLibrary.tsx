import React, { useState, useMemo } from 'react';
import { ChefHat, Search, Flame, X } from 'lucide-react';
import { BottomSheet } from './MotionUI';
import { FoodItem, MealType } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

type Category = 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'post-workout';

interface Recipe {
  id: string;
  emoji: string;
  name: string;
  category: Category;
  tag: string;
  tagColor: string;
  description: string;
  ingredients: string[];
  nutrition: { calories: number; protein: number; carbs: number; fats: number };
}

// ── Recipe data ────────────────────────────────────────────────────────────────

const RECIPES: Recipe[] = [
  // ── BREAKFAST ──────────────────────────────────────────────────────────────
  {
    id: 'overnight-oats',
    emoji: '🥣',
    name: 'High Protein Overnight Oats',
    category: 'breakfast',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Prep-ahead oats loaded with protein. Keeps you full and fuels morning training sessions.',
    ingredients: ['80g rolled oats', '200g Greek yogurt (0% fat)', '1 scoop vanilla protein powder', '1 medium banana', '1 tbsp almond butter'],
    nutrition: { calories: 522, protein: 46, carbs: 64, fats: 9 },
  },
  {
    id: 'salmon-scramble',
    emoji: '🥚',
    name: 'Salmon Scramble',
    category: 'breakfast',
    tag: 'Low Carb',
    tagColor: '#3E4528',
    description: 'Omega-3s and complete protein in one pan. Elegant enough for brunch, quick enough for mornings.',
    ingredients: ['3 large whole eggs', '80g smoked salmon', '30g light cream cheese', '50g baby spinach', '1 tsp olive oil'],
    nutrition: { calories: 422, protein: 42, carbs: 4, fats: 27 },
  },
  {
    id: 'egg-white-omelette',
    emoji: '🍳',
    name: 'Egg White Omelette',
    category: 'breakfast',
    tag: 'Low Carb',
    tagColor: '#3E4528',
    description: 'Light, fluffy, and packed with protein. Loaded with greens and feta for serious flavour.',
    ingredients: ['6 egg whites', '50g baby spinach', '80g mushrooms, sliced', '30g feta cheese', '1 tsp olive oil'],
    nutrition: { calories: 252, protein: 33, carbs: 5, fats: 10 },
  },
  {
    id: 'cottage-cheese-bowl',
    emoji: '🫙',
    name: 'Cottage Cheese Bowl',
    category: 'breakfast',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'High-protein, low-effort bowl. Great for recovery mornings or a light snack between meals.',
    ingredients: ['250g cottage cheese (low fat)', '100g mixed berries', '30g granola', '1 tsp honey'],
    nutrition: { calories: 378, protein: 33, carbs: 43, fats: 7 },
  },
  {
    id: 'smoothie-bowl',
    emoji: '🍇',
    name: 'Protein Smoothie Bowl',
    category: 'breakfast',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Thick, creamy and vibrant. Blends protein powder with frozen fruit and nutritious toppings.',
    ingredients: ['1 scoop vanilla protein powder', '1 frozen banana', '100g frozen mixed berries', '120ml unsweetened almond milk', '30g granola', '1 tbsp chia seeds'],
    nutrition: { calories: 418, protein: 32, carbs: 56, fats: 8 },
  },
  {
    id: 'avocado-egg-toast',
    emoji: '🥑',
    name: 'Avocado Egg Toast',
    category: 'breakfast',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Whole food fats, quality protein, and slow-release carbs — a textbook balanced breakfast.',
    ingredients: ['2 slices sourdough bread', '2 large eggs, poached', '½ ripe avocado', '80g cherry tomatoes, halved', 'Chilli flakes & sea salt'],
    nutrition: { calories: 430, protein: 22, carbs: 36, fats: 22 },
  },
  {
    id: 'banana-protein-pancakes',
    emoji: '🥞',
    name: 'Banana Protein Pancakes',
    category: 'breakfast',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Three ingredients, one pan, ten minutes. Naturally sweet pancakes with a solid protein hit.',
    ingredients: ['1 ripe banana', '2 large eggs', '50g rolled oats', '1 scoop vanilla protein powder', '1 tsp coconut oil (to cook)'],
    nutrition: { calories: 480, protein: 40, carbs: 52, fats: 10 },
  },
  {
    id: 'greek-yogurt-parfait',
    emoji: '🍓',
    name: 'Greek Yogurt Parfait',
    category: 'breakfast',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Layers of creamy yogurt, fresh berries, and crunchy granola. Ready in two minutes.',
    ingredients: ['200g Greek yogurt (2% fat)', '100g mixed berries', '30g granola', '1 tsp honey', '1 tsp chia seeds'],
    nutrition: { calories: 342, protein: 28, carbs: 44, fats: 6 },
  },
  {
    id: 'turkey-breakfast-wrap',
    emoji: '🌯',
    name: 'Turkey Breakfast Wrap',
    category: 'breakfast',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'A hot, filling wrap that travels well. High protein to kickstart muscle protein synthesis.',
    ingredients: ['80g lean turkey breast, sliced', '3 egg whites, scrambled', '50g baby spinach', '½ red capsicum, diced', '1 large whole grain tortilla'],
    nutrition: { calories: 382, protein: 40, carbs: 30, fats: 8 },
  },
  {
    id: 'smoked-salmon-bagel',
    emoji: '🥯',
    name: 'Smoked Salmon Bagel',
    category: 'breakfast',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'A café-quality breakfast at home. Omega-3s, protein, and carbs for sustained morning energy.',
    ingredients: ['1 whole grain bagel', '30g light cream cheese', '80g smoked salmon', '¼ red onion, thinly sliced', '1 tbsp capers', 'Fresh dill'],
    nutrition: { calories: 440, protein: 32, carbs: 52, fats: 12 },
  },
  {
    id: 'chia-pudding',
    emoji: '🫐',
    name: 'Chia Seed Pudding',
    category: 'breakfast',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Make it the night before. Rich in fibre, omega-3s, and slow-release energy.',
    ingredients: ['40g chia seeds', '250ml unsweetened almond milk', '1 tbsp almond butter', '100g mixed berries', '1 tsp maple syrup'],
    nutrition: { calories: 348, protein: 12, carbs: 32, fats: 18 },
  },
  {
    id: 'bircher-muesli',
    emoji: '🍎',
    name: 'Bircher Muesli',
    category: 'breakfast',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Swiss-style soaked oats with apple, yogurt, and walnuts. Creamy, satisfying, and no cooking required.',
    ingredients: ['80g rolled oats', '1 medium apple, grated', '100g Greek yogurt', '150ml almond milk', '30g walnuts, chopped', '½ tsp cinnamon'],
    nutrition: { calories: 518, protein: 18, carbs: 66, fats: 18 },
  },

  // ── LUNCH ──────────────────────────────────────────────────────────────────
  {
    id: 'greek-chicken-bowl',
    emoji: '🥗',
    name: 'Greek Chicken Bowl',
    category: 'lunch',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Lean chicken over rice with fresh cucumber, feta, and olives. A Mediterranean staple for muscle building.',
    ingredients: ['150g grilled chicken breast', '150g cooked jasmine rice', '60g cucumber, diced', '30g feta cheese, crumbled', '10g Kalamata olives', '1 tbsp olive oil & lemon dressing'],
    nutrition: { calories: 548, protein: 52, carbs: 46, fats: 14 },
  },
  {
    id: 'tuna-rice-bowl',
    emoji: '🍚',
    name: 'Tuna Rice Bowl',
    category: 'lunch',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Quick and affordable high-protein bowl. Ideal for meal prep — scales up easily for the week.',
    ingredients: ['150g canned tuna in spring water', '150g cooked jasmine rice', '60g frozen edamame, thawed', '60g cucumber, sliced', '1 tsp sesame oil', '1 tbsp low-sodium soy sauce'],
    nutrition: { calories: 490, protein: 48, carbs: 52, fats: 8 },
  },
  {
    id: 'chicken-caesar-salad',
    emoji: '🥬',
    name: 'Chicken Caesar Salad',
    category: 'lunch',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'The classic, done well. Grilled chicken, crisp romaine, parmesan, and a lighter Caesar dressing.',
    ingredients: ['180g grilled chicken breast', '150g romaine lettuce', '20g parmesan, shaved', '30g sourdough croutons', '2 tbsp light Caesar dressing'],
    nutrition: { calories: 478, protein: 46, carbs: 22, fats: 22 },
  },
  {
    id: 'turkey-avocado-wrap',
    emoji: '🫔',
    name: 'Turkey & Avocado Wrap',
    category: 'lunch',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Portable, filling, and high in healthy fats. Great for on-the-go days or desk lunches.',
    ingredients: ['120g sliced turkey breast', '½ ripe avocado', '50g lettuce leaves', '1 large tomato, sliced', '1 large whole grain tortilla', 'Dijon mustard'],
    nutrition: { calories: 422, protein: 38, carbs: 34, fats: 14 },
  },
  {
    id: 'quinoa-power-bowl',
    emoji: '🌿',
    name: 'Quinoa Power Bowl',
    category: 'lunch',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Plant-forward protein with roasted chickpeas, vegetables, feta, and a creamy tahini drizzle.',
    ingredients: ['150g cooked quinoa', '80g roasted chickpeas', '40g feta cheese', '80g cucumber, diced', '60g roasted capsicum', '2 tbsp tahini dressing'],
    nutrition: { calories: 520, protein: 22, carbs: 68, fats: 16 },
  },
  {
    id: 'chicken-rice-prep',
    emoji: '🍗',
    name: 'Chicken & Rice Meal Prep',
    category: 'lunch',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'The bodybuilder classic. Simple, effective, and highly scalable for meal prep batches.',
    ingredients: ['200g chicken thigh, grilled', '150g cooked jasmine rice', '200g broccoli, steamed', '1 tbsp teriyaki sauce', 'Garlic & ginger'],
    nutrition: { calories: 528, protein: 50, carbs: 52, fats: 10 },
  },
  {
    id: 'tuna-nicoise',
    emoji: '🫒',
    name: 'Tuna Niçoise Salad',
    category: 'lunch',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'A French bistro classic — tuna, eggs, green beans, and potatoes with a light vinaigrette.',
    ingredients: ['150g canned tuna in olive oil', '100g green beans, blanched', '2 hard-boiled eggs', '100g baby potatoes, cooked', '10g Kalamata olives', '2 tbsp red wine vinaigrette'],
    nutrition: { calories: 460, protein: 44, carbs: 28, fats: 16 },
  },
  {
    id: 'smashed-chicken-burger',
    emoji: '🍔',
    name: 'Smashed Chicken Burger',
    category: 'lunch',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Crispy smashed chicken fillet on a whole grain bun with a tangy Greek yogurt sauce.',
    ingredients: ['160g chicken breast, smashed & pan-fried', '1 whole grain burger bun', 'Large romaine leaves', '1 large tomato, sliced', '3 tbsp Greek yogurt & herb sauce'],
    nutrition: { calories: 490, protein: 48, carbs: 40, fats: 12 },
  },
  {
    id: 'couscous-bowl',
    emoji: '🍋',
    name: 'Lemon Herb Couscous Bowl',
    category: 'lunch',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Light yet filling — fluffy couscous with grilled zucchini, feta, fresh mint, and lemon.',
    ingredients: ['150g cooked couscous', '1 zucchini, grilled & sliced', '40g feta cheese', 'Handful of fresh mint', '½ lemon, juiced', '1 tbsp olive oil'],
    nutrition: { calories: 440, protein: 18, carbs: 62, fats: 12 },
  },
  {
    id: 'blt-protein-wrap',
    emoji: '🥓',
    name: 'Protein BLT Wrap',
    category: 'lunch',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'A macro-friendly twist on the BLT. Turkey bacon, creamy cottage cheese, and avocado.',
    ingredients: ['3 strips turkey bacon, cooked', '80g cottage cheese', '50g lettuce', '1 large tomato, sliced', '¼ avocado', '1 large whole grain tortilla'],
    nutrition: { calories: 442, protein: 36, carbs: 38, fats: 14 },
  },

  // ── DINNER ─────────────────────────────────────────────────────────────────
  {
    id: 'salmon-sweet-potato',
    emoji: '🐟',
    name: 'Salmon & Sweet Potato',
    category: 'dinner',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Omega-3 rich salmon with complex carbs and steamed broccoli. Perfect post-training recovery dinner.',
    ingredients: ['180g Atlantic salmon fillet', '200g sweet potato, roasted', '200g broccoli, steamed', '1 tbsp olive oil', 'Lemon, herbs & garlic'],
    nutrition: { calories: 578, protein: 48, carbs: 44, fats: 18 },
  },
  {
    id: 'steak-veg',
    emoji: '🥩',
    name: 'Sirloin & Sweet Potato',
    category: 'dinner',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Classic bodybuilder staple. Lean sirloin delivers creatine and iron alongside complex carbs.',
    ingredients: ['200g sirloin steak, grilled', '200g sweet potato, roasted', '150g asparagus, griddled', '1 tsp olive oil', 'Salt, pepper & rosemary'],
    nutrition: { calories: 553, protein: 56, carbs: 38, fats: 15 },
  },
  {
    id: 'turkey-stir-fry',
    emoji: '🥘',
    name: 'Turkey Stir Fry',
    category: 'dinner',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'Lean ground turkey stir-fried with colourful veg over brown rice. Big flavour, high protein.',
    ingredients: ['200g lean ground turkey', '1 cup mixed vegetables (capsicum, broccoli, snap peas)', '150g cooked brown rice', '1 tbsp sesame oil', '1 tbsp low-sodium soy sauce', 'Garlic & ginger'],
    nutrition: { calories: 518, protein: 45, carbs: 49, fats: 12 },
  },
  {
    id: 'chicken-traybake',
    emoji: '🍖',
    name: 'Herb Chicken Traybake',
    category: 'dinner',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'One tray, minimal washing up. Juicy chicken thighs roasted with colourful Mediterranean vegetables.',
    ingredients: ['200g chicken thighs (skin-on)', '1 red capsicum, chopped', '1 zucchini, chopped', '150g cherry tomatoes', '2 tbsp olive oil', 'Rosemary, thyme & garlic'],
    nutrition: { calories: 490, protein: 44, carbs: 22, fats: 22 },
  },
  {
    id: 'beef-bolognese',
    emoji: '🍝',
    name: 'Lean Beef Bolognese',
    category: 'dinner',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Classic Italian comfort food made lean. Slow-cooked rich tomato sauce over whole wheat pasta.',
    ingredients: ['150g lean beef mince (5% fat)', '120g whole wheat spaghetti', '200g passata', '1 onion, diced', '2 garlic cloves', '20g parmesan, grated'],
    nutrition: { calories: 578, protein: 46, carbs: 58, fats: 14 },
  },
  {
    id: 'teriyaki-salmon-bowl',
    emoji: '🫙',
    name: 'Teriyaki Salmon Bowl',
    category: 'dinner',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Japanese-inspired bowl with glazed salmon, edamame, and brown rice. Ready in 20 minutes.',
    ingredients: ['180g salmon fillet', '150g cooked brown rice', '80g frozen edamame, thawed', '2 tbsp teriyaki sauce', '1 tsp sesame seeds', 'Spring onion'],
    nutrition: { calories: 590, protein: 50, carbs: 58, fats: 16 },
  },
  {
    id: 'chicken-tikka',
    emoji: '🍛',
    name: 'Chicken Tikka Masala',
    category: 'dinner',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'High-protein Indian classic. Rich tomato-based sauce with tender chicken and basmati rice.',
    ingredients: ['200g chicken breast, cubed', '200g tikka masala sauce (low fat)', '150g cooked basmati rice', '½ naan bread', 'Coriander & lime'],
    nutrition: { calories: 620, protein: 52, carbs: 64, fats: 14 },
  },
  {
    id: 'baked-cod',
    emoji: '🐠',
    name: 'Baked Cod & Greens',
    category: 'dinner',
    tag: 'Low Carb',
    tagColor: '#3E4528',
    description: 'Light and elegant. Flaky white fish with green beans and cherry tomatoes baked in lemon oil.',
    ingredients: ['200g cod fillet', '150g green beans', '100g cherry tomatoes', '1 tbsp olive oil', '½ lemon, sliced', '1 tbsp capers', 'Fresh parsley'],
    nutrition: { calories: 312, protein: 42, carbs: 12, fats: 10 },
  },
  {
    id: 'turkey-burger',
    emoji: '🍔',
    name: 'Turkey Burger & Sweet Fries',
    category: 'dinner',
    tag: 'Balanced',
    tagColor: '#576038',
    description: 'A satisfying burger night that hits your macros. Lean turkey patty with sweet potato wedges.',
    ingredients: ['200g lean turkey mince patty', '1 whole grain burger bun', 'Lettuce, tomato & red onion', '200g sweet potato, wedge-cut & roasted', '2 tbsp Greek yogurt sauce'],
    nutrition: { calories: 578, protein: 46, carbs: 58, fats: 14 },
  },
  {
    id: 'pesto-chicken-pasta',
    emoji: '🌿',
    name: 'Pesto Chicken Pasta',
    category: 'dinner',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Fresh basil pesto tossed through whole wheat pasta with tender chicken and burst cherry tomatoes.',
    ingredients: ['180g chicken breast, grilled & sliced', '120g whole wheat penne', '3 tbsp fresh basil pesto', '100g cherry tomatoes', '20g parmesan, shaved'],
    nutrition: { calories: 618, protein: 52, carbs: 60, fats: 18 },
  },
  {
    id: 'lamb-couscous',
    emoji: '🫕',
    name: 'Lamb Cutlets & Couscous',
    category: 'dinner',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Rack of lamb cutlets with herbed couscous and roasted Mediterranean vegetables.',
    ingredients: ['180g lamb cutlets', '150g cooked couscous', '1 zucchini, griddled', '½ red capsicum, roasted', 'Fresh mint & lemon dressing'],
    nutrition: { calories: 590, protein: 50, carbs: 46, fats: 20 },
  },
  {
    id: 'prawn-stir-fry',
    emoji: '🦐',
    name: 'Prawn Stir Fry',
    category: 'dinner',
    tag: 'Low Carb',
    tagColor: '#3E4528',
    description: 'Sweet tiger prawns stir-fried with bok choy, broccoli, and snap peas in a light oyster sauce.',
    ingredients: ['200g tiger prawns, peeled', '100g bok choy, halved', '100g broccoli florets', '80g snap peas', '1 tbsp oyster sauce', '1 tsp sesame oil', '150g cooked jasmine rice'],
    nutrition: { calories: 438, protein: 42, carbs: 52, fats: 6 },
  },

  // ── SNACKS ─────────────────────────────────────────────────────────────────
  {
    id: 'protein-balls',
    emoji: '🍫',
    name: 'Protein Energy Balls',
    category: 'snack',
    tag: 'Snack',
    tagColor: '#3E4528',
    description: 'Batch-prep these for the week. Chewy, chocolatey bites with real protein per serve.',
    ingredients: ['60g rolled oats', '2 tbsp almond butter', '1 tbsp honey', '1 scoop chocolate protein powder', '2 tbsp dark chocolate chips'],
    nutrition: { calories: 280, protein: 18, carbs: 28, fats: 10 },
  },
  {
    id: 'rice-cakes-tuna',
    emoji: '🫙',
    name: 'Rice Cakes & Tuna',
    category: 'snack',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Incredibly simple, extremely high return. Crispy rice cakes topped with tuna and cream cheese.',
    ingredients: ['4 plain rice cakes', '100g canned tuna in spring water', '30g light cream cheese', '½ cucumber, sliced'],
    nutrition: { calories: 218, protein: 24, carbs: 20, fats: 4 },
  },
  {
    id: 'apple-almond-butter',
    emoji: '🍎',
    name: 'Apple & Almond Butter',
    category: 'snack',
    tag: 'Snack',
    tagColor: '#3E4528',
    description: 'The simplest snack that keeps you satisfied. Fibre-rich apple with healthy fat-rich almond butter.',
    ingredients: ['1 large apple, sliced', '2 tbsp almond butter'],
    nutrition: { calories: 238, protein: 6, carbs: 30, fats: 12 },
  },
  {
    id: 'boiled-eggs-hummus',
    emoji: '🥕',
    name: 'Boiled Eggs & Hummus',
    category: 'snack',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'A high-satiety snack packed with protein and healthy fats. Great pre-workout fuel.',
    ingredients: ['2 hard-boiled eggs', '60g hummus', '2 celery sticks', '2 medium carrots, cut to sticks'],
    nutrition: { calories: 290, protein: 18, carbs: 16, fats: 16 },
  },
  {
    id: 'greek-yogurt-berries',
    emoji: '🍓',
    name: 'Greek Yogurt & Berries',
    category: 'snack',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'A light, high-protein snack with antioxidant-rich berries. Perfect mid-afternoon pick-me-up.',
    ingredients: ['200g Greek yogurt (0% fat)', '100g mixed berries', '1 tsp honey'],
    nutrition: { calories: 220, protein: 20, carbs: 28, fats: 2 },
  },
  {
    id: 'cottage-crackers',
    emoji: '🧀',
    name: 'Cottage Cheese & Crackers',
    category: 'snack',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Creamy, satiating, and portable. A macro-friendly snack that hits protein goals easily.',
    ingredients: ['150g cottage cheese (low fat)', '6 whole grain rice crackers', '80g cherry tomatoes'],
    nutrition: { calories: 228, protein: 22, carbs: 22, fats: 5 },
  },
  {
    id: 'edamame',
    emoji: '🫛',
    name: 'Edamame & Sea Salt',
    category: 'snack',
    tag: 'Snack',
    tagColor: '#3E4528',
    description: 'One of the most protein-dense plant snacks available. Simple, clean, and ready in minutes.',
    ingredients: ['200g frozen edamame pods', 'Pinch of sea salt', 'Optional: drizzle of sesame oil'],
    nutrition: { calories: 188, protein: 17, carbs: 14, fats: 8 },
  },
  {
    id: 'protein-shake',
    emoji: '🥛',
    name: 'Banana Protein Shake',
    category: 'snack',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Fast, convenient, and filling. A well-rounded shake when you need nutrition on the move.',
    ingredients: ['1 scoop whey protein (vanilla or chocolate)', '300ml unsweetened almond milk', '1 medium banana', '5 ice cubes'],
    nutrition: { calories: 348, protein: 32, carbs: 42, fats: 5 },
  },
  {
    id: 'celery-peanut-butter',
    emoji: '🥜',
    name: 'Celery & Peanut Butter',
    category: 'snack',
    tag: 'Snack',
    tagColor: '#3E4528',
    description: 'Old-school, underrated, and genuinely satisfying. Crunchy celery boats filled with natural peanut butter.',
    ingredients: ['4 celery sticks', '2 tbsp natural peanut butter', 'Optional: a few raisins'],
    nutrition: { calories: 198, protein: 8, carbs: 12, fats: 14 },
  },
  {
    id: 'dark-choc-almonds',
    emoji: '🍫',
    name: 'Dark Chocolate & Almonds',
    category: 'snack',
    tag: 'Snack',
    tagColor: '#3E4528',
    description: 'A controlled, satisfying treat. Dark chocolate antioxidants with heart-healthy almond fats.',
    ingredients: ['30g dark chocolate (70%+ cacao)', '30g raw almonds'],
    nutrition: { calories: 278, protein: 7, carbs: 18, fats: 20 },
  },

  // ── POST-WORKOUT ───────────────────────────────────────────────────────────
  {
    id: 'choc-recovery-shake',
    emoji: '🍫',
    name: 'Chocolate Recovery Shake',
    category: 'post-workout',
    tag: 'Post-Workout',
    tagColor: '#974400',
    description: 'High-carb, high-protein shake optimised for glycogen replenishment and muscle repair.',
    ingredients: ['1 scoop chocolate whey protein', '1 ripe banana', '300ml low-fat milk', '1 tsp cacao powder', '5 ice cubes'],
    nutrition: { calories: 382, protein: 34, carbs: 48, fats: 6 },
  },
  {
    id: 'classic-rice-chicken',
    emoji: '🍗',
    name: 'Classic Rice & Chicken',
    category: 'post-workout',
    tag: 'Post-Workout',
    tagColor: '#974400',
    description: 'The post-workout gold standard. Simple carbs and complete protein for maximum recovery.',
    ingredients: ['200g chicken breast, grilled', '200g cooked jasmine rice', '1 tbsp low-sodium soy sauce', 'Garlic & spring onion'],
    nutrition: { calories: 588, protein: 56, carbs: 72, fats: 6 },
  },
  {
    id: 'quark-berries',
    emoji: '🫙',
    name: 'Quark & Berry Bowl',
    category: 'post-workout',
    tag: 'High Protein',
    tagColor: '#974400',
    description: 'Quark is a powerhouse dairy protein — near-zero fat with massive protein content. Top with berries and granola.',
    ingredients: ['250g quark (0% fat)', '100g mixed berries', '30g granola', '1 tsp honey'],
    nutrition: { calories: 308, protein: 36, carbs: 34, fats: 2 },
  },
  {
    id: 'sweet-potato-scramble',
    emoji: '🍠',
    name: 'Sweet Potato & Egg Scramble',
    category: 'post-workout',
    tag: 'Post-Workout',
    tagColor: '#974400',
    description: 'Complex carbs from sweet potato paired with complete protein from eggs — a proper recovery meal.',
    ingredients: ['200g sweet potato, cubed & roasted', '3 large eggs, scrambled', '50g baby spinach', '1 tsp olive oil', 'Salt & pepper'],
    nutrition: { calories: 418, protein: 26, carbs: 44, fats: 14 },
  },
  {
    id: 'choc-milk-banana',
    emoji: '🍌',
    name: 'Chocolate Milk & Banana',
    category: 'post-workout',
    tag: 'Post-Workout',
    tagColor: '#974400',
    description: 'Research-backed post-workout nutrition. Chocolate milk outperforms many sports drinks for recovery.',
    ingredients: ['300ml low-fat chocolate milk', '1 large banana', '20g raw almonds'],
    nutrition: { calories: 378, protein: 16, carbs: 60, fats: 10 },
  },
  {
    id: 'rice-egg-bowl',
    emoji: '🥚',
    name: 'Rice & Egg Power Bowl',
    category: 'post-workout',
    tag: 'Post-Workout',
    tagColor: '#974400',
    description: 'Fast-digesting carbs and protein from eggs. Add avocado for good fats and extra calories during bulking.',
    ingredients: ['200g cooked jasmine rice', '3 large eggs, fried', '½ avocado, sliced', '1 tsp sesame oil', '1 tbsp soy sauce', 'Spring onion & sesame seeds'],
    nutrition: { calories: 560, protein: 26, carbs: 64, fats: 22 },
  },
];

// ── Category config ────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'all',          label: 'All',         emoji: '🍽️' },
  { id: 'breakfast',    label: 'Breakfast',   emoji: '🌅' },
  { id: 'lunch',        label: 'Lunch',       emoji: '☀️' },
  { id: 'dinner',       label: 'Dinner',      emoji: '🌙' },
  { id: 'snack',        label: 'Snacks',      emoji: '🍎' },
  { id: 'post-workout', label: 'Post-Workout', emoji: '💪' },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface RecipeLibraryProps {
  activeMeal: MealType;
  selectedDate: string;
  onAdd: (food: FoodItem, amount: number) => void;
}

// ── Macro pill ─────────────────────────────────────────────────────────────────

const MacroPill: React.FC<{ label: string; value: number; unit: string; color: string; bg: string }> = ({ label, value, unit, color, bg }) => (
  <div style={{ flex: 1, background: bg, borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.04)' }}>
    <div style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(0,0,0,0.25)', marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: '1.1rem', fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(0,0,0,0.20)', marginTop: 1 }}>{unit}</div>
  </div>
);

// ── Component ──────────────────────────────────────────────────────────────────

export const RecipeLibrary: React.FC<RecipeLibraryProps> = ({ activeMeal, selectedDate: _selectedDate, onAdd }) => {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

  const filtered = useMemo(() => {
    let list = RECIPES;
    if (activeCategory !== 'all') {
      list = list.filter(r => r.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.tag.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

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
        <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.20)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChefHat size={11} color="rgba(0,0,0,0.25)" />
          Recipe Library
        </div>
        <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'rgba(0,0,0,0.18)' }}>
          {filtered.length} of {RECIPES.length} recipes
        </div>
      </div>

      {/* ── Search bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(0,0,0,0.04)',
        border: `1px solid ${searchActive ? 'rgba(87,96,56,0.30)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 14, padding: '9px 14px',
        marginBottom: 10,
        transition: 'border-color 0.2s ease',
      }}>
        <Search size={14} color="rgba(0,0,0,0.25)" />
        <input
          type="text"
          placeholder="Search recipes…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchActive(true)}
          onBlur={() => setSearchActive(false)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: '0.85rem', fontWeight: 600, color: '#1A1A1A',
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
            <X size={13} color="rgba(0,0,0,0.28)" />
          </button>
        )}
      </div>

      {/* ── Category filter tabs ── */}
      <div style={{
        display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4,
        scrollbarWidth: 'none', marginBottom: 12,
      } as React.CSSProperties}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id;
          const count = cat.id === 'all' ? RECIPES.length : RECIPES.filter(r => r.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px',
                borderRadius: 999,
                background: isActive ? '#576038' : 'rgba(0,0,0,0.04)',
                border: isActive ? 'none' : '1px solid rgba(0,0,0,0.06)',
                color: isActive ? '#FCFFE2' : 'rgba(0,0,0,0.45)',
                fontWeight: 800, fontSize: '0.73rem', cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              <span style={{ fontSize: '0.75rem' }}>{cat.emoji}</span>
              {cat.label}
              <span style={{
                fontSize: '0.58rem', fontWeight: 700,
                color: isActive ? 'rgba(252,255,226,0.65)' : 'rgba(0,0,0,0.22)',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
                borderRadius: 999, padding: '1px 5px',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Recipe grid ── */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '2rem 1rem',
          color: 'rgba(0,0,0,0.20)', border: '1.5px dashed rgba(0,0,0,0.06)',
          borderRadius: 18,
        }}>
          <ChefHat size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>No recipes found</div>
          <div style={{ fontSize: '0.72rem', marginTop: 4 }}>Try a different search or category</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}>
          {filtered.map(recipe => (
            <button
              key={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
              style={{
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
              {/* Emoji header */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(87,96,56,0.09) 0%, rgba(194,203,154,0.07) 100%)',
                padding: '14px 0 10px', textAlign: 'center',
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

                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontSize: '0.58rem', fontWeight: 800,
                  color: recipe.tagColor, background: `${recipe.tagColor}18`,
                  border: `1px solid ${recipe.tagColor}30`,
                  borderRadius: 999, padding: '2px 7px', marginBottom: 8,
                }}>
                  {recipe.tag}
                </div>

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
      )}

      {/* ── Recipe detail bottom sheet ── */}
      <BottomSheet isOpen={!!selectedRecipe} onClose={() => setSelectedRecipe(null)}>
        {selectedRecipe && (
          <div style={{ paddingTop: 4 }}>
            {/* Emoji + name */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>{selectedRecipe.emoji}</div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1A1A1A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
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
            <p style={{ fontSize: '0.82rem', color: 'rgba(26,26,26,0.58)', lineHeight: 1.55, textAlign: 'center', margin: '0 0 20px' }}>
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
            <div style={{ background: 'rgba(87,96,56,0.04)', border: '1px solid rgba(87,96,56,0.10)', borderRadius: 18, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.25)', marginBottom: 10 }}>
                Ingredients (1 serving)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {selectedRecipe.ingredients.map((ingredient, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#576038', flexShrink: 0, marginTop: 5 }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1A1A1A', lineHeight: 1.4 }}>{ingredient}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Add to meal button */}
            <button
              onClick={() => handleAdd(selectedRecipe)}
              style={{
                width: '100%', padding: '1rem',
                background: '#576038', color: '#FCFFE2', border: 'none', borderRadius: 16,
                fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <ChefHat size={16} />
              Add to {activeMeal.charAt(0).toUpperCase() + activeMeal.slice(1)}
            </button>

            <p style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.22)', fontWeight: 600, textAlign: 'center', marginTop: 10 }}>
              Logged as 1 serving · {selectedRecipe.nutrition.calories} kcal · {selectedRecipe.nutrition.protein}g protein
            </p>
          </div>
        )}
      </BottomSheet>
    </>
  );
};
