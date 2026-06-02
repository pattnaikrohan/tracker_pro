// If VITE_API_URL is set in the environment (e.g., Azure Static Web Apps), use it.
// Otherwise, auto-detect: use local dev server if on localhost, else use Azure App Service.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://tracker-pro.azurewebsites.net');
