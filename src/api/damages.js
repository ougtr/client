import { request } from './http';

export const addDamage = (token, missionId, payload) =>
  request(`/missions/${missionId}/damages`, {
    method: 'POST',
    body: payload,
    token,
  });

export const updateDamage = (token, missionId, damageId, payload) =>
  request(`/missions/${missionId}/damages/${damageId}`, {
    method: 'PUT',
    body: payload,
    token,
  });

export const deleteDamage = (token, missionId, damageId) =>
  request(`/missions/${missionId}/damages/${damageId}`, {
    method: 'DELETE',
    token,
  });
