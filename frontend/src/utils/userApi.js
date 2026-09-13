import { apiFetch } from '../api';

async function parseErrorOrThrow(response, fallbackMessage) {
  if (response.ok) return;
  const errData = await response.json().catch(() => ({}));
  const messages = Object.values(errData).flat().join(' | ');
  throw new Error(messages || fallbackMessage);
}

export async function fetchUsers() {
  const response = await apiFetch('/api/users/');
  await parseErrorOrThrow(response, 'Could not load users');
  return response.json();
}

export async function createUser(data) {
  const response = await apiFetch('/api/users/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await parseErrorOrThrow(response, 'Could not create user');
  return response.json();
}

export async function fetchUser(id) {
  const response = await apiFetch(`/api/users/${id}/`);
  await parseErrorOrThrow(response, 'Could not load user');
  return response.json();
}

export async function updateUser(id, data) {
  const response = await apiFetch(`/api/users/${id}/update/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await parseErrorOrThrow(response, 'Could not update user');
  return response.json();
}

export async function deleteUser(id) {
  const response = await apiFetch(`/api/users/${id}/delete/`, { method: 'DELETE' });
  await parseErrorOrThrow(response, 'Could not delete user');
}
