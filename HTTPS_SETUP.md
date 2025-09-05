# HTTPS Setup for QR Inventory System

## Overview
The QR Inventory System now runs exclusively on HTTPS to ensure secure communication and enable camera features for QR code scanning on mobile devices.

## SSL Certificate Generation

### First Time Setup
Run the SSL certificate generation script:
```bash
cd backend
node generate-ssl.js
```

This will create self-signed SSL certificates in the `backend/ssl/` directory:
- `key.pem` - Private key
- `cert.pem` - Certificate

**Note:** These certificates are already excluded from git via `.gitignore` for security.

## Starting the HTTPS Server

### Option 1: Using npm
```bash
npm start
```

### Option 2: Using the start script
```bash
./start-local-server.sh
```

The server will run on:
- Local: https://localhost:3000
- Network: https://[YOUR_IP]:3000

## Accessing the Application

### First Time Access
When accessing the application for the first time, you'll see a browser security warning because the certificate is self-signed.

#### Chrome/Edge:
1. Click "Advanced"
2. Click "Proceed to localhost (unsafe)"

#### Firefox:
1. Click "Advanced"
2. Click "Accept the Risk and Continue"

#### Safari:
1. Click "Show Details"
2. Click "visit this website"

### Mobile Devices
1. Connect your mobile device to the same network
2. Open browser and navigate to: https://[SERVER_IP]:3000
3. Accept the security warning as described above
4. The camera will now work for QR scanning

## Important Notes

### Security
- The self-signed certificates are for **development use only**
- For production deployment, use proper SSL certificates from a Certificate Authority (CA)
- Never commit SSL certificates to version control

### Camera Access
- HTTPS is **required** for camera access on mobile browsers
- The application will not be able to scan QR codes over HTTP

### Port Configuration
- The server runs on port 3000 for both HTTP and HTTPS
- All API calls are automatically configured to use HTTPS

## Troubleshooting

### Port Already in Use
If you get an error that port 3000 is already in use:
```bash
# Find the process
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill [PID]
```

### Certificate Issues
If you need to regenerate certificates:
```bash
# Delete existing certificates
rm -rf backend/ssl/

# Generate new ones
cd backend
node generate-ssl.js
```

### Browser Not Trusting Certificate
This is normal for self-signed certificates. Follow the browser-specific instructions above to proceed.

## API Configuration
The frontend automatically detects and uses HTTPS for all API calls. No manual configuration needed.