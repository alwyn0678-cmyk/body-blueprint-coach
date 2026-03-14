import { FoodItem } from '../types';

export const localFoodDatabase: FoodItem[] = [
  // --- FRUITS ---
  { id: 'db_f1', name: 'Apple', brand: 'Generic', servingSize: 182, servingUnit: 'g', calories: 95, protein: 0.5, carbs: 25, fats: 0.3 },
  { id: 'db_f2', name: 'Banana', brand: 'Generic', servingSize: 118, servingUnit: 'g', calories: 105, protein: 1.3, carbs: 27, fats: 0.4 },
  { id: 'db_f3', name: 'Blueberries', brand: 'Generic', servingSize: 148, servingUnit: 'g', calories: 84, protein: 1.1, carbs: 21, fats: 0.5 },
  { id: 'db_f4', name: 'Strawberries', brand: 'Generic', servingSize: 152, servingUnit: 'g', calories: 49, protein: 1, carbs: 12, fats: 0.5 },
  { id: 'db_f5', name: 'Orange', brand: 'Generic', servingSize: 131, servingUnit: 'g', calories: 62, protein: 1.2, carbs: 15, fats: 0.2 },
  { id: 'db_f6', name: 'Watermelon', brand: 'Generic', servingSize: 280, servingUnit: 'g', calories: 85, protein: 1.7, carbs: 21, fats: 0.4 },
  { id: 'db_f7', name: 'Grapes', brand: 'Generic', servingSize: 151, servingUnit: 'g', calories: 104, protein: 1.1, carbs: 27, fats: 0.2 },
  { id: 'db_f8', name: 'Pineapple', brand: 'Generic', servingSize: 165, servingUnit: 'g', calories: 82, protein: 0.9, carbs: 22, fats: 0.2 },

  // --- VEGETABLES ---
  { id: 'db_v1', name: 'Broccoli (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 34, protein: 2.8, carbs: 6.6, fats: 0.4 },
  { id: 'db_v2', name: 'Spinach (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4 },
  { id: 'db_v3', name: 'Carrots (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 41, protein: 0.9, carbs: 9.6, fats: 0.2 },
  { id: 'db_v4', name: 'Tomato (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2 },
  { id: 'db_v5', name: 'Cucumber (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 15, protein: 0.7, carbs: 3.6, fats: 0.1 },
  { id: 'db_v6', name: 'Bell Pepper (Red)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 31, protein: 1, carbs: 6, fats: 0.3 },
  { id: 'db_v7', name: 'Onion (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 40, protein: 1.1, carbs: 9.3, fats: 0.1 },
  { id: 'db_v8', name: 'Asparagus (Cooked)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 22, protein: 2.4, carbs: 4.1, fats: 0.2 },
  { id: 'db_v9', name: 'Cauliflower (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 25, protein: 1.9, carbs: 5, fats: 0.3 },
  { id: 'db_v10', name: 'Zucchini (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 17, protein: 1.2, carbs: 3.1, fats: 0.3 },

  // --- PROTEINS (MEAT, POULTRY, FISH) ---
  { id: 'db_p1', name: 'Chicken Breast (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 165, protein: 31, carbs: 0, fats: 3.6 },
  { id: 'db_p2', name: 'Chicken Thigh (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 177, protein: 20, carbs: 0, fats: 10 },
  { id: 'db_p3', name: 'Chicken Nuggets', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 296, protein: 15, carbs: 14, fats: 20 },
  { id: 'db_p4', name: 'Chicken Salad', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 226, protein: 14, carbs: 3, fats: 17 },
  { id: 'db_p5', name: 'Ground Beef (90% Lean, Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 176, protein: 20, carbs: 0, fats: 10 },
  { id: 'db_p6', name: 'Steak (Sirloin, Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 244, protein: 27, carbs: 0, fats: 15 },
  { id: 'db_p7', name: 'Pork Chop (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 231, protein: 24, carbs: 0, fats: 14 },
  { id: 'db_p8', name: 'Turkey Breast (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 104, protein: 24, carbs: 0, fats: 1.5 },
  { id: 'db_p9', name: 'Salmon (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 208, protein: 20, carbs: 0, fats: 13 },
  { id: 'db_p10', name: 'Tuna (Canned in Water)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 90, protein: 20, carbs: 0, fats: 1 },
  { id: 'db_p11', name: 'Tilapia (Raw)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 96, protein: 20, carbs: 0, fats: 1.7 },
  { id: 'db_p12', name: 'Shrimp (Cooked)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 99, protein: 24, carbs: 0.2, fats: 0.3 },

  // --- DAIRY & EGGS ---
  { id: 'db_d1', name: 'Egg (Whole, Large)', brand: 'Generic', servingSize: 50, servingUnit: 'g', calories: 72, protein: 6, carbs: 0.4, fats: 4.8 },
  { id: 'db_d2', name: 'Egg Whites (Liquid)', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 54, protein: 11, carbs: 0.7, fats: 0.2 },
  { id: 'db_d3', name: 'Milk (Whole, 3.25%)', brand: 'Generic', servingSize: 240, servingUnit: 'ml', calories: 149, protein: 8, carbs: 12, fats: 8 },
  { id: 'db_d4', name: 'Milk (Skim)', brand: 'Generic', servingSize: 240, servingUnit: 'ml', calories: 83, protein: 8, carbs: 12, fats: 0.2 },
  { id: 'db_d5', name: 'Greek Yogurt (Non-Fat, Plain)', brand: 'Generic', servingSize: 170, servingUnit: 'g', calories: 100, protein: 18, carbs: 6, fats: 0 },
  { id: 'db_d6', name: 'Cheddar Cheese', brand: 'Generic', servingSize: 28, servingUnit: 'g', calories: 114, protein: 7, carbs: 0.4, fats: 9.4 },
  { id: 'db_d7', name: 'Cottage Cheese (2%)', brand: 'Generic', servingSize: 113, servingUnit: 'g', calories: 92, protein: 12, carbs: 5, fats: 2.5 },
  { id: 'db_d8', name: 'Butter', brand: 'Generic', servingSize: 14, servingUnit: 'g', calories: 102, protein: 0.1, carbs: 0, fats: 11.5 },

  // --- GRAINS, PASTA & CARBS ---
  { id: 'db_c1', name: 'Rice (White, Cooked)', brand: 'Generic', servingSize: 158, servingUnit: 'g', calories: 205, protein: 4.3, carbs: 45, fats: 0.4 },
  { id: 'db_c2', name: 'Rice (Brown, Cooked)', brand: 'Generic', servingSize: 195, servingUnit: 'g', calories: 216, protein: 5, carbs: 45, fats: 1.8 },
  { id: 'db_c3', name: 'Oats (Rolled, Dry)', brand: 'Generic', servingSize: 40, servingUnit: 'g', calories: 152, protein: 5, carbs: 27, fats: 3 },
  { id: 'db_c4', name: 'Quinoa (Cooked)', brand: 'Generic', servingSize: 185, servingUnit: 'g', calories: 222, protein: 8.1, carbs: 39, fats: 3.6 },
  { id: 'db_c5', name: 'Pasta (Cooked, Regular)', brand: 'Generic', servingSize: 140, servingUnit: 'g', calories: 220, protein: 8, carbs: 43, fats: 1.3 },
  { id: 'db_c6', name: 'Bread (Whole Wheat)', brand: 'Generic', servingSize: 28, servingUnit: 'g', calories: 69, protein: 3.6, carbs: 11.6, fats: 1.1 },
  { id: 'db_c7', name: 'Bread (White)', brand: 'Generic', servingSize: 25, servingUnit: 'g', calories: 67, protein: 2.1, carbs: 13, fats: 0.8 },
  { id: 'db_c8', name: 'Sweet Potato (Baked)', brand: 'Generic', servingSize: 114, servingUnit: 'g', calories: 103, protein: 2.3, carbs: 24, fats: 0.2 },
  { id: 'db_c9', name: 'Potato (White, Baked)', brand: 'Generic', servingSize: 173, servingUnit: 'g', calories: 161, protein: 4.3, carbs: 37, fats: 0.2 },
  
  // --- NUTS, SEEDS & OILS ---
  { id: 'db_n1', name: 'Almonds', brand: 'Generic', servingSize: 28, servingUnit: 'g', calories: 164, protein: 6, carbs: 6, fats: 14 },
  { id: 'db_n2', name: 'Walnuts', brand: 'Generic', servingSize: 28, servingUnit: 'g', calories: 185, protein: 4.3, carbs: 3.9, fats: 18.5 },
  { id: 'db_n3', name: 'Peanut Butter', brand: 'Generic', servingSize: 32, servingUnit: 'g', calories: 188, protein: 8, carbs: 6, fats: 16 },
  { id: 'db_n4', name: 'Olive Oil', brand: 'Generic', servingSize: 14, servingUnit: 'g', calories: 119, protein: 0, carbs: 0, fats: 13.5 },
  { id: 'db_n5', name: 'Avocado', brand: 'Generic', servingSize: 100, servingUnit: 'g', calories: 160, protein: 2, carbs: 8.5, fats: 14.7 },
  { id: 'db_n6', name: 'Chia Seeds', brand: 'Generic', servingSize: 28, servingUnit: 'g', calories: 138, protein: 4.7, carbs: 12, fats: 8.7 },

  // --- BRANDED / PACKAGED ---
  { id: 'db_b1', name: 'Whey Protein Powder', brand: 'Optimum Nutrition', servingSize: 31, servingUnit: 'g', calories: 120, protein: 24, carbs: 3, fats: 1 },
  { id: 'db_b2', name: 'Protein Bar', brand: 'Quest', servingSize: 60, servingUnit: 'g', calories: 200, protein: 21, carbs: 22, fats: 7 },
  { id: 'db_b3', name: 'Energy Drink', brand: 'Monster Zero Ultra', servingSize: 473, servingUnit: 'ml', calories: 10, protein: 0, carbs: 2, fats: 0 },
  { id: 'db_b4', name: 'Almond Milk (Unsweetened)', brand: 'Almond Breeze', servingSize: 240, servingUnit: 'ml', calories: 30, protein: 1, carbs: 1, fats: 2.5 },
  { id: 'db_b5', name: 'Rice Cakes (Lightly Salted)', brand: 'Quaker', servingSize: 9, servingUnit: 'g', calories: 35, protein: 1, carbs: 7, fats: 0 },
  
  // --- RESTAURANT FAST FOOD ---
  { id: 'db_r1', name: 'Big Mac', brand: 'McDonalds', servingSize: 219, servingUnit: 'g', calories: 550, protein: 25, carbs: 45, fats: 30 },
  { id: 'db_r2', name: 'French Fries (Medium)', brand: 'McDonalds', servingSize: 111, servingUnit: 'g', calories: 320, protein: 5, carbs: 43, fats: 15 },
  { id: 'db_r3', name: 'Chicken Sandwich', brand: 'Chick-fil-A', servingSize: 165, servingUnit: 'g', calories: 420, protein: 28, carbs: 41, fats: 18 },
  { id: 'db_r4', name: 'Burrito Bowl (Chicken)', brand: 'Chipotle', servingSize: 400, servingUnit: 'g', calories: 630, protein: 40, carbs: 65, fats: 21 },
  { id: 'db_r5', name: 'Crunchwrap Supreme', brand: 'Taco Bell', servingSize: 255, servingUnit: 'g', calories: 530, protein: 16, carbs: 71, fats: 21 },
  // --- SNACKS & OTHERS ---
  { id: 'db_s1', name: 'Greek Yogurt (Honey)', brand: 'Fage', servingSize: 150, servingUnit: 'g', calories: 160, protein: 13, carbs: 17, fats: 4.5 },
  { id: 'db_s2', name: 'Protein Cookie', brand: 'Lenny & Larry', servingSize: 113, servingUnit: 'g', calories: 420, protein: 16, carbs: 55, fats: 14 },
  { id: 'db_s3', name: 'Almonds (Salted)', brand: 'Blue Diamond', servingSize: 28, servingUnit: 'g', calories: 170, protein: 6, carbs: 5, fats: 15 },
  { id: 'db_s4', name: 'Beef Jerky', brand: 'Jack Links', servingSize: 28, servingUnit: 'g', calories: 80, protein: 12, carbs: 3, fats: 1 },
  { id: 'db_s5', name: 'String Cheese', brand: 'Sargento', servingSize: 21, servingUnit: 'g', calories: 80, protein: 8, carbs: 0, fats: 6 }
];
