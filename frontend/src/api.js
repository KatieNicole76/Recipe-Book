import { getStorageItem, setStorageItem, removeStorageItem } from './utils/safeStorage';

const BASE_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  let accessToken = getStorageItem('access_token');

  const doFetch = (token) =>
    fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

  let response = await doFetch(accessToken);

  if (response.status === 401) {
    const refreshToken = getStorageItem('refresh_token');
    const refreshResponse = await fetch(`${BASE_URL}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (refreshResponse.ok) {
      const { access } = await refreshResponse.json();
      setStorageItem('access_token', access);
      response = await doFetch(access);
    } else {
      removeStorageItem('access_token');
      removeStorageItem('refresh_token');
      removeStorageItem('username');
      window.location.href = '/login';
    }
  }

  return response;
}
