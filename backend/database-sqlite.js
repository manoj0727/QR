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

        // Users table for authentication
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                email TEXT,
                role TEXT NOT NULL DEFAULT 'employee',
                department TEXT,
                is_active INTEGER DEFAULT 1,
                last_login DATETIME,
                created_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating users table:', err);
            else {
                console.log('Users table ready');
                // Create default admin user if not exists
                const crypto = require('crypto');
                const adminPassword = crypto.createHash('sha256').update('admin123').digest('hex');
                db.run(`
                    INSERT OR IGNORE INTO users (user_id, username, password_hash, full_name, role, email) 
                    VALUES ('USR-ADMIN', 'admin', ?, 'System Administrator', 'admin', 'admin@qrinventory.com')
                `, [adminPassword], (err) => {
                    if (!err) console.log('Default admin user created (username: admin, password: admin123)');
                });
            }
        });

        // User sessions table
        db.run(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `, (err) => {
            if (err) console.error('Error creating user_sessions table:', err);
            else console.log('User sessions table ready');
        });

        // Activity logs table
        db.run(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                description TEXT,
                entity_type TEXT,
                entity_id TEXT,
                ip_address TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `, (err) => {
            if (err) console.error('Error creating activity_logs table:', err);
            else console.log('Activity logs table ready');
        });

        console.log('SQLite database initialized successfully');
    });
};

// Export the database instance and initialization function
module.exports = { db, initializeDatabase };