import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

// Read the claims out of a JWT. The role claim is set at registration
// ('normal' for the normal sign-up, 'atc' for the ATC sign-up).
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function userFromToken(token, fallbackUsername) {
  if (!token) return null;
  const claims = decodeToken(token);
  if (!claims) {
    return { authenticated: true, username: fallbackUsername || null, role: 'normal' };
  }
  return {
    authenticated: true,
    username: claims.username || fallbackUsername || null,
    role: claims.role || 'normal',
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setUser(userFromToken(token));
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch('/api/accounts/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        setUser(userFromToken(data.access, username));
        navigate('/');
        return { success: true };
      }
      return { success: false, error: data.detail || 'Login failed' };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      await fetch('/api/accounts/logout/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ refresh })
      });
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
