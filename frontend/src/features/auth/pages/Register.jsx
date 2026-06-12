import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import { registerFirebaseUser } from '@/api/authApi';
import { firebaseSendEmailVerification, firebaseSignUpWithEmail } from '@/api/firebaseAuthApi';
import GoogleAuthButton from '@/features/auth/components/GoogleAuthButton';
import { UserPlus, Mail, Lock, AlertCircle, Loader2, Users, UserRound } from 'lucide-react';
import '@/styles/auth.css';

const SERVICE_UNAVAILABLE_MESSAGE =
  "Nous n'arrivons pas a contacter le service pour le moment. Verifiez votre connexion internet puis reessayez dans quelques instants.";

function dashboardPath(role) {
  switch (role) {
    case 'ADMIN': return '/admin';
    case 'FREELANCER': return '/freelancer/dashboard';
    case 'CLIENT': return '/client/dashboard';
    default: return '/';
  }
}

export default function Register() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CLIENT',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }
    if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) {
      setError('Le prenom et le nom doivent contenir au moins 2 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const firebaseSession = await firebaseSignUpWithEmail({
        email: form.email,
        password: form.password,
      });

      await registerFirebaseUser({
        idToken: firebaseSession.idToken,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
      });

      await firebaseSendEmailVerification(firebaseSession.idToken);
      setSuccess('Compte cree. Nous vous avons envoye un e-mail de validation.');
    } catch (err) {
      if (err.message && !err.response) {
        setError(err.message);
      } else if (!err.response) {
        setError(SERVICE_UNAVAILABLE_MESSAGE);
      } else {
        setError(err.response?.data?.message || "Erreur lors de l'inscription. Cet e-mail existe peut-etre deja.");
      }
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
          <div className="auth-icon-wrapper accent">
            <UserPlus size={28} />
          </div>
          <h1 className="auth-title">Creer un compte</h1>
          <p className="auth-subtitle">Rejoignez la communaute ProxiSkills</p>
        </div>

        {error && (
          <div className="auth-error animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && <div className="auth-success animate-fade-in">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-name-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="register-first-name">Prenom</label>
              <div className="input-icon-wrapper">
                <UserRound size={18} className="input-icon" />
                <input
                  id="register-first-name"
                  type="text"
                  name="firstName"
                  className="form-input input-with-icon"
                  placeholder="Votre prenom"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  minLength={2}
                  autoComplete="given-name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-last-name">Nom</label>
              <div className="input-icon-wrapper">
                <UserRound size={18} className="input-icon" />
                <input
                  id="register-last-name"
                  type="text"
                  name="lastName"
                  className="form-input input-with-icon"
                  placeholder="Votre nom"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  minLength={2}
                  autoComplete="family-name"
                />
              </div>
            </div>
          </div>

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
                placeholder="Au moins 6 caracteres"
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
                placeholder="Confirmez votre mot de passe"
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
          <p>Deja un compte ? <Link to="/login" className="auth-link">Se connecter</Link></p>
        </div>
      </div>
    </div>
  );
}
