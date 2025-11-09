import { request } from './http';

export const listAgencies = (token, { insurerId } = {}) => {
  const query = insurerId ? `?insurerId=${insurerId}` : '';
  return request(`/insurer-agencies${query}`, { token });
};

export const createAgency = (token, data) =>
  request('/insurer-agencies', { method: 'POST', body: data, token });

export const updateAgency = (token, id, data) =>
  request(`/insurer-agencies/${id}`, { method: 'PUT', body: data, token });

export const deleteAgency = (token, id) =>
  request(`/insurer-agencies/${id}`, { method: 'DELETE', token });
