import { useState } from 'react';
import AuthContext from './authContextValue';

function parseJwtPayload(token) {
  const payload = token?.split('.')?.[1];

  if (!payload || typeof atob !== 'function') {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(paddedBase64));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseJwtPayload(token);
  const expirationSeconds = Number(payload?.exp);

  if (!Number.isFinite(expirationSeconds)) {
    return true;
  }

  return expirationSeconds * 1000 <= Date.now();
}

function readStoredAuth() {
  const storedToken = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (!storedToken || !storedUser || isTokenExpired(storedToken)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    return {
      loading: false,
      token: null,
      user: null,
    };
  }

  try {
    return {
      loading: false,
      token: storedToken,
      user: JSON.parse(storedUser),
    };
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    return {
      loading: false,
      token: null,
      user: null,
    };
  }
}

export function AuthProvider({ children }) {
  const [{ loading, token, user }, setAuthState] = useState(readStoredAuth);

  const login = (userData, jwtToken) => {
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setAuthState({
      loading: false,
      token: jwtToken,
      user: userData,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setAuthState({
      loading: false,
      token: null,
      user: null,
    });
  };

  const updateUser = (nextUserData) => {
    setAuthState((currentState) => {
      const mergedUser = { ...currentState.user, ...nextUserData };
      localStorage.setItem('user', JSON.stringify(mergedUser));

      return {
        ...currentState,
        user: mergedUser,
      };
    });
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
