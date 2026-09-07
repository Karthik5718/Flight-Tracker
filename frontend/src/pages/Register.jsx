import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, AlertTriangle } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/accounts/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        navigate('/login');
      } else {
        const data = await response.json();
        // Extract first error message cleanly if possible
        const errorMsg = Object.values(data)[0];
        setError(Array.isArray(errorMsg) ? errorMsg[0] : JSON.stringify(data));
      }
    } catch (err) {
      setError('Connection refused. Is the server running?');
    }
  };

  return (
    <div className="form-container">
      <div className="form-title">
        <UserPlus size={24} color="#4ade80" />
        <h2 style={{ margin: 0 }}>Create Account</h2>
      </div>
      
      {error && (
        <div className="alert-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input 
            className="form-input"
            type="text" 
            placeholder="Username" 
            value={formData.username} 
            onChange={e => setFormData({ ...formData, username: e.target.value })} 
            required 
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Email</label>
          <input 
            className="form-input"
            type="email" 
            placeholder="name@example.com" 
            value={formData.email} 
            onChange={e => setFormData({ ...formData, email: e.target.value })} 
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Password</label>
          <input 
            className="form-input"
            type="password" 
            placeholder="••••••••" 
            value={formData.password} 
            onChange={e => setFormData({ ...formData, password: e.target.value })} 
            required 
          />
        </div>
        
        <button type="submit" className="form-button">Register</button>
      </form>
      
      <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        <p style={{ marginBottom: '0.5rem' }}>Are you an ATC? <Link to="/register-atc">ATC Registration</Link></p>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
};

export default Register;
