import { request } from './http';

export const listTenants = (token) => request('/tenants', { token });

export const createTenant = (token, data) =>
  request('/tenants', { method: 'POST', body: data, token });

export const updateTenant = (token, id, data) =>
  request(`/tenants/${id}`, { method: 'PUT', body: data, token });
