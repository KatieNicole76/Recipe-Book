import { createContext, useContext, useState } from 'react';
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils/safeStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(getStorageItem('access_token'));
  const [username, setUsername] = useState(getStorageItem('username'));
  const [isSuperuser, setIsSuperuser] = useState(getStorageItem('is_superuser') === 'true');
  const [isDemo, setIsDemo] = useState(getStorageItem('is_demo') === 'true');

  const applySession = ({ access, refresh, user, superuser = false, demo = false }) => {
    setStorageItem('access_token', access);
    setStorageItem('refresh_token', refresh);
    setStorageItem('username', user);
    setStorageItem('is_superuser', String(superuser));
    setStorageItem('is_demo', String(demo));
    setAccessToken(access);
    setUsername(user);
    setIsSuperuser(superuser);
    setIsDemo(demo);
  };

  const login = async (user, password) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid username or password');
    }

    const data = await response.json();

    const meResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me/`, {
      headers: { Authorization: `Bearer ${data.access}` },
    });
    const me = meResponse.ok ? await meResponse.json() : {};

    applySession({ access: data.access, refresh: data.refresh, user, superuser: !!me.is_superuser, demo: !!me.is_demo });
  };

  // No credentials — creates a fresh, isolated guest account on the spot.
  const loginDemo = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/demo-login/`, { method: 'POST' });
    if (!response.ok) {
      throw new Error('Could not start the demo right now');
    }
    const data = await response.json();
    applySession({ access: data.access, refresh: data.refresh, user: data.username, superuser: false, demo: true });
  };

  const logout = () => {
    removeStorageItem('access_token');
    removeStorageItem('refresh_token');
    removeStorageItem('username');
    removeStorageItem('is_superuser');
    removeStorageItem('is_demo');
    setAccessToken(null);
    setUsername(null);
    setIsSuperuser(false);
    setIsDemo(false);
  };

  return (
    <AuthContext.Provider
      value={{ accessToken, username, isSuperuser, isDemo, login, loginDemo, logout, isAuthenticated: !!accessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
