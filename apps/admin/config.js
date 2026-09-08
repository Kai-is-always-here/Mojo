const host = location.hostname;
const isLocal = location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1';
const apiBase = isLocal ? '/api' : 'https://box-office-mojo.up.railway.app/api';
window.BO_CONFIG = Object.freeze({ API_BASE: apiBase });
