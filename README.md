# QR Code Inventory Management System

Garment inventory tracking system using QR codes for real-time stock management.

## Quick Start

```bash
# Clone repo
git clone https://github.com/manoj0727/QR.git
cd QR

# Install & run
cd backend && npm install
npm start

# Access at
http://localhost:3000
```

## Features

- Generate unique QR codes for each garment
- Track inventory (Stock In/Out) by scanning QR codes
- Support for all sizes (XS to XXXL) and garment types
- Real-time dashboard with inventory statistics
- Complete transaction history

## How It Works

1. **Create Product** → Generate QR code
2. **Stock In** → Scan QR when items arrive → Inventory ↑
3. **Stock Out** → Scan QR when items sold → Inventory ↓

## Project Structure

```
backend/    - Server, Database, API
frontend/   - Web UI (HTML/CSS/JS)
```

## API Endpoints

- `POST /api/products/create` - Create product with QR
- `POST /api/inventory/scan` - Update stock via QR scan
- `GET /api/products` - List all products
- `GET /api/inventory/summary` - Dashboard stats

## Tech Stack

**Backend:** Node.js, Express, SQLite3, QRCode  
**Frontend:** HTML5, CSS3, JavaScript, HTML5-QRCode Scanner