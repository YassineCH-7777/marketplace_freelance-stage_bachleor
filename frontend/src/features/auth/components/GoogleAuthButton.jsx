import { useEffect, useRef, useState } from 'react';
import { loginGoogleUser } from '@/api/authApi';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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

export default function GoogleAuthButton({ role = 'CLIENT', onAuthenticated, onError }) {
  const buttonRef = useRef(null);
  const callbackRef = useRef(null);
  const [loading, setLoading] = useState(false);

  callbackRef.current = async (response) => {
    if (!response?.credential) {
      onError?.('Connexion Google annulee.');
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

  useEffect(() => {
    if (!googleClientId) {
      return undefined;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => callbackRef.current?.(response),
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_blue',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width: Math.min(buttonRef.current.parentElement?.clientWidth || 380, 400),
        });
      })
      .catch(() => onError?.('Connexion Google indisponible.'));

    return () => {
      cancelled = true;
    };
  }, [onError, role]);

  if (!googleClientId) {
    return null;
  }

  return (
    <div className={`google-auth-wrapper ${loading ? 'is-loading' : ''}`}>
      <div ref={buttonRef} className="google-auth-button" />
    </div>
  );
}
