import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { loginUser } from '../api/authApi';
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import './Auth.css';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await loginUser(form);
      const { token, id, email, role } = res.data;
      login({ id, email, role }, token);
      
      switch (role) {
        case 'ADMIN': navigate('/admin'); break;
        case 'FREELANCER': navigate('/freelancer/dashboard'); break;
        case 'CLIENT': navigate('/client/dashboard'); break;
        default: navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-shapes">
        <div className="auth-shape auth-shape-1"></div>
        <div className="auth-shape auth-shape-2"></div>
        <div className="auth-shape auth-shape-3"></div>
      </div>

      <div className="auth-card animate-fade-in-up">
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <LogIn size={28} />
          </div>
          <h1 className="auth-title">Bon retour !</h1>
          <p className="auth-subtitle">Connectez-vous pour accéder à votre espace</p>
        </div>

        {error && (
          <div className="auth-error animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Adresse e-mail</label>
            <div className="input-icon-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="login-email"
                type="email"
                name="email"
                className="form-input input-with-icon"
                placeholder="votre@email.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Mot de passe</label>
            <div className="input-icon-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="login-password"
                type="password"
                name="password"
                className="form-input input-with-icon"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                Connexion...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Se connecter
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Pas encore de compte ? <Link to="/register" className="auth-link">Créer un compte</Link></p>
        </div>
      </div>
    </div>
  );
}
