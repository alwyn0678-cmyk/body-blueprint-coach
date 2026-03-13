import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, ProgressBar } from '../components/SharedUI';
import { Search, Scan, Plus, Clock, Copy, ChevronRight } from 'lucide-react';
import { MealType, FoodItem, MealEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FoodSearch } from './FoodSearch';

export const LogFood: React.FC = () => {
  const { state, updateDailyLog } = useApp();
  const [activeMeal, setActiveMeal] = useState<MealType>('lunch');
  const [showSearch, setShowSearch] = useState(false);

  const todayDate = new Date().toISOString().split('T')[0];
  const todayLog = state.logs[todayDate] || {
    id: todayDate, date: todayDate, steps: 0, waterGlasses: 0, 
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    adherenceScore: 0
  };

  const handleAddFood = (food: FoodItem, amount: number) => {
    const newEntry: MealEntry = {
      id: uuidv4(),
      foodId: food.id,
      foodName: food.name,
      amount: amount,
      nutrition: {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats
      },
      timestamp: new Date().toISOString()
    };

    updateDailyLog(todayDate, {
      meals: {
        ...todayLog.meals,
        [activeMeal]: [...todayLog.meals[activeMeal], newEntry]
      }
    });
    
    setShowSearch(false);
  };

  const renderMealSummary = (mealType: MealType) => {
    const mealItems = todayLog.meals[mealType] || [];
    const mealCals = mealItems.reduce((sum, item) => sum + (item.nutrition.calories * item.amount), 0);
    const mealProtein = mealItems.reduce((sum, item) => sum + (item.nutrition.protein * item.amount), 0);
    
    return (
      <Card className="flex-col gap-2 p-3 mb-3 cursor-pointer" 
            style={{ 
              borderColor: activeMeal === mealType ? 'var(--accent-teal)' : 'var(--border-color)',
              boxShadow: activeMeal === mealType ? '0 0 0 1px var(--accent-teal)' : 'var(--shadow-sm)'
            }}
            onClick={() => setActiveMeal(mealType)} // This is safe, React wrapper doesn't pass DOM event
      >
        <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
          <span className="text-h3 capitalize" style={{ fontSize: '1.1rem' }}>{mealType}</span>
          <span className="text-body font-semibold">{Math.round(mealCals)} kcal</span>
        </div>
        
        {mealItems.length > 0 ? (
          <div className="flex-col gap-1 mt-2 mb-2">
            {mealItems.map(item => (
              <div key={item.id} className="flex-row justify-between text-body" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>{item.amount}x {item.foodName}</span>
                <span>{Math.round(item.nutrition.calories * item.amount)} kcal</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-subtitle" style={{ fontStyle: 'italic', margin: '0.5rem 0' }}>No items logged yet</span>
        )}

        <div className="flex-row justify-between mt-1 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
          <span className="text-caption" style={{ color: 'var(--color-protein)' }}>Protein: {Math.round(mealProtein)}g</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveMeal(mealType);
              setShowSearch(true);
            }}
            className="text-caption flex-row gap-1"
            style={{ color: 'var(--accent-terracotta)', border: 'none', background: 'none' }}
          >
            <Plus size={14} /> Add Food
          </button>
        </div>
      </Card>
    );
  };

  if (showSearch) {
    return <FoodSearch mealType={activeMeal} onAdd={handleAddFood} onCancel={() => setShowSearch(false)} />;
  }

  return (
    <div className="flex-col gap-4 p-4 animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div>
        <h1 className="text-h2">Log Food</h1>
        <p className="text-subtitle">What are you eating today?</p>
      </div>

      <div className="flex-row gap-2">
        <button 
          className="flex-row gap-2 justify-center p-3" 
          style={{ flex: 1, backgroundColor: 'var(--accent-teal)', color: 'white', borderRadius: 'var(--radius-sm)', border: 'none', fontWeight: 500 }}
          onClick={() => setShowSearch(true)}
        >
          <Search size={18} /> Search
        </button>
        <button 
          className="flex-row gap-2 justify-center p-3" 
          style={{ flex: 1, backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: 500 }}
          onClick={() => setShowSearch(true)}
        >
          <Scan size={18} /> Scan Barcode
        </button>
      </div>

      <div className="flex-col mt-2">
        {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(meal => (
          <div key={meal}>
            {renderMealSummary(meal)}
          </div>
        ))}
      </div>
    </div>
  );
};
