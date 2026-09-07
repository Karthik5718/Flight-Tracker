import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';

const RegisterATC = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', atc_number: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/accounts/register-atc/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => navigate('/login'), 3000);
      } else {
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
        <ShieldAlert size={24} color="#f59e0b" />
        <h2 style={{ margin: 0 }}>ATC Registration</h2>
      </div>
      
      {error && (
        <div className="alert-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}
      
      {message && (
        <div className="alert-success" style={{ borderColor: '#f59e0b', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
          <CheckCircle size={18} />
          {message}
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
        
        <div className="form-group">
          <label className="form-label">ATC License Number</label>
          <input 
            className="form-input"
            type="text" 
            placeholder="e.g. 9482-A" 
            value={formData.atc_number} 
            onChange={e => setFormData({ ...formData, atc_number: e.target.value })} 
            required 
          />
        </div>
        
        <button type="submit" className="form-button" style={{ backgroundColor: '#f59e0b' }}>
          Register
        </button>
      </form>
      
      <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        <Link to="/login">Back to Login</Link>
      </p>
    </div>
  );
};

export default RegisterATC;
