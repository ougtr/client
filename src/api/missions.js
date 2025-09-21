import { request } from './http';

const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value || value === 0) {
      params.append(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const listMissions = (token, filters) =>
  request(`/missions${buildQueryString(filters)}`, { token });

export const getMission = (token, id) =>
  request(`/missions/${id}`, { token });

export const createMission = (token, data) =>
  request('/missions', { method: 'POST', body: data, token });

export const updateMission = (token, id, data) =>
  request(`/missions/${id}`, { method: 'PUT', body: data, token });

export const updateMissionStatus = (token, id, statut) =>
  request(`/missions/${id}/status`, { method: 'PATCH', body: { statut }, token });

export const uploadMissionPhotos = (token, id, files, { phase, label }) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));
  formData.append('phase', phase);
  formData.append('label', label);

  return request(`/missions/${id}/photos`, {
    method: 'POST',
    body: formData,
    token,
    isFormData: true,
  });
};

export const deleteMissionPhoto = (token, missionId, photoId) =>
  request(`/missions/${missionId}/photos/${photoId}`, {
    method: 'DELETE',
    token,
  });

export const deleteMission = (token, id) =>
  request(`/missions/${id}`, { method: 'DELETE', token });
