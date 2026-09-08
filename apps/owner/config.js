const configuredApi = String(localStorage.getItem('bo_api') || '').trim();
const apiBase = configuredApi || '/api';
window.BO_CONFIG = Object.freeze({ API_BASE: apiBase });
