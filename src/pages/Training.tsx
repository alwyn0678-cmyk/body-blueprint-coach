import React, { useState } from 'react';
import { Card } from '../components/SharedUI';
import { Dumbbell, Plus, RotateCcw, Flame, Timer, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useApp } from '../context/AppContext';
import { getLocalISOString } from '../utils/dateUtils';
import { WorkoutSession, ExerciseEntry, ExerciseSet } from '../types';

export const Training: React.FC = () => {
  const { state, addWorkout, showToast } = useApp();
  const today = getLocalISOString();
  const [isLogging, setIsLogging] = useState(false);

  // Calculate volume per muscle group from logs (last 7 days)
  const calculateVolumeData = () => {
    const muscleVolume: Record<string, number> = { 'Chest': 0, 'Back': 0, 'Legs': 0, 'Arms': 0, 'Delts': 0 };
    
    // Iterate through all logs and sum sets by muscle
    Object.values(state.logs).forEach(log => {
      log.workouts.forEach(workout => {
        workout.exercises.forEach(ex => {
          const libraryEntry = state.workoutLibrary.find(l => l.id === ex.exerciseId);
          if (libraryEntry) {
            libraryEntry.targetMuscles.forEach(muscle => {
              if (muscleVolume[muscle] !== undefined) {
                muscleVolume[muscle] += ex.sets.length;
              }
            });
          }
        });
      });
    });

    return Object.entries(muscleVolume).map(([name, sets]) => ({ name, sets }));
  };

  const volumeData = calculateVolumeData();
  const recentWorkouts = Object.values(state.logs)
    .flatMap(log => log.workouts)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="flex-col gap-4 p-4 animate-fade-in" style={{ paddingBottom: '6rem' }}>
      <div className="flex-row justify-between mb-2 align-center">
        <div>
          <h1 className="text-h2">Training</h1>
          <p className="text-subtitle">Workout logs & overload.</p>
        </div>
        <button 
          onClick={() => setIsLogging(true)}
          className="btn-primary flex-row gap-2 align-center"
          style={{ padding: '0.6rem 1.2rem', borderRadius: '14px', fontSize: '0.9rem', backgroundColor: 'var(--accent-primary)', color: 'black' }}
        >
          <Plus size={18} /> Start Workout
        </button>
      </div>

      <Card className="flex-col gap-4 p-4 card-glass mt-2">
          <div className="flex-col mb-2">
             <span className="text-h3">Weekly Volume</span>
             <span className="text-caption text-muted mt-1">Total Sets per Muscle Group</span>
          </div>
          
          <div style={{ height: '200px', width: '100%', marginLeft: '-15px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {/* @ts-ignore */}
              <BarChart data={volumeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} dy={10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', padding: '12px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="sets" radius={[6, 6, 0, 0]} barSize={32}>
                  {volumeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.sets > 0 ? 'var(--color-carbs)' : 'rgba(255,255,255,0.05)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
      </Card>

      <div className="flex-row justify-between align-end mt-4">
        <h3 className="text-h3">Recent History</h3>
        <span className="text-caption font-bold text-muted hover:text-white cursor-pointer flex-row align-center gap-1">View All <ChevronRight size={14} /></span>
      </div>
      
      <div className="flex-col gap-3">
        {recentWorkouts.length === 0 ? (
          <div className="p-8 text-center text-muted card-glass rounded-xl">
             No workouts logged yet. Start your first session!
          </div>
        ) : (
          recentWorkouts.map(workout => (
            <Card key={workout.id} className="flex-col p-4 gap-3 card-glass transition-all hover:border-white/20">
              <div className="flex-row justify-between align-center border-b pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex-row gap-3 align-center">
                  <div style={{ backgroundColor: 'rgba(10, 132, 255, 0.1)', padding: '8px', borderRadius: '10px' }}>
                    <Dumbbell size={18} color="var(--accent-blue)" />
                  </div>
                  <div className="flex-col">
                    <span className="text-body font-bold" style={{ fontSize: '1.05rem' }}>{workout.name}</span>
                    <span className="text-caption text-muted" style={{ fontSize: '0.7rem' }}>{new Date(workout.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex-col align-end">
                   <span className="text-caption font-bold" style={{ color: 'var(--accent-green)' }}>COMPLETED</span>
                </div>
              </div>
              <div className="flex-row justify-between text-caption font-bold text-muted">
                <div className="flex-row align-center gap-1.5"><Timer size={14} /> {workout.durationMinutes}m</div>
                <div className="flex-row align-center gap-1.5">{workout.exercises.length} Exercises</div>
                <div className="flex-row align-center gap-1.5"><Flame size={14} color="var(--accent-orange)" /> {workout.caloriesBurned || '—'} kcal</div>
              </div>
            </Card>
          ))
        )}
      </div>

      {isLogging && (
        <div className="animate-slide-up" style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-primary)', zIndex: 1000, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
           <div className="flex-row justify-between align-center mb-6">
              <h2 className="text-h2">New Session</h2>
              <button onClick={() => setIsLogging(false)} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Cancel</button>
           </div>
           
           <div className="flex-col gap-4">
              <label className="text-caption text-muted">Select Routine</label>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                 {['Push Day A', 'Pull Day A', 'Leg Day A', 'Upper Body', 'Lower Body', 'Full Body'].map(routine => (
                    <Card key={routine} className="p-4 align-center justify-center cursor-pointer text-center hover:border-white/20" onClick={() => {
                       const newWorkout: WorkoutSession = {
                          id: Math.random().toString(36).substr(2, 9),
                          name: routine,
                          timestamp: new Date().toISOString(),
                          durationMinutes: 45,
                          exercises: []
                       };
                       addWorkout(today, newWorkout);
                       setIsLogging(false);
                       showToast(`Started ${routine}`, 'info');
                    }}>
                       <span className="text-body font-bold">{routine}</span>
                    </Card>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
