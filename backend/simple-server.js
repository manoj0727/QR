require('dotenv').config();

// Set timezone to IST
process.env.TZ = 'Asia/Kolkata';

const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { generateProductQR, generateUniqueProductId } = require('./qrGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple database connection
const dbPath = path.join(__dirname, 'database', 'simple-inventory.db');
console.log('Connecting to database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to simple inventory database');
    }
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// SSL certificate paths
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
};

// Configure CORS for production
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '..')));

// Root route - serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'Simple QR Inventory API', timestamp: new Date().toISOString() });
});

// **FIXED PRODUCT CREATION API**
app.post('/api/products/create', async (req, res) => {
  const { name, type, size, color, initial_quantity = 0 } = req.body;
  
  if (!name || !type || !size) {
    return res.status(400).json({ error: 'Name, type, and size are required' });
  }

  try {
    const product_id = generateUniqueProductId(type, size);
    
    const qrResult = await generateProductQR({
      product_id,
      name,
      type,
      size,
      color
    });

    // Insert into products table (matching simple schema)
    db.run(
      `INSERT INTO products (product_id, name, type, size, color, quantity) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, name, type, size, color, initial_quantity],
      function(err) {
        if (err) {
          console.error('Product insert error:', err);
          return res.status(500).json({ error: err.message });
        }

        // Insert QR code (matching simple schema)
        db.run(
          `INSERT INTO qr_codes (product_id, qr_data, qr_image_base64, qr_image_path) 
           VALUES (?, ?, ?, ?)`,
          [product_id, qrResult.qrData, qrResult.dataURL, ''],
          (err) => {
            if (err) {
              console.error('QR insert error:', err);
              return res.status(500).json({ error: err.message });
            }

            // Insert initial transaction if quantity > 0 (matching simple schema)
            if (initial_quantity > 0) {
              db.run(
                `INSERT INTO transactions (product_id, action, quantity, performed_by, location, notes)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [product_id, 'INITIAL_STOCK', initial_quantity, 'System', 'Manufacturing', 'Initial stock creation'],
                (err) => {
                  if (err) console.error('Transaction insert error:', err);
                  else console.log('✓ Initial transaction created');
                }
              );
            }

            res.json({
              success: true,
              product_id: product_id,
              qr_code: qrResult.dataURL,
              message: 'Product created successfully'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// **FIXED INVENTORY SCAN API**
app.post('/api/inventory/scan', (req, res) => {
  console.log('Received scan request:', req.body);
  const { qr_data, action, quantity = 1, performed_by = 'Unknown', location = '', notes = '' } = req.body;
  
  if (!qr_data) {
    return res.status(400).json({ error: 'Missing QR data. Please scan a QR code first.' });
  }
  
  if (!action) {
    return res.status(400).json({ error: 'Missing action. Please select Add Items or Remove Items.' });
  }

  try {
    const parsedData = JSON.parse(qr_data);
    const product_id = parsedData.product_id;

    if (!product_id) {
      return res.status(400).json({ error: 'Invalid QR code data - missing product ID' });
    }

    db.get('SELECT * FROM products WHERE product_id = ?', [product_id], (err, product) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      let newQuantity = product.quantity;
      
      if (action === 'IN' || action === 'STOCK_IN') {
        newQuantity += quantity;
      } else if (action === 'OUT' || action === 'SALE' || action === 'STOCK_OUT') {
        if (product.quantity < quantity) {
          return res.status(400).json({ 
            error: 'Insufficient stock', 
            current_quantity: product.quantity,
            requested: quantity 
          });
        }
        newQuantity -= quantity;
      } else {
        return res.status(400).json({ error: 'Invalid action. Use IN or OUT' });
      }

      // Update product quantity
      db.run(
        `UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
        [newQuantity, product_id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Insert transaction record (using correct schema)
          db.run(
            `INSERT INTO transactions (product_id, action, quantity, performed_by, location, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [product_id, action, quantity, performed_by, location, notes],
            (err) => {
              if (err) {
                console.error('Transaction log error:', err);
              } else {
                console.log('✓ Transaction created');
              }

              res.json({
                success: true,
                product: {
                  ...product,
                  previous_quantity: product.quantity,
                  new_quantity: newQuantity
                },
                transaction: {
                  action,
                  quantity,
                  performed_by,
                  location,
                  timestamp: new Date().toISOString()
                }
              });
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid QR code format' });
  }
});

// **FIXED PRODUCTS LIST API**
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// **FIXED TRANSACTIONS LIST API**
app.get('/api/transactions', (req, res) => {
  const { product_id, limit = 50 } = req.query;
  
  let query = 'SELECT t.*, p.name, p.type, p.size FROM transactions t JOIN products p ON t.product_id = p.product_id';
  let params = [];
  
  if (product_id) {
    query += ' WHERE t.product_id = ?';
    params.push(product_id);
  }
  
  query += ' ORDER BY t.timestamp DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// **FIXED DASHBOARD STATS API**
app.get('/api/dashboard/stats', (req, res) => {
  const queries = [
    // Total products
    new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM products', [], (err, result) => {
        if (err) reject(err);
        else resolve({ totalProducts: result.count });
      });
    }),
    
    // Total items (sum of all quantities)
    new Promise((resolve, reject) => {
      db.get('SELECT SUM(quantity) as sum FROM products', [], (err, result) => {
        if (err) reject(err);
        else resolve({ totalItems: result.sum || 0 });
      });
    }),
    
    // Recent transactions count
    new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM transactions WHERE timestamp >= datetime("now", "-7 days")', 
        [], 
        (err, result) => {
          if (err) reject(err);
          else resolve({ recentTransactions: result.count });
        }
      );
    })
  ];
  
  Promise.all(queries)
    .then(results => {
      const stats = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      res.json(stats);
    })
    .catch(error => {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Create HTTPS server
const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('🚀 Simple HTTPS Server Started!');
  console.log('========================================');
  console.log(`📍 Local: https://localhost:${PORT}`);
  console.log('\n🔐 Registered API Routes:');
  console.log('  ✓ /api/products/* - Product management');
  console.log('  ✓ /api/inventory/scan - Inventory operations');  
  console.log('  ✓ /api/transactions - Transaction logs');
  console.log('  ✓ /api/dashboard/stats - Dashboard statistics');
  console.log('\n📊 Database: Simple schema with correct field names');
  console.log('========================================\n');
});