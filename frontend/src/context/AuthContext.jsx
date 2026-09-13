import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [isSuperuser, setIsSuperuser] = useState(localStorage.getItem('is_superuser') === 'true');

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

    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('username', user);
    localStorage.setItem('is_superuser', String(superuser));
    setAccessToken(data.access);
    setUsername(user);
    setIsSuperuser(superuser);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_superuser');
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