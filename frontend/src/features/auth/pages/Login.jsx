import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { loginUser } from '@/api/authApi';
import GoogleAuthButton from '@/features/auth/components/GoogleAuthButton';
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import '@/styles/auth.css';

const LOGIN_CREDENTIALS_ERROR =
  'Adresse e-mail ou mot de passe incorrect. Verifiez votre saisie, puis reessayez ou utilisez le lien Mot de passe oublie.';
const SERVER_UNREACHABLE_ERROR =
  "Nous n'arrivons pas a contacter le service pour le moment. Verifiez votre connexion internet puis reessayez dans quelques instants.";

function resolveLoginError(err) {
  if (!err.response) {
    return SERVER_UNREACHABLE_ERROR;
  }

  const message = err.response?.data?.message;
  const normalizedMessage = typeof message === 'string' ? message.trim().toLowerCase() : '';

  if (!normalizedMessage || normalizedMessage === 'identifiants invalides' || normalizedMessage === 'bad credentials') {
    return LOGIN_CREDENTIALS_ERROR;
  }

  return message;
}

function dashboardPath(role) {
  switch (role) {
    case 'ADMIN': return '/admin';
    case 'FREELANCER': return '/freelancer/dashboard';
    case 'CLIENT': return '/client/dashboard';
    default: return '/';
  }
}

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
      const { token, ...authUser } = res.data;
      login(authUser, token);
      navigate(dashboardPath(authUser.role));
    } catch (err) {
      setError(resolveLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuthenticated = (data) => {
    const { token, ...authUser } = data;
    login(authUser, token);
    navigate(dashboardPath(authUser.role));
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in-up">
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <LogIn size={28} />
          </div>
          <h1 className="auth-title">Bon retour !</h1>
          <p className="auth-subtitle">Connectez-vous pour acceder a votre espace</p>
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
                placeholder="Votre mot de passe"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="auth-secondary-actions">
            <Link to="/forgot-password" className="auth-link">Mot de passe oublie ?</Link>
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

        <div className="auth-divider"><span>ou</span></div>

        <GoogleAuthButton
          role="CLIENT"
          onAuthenticated={handleGoogleAuthenticated}
          onError={setError}
        />

        <div className="auth-footer">
          <p>Pas encore de compte ? <Link to="/register" className="auth-link">Creer un compte</Link></p>
        </div>
      </div>
    </div>
  );
}
