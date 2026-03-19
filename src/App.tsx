import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { LogFood } from './pages/LogFood';
import { Progress } from './pages/Progress';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { Training } from './pages/Training';
import { Health } from './pages/Health';
import { Coach } from './pages/Coach';
import { Habits } from './pages/Habits';

const AppRoutes: React.FC = () => {
  const { state } = useApp();

  if (!state.user?.onboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<LogFood />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/training" element={<Training />} />
          <Route path="/health" element={<Health />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Header />
    </div>
  );
};

export const App = () => {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
};

export default App;
