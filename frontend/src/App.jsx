import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Tracking from './pages/Tracking';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Airport from './pages/Airport';
import ATCDashboard from './pages/ATCDashboard';
import DelayPrediction from './pages/DelayPrediction';
import CongestionPrediction from './pages/CongestionPrediction';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterATC from './pages/RegisterATC';
import ProtectedRoute from './components/ProtectedRoute';
import ATCProtectedRoute from './components/ATCProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/tracking" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
            <Route path="/tracking/:flightNumber" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
            <Route path="/booking" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
            <Route path="/airport" element={<ProtectedRoute><Airport /></ProtectedRoute>} />
            <Route path="/predictions/delay" element={<ProtectedRoute><DelayPrediction /></ProtectedRoute>} />
            <Route path="/predictions/congestion" element={<ProtectedRoute><CongestionPrediction /></ProtectedRoute>} />
            <Route path="/atc" element={<ATCProtectedRoute><ATCDashboard /></ATCProtectedRoute>} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-atc" element={<RegisterATC />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
