import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/app/Dashboard';
import Discovery from './pages/app/Discovery';
import Campaigns from './pages/app/Campaigns';
import Integrations from './pages/app/Integrations';
import Inbox from './pages/app/Inbox';
import Leads from './pages/app/Leads';
import Templates from './pages/app/Templates';
import Calls from './pages/app/Calls';
import Analytics from './pages/app/Analytics';
import Billing from './pages/app/Billing';
import Settings from './pages/app/Settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="discovery" element={<Discovery />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="leads" element={<Leads />} />
          <Route path="templates" element={<Templates />} />
          <Route path="calls" element={<Calls />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="billing" element={<Billing />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
