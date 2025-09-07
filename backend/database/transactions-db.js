const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'transactions.db');
const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Create transactions table
const createTransactionsTable = () => {
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT UNIQUE NOT NULL,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            category TEXT,
            size TEXT,
            color TEXT,
            transaction_type TEXT NOT NULL CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'SALE', 'RETURN', 'ADJUSTMENT', 'INITIAL_STOCK')),
            quantity INTEGER NOT NULL,
            previous_stock INTEGER,
            new_stock INTEGER,
            unit_price DECIMAL(10,2),
            total_amount DECIMAL(10,2),
            performed_by TEXT NOT NULL,
            location TEXT,
            warehouse_id INTEGER,
            reference_number TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating transactions table:', err);
        } else {
            console.log('Transactions table ready');
            
            // Create indexes for better performance
            db.run(`CREATE INDEX IF NOT EXISTS idx_product_id ON transactions(product_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_type ON transactions(transaction_type)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_created_at ON transactions(created_at)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_id ON transactions(transaction_id)`);
        }
    });
};

// Create transaction summary table for quick stats
const createTransactionSummaryTable = () => {
    db.run(`
        CREATE TABLE IF NOT EXISTS transaction_summary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT UNIQUE NOT NULL,
            total_stock_in INTEGER DEFAULT 0,
            total_stock_out INTEGER DEFAULT 0,
            total_sales INTEGER DEFAULT 0,
            total_returns INTEGER DEFAULT 0,
            current_stock INTEGER DEFAULT 0,
            last_transaction_date DATETIME,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating transaction summary table:', err);
        } else {
            console.log('Transaction summary table ready');
        }
    });
};

// Initialize database
const initializeDatabase = () => {
    createTransactionsTable();
    createTransactionSummaryTable();
};

// Generate unique transaction ID
const generateTransactionId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TXN-${year}${month}${day}-${random}`;
};

// Record a transaction
const recordTransaction = (transactionData, callback) => {
    const transactionId = generateTransactionId();
    
    db.run(`
        INSERT INTO transactions (
            transaction_id, product_id, product_name, category, size, color,
            transaction_type, quantity, previous_stock, new_stock,
            unit_price, total_amount, performed_by, location, warehouse_id,
            reference_number, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        transactionId,
        transactionData.product_id,
        transactionData.product_name,
        transactionData.category || null,
        transactionData.size || null,
        transactionData.color || null,
        transactionData.transaction_type,
        transactionData.quantity,
        transactionData.previous_stock || 0,
        transactionData.new_stock || 0,
        transactionData.unit_price || null,
        transactionData.total_amount || null,
        transactionData.performed_by,
        transactionData.location || null,
        transactionData.warehouse_id || null,
        transactionData.reference_number || null,
        transactionData.notes || null
    ], function(err) {
        if (err) {
            console.error('Error recording transaction:', err);
            if (callback) callback(err);
            return { success: false, error: err.message };
        }
        
        // Update transaction summary
        updateTransactionSummary(transactionData.product_id);
        
        const result = { success: true, transactionId, id: this.lastID };
        if (callback) callback(null, result);
        return result;
    });
    
    return { transactionId };
};

// Update transaction summary for a product
const updateTransactionSummary = (productId) => {
    db.get(`
        SELECT 
            SUM(CASE WHEN transaction_type = 'STOCK_IN' OR transaction_type = 'INITIAL_STOCK' THEN quantity ELSE 0 END) as total_in,
            SUM(CASE WHEN transaction_type = 'STOCK_OUT' OR transaction_type = 'SALE' THEN quantity ELSE 0 END) as total_out,
            SUM(CASE WHEN transaction_type = 'SALE' THEN quantity ELSE 0 END) as total_sales,
            SUM(CASE WHEN transaction_type = 'RETURN' THEN quantity ELSE 0 END) as total_returns,
            MAX(created_at) as last_date
        FROM transactions
        WHERE product_id = ?
    `, [productId], (err, stats) => {
        if (err) {
            console.error('Error calculating transaction summary:', err);
            return;
        }
        
        const currentStock = (stats.total_in || 0) - (stats.total_out || 0) + (stats.total_returns || 0);
        
        // Check if summary exists
        db.get('SELECT id FROM transaction_summary WHERE product_id = ?', [productId], (err, existing) => {
            if (err) {
                console.error('Error checking existing summary:', err);
                return;
            }
            
            if (existing) {
                db.run(`
                    UPDATE transaction_summary 
                    SET total_stock_in = ?, total_stock_out = ?, total_sales = ?, 
                        total_returns = ?, current_stock = ?, last_transaction_date = ?,
                        last_updated = CURRENT_TIMESTAMP
                    WHERE product_id = ?
                `, [
                    stats.total_in || 0,
                    stats.total_out || 0,
                    stats.total_sales || 0,
                    stats.total_returns || 0,
                    currentStock,
                    stats.last_date,
                    productId
                ]);
            } else {
                db.run(`
                    INSERT INTO transaction_summary (
                        product_id, total_stock_in, total_stock_out, total_sales,
                        total_returns, current_stock, last_transaction_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    productId,
                    stats.total_in || 0,
                    stats.total_out || 0,
                    stats.total_sales || 0,
                    stats.total_returns || 0,
                    currentStock,
                    stats.last_date
                ]);
            }
        });
    });
};

// Get all transactions
const getAllTransactions = (filters = {}, callback) => {
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];
    
    if (filters.product_id) {
        query += ' AND product_id = ?';
        params.push(filters.product_id);
    }
    
    if (filters.transaction_type) {
        query += ' AND transaction_type = ?';
        params.push(filters.transaction_type);
    }
    
    if (filters.start_date) {
        query += ' AND created_at >= ?';
        params.push(filters.start_date);
    }
    
    if (filters.end_date) {
        query += ' AND created_at <= ?';
        params.push(filters.end_date);
    }
    
    if (filters.performed_by) {
        query += ' AND performed_by = ?';
        params.push(filters.performed_by);
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
    }
    
    // If no callback provided, return empty array for backward compatibility
    if (!callback) {
        db.all(query, params, () => {});
        return [];
    }
    
    db.all(query, params, (err, rows) => {
        callback(err, rows || []);
    });
};

// Get transaction by ID
const getTransactionById = (transactionId, callback) => {
    db.get('SELECT * FROM transactions WHERE transaction_id = ?', [transactionId], (err, row) => {
        if (callback) {
            callback(err, row);
        }
    });
    return null;
};

// Get product transaction history
const getProductTransactionHistory = (productId, callback) => {
    db.all(`
        SELECT * FROM transactions 
        WHERE product_id = ? 
        ORDER BY created_at DESC
    `, [productId], (err, rows) => {
        if (callback) {
            callback(err, rows || []);
        }
    });
    return [];
};

// Get transaction summary for a product
const getProductTransactionSummary = (productId, callback) => {
    db.get('SELECT * FROM transaction_summary WHERE product_id = ?', [productId], (err, row) => {
        if (callback) {
            callback(err, row);
        }
    });
    return null;
};

// Get dashboard statistics
const getDashboardStats = (callback) => {
    const today = new Date().toISOString().split('T')[0];
    const stats = {};
    
    // Get today's transactions count
    db.get(`
        SELECT COUNT(*) as count FROM transactions 
        WHERE DATE(created_at) = DATE(?)
    `, [today], (err, result) => {
        stats.todayTransactions = result ? result.count : 0;
        
        // Get total transactions
        db.get('SELECT COUNT(*) as count FROM transactions', (err, result) => {
            stats.totalTransactions = result ? result.count : 0;
            
            // Get stock movements
            db.get(`
                SELECT 
                    SUM(CASE WHEN transaction_type IN ('STOCK_IN', 'INITIAL_STOCK') THEN quantity ELSE 0 END) as total_in,
                    SUM(CASE WHEN transaction_type IN ('STOCK_OUT', 'SALE') THEN quantity ELSE 0 END) as total_out
                FROM transactions
            `, (err, result) => {
                stats.totalStockMovements = result || { total_in: 0, total_out: 0 };
                
                // Get recent transactions
                db.all(`
                    SELECT * FROM transactions 
                    ORDER BY created_at DESC 
                    LIMIT 10
                `, (err, rows) => {
                    stats.recentTransactions = rows || [];
                    
                    if (callback) {
                        callback(null, stats);
                    }
                });
            });
        });
    });
    
    return null;
};

// Initialize database on module load
initializeDatabase();

module.exports = {
    db,
    initializeDatabase,
    recordTransaction,
    getAllTransactions,
    getTransactionById,
    getProductTransactionHistory,
    getProductTransactionSummary,
    getDashboardStats,
    updateTransactionSummary,
    generateTransactionId
};