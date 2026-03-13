import React, { useState, useEffect } from 'react';
import { FoodItem, MealType } from '../types';
import { ArrowLeft, Search, Scan, Plus, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface FoodSearchProps {
  mealType: MealType;
  onAdd: (food: FoodItem, amount: number) => void;
  onCancel: () => void;
}

// Mock Database for quick search
const mockDatabase: FoodItem[] = [
  { id: 'f1', name: 'Chicken Breast (Raw)', servingSize: 100, servingUnit: 'g', calories: 120, protein: 26, carbs: 0, fats: 1.5 },
  { id: 'f2', name: 'Jasmine Rice (Cooked)', servingSize: 100, servingUnit: 'g', calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
  { id: 'f3', name: 'Olive Oil', servingSize: 15, servingUnit: 'ml', calories: 120, protein: 0, carbs: 0, fats: 14 },
  { id: 'f4', name: 'Whey Protein Isolate', servingSize: 30, servingUnit: 'g', calories: 110, protein: 25, carbs: 1, fats: 0.5 },
  { id: 'f5', name: 'Avocado', servingSize: 50, servingUnit: 'g', calories: 80, protein: 1, carbs: 4, fats: 7.5 },
];

export const FoodSearch: React.FC<FoodSearchProps> = ({ mealType, onAdd, onCancel }) => {
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState(1);

  useEffect(() => {
    if (query.trim() === '') {
      // Show recents/custom when empty
      setResults([...state.customFoods, ...mockDatabase].slice(0, 5));
    } else {
      const allFoods = [...state.customFoods, ...mockDatabase];
      const filtered = allFoods.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
      setResults(filtered);
    }
  }, [query, state.customFoods]);

  const handleScanMock = async () => {
    setIsScanning(true);
    // Simulate API delay to OpenFoodFacts
    setTimeout(() => {
      // Mock result as if we hit OpenFoodFacts API successfully
      const scannedItem: FoodItem = {
        id: 'opf-' + Date.now(),
        name: 'Oikos Triple Zero Greek Yogurt',
        brand: 'Dannon',
        barcode: '036632027552',
        servingSize: 150,
        servingUnit: 'g',
        calories: 90,
        protein: 15,
        carbs: 7,
        fats: 0
      };
      setSelectedFood(scannedItem);
      setIsScanning(false);
    }, 1500);
  };

  if (selectedFood) {
    return (
      <div className="flex-col gap-4 p-4 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', minHeight: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        <button onClick={() => setSelectedFood(null)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', width: 'fit-content' }}>
          <ArrowLeft size={20} /> Back
        </button>

        <div>
          <h2 className="text-h2" style={{ color: 'var(--text-main)' }}>{selectedFood.name}</h2>
          {selectedFood.brand && <p className="text-subtitle" style={{ color: 'var(--text-muted)' }}>{selectedFood.brand}</p>}
        </div>

        <div className="card flex-col gap-3" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
          <div className="flex-row justify-between text-body font-semibold" style={{ color: 'var(--text-main)' }}>
            <span>Per {selectedFood.servingSize}{selectedFood.servingUnit}</span>
            <span style={{ color: 'var(--accent-primary)' }}>{selectedFood.calories} kcal</span>
          </div>
          <div className="flex-row justify-between text-caption border-t pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--color-protein)' }}>Protein: {selectedFood.protein}g</span>
            <span style={{ color: 'var(--color-carbs)' }}>Carbs: {selectedFood.carbs}g</span>
            <span style={{ color: 'var(--color-fats)' }}>Fats: {selectedFood.fats}g</span>
          </div>
        </div>

        <div className="flex-col gap-2 mt-4">
          <label className="text-body font-medium">Number of Servings</label>
          <input 
            type="number" 
            min="0.1" 
            step="0.1" 
            value={amount} 
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '1.1rem' }}
          />
        </div>

        <div className="flex-col gap-2 mt-2">
          <span className="text-subtitle">Total for this entry:</span>
          <div className="flex-row justify-between font-semibold">
            <span>Calories:</span>
            <span>{Math.round(selectedFood.calories * amount)}</span>
          </div>
        </div>

        <button 
          onClick={() => onAdd(selectedFood, amount)}
          style={{ 
            marginTop: 'auto',
            padding: '1rem', 
            backgroundColor: 'var(--text-main)', 
            color: 'white', 
            borderRadius: 'var(--radius-sm)', 
            border: 'none', 
            fontWeight: 600,
            fontSize: '1.1rem'
          }}
        >
          Add to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-col p-4 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', minHeight: '100vh', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      {/* Search Header */}
      <div className="flex-row gap-3 mb-4" style={{ alignItems: 'center' }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search for food..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem 1rem 0.75rem 2.5rem', 
              borderRadius: 'var(--radius-full)', 
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-main)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
            }}
            autoFocus
          />
        </div>
        <button 
          onClick={handleScanMock}
          style={{ background: 'none', border: 'none', color: 'var(--text-main)' }}
          title="Scan Barcode (Mock)"
        >
          {isScanning ? <span className="text-caption">Wait...</span> : <Scan size={24} />}
        </button>
      </div>

      {isScanning && (
        <div className="card p-4 text-center mt-2" style={{ backgroundColor: 'var(--accent-beige)', border: 'none' }}>
          <Info size={24} color="var(--accent-terracotta)" style={{ margin: '0 auto 0.5rem' }} />
          <p className="text-body font-medium" style={{ color: 'var(--text-main)' }}>
            Mocking OpenFoodFacts API request...
          </p>
        </div>
      )}

      {/* Results List */}
      <div className="flex-col" style={{ flex: 1, overflowY: 'auto' }}>
        <h3 className="text-subtitle mb-2" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{query ? 'Results' : 'Recent Foods'}</h3>
        
        {results.map(f => (
          <div 
            key={f.id} 
            onClick={() => { setSelectedFood(f); setAmount(1); }}
            className="flex-row justify-between p-3 cursor-pointer animate-fade-in"
            style={{ 
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '0.5rem',
              border: '1px solid var(--border-color)'
            }}
          >
            <div className="flex-col gap-1">
              <span className="text-body font-semibold" style={{ color: 'var(--text-main)' }}>{f.name}</span>
              <span className="text-caption" style={{ color: 'var(--text-light)' }}>{f.servingSize}{f.servingUnit} • <span style={{ color: 'var(--accent-primary)' }}>{f.calories} kcal</span></span>
            </div>
            <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255, 90, 54, 0.1)' }}>
              <Plus size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
