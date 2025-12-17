const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000/api';
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  }
  return 'http://localhost:4000/api';
};

const API_URL = resolveApiUrl();
const ASSET_URL = API_URL.replace(/\/api$/, '');

const clearSessionAndRedirect = () => {
  try {
    localStorage.removeItem('gm_token');
    localStorage.removeItem('gm_user');
  } catch (error) {
    // ignore storage errors
  }

  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

const buildHeaders = (token, isFormData) => {
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const request = async (path, { method = 'GET', body, token, isFormData = false } = {}) => {
  const options = { method, headers: buildHeaders(token, isFormData) };
  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const errorText = await response.text();
    let message = 'Erreur serveur';

    try {
      const parsed = JSON.parse(errorText);
      message = parsed.message || message;
    } catch (error) {
      if (errorText) {
        message = errorText;
      }
    }

    if (response.status === 401) {
      clearSessionAndRedirect();
    }

    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) {
    return null;
  }

  const dataText = await response.text();
  return dataText ? JSON.parse(dataText) : null;
};

export { API_URL, ASSET_URL, request };
