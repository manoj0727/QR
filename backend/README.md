# QR Inventory Backend Setup

## MySQL Database Setup

1. Install MySQL if not already installed
2. Login to MySQL:
   ```bash
   mysql -u root -p
   ```
3. Run the schema file to create database and tables:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

## Node.js Backend Setup (Option 1)

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. The API will be available at: `http://localhost:3001/api/products`

## PHP Backend Setup (Option 2)

1. Make sure PHP and MySQL are installed
2. Place the PHP files in your web server directory
3. Update database credentials in `config/database.php` if needed
4. Access the API at: `http://localhost/backend/api/products.php`

## API Endpoints

- **POST** `/api/products/create` - Create new product
- **GET** `/api/products/list` - Get all products
- **GET** `/api/products/get/:id` - Get single product
- **PUT** `/api/products/update/:id` - Update product
- **DELETE** `/api/products/delete/:id` - Delete product
- **GET** `/api/products/search?query=...` - Search products
- **GET** `/api/products/stats` - Get inventory statistics

## Database Structure

The database includes the following tables:
- `products` - Main product inventory
- `transactions` - Track all inventory movements
- `employees` - Employee management
- `tailors` - Tailor management
- `qr_scans` - QR code scan history
- `categories` - Product categories

## Notes

- The frontend will automatically try to save to the database when creating products
- If the backend is not running, products will still be saved to localStorage
- The system handles duplicate SKUs by auto-generating unique ones