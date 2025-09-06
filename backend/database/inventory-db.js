const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create inventory database
const dbPath = path.join(__dirname, 'inventory.db');
console.log('Inventory database location:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening inventory database:', err);
    } else {
        console.log('Connected to inventory database');
    }
});

// Disable foreign keys during initialization
db.run("PRAGMA foreign_keys = OFF");

// Initialize database schema
const initializeDatabase = () => {
    db.serialize(() => {
        // Categories table
        db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_code TEXT UNIQUE NOT NULL,
                category_name TEXT NOT NULL,
                description TEXT,
                parent_category_id INTEGER,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL
            )
        `, (err) => {
            if (err) console.error('Error creating categories table:', err);
            else {
                console.log('Categories table ready');
                createDefaultCategories();
            }
        });

        // Products table (updated to match existing code)
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                size TEXT NOT NULL,
                color TEXT,
                quantity INTEGER DEFAULT 0,
                sku TEXT,
                description TEXT,
                category_id INTEGER,
                brand TEXT,
                model TEXT,
                material TEXT,
                unit TEXT DEFAULT 'piece',
                min_stock_level INTEGER DEFAULT 10,
                max_stock_level INTEGER DEFAULT 1000,
                reorder_point INTEGER DEFAULT 20,
                price DECIMAL(10,2) DEFAULT 0,
                cost DECIMAL(10,2) DEFAULT 0,
                location TEXT,
                warehouse_section TEXT,
                rack_number TEXT,
                bin_number TEXT,
                supplier_id INTEGER,
                manufacturer TEXT,
                barcode TEXT,
                qr_code TEXT,
                image_url TEXT,
                weight DECIMAL(10,3),
                dimensions TEXT, -- JSON: {length, width, height}
                status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'discontinued')),
                tags TEXT, -- JSON array of tags
                custom_fields TEXT, -- JSON for additional fields
                created_by TEXT,
                updated_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
            )
        `, (err) => {
            if (err) console.error('Error creating products table:', err);
            else console.log('Products table ready');
        });

        // Stock transactions table
        db.run(`
            CREATE TABLE IF NOT EXISTS stock_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id TEXT UNIQUE NOT NULL,
                product_id TEXT NOT NULL,
                transaction_type TEXT NOT NULL CHECK(
                    transaction_type IN (
                        'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 
                        'RETURN', 'DAMAGE', 'TRANSFER', 'INITIAL'
                    )
                ),
                quantity INTEGER NOT NULL,
                quantity_before INTEGER,
                quantity_after INTEGER,
                unit_price DECIMAL(10,2),
                total_amount DECIMAL(10,2),
                reference_type TEXT, -- PO, SO, TRANSFER, ADJUSTMENT
                reference_id TEXT,
                reason TEXT,
                notes TEXT,
                source_location TEXT,
                destination_location TEXT,
                performed_by TEXT NOT NULL,
                approved_by TEXT,
                transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating stock_transactions table:', err);
            else console.log('Stock transactions table ready');
        });

        // Suppliers table
        db.run(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier_code TEXT UNIQUE NOT NULL,
                company_name TEXT NOT NULL,
                contact_person TEXT,
                email TEXT,
                phone TEXT,
                address TEXT,
                city TEXT,
                state TEXT,
                country TEXT,
                postal_code TEXT,
                tax_id TEXT,
                payment_terms TEXT,
                credit_limit DECIMAL(10,2),
                rating INTEGER CHECK(rating >= 1 AND rating <= 5),
                notes TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating suppliers table:', err);
            else console.log('Suppliers table ready');
        });

        // Purchase orders table
        db.run(`
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                po_number TEXT UNIQUE NOT NULL,
                supplier_id INTEGER,
                order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                expected_date DATETIME,
                received_date DATETIME,
                status TEXT DEFAULT 'pending' CHECK(
                    status IN ('pending', 'approved', 'ordered', 'partial', 'received', 'cancelled')
                ),
                total_amount DECIMAL(10,2),
                tax_amount DECIMAL(10,2),
                discount_amount DECIMAL(10,2),
                shipping_cost DECIMAL(10,2),
                notes TEXT,
                created_by TEXT,
                approved_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
            )
        `, (err) => {
            if (err) console.error('Error creating purchase_orders table:', err);
            else console.log('Purchase orders table ready');
        });

        // Purchase order items table
        db.run(`
            CREATE TABLE IF NOT EXISTS po_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                po_id INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                quantity_ordered INTEGER NOT NULL,
                quantity_received INTEGER DEFAULT 0,
                unit_price DECIMAL(10,2),
                total_price DECIMAL(10,2),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating po_items table:', err);
            else console.log('PO items table ready');
        });

        // Inventory adjustments table
        db.run(`
            CREATE TABLE IF NOT EXISTS inventory_adjustments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                adjustment_id TEXT UNIQUE NOT NULL,
                product_id TEXT NOT NULL,
                adjustment_type TEXT NOT NULL CHECK(
                    adjustment_type IN ('damage', 'loss', 'expired', 'count_correction', 'other')
                ),
                quantity_adjusted INTEGER NOT NULL,
                old_quantity INTEGER,
                new_quantity INTEGER,
                reason TEXT NOT NULL,
                reference_document TEXT,
                adjusted_by TEXT NOT NULL,
                approved_by TEXT,
                adjustment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating inventory_adjustments table:', err);
            else console.log('Inventory adjustments table ready');
        });

        // Stock alerts table
        db.run(`
            CREATE TABLE IF NOT EXISTS stock_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id TEXT UNIQUE NOT NULL,
                product_id TEXT NOT NULL,
                alert_type TEXT NOT NULL CHECK(
                    alert_type IN ('low_stock', 'out_of_stock', 'overstock', 'expiring', 'expired')
                ),
                current_quantity INTEGER,
                threshold_quantity INTEGER,
                message TEXT,
                severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')),
                is_resolved INTEGER DEFAULT 0,
                resolved_by TEXT,
                resolved_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating stock_alerts table:', err);
            else console.log('Stock alerts table ready');
        });

        // Transactions table (compatibility table for existing code)
        db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT NOT NULL,
                action TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                performed_by TEXT,
                location TEXT,
                notes TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating transactions table:', err);
            else console.log('Transactions table ready');
        });

        // QR codes table (updated to match existing code expectations)
        db.run(`
            CREATE TABLE IF NOT EXISTS qr_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT UNIQUE NOT NULL,
                qr_data TEXT NOT NULL,
                qr_image_base64 TEXT,
                qr_image_path TEXT,
                qr_image_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating qr_codes table:', err);
            else console.log('QR codes table ready');
        });

        // Warehouses/Locations table
        db.run(`
            CREATE TABLE IF NOT EXISTS warehouses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                warehouse_code TEXT UNIQUE NOT NULL,
                warehouse_name TEXT NOT NULL,
                address TEXT,
                city TEXT,
                state TEXT,
                country TEXT,
                postal_code TEXT,
                manager_name TEXT,
                contact_phone TEXT,
                contact_email TEXT,
                capacity INTEGER,
                current_occupancy INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating warehouses table:', err);
            else {
                console.log('Warehouses table ready');
                // Re-enable foreign keys after all tables are created
                db.run("PRAGMA foreign_keys = ON", (err) => {
                    if (!err) console.log('Foreign keys re-enabled');
                });
            }
        });
    });
};

// Create default categories
const createDefaultCategories = () => {
    const categories = [
        { code: 'CLOTHING', name: 'Clothing', description: 'All clothing items' },
        { code: 'SHIRT', name: 'Shirts', description: 'All types of shirts' },
        { code: 'PANTS', name: 'Pants', description: 'All types of pants' },
        { code: 'JACKET', name: 'Jackets', description: 'All types of jackets' },
        { code: 'TSHIRT', name: 'T-Shirts', description: 'All types of t-shirts' },
        { code: 'ACCESSORIES', name: 'Accessories', description: 'Fashion accessories' },
        { code: 'ELECTRONICS', name: 'Electronics', description: 'Electronic items' },
        { code: 'RAW_MATERIAL', name: 'Raw Materials', description: 'Raw materials and fabrics' }
    ];

    categories.forEach(cat => {
        db.run(`
            INSERT OR IGNORE INTO categories (category_code, category_name, description)
            VALUES (?, ?, ?)
        `, [cat.code, cat.name, cat.description]);
    });

    // Create default warehouse
    db.run(`
        INSERT OR IGNORE INTO warehouses (
            warehouse_code, warehouse_name, address, city, state, country, capacity
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['WH-001', 'Main Warehouse', '123 Industrial Area', 'Mumbai', 'Maharashtra', 'India', 10000]);

    console.log('✓ Default categories and warehouse created');
};

// Helper functions
const generateProductId = (category) => {
    const prefix = category ? category.substring(0, 3).toUpperCase() : 'PRD';
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}-${timestamp}`;
};

const generateSKU = (category, size, color) => {
    const catCode = category ? category.substring(0, 3).toUpperCase() : 'XXX';
    const sizeCode = size ? size.substring(0, 1).toUpperCase() : 'X';
    const colorCode = color ? color.substring(0, 2).toUpperCase() : 'XX';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${catCode}-${sizeCode}-${colorCode}-${random}`;
};

const generateTransactionId = (type) => {
    const prefix = type === 'STOCK_IN' ? 'IN' : 
                  type === 'STOCK_OUT' ? 'OUT' : 
                  type === 'ADJUSTMENT' ? 'ADJ' : 'TRX';
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}-${timestamp}`;
};

const generatePONumber = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PO-${year}-${random}`;
};

// Stock level helpers
const checkStockLevel = (quantity, minStock, maxStock) => {
    if (quantity <= 0) return 'out_of_stock';
    if (quantity <= minStock) return 'low_stock';
    if (quantity >= maxStock) return 'overstock';
    return 'normal';
};

const createStockAlert = (productId, alertType, currentQty, threshold, message) => {
    const alertId = `ALERT-${Date.now().toString(36).toUpperCase()}`;
    const severity = alertType === 'out_of_stock' ? 'critical' :
                    alertType === 'low_stock' ? 'high' :
                    alertType === 'overstock' ? 'medium' : 'low';
    
    db.run(`
        INSERT INTO stock_alerts (
            alert_id, product_id, alert_type, current_quantity, 
            threshold_quantity, message, severity
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [alertId, productId, alertType, currentQty, threshold, message, severity]);
};

// Export database and helper functions
module.exports = {
    db,
    initializeDatabase,
    generateProductId,
    generateSKU,
    generateTransactionId,
    generatePONumber,
    checkStockLevel,
    createStockAlert
};