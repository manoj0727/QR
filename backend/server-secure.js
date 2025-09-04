const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const os = require('os');
require('dotenv').config();

const { generateProductQR, generateUniqueProductId } = require('./qrGenerator');
const { db, initializeDatabase } = require('./database-sqlite'); // Using SQLite for local storage

// Initialize database tables
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Check if SSL certificates exist
let useHttps = false;
let credentials = null;

try {
    const privateKey = fs.readFileSync('key.pem', 'utf8');
    const certificate = fs.readFileSync('cert.pem', 'utf8');
    credentials = { key: privateKey, cert: certificate };
    useHttps = true;
} catch (err) {
    console.log('SSL certificates not found. Generating new ones...');
    // Generate certificates if they don't exist
    const { execSync } = require('child_process');
    try {
        execSync('openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=QRInventory/CN=localhost"');
        const privateKey = fs.readFileSync('key.pem', 'utf8');
        const certificate = fs.readFileSync('cert.pem', 'utf8');
        credentials = { key: privateKey, cert: certificate };
        useHttps = true;
        console.log('✅ SSL certificates generated successfully!');
    } catch (genErr) {
        console.error('Failed to generate SSL certificates:', genErr.message);
        console.log('Running in HTTP mode (camera features will not work)');
    }
}

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        // Allow any origin for local development
        callback(null, true);
    },
    credentials: true
}));

app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        database: 'SQLite',
        https: useHttps,
        protocol: req.protocol
    });
});

// Products endpoints
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, products) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(products);
    });
});

app.get('/api/products/:product_id', (req, res) => {
    const { product_id } = req.params;
    db.get('SELECT * FROM products WHERE product_id = ?', [product_id], (err, product) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json(product);
    });
});

app.post('/api/products/create', async (req, res) => {
    const { name, type, size, color, initial_quantity } = req.body;
    const product_id = generateUniqueProductId(type, size);
    const quantity = initial_quantity || 0;

    try {
        // Generate QR code
        const qrData = await generateProductQR({
            product_id,
            name,
            type,
            size,
            color
        });

        // Insert product
        db.run(
            `INSERT INTO products (product_id, name, type, size, color, quantity) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [product_id, name, type, size, color, quantity],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                const productDbId = this.lastID;

                // Store QR code
                db.run(
                    `INSERT INTO qr_codes (product_id, qr_data, qr_image_base64) VALUES (?, ?, ?)`,
                    [product_id, qrData.qrData, qrData.dataURL],
                    (err) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }

                        // Log initial inventory if quantity > 0
                        if (quantity > 0) {
                            db.run(
                                `INSERT INTO transactions (product_id, action, quantity, notes) 
                                 VALUES (?, 'in', ?, 'Initial stock')`,
                                [product_id, quantity],
                                (err) => {
                                    if (err) console.error('Error logging initial transaction:', err);
                                }
                            );
                        }

                        res.json({
                            success: true,
                            product_id: product_id,
                            qr_code: qrData.dataURL,
                            message: 'Product created successfully'
                        });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// QR Code endpoints
app.get('/api/qr/:product_id', (req, res) => {
    const { product_id } = req.params;
    db.get('SELECT * FROM qr_codes WHERE product_id = ?', [product_id], (err, qr) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!qr) {
            res.status(404).json({ error: 'QR code not found' });
            return;
        }
        res.json({
            qr_data: qr.qr_data,
            qr_image: qr.qr_image_base64.startsWith('data:') 
                ? qr.qr_image_base64 
                : `data:image/png;base64,${qr.qr_image_base64}`
        });
    });
});

// Inventory endpoints
app.post('/api/inventory/scan', (req, res) => {
    console.log('Received scan request:', req.body);
    const { qr_data, action, quantity = 1, performed_by = 'Unknown', location = '', notes = '' } = req.body;

    if (!qr_data || !action) {
        console.log('ERROR: Missing qr_data or action. Got:', { qr_data: !!qr_data, action: !!action });
        res.status(400).json({ error: 'SERVER-SECURE: QR data and action are required' });
        return;
    }

    // Parse QR data to get product_id
    let product_id;
    try {
        const parsedData = JSON.parse(qr_data);
        product_id = parsedData.product_id;
        
        if (!product_id) {
            res.status(400).json({ error: 'Invalid QR code data - missing product ID' });
            return;
        }
    } catch (error) {
        res.status(400).json({ error: 'Invalid QR code format' });
        return;
    }

    // Get current product
    db.get('SELECT * FROM products WHERE product_id = ?', [product_id], (err, product) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        let newQuantity = product.quantity;
        
        // Handle different action types
        if (action === 'IN' || action === 'STOCK_IN') {
            newQuantity += quantity;
        } else if (action === 'OUT' || action === 'SALE' || action === 'STOCK_OUT') {
            if (product.quantity < quantity) {
                res.status(400).json({ 
                    error: 'Insufficient stock', 
                    current_quantity: product.quantity,
                    requested: quantity 
                });
                return;
            }
            newQuantity -= quantity;
        } else {
            res.status(400).json({ error: 'Invalid action. Use IN or OUT' });
            return;
        }

        // Update product quantity
        db.run(
            'UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
            [newQuantity, product_id],
            (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                // Log transaction
                db.run(
                    `INSERT INTO transactions (product_id, action, quantity, performed_by, location, notes) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [product_id, action, quantity, performed_by, location, notes],
                    (err) => {
                        if (err) {
                            console.error('Transaction log error:', err);
                        }

                        res.json({
                            success: true,
                            product: {
                                ...product,
                                previous_quantity: product.quantity,
                                new_quantity: newQuantity,
                                name: product.name
                            },
                            transaction: {
                                action,
                                quantity,
                                performed_by,
                                location,
                                notes
                            }
                        });
                    }
                );
            }
        );
    });
});

app.get('/api/inventory/summary', (req, res) => {
    db.all(
        `SELECT 
            type,
            size,
            SUM(quantity) as total_quantity,
            COUNT(*) as product_count
         FROM products 
         GROUP BY type, size
         ORDER BY type, size`,
        [],
        (err, summary) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Get total items
            db.get('SELECT SUM(quantity) as total FROM products', [], (err, total) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({
                    summary_by_type_size: summary,
                    total_items: total.total || 0
                });
            });
        }
    );
});

// Transactions endpoint
app.get('/api/transactions', (req, res) => {
    const limit = req.query.limit || 100;
    db.all(
        `SELECT t.*, p.name as product_name, p.type, p.size, p.color 
         FROM transactions t 
         LEFT JOIN products p ON t.product_id = p.product_id 
         ORDER BY t.timestamp DESC 
         LIMIT ?`,
        [limit],
        (err, transactions) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(transactions);
        }
    );
});

// Tailor routes
const tailorRoutes = require('./tailorRoutes');
app.use('/api/tailor', tailorRoutes);

// Authentication routes
const { router: authRoutes } = require('./authRoutes');
app.use('/api/auth', authRoutes);

// Redirect root to login page
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Function to get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (let devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

// Start server
if (useHttps) {
    // Use HTTPS
    https.createServer(credentials, app).listen(PORT, '0.0.0.0', () => {
        const localIP = getLocalIP();
        console.log(`\n🔒 HTTPS Server is running on port ${PORT}`);
        console.log(`\n📱 Access URLs:`);
        console.log(`  - Local: https://localhost:${PORT}`);
        console.log(`  - Network: https://${localIP}:${PORT}`);
        console.log(`\n⚠️  Note: You'll see a security warning about the certificate.`);
        console.log(`   Click "Advanced" and "Proceed to localhost" to continue.`);
        console.log(`\n✅ Camera scanning will work with HTTPS!`);
    });
} else {
    // Fallback to HTTP if SSL fails
    app.listen(PORT, '0.0.0.0', () => {
        const localIP = getLocalIP();
        console.log(`\n⚠️  HTTP Server is running on port ${PORT} (Camera features disabled)`);
        console.log(`\n📱 Access URLs:`);
        console.log(`  - Local: http://localhost:${PORT}`);
        console.log(`  - Network: http://${localIP}:${PORT}`);
        console.log(`\n❌ Camera scanning requires HTTPS. Please ensure SSL certificates are generated.`);
    });
}