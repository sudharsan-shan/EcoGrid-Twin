import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/Overview';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BatteryPage } from './pages/BatteryPage';
import { ValidationPage } from './pages/ValidationPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="twin" element={<DigitalTwinPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="battery" element={<BatteryPage />} />
          <Route path="validation" element={<ValidationPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
