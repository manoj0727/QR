# QR Inventory System - Project Structure

## 📁 Directory Structure

```
QR/
├── index.html                    # Main application entry point
├── package.json                  # Node.js dependencies
├── .env                         # Environment variables
│
├── assets/                      # Static assets
│   ├── css/                    # Stylesheets
│   │   ├── dashboard-modern.css
│   │   ├── transaction-history.css
│   │   ├── original-styles.css
│   │   ├── enhanced-sidebar.css
│   │   ├── create-product-advanced.css
│   │   ├── inventory-advanced.css
│   │   ├── inventory-advanced-nav.css
│   │   ├── inventory-mobile.css
│   │   ├── product-simple.css
│   │   └── styles.css
│   │
│   ├── js/                     # JavaScript files
│   │   ├── app.js              # Main application logic
│   │   ├── admin.js            # Admin panel logic
│   │   ├── api-service.js      # API service layer
│   │   ├── employee-dashboard.js
│   │   ├── create-product-advanced.js
│   │   ├── inventory-advanced.js
│   │   ├── product-simple.js
│   │   └── tailor.js
│   │
│   └── images/                 # Image assets
│       └── (image files)
│
├── backend/                    # Backend server
│   ├── server.js              # Express server
│   ├── database.js            # Database configuration
│   ├── qrGenerator.js         # QR code generation
│   ├── authRoutes.js          # Authentication routes
│   ├── tailorRoutes.js        # Tailor management routes
│   ├── routeValidator.js      # Route validation
│   ├── ssl/                   # SSL certificates
│   │   ├── cert.pem
│   │   └── key.pem
│   └── databases/             # SQLite databases
│       ├── inventory.db
│       ├── auth.db
│       └── tailor.db
│
├── components/                 # Reusable components
│   ├── common/                # Common UI components
│   ├── layouts/               # Layout components
│   ├── pages/                 # Page components
│   │   ├── product-simple.html
│   │   ├── create-product-advanced.html
│   │   ├── inventory-advanced.html
│   │   └── login.html
│   │
│   └── sidebar/               # Sidebar component
│       ├── index.js           # Component loader
│       ├── README.md          # Component documentation
│       ├── templates/         # HTML templates
│       │   ├── sidebar.html
│       │   └── sidebar-clean.html
│       ├── styles/            # Component styles
│       │   ├── sidebar.css
│       │   └── sidebar-tailwind.css
│       └── scripts/           # Component scripts
│           └── sidebar-component.js
│
├── config/                    # Configuration files
│   └── config.js             # App configuration
│
├── public/                    # Public static files
│   ├── css/                  # Public CSS
│   └── js/                   # Public JavaScript
│       └── sw.js             # Service Worker
│
├── utils/                     # Utility scripts
│   └── build.js              # Build script
│
└── src/                      # Source files (if using build process)
    ├── components/
    ├── utils/
    └── main.js
```

## 🔧 File Organization

### CSS Files (`assets/css/`)
- **dashboard-modern.css** - Modern dashboard styles
- **transaction-history.css** - Transaction page styles
- **original-styles.css** - Original/legacy styles
- **enhanced-sidebar.css** - Enhanced sidebar styles
- **inventory-*.css** - Inventory related styles
- **product-simple.css** - Product page styles
- **styles.css** - Global styles

### JavaScript Files (`assets/js/`)
- **app.js** - Main application logic
- **api-service.js** - API communication layer
- **admin.js** - Admin functionality
- **employee-dashboard.js** - Employee dashboard logic
- **inventory-advanced.js** - Inventory management
- **product-simple.js** - Product management
- **tailor.js** - Tailor management

### Backend (`backend/`)
- **server.js** - Express server setup
- **database.js** - SQLite database configuration
- **qrGenerator.js** - QR code generation logic
- **authRoutes.js** - Authentication endpoints
- **tailorRoutes.js** - Tailor management endpoints
- **ssl/** - SSL certificates for HTTPS

### Components (`components/`)
- **sidebar/** - Modular sidebar component
- **pages/** - Individual page components
- **common/** - Reusable UI components
- **layouts/** - Layout templates

## 📦 Import Paths

After restructuring, update your import paths:

### Before:
```html
<link rel="stylesheet" href="dashboard-modern.css">
<script src="app.js"></script>
<iframe src="product-simple.html">
```

### After:
```html
<link rel="stylesheet" href="assets/css/dashboard-modern.css">
<script src="assets/js/app.js"></script>
<iframe src="components/pages/product-simple.html">
```

## 🚀 Quick Start

1. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```

2. **Access the application:**
   ```
   https://localhost:3000
   ```

3. **Development:**
   - CSS files: `assets/css/`
   - JS files: `assets/js/`
   - Components: `components/`
   - Backend APIs: `backend/`

## 🔄 Build Process

Use the build script to optimize for production:
```bash
node utils/build.js
```

## 📝 Notes

- All paths in HTML files have been updated to reflect the new structure
- The Service Worker is now in `public/js/sw.js`
- Component-specific files are organized in their respective folders
- Backend remains in its own directory with subdirectories for databases and SSL