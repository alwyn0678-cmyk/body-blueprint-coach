import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, ProgressBar, Skeleton } from '../components/SharedUI';
import { Search, Scan, Plus, Clock, Copy, ChevronRight, Camera, Check, X, Loader2, Utensils, Zap, Trash2 } from 'lucide-react';
import { MealType, FoodItem, MealEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FoodSearch } from './FoodSearch';
import { getLocalISOString } from '../utils/dateUtils';
import { SwipeReveal, SlideOver } from '../components/MotionUI';

export const LogFood: React.FC = () => {
  const { state, updateDailyLog, showToast, removeFoodEntry } = useApp();
  const [activeMeal, setActiveMeal] = useState<MealType>('lunch');
  const [showSearch, setShowSearch] = useState(false);
  const [isAIScanning, setIsAIScanning] = useState(false);
  const [aiResult, setAIResult] = useState<FoodItem | null>(null);

  const todayDate = getLocalISOString();
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
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      nutrition: food,
      timestamp: new Date().toISOString()
    };

    updateDailyLog(todayDate, {
      meals: {
        ...todayLog.meals,
        [activeMeal]: [...todayLog.meals[activeMeal], newEntry]
      }
    });
    
    showToast(`${food.name} added to ${activeMeal}!`, "success");
    setShowSearch(false);
  };

  const handleAIScan = () => {
    setIsAIScanning(true);
    setAIResult(null);
    // Simulate Vision API
    setTimeout(() => {
      const result: FoodItem = {
        id: 'ai-' + uuidv4(),
        name: 'Grilled Salmon with Quinoa',
        brand: 'Claude AI Vision',
        servingSize: 1,
        servingUnit: 'portion',
        calories: 520,
        protein: 42,
        carbs: 35,
        fats: 24
      };
      setAIResult(result);
      setIsAIScanning(false);
      showToast("AI analysis complete!", "success");
    }, 2500);
  };

  const confirmAIResult = () => {
    if (aiResult) {
      handleAddFood(aiResult, 1);
      setAIResult(null);
    }
  };

  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  const toggleMealExpansion = (mealType: string) => {
    setExpandedMeals(prev => ({ ...prev, [mealType]: !prev[mealType] }));
  };

  const getMealIcon = (meal: string) => {
    switch(meal) {
      case 'breakfast': return '🍳';
      case 'lunch': return '🥗';
      case 'dinner': return '🍽️';
      case 'snacks': return '🍎';
      default: return '🍴';
    }
  };

  const renderMealSummary = (mealType: MealType) => {
    const mealItems = todayLog.meals[mealType] || [];
    const mealCals = mealItems.reduce((sum, item) => sum + (item.nutrition.calories * item.amount), 0);
    const mealProtein = mealItems.reduce((sum, item) => sum + (item.nutrition.protein * item.amount), 0);
    const mealCarbs = mealItems.reduce((sum, item) => sum + (item.nutrition.carbs * item.amount), 0);
    const mealFats = mealItems.reduce((sum, item) => sum + (item.nutrition.fats * item.amount), 0);
    
    const isExpanded = expandedMeals[mealType] || false;

    return (
      <Card 
        key={mealType}
        className="flex-col mb-4 overflow-hidden"
        style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Card Header (Always Visible) */}
        <div 
          className="flex-row justify-between align-center p-4 cursor-pointer"
          onClick={() => toggleMealExpansion(mealType)}
          style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
        >
          <div className="flex-row gap-4 align-center w-full">
            <div style={{ fontSize: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '12px' }}>
              {getMealIcon(mealType)}
            </div>
            
            <div className="flex-col flex-1 pl-2">
              <div className="flex-row justify-between align-center">
                <h3 className="text-body font-bold" style={{ textTransform: 'capitalize', fontSize: '1.1rem' }}>
                  {mealType}
                </h3>
                <div className="flex-row align-center gap-1">
                  <span className="text-body font-bold" style={{ color: 'var(--text-main)' }}>{Math.round(mealCals)}</span>
                  <span className="text-caption text-muted">kcal</span>
                </div>
              </div>
              
              {/* Macro Mini-Bars */}
              <div className="flex-row gap-3 mt-2 w-full">
                <div className="flex-col flex-1 gap-1">
                  <div className="progress-track" style={{ height: '4px' }}>
                    <div className="progress-fill" style={{ width: `${Math.min(100, (mealProtein / (state.user?.targets.protein || 150)) * 100)}%`, backgroundColor: 'var(--color-protein)' }} />
                  </div>
                  <span className="text-caption" style={{ fontSize: '0.65rem' }}>{Math.round(mealProtein)}g P</span>
                </div>
                <div className="flex-col flex-1 gap-1">
                  <div className="progress-track" style={{ height: '4px' }}>
                    <div className="progress-fill" style={{ width: `${Math.min(100, (mealCarbs / (state.user?.targets.carbs || 200)) * 100)}%`, backgroundColor: 'var(--color-carbs)' }} />
                  </div>
                  <span className="text-caption" style={{ fontSize: '0.65rem' }}>{Math.round(mealCarbs)}g C</span>
                </div>
                <div className="flex-col flex-1 gap-1">
                  <div className="progress-track" style={{ height: '4px' }}>
                    <div className="progress-fill" style={{ width: `${Math.min(100, (mealFats / (state.user?.targets.fats || 65)) * 100)}%`, backgroundColor: 'var(--color-fats)' }} />
                  </div>
                  <span className="text-caption" style={{ fontSize: '0.65rem' }}>{Math.round(mealFats)}g F</span>
                </div>
              </div>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
          </div>
        </div>
        
        {/* Expanded Content View */}
        <div style={{ 
          height: isExpanded ? 'auto' : '0px', 
          overflow: 'hidden', 
          opacity: isExpanded ? 1 : 0, 
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderTop: isExpanded ? '1px solid var(--border-color)' : 'none',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          <div className="p-3">
            {mealItems.length > 0 ? (
              <div className="flex-col gap-2 mb-3">
                {mealItems.map(item => (
                  <SwipeReveal 
                    key={item.id} 
                    onDelete={() => {
                      removeFoodEntry(todayDate, mealType, item.id);
                      showToast(`${item.foodName} removed.`, "info");
                    }}
                  >
                    <div className="flex-row justify-between align-center py-2 px-3 card-glass" style={{ marginBottom: '4px' }}>
                      <div className="flex-col">
                        <span className="text-body font-semibold">{item.foodName}</span>
                        <span className="text-caption text-light" style={{ fontSize: '0.75rem' }}>{Math.round(item.amount * item.servingSize)}{item.servingUnit}</span>
                      </div>
                      <div className="flex-col align-end text-right">
                        <span className="text-body font-bold">{Math.round(item.nutrition.calories * item.amount)}</span>
                        <span className="text-caption text-light" style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: 'var(--color-protein)' }}>{Math.round(item.nutrition.protein * item.amount)}P</span>{' '}
                          <span style={{ color: 'var(--color-carbs)' }}>{Math.round(item.nutrition.carbs * item.amount)}C</span>{' '}
                          <span style={{ color: 'var(--color-fats)' }}>{Math.round(item.nutrition.fats * item.amount)}F</span>
                        </span>
                      </div>
                    </div>
                  </SwipeReveal>
                ))}
              </div>
            ) : (
               <div className="py-4 text-center text-caption text-light mb-2">No items logged.</div>
            )}

            {/* Quick Action Buttons */}
            <div className="flex-row gap-2 mt-2 px-1 pb-1">
              <button 
                className="flex-row align-center justify-center gap-2"
                onClick={(e) => { e.stopPropagation(); setActiveMeal(mealType); setShowSearch(true); }}
                style={{ padding: '0.75rem', color: 'var(--text-inverse)', background: 'var(--accent-primary)', border: 'none', borderRadius: 'var(--radius-sm)', flex: 1, fontWeight: 600, fontSize: '0.9rem' }}
              >
                <Plus size={16} /> Quick Add
              </button>
              <button 
                className="flex-row align-center justify-center gap-2"
                onClick={(e) => { e.stopPropagation(); setActiveMeal(mealType); handleAIScan(); }}
                style={{ padding: '0.75rem', color: 'var(--text-main)', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', flex: 1, fontWeight: 600, fontSize: '0.9rem' }}
              >
                <Scan size={16} /> Barcode / Scan
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex-col gap-4 p-4 animate-fade-in" style={{ paddingBottom: '2rem', backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div>
        <h1 className="text-h2">Daily Diary</h1>
        <p className="text-subtitle">Your comprehensive food log.</p>
      </div>

      <div className="flex-col mt-2">
        {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map(m => renderMealSummary(m))}
      </div>

      {/* AI Scanning Modal Overlay */}
      {(isAIScanning || aiResult) && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, backgroundColor: 'rgba(250, 249, 246, 0.98)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
          <div className="flex-col gap-6 w-full align-center" style={{ marginTop: '20vh' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              <Camera size={40} color="var(--accent-primary)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
              {isAIScanning && <Loader2 size={130} color="var(--accent-primary)" className="animate-spin" style={{ position: 'absolute', top: '-5px', left: '-5px', opacity: 0.3 }} />}
            </div>
            
            <div className="text-center">
              <h2 className="text-h2">{isAIScanning ? 'Analyzing Meal...' : 'Analysis Complete'}</h2>
              <p className="text-subtitle">{isAIScanning ? "Claude Vision is identifying ingredients and estimating macros." : "Is this what you ate?"}</p>
            </div>

            {aiResult && (
              <Card className="w-full flex-col gap-4 p-4 animate-slide-up" style={{ border: '2px solid var(--accent-primary)' }}>
                <div>
                  <h3 className="text-h3">{aiResult.name}</h3>
                  <p className="text-caption">{aiResult.brand}</p>
                </div>
                <div className="flex-row justify-between">
                  <div className="flex-col">
                    <span className="text-h3">{aiResult.calories}</span>
                    <span className="text-caption">Calories</span>
                  </div>
                  <div className="flex-col">
                    <span className="text-h3" style={{ color: 'var(--color-protein)' }}>{aiResult.protein}g</span>
                    <span className="text-caption">Protein</span>
                  </div>
                  <div className="flex-col">
                    <span className="text-h3" style={{ color: 'var(--color-carbs)' }}>{aiResult.carbs}g</span>
                    <span className="text-caption">Carbs</span>
                  </div>
                  <div className="flex-col">
                    <span className="text-h3" style={{ color: 'var(--color-fats)' }}>{aiResult.fats}g</span>
                    <span className="text-caption">Fats</span>
                  </div>
                </div>
                <div className="flex-row gap-3 mt-2">
                  <button className="flex-row align-center justify-center gap-2" onClick={() => setAIResult(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'white' }}>
                    <X size={18} /> Cancel
                  </button>
                  <button className="flex-row align-center justify-center gap-2 btn-primary" onClick={confirmAIResult} style={{ flex: 2, padding: '0.75rem' }}>
                    <Check size={18} /> Add to Log
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Full-Screen Modals */}
      <SlideOver isOpen={showSearch} onClose={() => setShowSearch(false)}>
         {showSearch && <FoodSearch mealType={activeMeal} onAdd={handleAddFood} onCancel={() => setShowSearch(false)} />}
      </SlideOver>

    </div>
  );
};

export default LogFood;
