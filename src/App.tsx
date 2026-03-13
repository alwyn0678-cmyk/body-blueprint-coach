import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { LogFood } from './pages/LogFood';
import { Progress } from './pages/Progress';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';

const AppRoutes: React.FC = () => {
  const { state } = useApp();

  // Route guarding based on onboarding status
  if (!state.user?.onboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div className="container" style={{ padding: 0 }}>
      {/* Scrollable Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<LogFood />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          {/* Catch all back to dashboard if onboarded */}
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
