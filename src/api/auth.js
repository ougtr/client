import { request } from './http';

export const login = (credentials) =>
  request('/auth/login', { method: 'POST', body: credentials });
