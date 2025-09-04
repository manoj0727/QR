const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in the backend directory
const dbPath = path.join(__dirname, 'inventory.db');
console.log('Using SQLite database at:', dbPath);

// Create a new database instance
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

const initializeDatabase = () => {
    db.serialize(() => {
        // Products table
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                size TEXT NOT NULL,
                color TEXT,
                quantity INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating products table:', err);
            else console.log('Products table ready');
        });

        // Transactions table
        db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT NOT NULL,
                action TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                performed_by TEXT,
                location TEXT,
                notes TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating transactions table:', err);
            else console.log('Transactions table ready');
        });

        // QR Codes table
        db.run(`
            CREATE TABLE IF NOT EXISTS qr_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT UNIQUE NOT NULL,
                qr_data TEXT NOT NULL,
                qr_image_base64 TEXT,
                qr_image_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating qr_codes table:', err);
            else console.log('QR codes table ready');
        });

        // Tailors table
        db.run(`
            CREATE TABLE IF NOT EXISTS tailors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tailor_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                specialization TEXT,
                contact_number TEXT,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating tailors table:', err);
            else console.log('Tailors table ready');
        });

        // Work assignments table
        db.run(`
            CREATE TABLE IF NOT EXISTS work_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assignment_id TEXT UNIQUE NOT NULL,
                tailor_id TEXT NOT NULL,
                product_id TEXT,
                garment_type TEXT NOT NULL,
                fabric_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                expected_date DATETIME,
                completed_date DATETIME,
                status TEXT DEFAULT 'assigned',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating work_assignments table:', err);
            else console.log('Work assignments table ready');
        });

        // Fabrics table
        db.run(`
            CREATE TABLE IF NOT EXISTS fabrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fabric_id TEXT UNIQUE NOT NULL,
                fabric_type TEXT NOT NULL,
                color TEXT,
                quantity_meters REAL,
                location TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating fabrics table:', err);
            else console.log('Fabrics table ready');
        });

        console.log('SQLite database initialized successfully');
    });
};

// Export the database instance and initialization function
module.exports = { db, initializeDatabase };