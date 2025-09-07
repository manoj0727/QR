const express = require('express');
const router = express.Router();
const databases = require('./database');

// Helper function to generate unique IDs
const generateEmployeeId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `EMP-${timestamp}-${random}`.toUpperCase();
};

const generateNotificationId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `NOT-${timestamp}-${random}`.toUpperCase();
};

// Register new employee
router.post('/register', async (req, res) => {
  try {
    const result = await databases.employees.registerEmployee(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Authenticate employee login
router.post('/login', async (req, res) => {
  try {
    const result = await databases.employees.authenticateEmployee(req.body.username, req.body.password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all employees
router.get('/all', (req, res) => {
  databases.employees.getAllEmployees((err, employees) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(employees || []);
  });
});

// Employee logout
router.post('/logout', (req, res) => {
  const { employee_id } = req.body;
  
  if (employee_id) {
    // Record logout activity
    databases.employees.recordActivity({
      employee_id,
      activity_type: 'logout',
      details: 'Employee logged out'
    }, (err) => {
      if (err) {
        console.error('Error recording logout activity:', err);
      }
    });
  }
  
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get employee by ID
router.get('/:id', (req, res) => {
  databases.employees.getEmployeeById(req.params.id, (err, employee) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  });
});

// Send notification to employee(s)
router.post('/notifications', (req, res) => {
  const { employee_id, title, message, type } = req.body;
  
  if (employee_id) {
    // Send to specific employee
    const notificationData = {
      notification_id: generateNotificationId(),
      employee_id,
      title,
      message,
      type: type || 'info'
    };

    databases.employees.sendNotification(notificationData, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(result);
    });
  } else {
    // Send to all employees
    databases.employees.getAllEmployees((err, employees) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      let completed = 0;
      let errors = [];
      const totalEmployees = employees.length;
      
      if (totalEmployees === 0) {
        return res.json({ 
          success: true, 
          message: 'No employees to send notifications to' 
        });
      }
      
      employees.forEach((employee) => {
        const notificationData = {
          notification_id: generateNotificationId(),
          employee_id: employee.employee_id,
          title,
          message,
          type: type || 'info'
        };
        
        databases.employees.sendNotification(notificationData, (err) => {
          completed++;
          
          if (err) {
            errors.push({ employee_id: employee.employee_id, error: err.message });
          }
          
          // Check if all notifications are sent
          if (completed === totalEmployees) {
            if (errors.length === 0) {
              res.json({ 
                success: true, 
                message: `Notification sent to ${totalEmployees} employees successfully` 
              });
            } else {
              res.json({ 
                success: true, 
                message: `Notification sent to ${totalEmployees - errors.length} employees, ${errors.length} failed`,
                errors: errors
              });
            }
          }
        });
      });
    });
  }
});

// Get notifications for an employee
router.get('/:id/notifications', (req, res) => {
  databases.employees.getNotificationsByEmployee(req.params.id, (err, notifications) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(notifications || []);
  });
});

// Mark notification as read
router.put('/notifications/:id/read', (req, res) => {
  databases.employees.db.run(
    'UPDATE employee_notifications SET is_read = 1 WHERE notification_id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Notification marked as read' });
    }
  );
});

// Record employee activity
router.post('/activities', (req, res) => {
  databases.employees.recordActivity(req.body, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// Get activities for an employee
router.get('/:id/activities', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  databases.employees.getEmployeeActivities(req.params.id, limit, (err, activities) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(activities || []);
  });
});

// Update employee performance
router.post('/:id/performance', (req, res) => {
  databases.employees.updateEmployeePerformance(req.params.id, req.body, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// Get employee performance
router.get('/:id/performance', (req, res) => {
  databases.employees.getEmployeePerformance(req.params.id, (err, performance) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(performance || []);
  });
});

// Employee QR operations
router.post('/qr/create', async (req, res) => {
  const { employee_id, product_data } = req.body;
  
  if (!employee_id || !product_data) {
    return res.status(400).json({ error: 'Employee ID and product data are required' });
  }

  try {
    // Use the existing product creation API
    const { generateProductQR, generateUniqueProductId } = require('./qrGenerator');
    
    const product_id = generateUniqueProductId(product_data.type, product_data.size);
    
    const qrResult = await generateProductQR({
      product_id,
      name: product_data.name,
      type: product_data.type,
      size: product_data.size,
      color: product_data.color
    });

    // Add to inventory
    databases.inventory.db.run(
      `INSERT INTO products (product_id, name, type, size, color, quantity) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, product_data.name, product_data.type, product_data.size, product_data.color, product_data.initial_quantity || 0],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Add QR code
        databases.inventory.db.run(
          `INSERT INTO qr_codes (product_id, qr_data, qr_image_base64, qr_image_path) 
           VALUES (?, ?, ?, ?)`,
          [product_id, qrResult.qrData, qrResult.dataURL, ''],
          (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Record activity
            databases.employees.recordActivity({
              employee_id,
              activity_type: 'qr_create',
              product_id,
              product_name: product_data.name,
              details: `Created QR code for ${product_data.name}`
            });

            // Update performance
            databases.employees.updateEmployeePerformance(employee_id, {
              qr_codes_created: 1
            });

            res.json({
              success: true,
              product_id,
              qr_code: qrResult.dataURL,
              message: 'QR code created successfully'
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Employee QR scan
router.post('/qr/scan', (req, res) => {
  const { employee_id, qr_data, action, quantity = 1, location = '', notes = '' } = req.body;
  
  if (!employee_id || !qr_data || !action) {
    return res.status(400).json({ error: 'Employee ID, QR data, and action are required' });
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

          // Record transaction
          const transactionType = action === 'IN' || action === 'STOCK_IN' ? 'STOCK_IN' : 
                                 action === 'OUT' || action === 'STOCK_OUT' ? 'STOCK_OUT' : 'SALE';
          
          databases.transactions.recordTransaction({
            product_id,
            product_name: product.name,
            category: product.type,
            size: product.size,
            color: product.color,
            transaction_type: transactionType,
            quantity,
            previous_stock: product.quantity,
            new_stock: newQuantity,
            performed_by: employee_id,
            location,
            notes
          });

          // Record employee activity
          databases.employees.recordActivity({
            employee_id,
            activity_type: 'qr_scan',
            product_id,
            product_name: product.name,
            details: `Scanned QR code: ${action} ${quantity} items`,
            location
          });

          // Update performance
          databases.employees.updateEmployeePerformance(employee_id, {
            qr_codes_scanned: 1
          });

          res.json({
            success: true,
            product: {
              ...product,
              previous_quantity: product.quantity,
              new_quantity: newQuantity
            },
            action: transactionType,
            quantity,
            performed_by: employee_id,
            location
          });
        }
      );
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid QR code format' });
  }
});

// Get inventory for employee (read-only)
router.get('/inventory/:employee_id', (req, res) => {
  const { employee_id } = req.params;
  
  // Record activity
  databases.employees.recordActivity({
    employee_id,
    activity_type: 'inventory_view',
    details: 'Viewed inventory list'
  });

  // Update performance
  databases.employees.updateEmployeePerformance(employee_id, {
    inventory_items_viewed: 1
  });

  // Get inventory
  databases.inventory.db.all('SELECT * FROM products WHERE status = "active" ORDER BY created_at DESC', [], (err, products) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(products);
  });
});

// Dashboard stats for employee
router.get('/stats/:employee_id', (req, res) => {
  const { employee_id } = req.params;
  const stats = {};
  
  // Get employee activities count
  databases.employees.db.get(
    `SELECT 
      COUNT(CASE WHEN activity_type = 'qr_create' THEN 1 END) as qr_created,
      COUNT(CASE WHEN activity_type = 'qr_scan' THEN 1 END) as qr_scanned,
      COUNT(CASE WHEN activity_type = 'inventory_view' THEN 1 END) as inventory_viewed,
      COUNT(*) as total_activities
    FROM employee_activities 
    WHERE employee_id = ? AND DATE(created_at) = DATE('now')`,
    [employee_id],
    (err, activityStats) => {
      if (err) return res.status(500).json({ error: err.message });
      
      stats.today = activityStats;
      
      // Get unread notifications count
      databases.employees.db.get(
        'SELECT COUNT(*) as unread_count FROM employee_notifications WHERE employee_id = ? AND is_read = 0',
        [employee_id],
        (err, notificationStats) => {
          if (err) return res.status(500).json({ error: err.message });
          
          stats.notifications = notificationStats;
          res.json(stats);
        }
      );
    }
  );
});

module.exports = router;