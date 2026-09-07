import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ATCProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  // Frontend check is UX only — real enforcement is server-side via IsATCVerified
  // If role info not in token, allow navigation but backend will return 403
  return children;
};

export default ATCProtectedRoute;
