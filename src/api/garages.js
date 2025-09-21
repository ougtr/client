import { request } from './http';

export const listGarages = (token) => request('/garages', { token });

export const createGarage = (token, data) =>
  request('/garages', {
    method: 'POST',
    body: data,
    token,
  });

export const updateGarage = (token, id, data) =>
  request(`/garages/${id}`, {
    method: 'PUT',
    body: data,
    token,
  });

export const deleteGarage = (token, id) =>
  request(`/garages/${id}`, {
    method: 'DELETE',
    token,
  });
