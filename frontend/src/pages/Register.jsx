import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        navigate('/login');
      } else {
        const data = await response.json();
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
        <h1 className="auth__title">Create an account</h1>
        <p className="auth__sub">For tracking, airports and booking</p>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              className="input"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              className="input"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              className="input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              autoComplete="new-password"
              required
            />
          </div>
          <button className="btn btn--primary btn--block" type="submit">
            Create account
          </button>
        </form>

        <div className="auth__foot">
          <span>
            Already registered? <Link to="/login">Sign in</Link>
          </span>
          <span>
            ATC controller? <Link to="/register-atc">Register for ATC access</Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Register;
