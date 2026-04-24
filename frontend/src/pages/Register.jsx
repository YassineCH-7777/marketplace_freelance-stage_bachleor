import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { registerUser } from '../api/authApi';
import { UserPlus, Mail, Lock, AlertCircle, Loader2, Users } from 'lucide-react';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', role: 'CLIENT' });
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
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await registerUser({ email: form.email, password: form.password, role: form.role });
      const { token, id, email, role } = res.data;
      login({ id, email, role }, token);

      switch (role) {
        case 'FREELANCER': navigate('/freelancer/dashboard'); break;
        case 'CLIENT': navigate('/client/dashboard'); break;
        default: navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription. Cet e-mail existe peut-être déjà.");
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
          <div className="auth-icon-wrapper accent">
            <UserPlus size={28} />
          </div>
          <h1 className="auth-title">Créer un compte</h1>
          <p className="auth-subtitle">Rejoignez la communauté FreelanceHub</p>
        </div>

        {error && (
          <div className="auth-error animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Adresse e-mail</label>
            <div className="input-icon-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="register-email"
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
            <label className="form-label" htmlFor="register-password">Mot de passe</label>
            <div className="input-icon-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="register-password"
                type="password"
                name="password"
                className="form-input input-with-icon"
                placeholder="Au moins 6 caractères"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-confirm">Confirmer le mot de passe</label>
            <div className="input-icon-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="register-confirm"
                type="password"
                name="confirmPassword"
                className="form-input input-with-icon"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Je suis un...</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-option ${form.role === 'CLIENT' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'CLIENT' })}
              >
                <Users size={20} />
                <span className="role-option-title">Client</span>
                <span className="role-option-desc">Je cherche un freelance</span>
              </button>
              <button
                type="button"
                className={`role-option ${form.role === 'FREELANCER' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'FREELANCER' })}
              >
                <UserPlus size={20} />
                <span className="role-option-title">Freelance</span>
                <span className="role-option-desc">Je propose mes services</span>
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-accent btn-lg auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                Inscription...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                S'inscrire
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Déjà un compte ? <Link to="/login" className="auth-link">Se connecter</Link></p>
        </div>
      </div>
    </div>
  );
}
