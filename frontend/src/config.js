// If VITE_API_URL is set in the environment (e.g., Azure Static Web Apps), use it.
// Otherwise, fallback to the local development server.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
