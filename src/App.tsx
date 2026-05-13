import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Machines } from './pages/Machines';
import { Status } from './pages/Status';
import { Admin } from './pages/Admin';
import { AdminRepairs } from './pages/AdminRepairs';
import { AdminMachines } from './pages/AdminMachines';
import { AdminAppointments } from './pages/AdminAppointments';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ClientPortal } from './pages/ClientPortal';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col pb-24 md:pb-0">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/ugyfelkapu" element={<ClientPortal />} />
              <Route path="/gepek" element={<Machines />} />
              <Route path="/status/:id" element={<Status />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/repairs" element={<AdminRepairs />} />
              <Route path="/admin/machines" element={<AdminMachines />} />
              <Route path="/admin/appointments" element={<AdminAppointments />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-center" />
      </Router>
    </AuthProvider>
  );
}
