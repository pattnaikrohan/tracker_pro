export const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : 'https://tracker-pro.azurewebsites.net';

export const WS_BASE_URL = window.location.hostname === 'localhost'
  ? 'ws://localhost:8000'
  : 'wss://tracker-pro.azurewebsites.net';
