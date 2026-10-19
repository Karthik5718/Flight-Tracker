import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ATCProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  // Only accounts registered as ATC employees may open the ATC section.
  if (user.role !== 'atc') return <Navigate to="/" replace />;
  return children;
};

export default ATCProtectedRoute;
