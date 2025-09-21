import { request } from './http';

export const listUsers = (token) => request('/users', { token });

export const createUser = (token, data) =>
  request('/users', { method: 'POST', body: data, token });

export const updateUser = (token, id, data) =>
  request(`/users/${id}`, { method: 'PUT', body: data, token });

export const deleteUser = (token, id) =>
  request(`/users/${id}`, { method: 'DELETE', token });
