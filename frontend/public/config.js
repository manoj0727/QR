// Configuration for QR Inventory System
// This config automatically matches the protocol of the current page

(function() {
    'use strict';
    
    // Clear any cached API URLs
    delete window.API_URL;
    delete window.API_BASE_URL;
    delete window.API_CONFIG;
    
    // Get the current location details
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    const currentPort = window.location.port || (currentProtocol === 'https:' ? '443' : '80');
    
    // Determine the API URL based on current access method
    let apiUrl;
    
    // If we're already accessing via the backend server (port 3000)
    if (currentPort === '3000') {
        // Use the same protocol and host as we're currently using
        // This means if you access via HTTPS, API calls use HTTPS
        // If you access via HTTP, API calls use HTTP (though this won't work for camera)
        apiUrl = `${currentProtocol}//${currentHost}:3000`;
    }
    // If accessing from a different port (shouldn't happen in production)
    else {
        // Try to use HTTPS on port 3000
        apiUrl = `https://${currentHost}:3000`;
    }
    
    // Set the global API_URL variable
    window.API_URL = apiUrl;
    window.API_BASE_URL = apiUrl;
    
    // Log configuration for debugging
    console.log('=== API Configuration ===');
    console.log('Current URL:', window.location.href);
    console.log('Current protocol:', currentProtocol);
    console.log('Current host:', currentHost);
    console.log('Current port:', currentPort);
    console.log('API URL configured as:', window.API_URL);
    console.log('=======================');
    
    // Display a warning if not using HTTPS
    if (currentProtocol !== 'https:') {
        console.warn('⚠️ Not using HTTPS. Camera features will not work.');
        console.warn('📱 Please access the application at: https://' + currentHost + ':3000');
    }
})();