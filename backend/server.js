require('dotenv').config();

// Set timezone to IST
process.env.TZ = 'Asia/Kolkata';

const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
// Use SQLite instead of PostgreSQL
const databases = require('./database/index.js');
const { generateProductQR, generateUniqueProductId } = require('./qrGenerator');
const tailorRoutes = require('./tailorRoutes');
const { router: authRoutes } = require('./authRoutes');
const { validateOnStartup } = require('./routeValidator');

const app = express();
const PORT = process.env.PORT || 3000;

// SSL certificate paths
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
};

// Helper function to get current IST time
const getISTTime = () => {
  const now = new Date();
  // Add 5 hours 30 minutes to UTC to get IST
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString();
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

databases.initializeAllDatabases();

// Root route - serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'QR Inventory API', timestamp: new Date().toISOString() });
});

// Mount auth routes
app.use('/api/auth', authRoutes);

// Mount tailor management routes
app.use('/api/tailor', tailorRoutes);

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

    databases.inventory.db.run(
      `INSERT INTO products (product_id, name, type, size, color, quantity) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, name, type, size, color, initial_quantity],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        databases.inventory.db.run(
          `INSERT INTO qr_codes (product_id, qr_data, qr_image_base64, qr_image_path) 
           VALUES (?, ?, ?, ?)`,
          [product_id, qrResult.qrData, qrResult.dataURL, ''],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            if (initial_quantity > 0) {
              // Record initial stock transaction in the new transactions database
              databases.transactions.recordTransaction({
                product_id,
                product_name: name,
                category: type,
                size,
                color,
                transaction_type: 'INITIAL_STOCK',
                quantity: initial_quantity,
                previous_stock: 0,
                new_stock: initial_quantity,
                performed_by: 'System',
                location: 'Manufacturing',
                notes: 'Initial stock creation'
              });
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
    res.status(500).json({ error: error.message });
  }
});

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

    databases.inventory.db.get('SELECT * FROM products WHERE product_id = ?', [product_id], (err, product) => {
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

      databases.inventory.db.run(
        `UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
        [newQuantity, product_id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Record transaction in the new transactions database
          const transactionType = action === 'IN' || action === 'STOCK_IN' ? 'STOCK_IN' : 
                                 action === 'OUT' || action === 'STOCK_OUT' ? 'STOCK_OUT' : 'SALE';
          
          const transactionResult = databases.transactions.recordTransaction({
            product_id,
            product_name: product.name,
            category: product.type,
            size: product.size,
            color: product.color,
            transaction_type: transactionType,
            quantity,
            previous_stock: product.quantity,
            new_stock: newQuantity,
            performed_by,
            location,
            notes
          });

          res.json({
            success: true,
            product: {
              ...product,
              previous_quantity: product.quantity,
              new_quantity: newQuantity
            },
            transaction: {
              id: transactionResult.transactionId,
              action: transactionType,
              quantity,
              performed_by,
              location,
              timestamp: getISTTime()
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid QR code format' });
  }
});

app.get('/api/products', (req, res) => {
  // Only get active products (not deleted)
  databases.inventory.db.all('SELECT * FROM products WHERE status = "active" ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/api/products/:product_id', (req, res) => {
  const { product_id } = req.params;
  
  databases.inventory.db.get('SELECT * FROM products WHERE product_id = ? AND status = "active"', [product_id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    databases.inventory.db.get('SELECT * FROM qr_codes WHERE product_id = ?', [product_id], (err, qr) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      databases.inventory.db.all(
        'SELECT * FROM transactions WHERE product_id = ? ORDER BY timestamp DESC LIMIT 10',
        [product_id],
        (err, transactions) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({
            product,
            qr_code: qr ? qr.qr_image_base64 : null,
            recent_transactions: transactions
          });
        }
      );
    });
  });
});

// Soft delete product (set status to inactive)
app.delete('/api/products/:product_id', (req, res) => {
  const { product_id } = req.params;
  
  // First check if product exists
  databases.inventory.db.get(
    'SELECT * FROM products WHERE product_id = ? AND status = "active"',
    [product_id],
    (err, product) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found or already deleted' });
      }
      
      // Soft delete: set status to inactive
      databases.inventory.db.run(
        'UPDATE products SET status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
        [product_id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Record the deletion in transactions
          databases.transactions.recordTransaction({
            product_id: product_id,
            product_name: product.name,
            transaction_type: 'SALE',  // Using SALE as it will show as "Removed" in the UI
            quantity: product.quantity,
            previous_stock: product.quantity,
            new_stock: 0,
            performed_by: 'System',
            location: product.location || 'Unknown',
            notes: 'Product deleted from inventory'
          }, (err) => {
            if (err) {
              console.error('Error recording deletion transaction:', err);
            }
          });
          
          res.json({ 
            success: true, 
            message: 'Product deleted successfully',
            product_id: product_id
          });
        }
      );
    }
  );
});

app.get('/api/qr/:product_id', (req, res) => {
  const { product_id } = req.params;
  
  databases.inventory.db.get('SELECT qr_image_base64 FROM qr_codes WHERE product_id = ?', [product_id], (err, qr) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!qr) {
      return res.status(404).json({ error: 'QR code not found' });
    }
    
    res.json({ qr_image: qr.qr_image_base64 });
  });
});

// Transactions API endpoints
app.get('/api/transactions', (req, res) => {
  const { product_id, transaction_type, start_date, end_date, limit = 50 } = req.query;
  
  const filters = {
    product_id,
    transaction_type,
    start_date,
    end_date,
    limit: parseInt(limit)
  };
  
  databases.transactions.getAllTransactions(filters, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(transactions);
  });
});

app.get('/api/transactions/dashboard/stats', (req, res) => {
  databases.transactions.getDashboardStats((err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stats);
  });
});

app.get('/api/transactions/:id', (req, res) => {
  databases.transactions.getTransactionById(req.params.id, (err, transaction) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  });
});

app.get('/api/transactions/product/:productId', (req, res) => {
  databases.transactions.getProductTransactionHistory(req.params.productId, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(transactions);
  });
});

app.get('/api/transactions/summary/:productId', (req, res) => {
  databases.transactions.getProductTransactionSummary(req.params.productId, (err, summary) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(summary || { product_id: req.params.productId, message: 'No transactions yet' });
  });
});

app.get('/api/inventory/summary', (req, res) => {
  databases.inventory.db.all(
    `SELECT 
      type,
      size,
      SUM(quantity) as total_quantity,
      COUNT(*) as product_count
     FROM products 
     GROUP BY type, size
     ORDER BY type, size`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      databases.inventory.db.get('SELECT SUM(quantity) as total_items FROM products', [], (err, total) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          summary_by_type_size: rows,
          total_items: total.total_items || 0
        });
      });
    }
  );
});

// 404 handler for undefined API routes
app.use((req, res, next) => {
  // Only handle /api routes that haven't been matched
  if (req.path.startsWith('/api/')) {
    console.error(`[404] Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.originalUrl,
      method: req.method,
      message: 'The requested API endpoint does not exist. Please check the URL and try again.'
    });
  } else {
    next();
  }
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

// Get the local IP address
const os = require('os');
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
};

// Create HTTPS server and listen on all network interfaces (0.0.0.0)
const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n========================================');
  console.log('🚀 HTTPS Server Started Successfully!');
  console.log('========================================');
  console.log(`📍 Local: https://localhost:${PORT}`);
  console.log(`📍 Network: https://${localIP}:${PORT}`);
  console.log('\n🔐 Registered API Routes:');
  console.log('  ✓ /api/auth/* - Authentication endpoints');
  console.log('  ✓ /api/tailor/* - Tailor management');
  console.log('  ✓ /api/products/* - Product management');
  console.log('  ✓ /api/inventory/* - Inventory operations');
  console.log('  ✓ /api/transactions - Transaction logs');
  console.log('  ✓ /api/qr/* - QR code operations');
  console.log('\n⚠️  Note: Using self-signed certificate');
  console.log('   Browsers will show a security warning.');
  console.log('\n📝 Default Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('========================================\n');
  
  // Validate all routes are properly mounted
  validateOnStartup(app);
});