import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { FleetStatus } from './pages/FleetStatus';
import { Garages } from './pages/Garages';
import { Analytics } from './pages/Analytics';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { GarageRouting } from './pages/GarageRouting';
import { AppProvider } from './store/data';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="vehicles" element={<FleetStatus />} />
            <Route path="garages" element={<Garages />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="analytics-dashboard" element={<AnalyticsDashboard />} />
            <Route path="garage-routing" element={<GarageRouting />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
