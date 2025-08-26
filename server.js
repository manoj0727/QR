const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { db, initializeDatabase } = require('./database');
const { generateProductQR, generateUniqueProductId } = require('./qrGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/qr_codes', express.static(path.join(__dirname, 'qr_codes')));
app.use(express.static(path.join(__dirname, 'public')));

initializeDatabase();

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

    db.run(
      `INSERT INTO products (product_id, name, type, size, color, quantity) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, name, type, size, color, initial_quantity],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.run(
          `INSERT INTO qr_codes (product_id, qr_data, qr_image_path) 
           VALUES (?, ?, ?)`,
          [product_id, qrResult.qrData, qrResult.fileName],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            if (initial_quantity > 0) {
              db.run(
                `INSERT INTO transactions (product_id, action, quantity, performed_by, location, notes)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [product_id, 'INITIAL_STOCK', initial_quantity, 'System', 'Manufacturing', 'Initial stock creation'],
                (err) => {
                  if (err) console.error('Transaction log error:', err);
                }
              );
            }

            res.json({
              success: true,
              product_id: product_id,
              qr_code: qrResult.dataURL,
              qr_file: `/qr_codes/${qrResult.fileName}`,
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
  const { qr_data, action, quantity = 1, performed_by = 'Unknown', location = '', notes = '' } = req.body;
  
  if (!qr_data || !action) {
    return res.status(400).json({ error: 'QR data and action are required' });
  }

  try {
    const parsedData = JSON.parse(qr_data);
    const product_id = parsedData.product_id;

    if (!product_id) {
      return res.status(400).json({ error: 'Invalid QR code data' });
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

      db.run(
        'UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
        [newQuantity, product_id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

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

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/api/products/:product_id', (req, res) => {
  const { product_id } = req.params;
  
  db.get('SELECT * FROM products WHERE product_id = ?', [product_id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    db.get('SELECT * FROM qr_codes WHERE product_id = ?', [product_id], (err, qr) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.all(
        'SELECT * FROM transactions WHERE product_id = ? ORDER BY timestamp DESC LIMIT 10',
        [product_id],
        (err, transactions) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({
            product,
            qr_code: qr ? `/qr_codes/${qr.qr_image_path}` : null,
            recent_transactions: transactions
          });
        }
      );
    });
  });
});

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
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      db.get('SELECT SUM(quantity) as total_items FROM products', [], (err, total) => {
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});