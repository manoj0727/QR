# Database Viewing & Management Guide

## 🗄️ Current Setup: SQLite (Local)

Your database is stored at: `backend/inventory.db`

## How to View Your Database

### 1. **Web Database Viewer (NEW!)** 
Open `backend/db-viewer.html` in your browser to see all data visually!

### 2. **Terminal/Command Line**
```bash
# View all products
sqlite3 backend/inventory.db "SELECT * FROM products;"

# View transactions
sqlite3 backend/inventory.db "SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 10;"

# Count total items
sqlite3 backend/inventory.db "SELECT SUM(quantity) FROM products;"

# Show tables
sqlite3 backend/inventory.db ".tables"

# Show table structure
sqlite3 backend/inventory.db ".schema products"
```

### 3. **GUI Tools (Download These)**

#### **DB Browser for SQLite** (FREE - Recommended)
- Download: https://sqlitebrowser.org/
- Open `backend/inventory.db` file
- View/Edit all data visually
- Run SQL queries
- Export to CSV/JSON

#### **TablePlus** (Beautiful UI)
- Download: https://tableplus.com/
- Free version available
- Modern interface

#### **DBeaver** (Professional)
- Download: https://dbeaver.io/
- Works with all databases
- Free & open source

### 4. **VS Code Extensions**
Install these extensions in VS Code:
- **SQLite Viewer** - View database directly in VS Code
- **SQLite** - Run queries from VS Code

## 🌐 Cloud Databases (When Deployed)

### **PostgreSQL (Render/Railway)**

#### View Options:

1. **Render Dashboard**
   - Login to render.com
   - Click your database
   - Use "Connect" → "PSQL Command"

2. **Railway Dashboard**
   - Login to railway.app
   - Click on Database
   - Use Data tab to view tables

3. **pgAdmin (Web/Desktop)**
   - https://www.pgadmin.org/
   - Connect using DATABASE_URL

4. **TablePlus/DBeaver**
   - Same tools work for PostgreSQL
   - Use connection string from Render/Railway

### **Supabase (PostgreSQL)**
- Built-in Table Editor at supabase.com
- Real-time data viewer
- SQL editor included

## 📊 Quick Database Commands

### View Data Size
```bash
# SQLite
sqlite3 backend/inventory.db "SELECT COUNT(*) as products FROM products;"
sqlite3 backend/inventory.db "SELECT COUNT(*) as transactions FROM transactions;"

# File size
ls -lh backend/inventory.db
```

### Backup Database
```bash
# SQLite backup
cp backend/inventory.db backend/backup_$(date +%Y%m%d).db

# Export to SQL
sqlite3 backend/inventory.db .dump > backup.sql

# Export to CSV
sqlite3 -header -csv backend/inventory.db "SELECT * FROM products;" > products.csv
```

### View Recent Activity
```bash
# Last 5 transactions
sqlite3 backend/inventory.db "SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 5;"

# Products low on stock
sqlite3 backend/inventory.db "SELECT * FROM products WHERE quantity < 10;"
```

## 🔍 Database Structure

```sql
-- Products Table
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  product_id TEXT UNIQUE,     -- Unique ID like "SHI-L-ABC123"
  name TEXT,                  -- Product name
  type TEXT,                  -- Shirt, Pants, etc.
  size TEXT,                  -- S, M, L, XL, etc.
  color TEXT,                 -- Color
  quantity INTEGER,           -- Current stock
  created_at DATETIME,
  updated_at DATETIME
);

-- Transactions Table
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  product_id TEXT,            -- Links to products
  action TEXT,                -- IN, OUT, INITIAL_STOCK
  quantity INTEGER,           -- Amount changed
  performed_by TEXT,          -- Who did it
  location TEXT,              -- Where
  notes TEXT,                 -- Additional info
  timestamp DATETIME
);

-- QR Codes Table
CREATE TABLE qr_codes (
  id INTEGER PRIMARY KEY,
  product_id TEXT UNIQUE,     -- Links to products
  qr_data TEXT,               -- JSON data in QR
  qr_image_base64 TEXT,       -- Image as base64
  created_at DATETIME
);
```

## 🚀 Cloud Database Comparison

| Feature | SQLite (Local) | PostgreSQL (Cloud) | MySQL (Cloud) |
|---------|---------------|--------------------|---------------|
| **Where to View** | Local tools, DB Browser | Web dashboards | phpMyAdmin |
| **Cost** | FREE | Free tier available | Free tier available |
| **Backup** | Copy .db file | Automated | Automated |
| **Access** | Local only | Anywhere | Anywhere |
| **Best For** | Development | Production | Production |

## 📱 Mobile Database Viewers

### For SQLite:
- **SQLiteDirector** (iOS)
- **SQLite Manager** (Android)

### For Cloud:
- **Supabase Mobile**
- **Railway Mobile**
- Web dashboards work on mobile

## 🔐 Security Note

When using cloud databases:
- Never share DATABASE_URL publicly
- Use environment variables
- Enable SSL connections
- Regular backups

## Need Help?

1. **View Database Now**: Open `backend/db-viewer.html` in browser
2. **Quick Look**: `sqlite3 backend/inventory.db "SELECT * FROM products;"`
3. **Download Tool**: Get DB Browser from https://sqlitebrowser.org/