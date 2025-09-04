// Configuration file for API endpoint
// Update this when deploying to production
const API_CONFIG = {
  // For local development with HTTPS
  development: 'https://localhost:3000',
  
  // For production - Render backend URL
  production: 'https://qr-pvxs.onrender.com'
};

// Automatically detect environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? API_CONFIG.development 
  : API_CONFIG.production;