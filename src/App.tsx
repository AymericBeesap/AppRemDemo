import { Routes, Route } from 'react-router-dom';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import NewCampaign from './pages/NewCampaign';
import Employees from './pages/Employees';
import Reporting from './pages/Reporting';
import Audit from './pages/Audit';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/new" element={<NewCampaign />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/reporting" element={<Reporting />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Shell>
  );
}
