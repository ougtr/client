import { request } from './http';

export const getTenantSettings = (token) => request('/tenant-settings/me', { token });

export const updateTenantSettings = (token, data, files = {}) => {
  const formData = new FormData();
  Object.entries(data || {}).forEach(([key, value]) => {
    formData.append(key, value ?? '');
  });
  if (files.logo) {
    formData.append('logo', files.logo);
  }
  if (files.cachet) {
    formData.append('cachet', files.cachet);
  }

  return request('/tenant-settings/me', {
    method: 'PUT',
    body: formData,
    token,
    isFormData: true,
  });
};
