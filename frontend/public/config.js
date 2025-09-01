// Configuration file for API endpoint
// Update this when deploying to production
const API_CONFIG = {
  // For local development
  development: 'http://localhost:3000/api',
  
  // For production - Render backend URL
  production: 'https://qr-pvxs.onrender.com/api'
};

// Automatically detect environment
const API_URL = window.location.hostname === 'localhost' 
  ? API_CONFIG.development 
  : API_CONFIG.production;