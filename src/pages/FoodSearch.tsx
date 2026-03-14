import React, { useState, useEffect } from 'react';
import { FoodItem, MealType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Search, ScanLine, Plus, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { localFoodDatabase } from '../utils/foodDatabase';

interface FoodSearchProps {
  mealType: MealType;
  onAdd: (food: FoodItem, amount: number) => void;
  onCancel: () => void;
}

export const FoodSearch: React.FC<FoodSearchProps> = ({ mealType, onAdd, onCancel }) => {
  const { state, addCustomFood, showToast } = useApp() as any;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  
  // Measurement State
  const [measurementValue, setMeasurementValue] = useState<string>('1');
  const [measurementUnit, setMeasurementUnit] = useState<string>('serving');

  useEffect(() => {
    if (selectedFood) {
      setMeasurementValue(selectedFood.servingSize.toString());
      setMeasurementUnit(selectedFood.servingUnit || 'g');
    }
  }, [selectedFood]);

  const getCalculatedMultiplier = () => {
    if (!selectedFood) return 0;
    const val = parseFloat(measurementValue) || 0;
    if (val === 0) return 0;

    const baseUnit = (selectedFood.servingUnit || 'g').toLowerCase();
    const inputUnit = measurementUnit.toLowerCase();

    if (baseUnit === inputUnit) return val / selectedFood.servingSize;

    let valInBase = val;
    if ((baseUnit === 'g' || baseUnit === 'ml') && inputUnit === 'oz') {
      valInBase = val * 28.3495;
    } else if ((baseUnit === 'g' || baseUnit === 'ml') && inputUnit === 'lbs') {
      valInBase = val * 453.592;
    } else if (inputUnit.includes('serving')) {
      return val; 
    }

    return valInBase / selectedFood.servingSize;
  };

  // Instant Local Search Filtering
  useEffect(() => {
    const allFoods = [...state.customFoods, ...localFoodDatabase];
    
    if (query.trim() === '') {
      // Show highly used defaults
      setResults(allFoods.slice(0, 15));
      return;
    }

    const q = query.toLowerCase().trim();
    const filtered = allFoods.filter(f => 
      f.name.toLowerCase().includes(q) || 
      (f.brand && f.brand.toLowerCase().includes(q))
    ).sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.name.toLowerCase() === q;
      const bExact = b.name.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Prioritize startsWith
      const aStart = a.name.toLowerCase().startsWith(q);
      const bStart = b.name.toLowerCase().startsWith(q);
      if (aStart && !bStart) return -1;
      if (!aStart && bStart) return 1;
      
      return 0;
    });
    setResults(filtered.slice(0, 30)); // Higher density
  }, [query, state.customFoods]);

  const handleSimulateScan = () => {
     setIsScanning(false);
     const scanTargets = [
        localFoodDatabase.find(f => f.name.includes("Whey")),
        localFoodDatabase.find(f => f.name.includes("Energy Drink")),
        localFoodDatabase.find(f => f.name.includes("Protein Bar"))
     ].filter(Boolean) as FoodItem[];

     const rand = scanTargets[Math.floor(Math.random() * scanTargets.length)];
     if (rand) {
       setSelectedFood(rand);
       showToast(`Barcode Scanned: ${rand.name}`, 'success');
     }
  };

  if (selectedFood) {
    const multiplier = getCalculatedMultiplier();
    
    return (
      <div className="flex-col gap-4 p-4 animate-slide-up" style={{ backgroundColor: '#000000', minHeight: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        <button onClick={() => setSelectedFood(null)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FFFFFF', width: 'fit-content', padding: 0 }}>
          <ArrowLeft size={24} />
        </button>

        <div className="mt-4">
          <h2 className="text-h1" style={{ color: '#FFFFFF', lineHeight: 1.1, fontSize: '2.5rem', fontWeight: 800 }}>{selectedFood.name}</h2>
          <p className="text-subtitle mt-2" style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{selectedFood.brand || 'Generic Food'}</p>
        </div>

        <div className="flex-col gap-6 mt-6">
          <div className="flex-row justify-between align-end" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <span className="text-h1" style={{ fontSize: '4rem', color: '#FFFFFF', fontFeatureSettings: '"tnum"', letterSpacing: '-0.03em', lineHeight: 0.85 }}>{Math.round(selectedFood.calories * multiplier)}</span>
            <span className="text-caption font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Calories</span>
          </div>
          
          <div className="flex-row justify-between">
            <div className="flex-col">
              <span className="text-h2" style={{ color: 'var(--color-protein)', fontFeatureSettings: '"tnum"' }}>{Math.round(selectedFood.protein * multiplier)}g</span>
              <span className="text-caption font-semibold uppercase tracking-wider text-muted">Protein</span>
            </div>
            <div className="flex-col">
              <span className="text-h2" style={{ color: 'var(--color-carbs)', fontFeatureSettings: '"tnum"' }}>{Math.round(selectedFood.carbs * multiplier)}g</span>
              <span className="text-caption font-semibold uppercase tracking-wider text-muted">Carbs</span>
            </div>
            <div className="flex-col align-end">
              <span className="text-h2" style={{ color: 'var(--color-fats)', fontFeatureSettings: '"tnum"' }}>{Math.round(selectedFood.fats * multiplier)}g</span>
              <span className="text-caption font-semibold uppercase tracking-wider text-muted">Fats</span>
            </div>
          </div>
        </div>

        <div className="flex-col gap-2 mt-8">
          <label className="text-caption font-semibold uppercase tracking-widest text-muted mb-1">Serving Amount</label>
          <div className="flex-row gap-2">
            <input 
              type="number" 
              value={measurementValue} 
              onChange={(e) => setMeasurementValue(e.target.value)}
              className="tabular-nums"
              style={{ flex: 1, padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', fontSize: '1.5rem', backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFFFFF', fontWeight: 700 }}
            />
            <select 
              value={measurementUnit}
              onChange={(e) => setMeasurementUnit(e.target.value)}
              style={{ flex: 1, padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', fontSize: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFFFFF', fontWeight: 700, appearance: 'none' }}
            >
              <option value="g">Grams (g)</option>
              <option value="oz">Ounces (oz)</option>
              <option value="lbs">Pounds (lbs)</option>
              <option value="ml">Milliliters (ml)</option>
              <option value="serving">Serving</option>
            </select>
          </div>
        </div>

        <button 
          onClick={() => {
            onAdd(selectedFood, multiplier);
            showToast(`Added ${selectedFood.name}`, 'success');
          }}
          className="btn-primary flex-row justify-center align-center gap-2"
          style={{ marginTop: 'auto', padding: '1.4rem', width: '100%', fontSize: '1.2rem', fontWeight: 800, borderRadius: '24px', backgroundColor: '#FFFFFF', color: '#000000', boxShadow: '0 10px 30px rgba(255,255,255,0.2)' }}
        >
          <CheckCircle2 size={24} /> Log to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-col p-4 animate-slide-up" style={{ backgroundColor: '#000000', minHeight: '100vh', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      {/* HUD Search Header */}
      <div className="flex-row gap-3 mb-6 mt-2" style={{ alignItems: 'center' }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#FFFFFF', padding: 0 }}>
          <ArrowLeft size={28} />
        </button>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }} />
          <input 
            type="text" 
            placeholder="Search food database..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '1rem 1rem 1rem 3rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: '#FFFFFF',
              fontSize: '1.1rem',
              fontWeight: 500
            }}
            autoFocus
          />
        </div>
        <button 
          onClick={() => setIsScanning(true)}
          style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', border: 'none', color: '#FFFFFF', padding: '0.9rem' }}
        >
          <ScanLine size={24} />
        </button>
      </div>

      {isScanning && (
        <div className="animate-fade-in" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 150, backgroundColor: '#000000', display: 'flex', flexDirection: 'column' }}>
          {/* Digital Static Background Overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1), rgba(255,255,255,0.1) 1px, transparent 1px, transparent 2px)', backgroundSize: '100% 2px' }} />
          
          <div className="flex-row justify-between p-4 mt-2" style={{ alignItems: 'center', zIndex: 160 }}>
            <div className="flex-col">
              <span className="text-caption font-bold" style={{ color: 'var(--accent-primary)', letterSpacing: '2px' }}>DEEP_SCAN_ACTIVE</span>
              <span className="text-h2" style={{ color: 'white', marginTop: '-4px' }}>HUD Scanner</span>
            </div>
            <button onClick={() => setIsScanning(false)} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Abort</button>
          </div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {/* Cinematic HUD Overlay */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', zIndex: 160, pointerEvents: 'none' }}>
               {/* Reticle Corners with glow */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '60px', height: '60px', borderTop: '4px solid var(--accent-primary)', borderLeft: '4px solid var(--accent-primary)', filter: 'drop-shadow(0 0 10px var(--accent-primary))' }}/>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '60px', borderTop: '4px solid var(--accent-primary)', borderRight: '4px solid var(--accent-primary)', filter: 'drop-shadow(0 0 10px var(--accent-primary))' }}/>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '60px', height: '60px', borderBottom: '4px solid var(--accent-primary)', borderLeft: '4px solid var(--accent-primary)', filter: 'drop-shadow(0 0 10px var(--accent-primary))' }}/>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '60px', height: '60px', borderBottom: '4px solid var(--accent-primary)', borderRight: '4px solid var(--accent-primary)', filter: 'drop-shadow(0 0 10px var(--accent-primary))' }}/>
              
              {/* Dynamic HUD Data Points */}
              <div className="text-caption" style={{ position: 'absolute', top: '-40px', left: 0, fontFeatureSettings: '"tnum"', color: 'rgba(255,255,255,0.5)' }}>LAT: 37.7749 | LNG: -122.4194</div>
              <div className="text-caption" style={{ position: 'absolute', bottom: '-40px', right: 0, fontFeatureSettings: '"tnum"', color: 'rgba(255,255,255,0.5)' }}>FREQ: 433.92MHz | GAIN: +12dB</div>

              {/* Scanner Line Animation */}
              <div style={{ width: '100%', height: '2px', backgroundColor: 'var(--accent-primary)', position: 'absolute', top: '50%', boxShadow: '0 0 20px var(--accent-primary)', zIndex: 165 }} className="animate-pulse" />
            </div>
            
            <div className="flex-col align-center" style={{ position: 'absolute', bottom: '15%', gap: '1rem', width: '100%', zIndex: 170 }}>
              <button 
                  onClick={handleSimulateScan}
                  className="animate-slide-up"
                  style={{ padding: '1.2rem 2.5rem', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '40px', color: '#FFF', backdropFilter: 'blur(15px)', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.9rem', boxShadow: '0 0 30px rgba(255,255,255,0.1)' }}>
                  Simulate Optical Scan
              </button>
              <p className="text-caption" style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Align barcode within frame for auto-detection</p>
            </div>
          </div>
        </div>
      )}

      {/* High-Density Results List */}
      <div className="flex-col" style={{ flex: 1, overflowY: 'auto' }}>
        <h3 className="text-caption font-semibold mb-3 ml-1 text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{query ? 'Global Database' : 'Frequently Logged'}</h3>
        
        {results.length === 0 && (
            <div className="p-4 text-center mt-10" style={{ color: 'var(--text-muted)' }}>
               No exact matches found for "{query}".
            </div>
        )}

        {results.map(f => (
          <div 
            key={f.id} 
            onClick={() => setSelectedFood(f)}
            className="flex-row justify-between p-4 cursor-pointer"
            style={{ 
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="flex-col gap-1">
              <span className="text-body font-bold" style={{ color: '#FFFFFF', fontSize: '1.1rem' }}>{f.name}</span>
              <span className="text-caption font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {f.brand ? `${f.brand} • ` : ''}{f.servingSize}{f.servingUnit}
              </span>
            </div>
            <div className="flex-row gap-4 align-center">
                <div className="flex-col align-end">
                   <span className="text-body font-bold" style={{ color: '#FFFFFF', fontFeatureSettings: '"tnum"', lineHeight: 1 }}>{f.calories}</span>
                   <span className="text-caption font-semibold" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', marginTop: '2px' }}>CALS</span>
                </div>
                <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent-primary)', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                   <Plus size={18} />
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
