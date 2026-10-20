// API Client for Vif Web Portal
const API_BASE = '/api';

export const getStoredToken = () => localStorage.getItem('vif_token');
export const setStoredToken = (token) => localStorage.setItem('vif_token', token);
export const removeStoredToken = () => localStorage.removeItem('vif_token');

export const getStoredUser = () => {
  const data = localStorage.getItem('vif_user');
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};
export const setStoredUser = (user) => localStorage.setItem('vif_user', JSON.stringify(user));
export const removeStoredUser = () => localStorage.removeItem('vif_user');

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      removeStoredToken();
      removeStoredUser();
    }

    // Handle PDF or blob downloads
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      return await response.blob();
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.detail || (typeof data === 'string' ? data : 'Request failed');
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Authentication
  login: async (email, password) => {
    const data = await request('/token', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.access_token);
    const user = await api.getCurrentUser();
    setStoredUser(user);
    return { token: data.access_token, user };
  },

  signup: async (payload) => {
    return await request('/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCurrentUser: async () => {
    return await request('/users/me');
  },

  // Student Portal
  getNearbyPulses: async (lat = 48.8566, lng = 2.3522) => {
    return await request(`/pulses/nearby?lat=${lat}&lng=${lng}`);
  },

  createClaim: async (pulseId) => {
    return await request('/claims/create', {
      method: 'POST',
      body: JSON.stringify({ pulse_id: pulseId }),
    });
  },

  verifyStudentId: async (file) => {
    const formData = new FormData();
    formData.append('upload', file);
    return await request('/student/verify-id', {
      method: 'POST',
      body: formData,
    });
  },

  // Shopkeeper Portal
  createPulse: async (pulseData) => {
    return await request('/pulses', {
      method: 'POST',
      body: JSON.stringify(pulseData),
    });
  },

  validateClaim: async (qrToken) => {
    return await request('/validate-claim', {
      method: 'POST',
      body: JSON.stringify({ qr_token: qrToken, qr_code_token: qrToken }),
    });
  },

  getOrUpdateShopCosts: async (payload) => {
    return await request('/shopkeeper/inventory-costs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  generateTaxReport: async (shopId, year, month) => {
    return await request(`/shops/${shopId}/tax-report/${year}/${month}`, {
      method: 'POST',
    });
  },
};
