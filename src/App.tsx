import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Optimization } from './pages/Optimization';
import { Monitor } from './pages/Monitor';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Landing page — full-screen, no sidebar layout */}
        <Route path="/" element={<Landing />} />

        {/* App pages — wrapped in Layout with sidebar */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/orders"    element={<Layout><Orders /></Layout>} />
        <Route path="/optimization" element={<Layout><Optimization /></Layout>} />
        <Route path="/monitor"   element={<Layout><Monitor /></Layout>} />
        <Route path="/profile"   element={<Layout><Profile /></Layout>} />
        <Route path="/settings"  element={<Layout><Settings /></Layout>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
