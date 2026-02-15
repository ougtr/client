import { request } from './http';

export const saveLabors = (token, missionId, payload) =>
  request(`/missions/${missionId}/labors`, {
    method: 'PUT',
    body: payload,
    token,
  });
