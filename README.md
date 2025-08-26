# Garment Inventory Management System with QR Codes

A comprehensive inventory management system for garments using QR codes to track products as they move through the supply chain.

## Features

- **QR Code Generation**: Generate unique QR codes for each garment product
- **Inventory Tracking**: Track items as they move in and out of storage
- **Size Management**: Support for multiple sizes (XS, S, M, L, XL, XXL, XXXL)
- **Product Types**: Manage different garment types (Shirts, T-Shirts, Pants, etc.)
- **Transaction History**: Complete audit trail of all inventory movements
- **Web-based Scanner**: Scan QR codes using device camera
- **Dashboard**: Real-time inventory statistics and summaries

## Project Structure

```
QR/
├── backend/               # Backend application
│   ├── server.js         # Express server
│   ├── database.js       # Database configuration
│   ├── qrGenerator.js    # QR code generation utilities
│   ├── inventory.db      # SQLite database
│   ├── qr_codes/         # Generated QR code images
│   └── package.json      # Backend dependencies
├── frontend/             # Frontend application
│   ├── public/           # Static files
│   │   ├── index.html    # Main HTML file
│   │   ├── styles.css    # Styling
│   │   └── app.js        # Frontend JavaScript
│   └── package.json      # Frontend dependencies
├── test.js              # Test script
├── package.json         # Root package file
└── README.md           # Documentation
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/manoj0727/QR.git
cd QR
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Start the server:
```bash
npm start
```
Or from the root directory:
```bash
npm run start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

### Adding a New Product

1. Navigate to "Add Product" section
2. Enter product details (name, type, size, color)
3. Set initial quantity if manufacturing batch
4. Click "Create Product & Generate QR"
5. Download and print the QR code

### Scanning Products

1. Navigate to "Scan QR" section
2. Choose camera scanner or manual entry
3. Scan the QR code on the product
4. Select action:
   - **Stock In**: When products arrive at warehouse/store
   - **Stock Out**: When products are sold or moved out
5. Enter quantity and additional details
6. Submit transaction

### Workflow Example

1. **Manufacturing**: Create a new shirt with size L, generate QR code
2. **Packaging**: Attach QR code to product package
3. **Storage Entry**: Manager scans QR, selects "Stock In" - inventory increases
4. **Sale/Transfer**: Manager scans QR, selects "Stock Out" - inventory decreases

## Database Schema

### Products Table
- `product_id`: Unique identifier
- `name`: Product name
- `type`: Garment type
- `size`: Size (S, M, L, XL, etc.)
- `color`: Color variant
- `quantity`: Current stock level

### Transactions Table
- Records all inventory movements
- Tracks who performed the action and when
- Maintains complete audit trail

### QR Codes Table
- Stores QR code data and image paths
- Links to product records

## API Endpoints

- `POST /api/products/create` - Create new product with QR code
- `POST /api/inventory/scan` - Process QR scan and update inventory
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get specific product details
- `GET /api/transactions` - Get transaction history
- `GET /api/inventory/summary` - Get inventory statistics

## Technologies Used

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **SQLite3**: Database
- **QRCode**: QR code generation
- **UUID**: Unique ID generation
- **CORS**: Cross-origin resource sharing

### Frontend
- **HTML5**: Structure
- **CSS3**: Styling with gradients
- **JavaScript**: Client-side logic
- **HTML5-QRCode**: QR code scanning

## Data Storage

- **Database**: `backend/inventory.db` (SQLite)
- **QR Codes**: `backend/qr_codes/` (PNG images)

## License

ISC