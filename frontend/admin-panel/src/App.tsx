import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { FleetStatus } from './pages/FleetStatus';
import { Garages } from './pages/Garages';
import { Analytics } from './pages/Analytics';
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
