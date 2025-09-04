// Simple configuration - HTTPS only for camera support
(function() {
    // Get the current host from the browser's location
    const currentHost = window.location.hostname;
    const protocol = 'https'; // Always use HTTPS
    const port = '3000'; // Single port for everything
    
    // Set the API URL
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        window.API_URL = `${protocol}://localhost:${port}`;
    } else {
        // For network access
        window.API_URL = `${protocol}://${currentHost}:${port}`;
    }
    
    console.log('API URL configured as:', window.API_URL);
    console.log('Current location:', window.location.href);
    
    // Store the API URL globally
    window.API_BASE_URL = window.API_URL;
})();