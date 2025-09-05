// Dynamic configuration that works both locally and on network
(function() {
    // Get the current host and port from the browser's location
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    
    // Always use HTTPS on port 3000
    if (window.location.protocol === 'file:') {
        window.API_URL = 'https://localhost:3000';
    } 
    // If accessing from localhost
    else if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        window.API_URL = `https://localhost:3000`; // HTTPS port
    } 
    // If accessing from network IP
    else {
        window.API_URL = `https://${currentHost}:3000`; // HTTPS port
    }
    
    console.log('API URL configured as:', window.API_URL);
    console.log('Current location:', window.location.href);
    console.log('Protocol:', currentProtocol);
    
    // Store the API URL globally
    window.API_BASE_URL = window.API_URL;
})();