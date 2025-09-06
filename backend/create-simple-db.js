const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a simple database that matches server expectations
const dbPath = path.join(__dirname, 'database', 'simple-inventory.db');
console.log('Creating simple inventory database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error creating database:', err);
    } else {
        console.log('Connected to new simple database');
    }
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// Create tables that match what server.js expects
db.serialize(() => {
    console.log('Creating products table...');
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            size TEXT,
            color TEXT,
            quantity INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creating products table:', err);
        else console.log('✓ Products table created');
    });

    console.log('Creating transactions table...');
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT NOT NULL,
            action TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            performed_by TEXT DEFAULT 'System',
            location TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creating transactions table:', err);
        else console.log('✓ Transactions table created');
    });

    console.log('Creating qr_codes table...');
    db.run(`
        CREATE TABLE IF NOT EXISTS qr_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT UNIQUE NOT NULL,
            qr_data TEXT NOT NULL,
            qr_image_base64 TEXT,
            qr_image_path TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creating qr_codes table:', err);
        else console.log('✓ QR codes table created');
    });

    // Close database
    setTimeout(() => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('✅ Simple database created successfully!');
                console.log('Database location:', dbPath);
            }
        });
    }, 1000);
});