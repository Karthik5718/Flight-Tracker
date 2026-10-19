import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

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
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Registration received. You can sign in now.');
        setTimeout(() => navigate('/login'), 2500);
      } else {
        const errorMsg = Object.values(data)[0];
        setError(Array.isArray(errorMsg) ? errorMsg[0] : JSON.stringify(data));
      }
    } catch (err) {
      setError('Cannot reach the server. Check that it is running.');
    }
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <h1 className="auth__title">ATC registration</h1>
        <p className="auth__sub">Controller access to the ATC console</p>

        {error && <div className="alert alert--error">{error}</div>}
        {message && (
          <div className="alert alert--ok">
            <CheckCircle size={16} /> {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label htmlFor="atc-username">Username</label>
            <input
              id="atc-username"
              className="input"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="atc-email">Email</label>
            <input
              id="atc-email"
              className="input"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="atc-password">Password</label>
            <input
              id="atc-password"
              className="input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="atc-number">Licence number</label>
            <input
              id="atc-number"
              className="input input--code"
              value={formData.atc_number}
              onChange={(e) => setFormData({ ...formData, atc_number: e.target.value })}
              placeholder="9482-A"
              required
            />
          </div>
          <button className="btn btn--primary btn--block" type="submit">
            Register
          </button>
        </form>

        <div className="auth__foot">
          <span>
            Not a controller? <Link to="/register">Create a standard account</Link>
          </span>
          <span>
            Already registered? <Link to="/login">Sign in</Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegisterATC;
