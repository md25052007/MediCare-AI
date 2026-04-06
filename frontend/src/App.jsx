import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Login from './components/Login';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans"> 
        <Header />
        <main className="flex-1 pt-16 flex flex-col relative">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="/patient-dashboard" element={<PatientDashboard />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}