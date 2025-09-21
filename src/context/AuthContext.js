import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { login as apiLogin } from '../api/auth';

const AuthContext = createContext(null);

const TOKEN_KEY = 'gm_token';
const USER_KEY = 'gm_user';

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(getStoredUser);

  const saveSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken && nextUser) {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await apiLogin(credentials);
    saveSession(data.token, data.user);
    return data.user;
  }, [saveSession]);

  const logout = useCallback(() => {
    saveSession(null, null);
  }, [saveSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isManager: user?.role === 'GESTIONNAIRE',
      isAgent: user?.role === 'AGENT',
    }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit etre utilise dans AuthProvider');
  }
  return context;
};
