import { request } from './http';

export const listInsurers = (token) => request('/insurers', { token });

export const createInsurer = (token, data) =>
  request('/insurers', { method: 'POST', body: data, token });

export const updateInsurer = (token, id, data) =>
  request(`/insurers/${id}`, { method: 'PUT', body: data, token });

export const deleteInsurer = (token, id) =>
  request(`/insurers/${id}`, { method: 'DELETE', token });
