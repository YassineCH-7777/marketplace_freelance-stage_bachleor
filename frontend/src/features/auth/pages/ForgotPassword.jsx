import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, Mail, Send } from 'lucide-react';
import { firebaseSendPasswordReset } from '@/api/firebaseAuthApi';
import '@/styles/auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await firebaseSendPasswordReset(email);
      setSuccess('Si un compte existe avec cet e-mail, Firebase vient d envoyer un lien.');
    } catch (err) {
      if (err.message && !err.response) {
        setError(err.message);
      } else if (!err.response) {
        setError('Impossible de joindre le serveur.');
      } else {
        setError(err.response?.data?.message || 'Impossible d envoyer le lien.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in-up">
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <Send size={28} />
          </div>
          <h1 className="auth-title">Mot de passe oublie</h1>
          <p className="auth-subtitle">Recevez un lien securise par e-mail</p>
        </div>

        {error && (
          <div className="auth-error animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && <div className="auth-success animate-fade-in">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">Adresse e-mail</label>
            <div className="input-icon-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="forgot-email"
                type="email"
                className="form-input input-with-icon"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                Envoi...
              </>
            ) : (
              <>
                <Send size={18} />
                Envoyer le lien
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p><Link to="/login" className="auth-link">Retour a la connexion</Link></p>
        </div>
      </div>
    </div>
  );
}
