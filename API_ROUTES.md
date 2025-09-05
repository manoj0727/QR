# API Routes Documentation

## 🔐 Authentication Routes (`/api/auth`)
**CRITICAL: Must be mounted for login functionality**

### Login
- **Endpoint:** `POST /api/auth/login`
- **Description:** Authenticate user and create session
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "session_id": "...",
    "user": {
      "user_id": "USR-ADMIN",
      "username": "admin",
      "full_name": "System Administrator",
      "role": "admin",
      "department": null,
      "email": "admin@qrinventory.com"
    }
  }
  ```

### Logout
- **Endpoint:** `POST /api/auth/logout`
- **Headers:** `Authorization: Bearer {session_id}`
- **Description:** Terminate user session

### Get Current User
- **Endpoint:** `GET /api/auth/me`
- **Headers:** `Authorization: Bearer {session_id}`
- **Description:** Get current logged-in user information

### User Management (Admin Only)
- `POST /api/auth/users/create` - Create new user
- `GET /api/auth/users` - List all users
- `PUT /api/auth/users/:user_id` - Update user
- `DELETE /api/auth/users/:user_id` - Deactivate user

### Activity Logs (Admin Only)
- `GET /api/auth/activity-logs` - View activity logs
- `GET /api/auth/admin/stats` - Get dashboard statistics

---

## 📦 Product Management (`/api/products`)

### Create Product
- **Endpoint:** `POST /api/products/create`
- **Request Body:**
  ```json
  {
    "name": "T-Shirt",
    "type": "Clothing",
    "size": "L",
    "color": "Blue",
    "initial_quantity": 100
  }
  ```

### List Products
- **Endpoint:** `GET /api/products`
- **Description:** Get all products in inventory

### Get Product Details
- **Endpoint:** `GET /api/products/:product_id`
- **Description:** Get specific product with QR code and recent transactions

---

## 📊 Inventory Operations (`/api/inventory`)

### Process QR Scan
- **Endpoint:** `POST /api/inventory/scan`
- **Request Body:**
  ```json
  {
    "qr_data": "{\"product_id\":\"CLO-L-123\"}",
    "action": "IN",
    "quantity": 10,
    "performed_by": "John Doe",
    "location": "Warehouse A",
    "notes": "Restocking"
  }
  ```
- **Actions:** `IN`, `OUT`, `STOCK_IN`, `STOCK_OUT`, `SALE`

### Get Inventory Summary
- **Endpoint:** `GET /api/inventory/summary`
- **Description:** Get summary statistics by type and size

---

## 📝 Transaction Logs (`/api/transactions`)

### List Transactions
- **Endpoint:** `GET /api/transactions`
- **Query Parameters:**
  - `product_id` (optional) - Filter by product
  - `limit` (optional, default: 50) - Number of records

---

## 🔖 QR Code Operations (`/api/qr`)

### Get Product QR Code
- **Endpoint:** `GET /api/qr/:product_id`
- **Description:** Get base64 QR code image for a product

---

## 🧵 Tailor Management (`/api/tailor`)

### Tailor Operations
- `GET /api/tailor/tailors` - List all tailors
- `POST /api/tailor/tailors` - Add new tailor
- `PUT /api/tailor/tailors/:id` - Update tailor
- `DELETE /api/tailor/tailors/:id` - Remove tailor

### Work Assignment
- `POST /api/tailor/assignments` - Create work assignment
- `GET /api/tailor/assignments` - List assignments
- `PUT /api/tailor/assignments/:id` - Update assignment

### Fabric Management
- `GET /api/tailor/fabrics` - List fabrics
- `POST /api/tailor/fabrics` - Add fabric
- `PUT /api/tailor/fabrics/:id` - Update fabric

---

## 🩺 Health Check Endpoints

### Application Health
- **Endpoint:** `GET /api/health`
- **Description:** Check if API is running
- **Response:**
  ```json
  {
    "status": "healthy",
    "service": "QR Inventory API",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
  ```

### General Health Check
- **Endpoint:** `GET /health`
- **Description:** Basic health check for monitoring services

---

## ⚠️ Error Handling

### 404 Not Found
When an API endpoint doesn't exist, you'll receive:
```json
{
  "error": "API endpoint not found",
  "path": "/api/invalid/endpoint",
  "method": "GET",
  "message": "The requested API endpoint does not exist. Please check the URL and try again."
}
```

### 401 Unauthorized
When authentication is required but not provided:
```json
{
  "error": "No session token provided"
}
```

### 500 Internal Server Error
When an unexpected error occurs:
```json
{
  "error": "Internal server error",
  "message": "Something went wrong!"
}
```

---

## 🔑 Default Credentials

- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Important:** Change these credentials after first login!

---

## 📡 Request Headers

### Authentication
Most endpoints require authentication:
```
Authorization: Bearer {session_id}
```

### Content Type
For POST/PUT requests:
```
Content-Type: application/json
```

---

## 🚀 Quick Start

1. **Login First:**
   ```bash
   curl -X POST https://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

2. **Use the session_id in subsequent requests:**
   ```bash
   curl -X GET https://localhost:3000/api/products \
     -H "Authorization: Bearer {session_id}"
   ```

---

## 🔍 Troubleshooting

### "API endpoint not found" Error
- Check that the URL is correct
- Verify the HTTP method (GET, POST, PUT, DELETE)
- Ensure the route is mounted in server.js

### "Invalid credentials" Error
- Verify username and password
- Check if user account is active
- Ensure you're using the correct endpoint

### Connection Error
- Verify server is running on https://localhost:3000
- Check SSL certificate is properly configured
- Ensure no firewall is blocking the port

---

## 📚 Additional Resources

- Server Configuration: `backend/server.js`
- Auth Routes: `backend/authRoutes.js`
- Tailor Routes: `backend/tailorRoutes.js`
- Database Schema: `backend/database-sqlite.js`