const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const identityBaseUrl = 'https://identitytoolkit.googleapis.com/v1';

function ensureFirebaseConfig() {
  if (!firebaseApiKey) {
    throw new Error("La connexion est temporairement indisponible. Reessayez dans quelques instants.");
  }
}

async function firebaseRequest(path, payload) {
  ensureFirebaseConfig();

  const response = await fetch(`${identityBaseUrl}/${path}?key=${firebaseApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const firebaseCode = data?.error?.message || 'UNKNOWN_FIREBASE_ERROR';
    const error = new Error(mapFirebaseError(firebaseCode));
    error.firebaseCode = firebaseCode;
    throw error;
  }

  return data;
}

function mapFirebaseError(code = '') {
  if (code.includes('EMAIL_EXISTS')) return 'Cet e-mail est deja utilise.';
  if (code.includes('EMAIL_NOT_FOUND')) return 'Aucun compte ne correspond a cet e-mail.';
  if (code.includes('INVALID_PASSWORD')) return 'Mot de passe incorrect.';
  if (code.includes('INVALID_LOGIN_CREDENTIALS')) return 'Email ou mot de passe incorrect.';
  if (code.includes('USER_DISABLED')) return 'Ce compte est desactive.';
  if (code.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) return 'Trop de tentatives. Reessayez plus tard.';
  if (code.includes('WEAK_PASSWORD')) return 'Le mot de passe doit contenir au moins 6 caracteres.';
  if (code.includes('OPERATION_NOT_ALLOWED')) return 'La connexion Google est indisponible pour le moment.';
  if (code.includes('INVALID_IDP_RESPONSE')) return "La connexion Google n'a pas pu aboutir. Reessayez avec le meme compte ou choisissez une autre methode.";
  return "La demande n'a pas pu etre traitee. Reessayez dans quelques instants.";
}

export function isFirebaseConfigured() {
  return Boolean(firebaseApiKey);
}

export function firebaseSignUpWithEmail({ email, password }) {
  return firebaseRequest('accounts:signUp', {
    email,
    password,
    returnSecureToken: true,
  });
}

export function firebaseSignInWithEmail({ email, password }) {
  return firebaseRequest('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });
}

export function firebaseSendEmailVerification(idToken) {
  return firebaseRequest('accounts:sendOobCode', {
    requestType: 'VERIFY_EMAIL',
    idToken,
  });
}

export function firebaseSendPasswordReset(email) {
  return firebaseRequest('accounts:sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email,
  });
}

export function firebaseSignInWithGoogleCredential(googleIdToken) {
  return firebaseRequest('accounts:signInWithIdp', {
    postBody: `id_token=${encodeURIComponent(googleIdToken)}&providerId=google.com`,
    requestUri: window.location.origin,
    returnIdpCredential: true,
    returnSecureToken: true,
  });
}
