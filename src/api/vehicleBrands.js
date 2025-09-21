import { request } from './http';

export const listVehicleBrands = (token) => request('/vehicle-brands', { token });

export const createVehicleBrand = (token, data) =>
  request('/vehicle-brands', { method: 'POST', body: data, token });

export const updateVehicleBrand = (token, id, data) =>
  request(`/vehicle-brands/${id}`, { method: 'PUT', body: data, token });

export const deleteVehicleBrand = (token, id) =>
  request(`/vehicle-brands/${id}`, { method: 'DELETE', token });
