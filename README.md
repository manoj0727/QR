# QR Code Inventory Management System

Real-time garment inventory tracking using QR codes.

## 🚀 Live Demo
- **Frontend & Backend**: https://qr-1-mrcg.onrender.com

## Features
- Generate unique QR codes for each garment
- Track inventory (Stock In/Out) by scanning QR codes  
- Support for all sizes (XS to XXXL)
- Real-time dashboard with statistics
- Complete transaction history

## Tech Stack
**Backend:** Node.js, Express, PostgreSQL (Production) / SQLite (Local)  
**Frontend:** HTML5, CSS3, JavaScript, QR Scanner

## Local Development

```bash
# Install dependencies
cd backend && npm install

# Run locally
npm start

# Access at
http://localhost:3000
```

## Project Structure
```
├── backend/          # Server, API, Database
│   ├── server.js    
│   ├── database-adapter.js
│   └── qrGenerator.js
├── frontend/         # Web UI
│   └── public/
│       ├── index.html
│       ├── app.js
│       └── styles.css
└── package.json
```

## Deployment (Render)
- Automatically deploys from GitHub
- PostgreSQL database included
- Environment: `NODE_ENV=production`