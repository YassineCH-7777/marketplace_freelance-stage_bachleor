import { useEffect, useRef, useState } from 'react';
import { loginGoogleUser } from '@/api/authApi';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_PROMPT_BLOCKED_MESSAGE =
  "La fenetre Google ne peut pas s'ouvrir. Autorisez les pop-ups et les cookies tiers pour ce site, puis reessayez.";

let googleScriptPromise;

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', resolve, { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

/* ── Google "G" logo SVG ── */
const GoogleLogo = () => (
  <svg
    className="google-auth-logo"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04
         2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23
         1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18
         C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1
         12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/* ── Spinner SVG ── */
const Spinner = () => (
  <svg
    className="google-auth-spinner"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="#5F5E5A"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeDasharray="28 56"
    />
  </svg>
);

export default function GoogleAuthButton({ role = 'CLIENT', onAuthenticated, onError }) {
  const buttonRef = useRef(null);
  const callbackRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [useCustom, setUseCustom] = useState(false);

  callbackRef.current = async (response) => {
    if (!response?.credential) {
      onError?.('Connexion Google annulée.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginGoogleUser({ idToken: response.credential, role });
      onAuthenticated?.(res.data);
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Connexion Google impossible.';
      const details = err.response?.data?.details;
      onError?.(details && message === 'An unexpected error occurred' ? details : message);
    } finally {
      setLoading(false);
    }
  };

  /* Déclenche la connexion via One Tap quand on clique sur le bouton custom */
  const handleCustomClick = () => {
    if (!window.google?.accounts?.id || loading) return;
    window.google.accounts.id.prompt((notification) => {
      if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
        onError?.(GOOGLE_PROMPT_BLOCKED_MESSAGE);
      }
    });
  };

  useEffect(() => {
    if (!googleClientId) return undefined;

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => callbackRef.current?.(response),
        });

        /* Essaie d'abord le widget officiel dans buttonRef */
        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
          const containerWidth =
            buttonRef.current.closest('.google-auth-wrapper')?.clientWidth ||
            buttonRef.current.parentElement?.clientWidth ||
            420;

          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',       // blanc + bordure grise Google native
            size: 'large',
            type: 'standard',
            shape: 'rectangular',   // le wrapper CSS gère le border-radius
            text: 'continue_with',
            logo_alignment: 'left',
            width: Math.min(containerWidth, 420),
          });

          /*
           * Si le widget n'a rien rendu (ex. domaine non autorisé en dev),
           * on bascule sur le bouton custom.
           */
          setTimeout(() => {
            if (!cancelled && buttonRef.current && !buttonRef.current.firstChild) {
              setUseCustom(true);
            }
          }, 800);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUseCustom(true);
          onError?.('Connexion Google indisponible.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onError, role]);

  if (!googleClientId) return null;

  return (
    <div className={`google-auth-wrapper${loading ? ' is-loading' : ''}`}>
      {useCustom ? (
        /* ── Bouton custom (fallback ou rendu explicite) ── */
        <button
          type="button"
          className="google-auth-inner"
          onClick={handleCustomClick}
          disabled={loading}
          aria-label="Continuer avec Google"
          aria-busy={loading}
        >
          {loading ? <Spinner /> : <GoogleLogo />}
          <span className="google-auth-label">
            {loading ? 'Connexion en cours…' : 'Continuer avec Google'}
          </span>
        </button>
      ) : (
        /* ── Widget officiel Google ── */
        <div ref={buttonRef} className="google-auth-button" />
      )}

      {loading && <div className="google-auth-overlay" aria-hidden="true" />}
    </div>
  );
}
