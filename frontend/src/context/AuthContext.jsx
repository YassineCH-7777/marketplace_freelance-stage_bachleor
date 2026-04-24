import { useState } from 'react';
import AuthContext from './authContextValue';

function readStoredAuth() {
  const storedToken = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (!storedToken || !storedUser) {
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

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
