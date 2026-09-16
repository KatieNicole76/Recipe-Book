import { createContext, useContext, useState } from 'react';
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils/safeStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(getStorageItem('access_token'));
  const [username, setUsername] = useState(getStorageItem('username'));
  const [isSuperuser, setIsSuperuser] = useState(getStorageItem('is_superuser') === 'true');

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
    const superuser = meResponse.ok ? (await meResponse.json()).is_superuser : false;

    setStorageItem('access_token', data.access);
    setStorageItem('refresh_token', data.refresh);
    setStorageItem('username', user);
    setStorageItem('is_superuser', String(superuser));
    setAccessToken(data.access);
    setUsername(user);
    setIsSuperuser(superuser);
  };

  const logout = () => {
    removeStorageItem('access_token');
    removeStorageItem('refresh_token');
    removeStorageItem('username');
    removeStorageItem('is_superuser');
    setAccessToken(null);
    setUsername(null);
    setIsSuperuser(false);
  };

  return (
    <AuthContext.Provider
      value={{ accessToken, username, isSuperuser, login, logout, isAuthenticated: !!accessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
