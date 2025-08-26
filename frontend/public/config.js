// Configuration file for API endpoint
// Update this when deploying to production
const API_CONFIG = {
  // For local development
  development: 'http://localhost:3000/api',
  
  // For production - UPDATE THIS WITH YOUR BACKEND URL
  production: 'https://your-backend-url.onrender.com/api'
};

// Automatically detect environment
const API_URL = window.location.hostname === 'localhost' 
  ? API_CONFIG.development 
  : API_CONFIG.production;