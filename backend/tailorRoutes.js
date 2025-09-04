const express = require('express');
const router = express.Router();
const { db } = require('./database-adapter');

// Helper function to generate unique IDs
const generateTailorId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TLR-${timestamp}-${random}`.toUpperCase();
};

const generateAssignmentId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `WRK-${timestamp}-${random}`.toUpperCase();
};

const generateFabricId = (type) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `FAB-${type.substring(0, 3)}-${timestamp}-${random}`.toUpperCase();
};

// Tailor Management Routes
router.post('/tailors/create', (req, res) => {
  const { name, specialization, contact_number } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const tailor_id = generateTailorId();

  db.run(
    `INSERT INTO tailors (tailor_id, name, specialization, contact_number, status) 
     VALUES (?, ?, ?, ?, 'active')`,
    [tailor_id, name, specialization, contact_number],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        tailor_id,
        message: 'Tailor registered successfully'
      });
    }
  );
});

router.get('/tailors', (req, res) => {
  const { status } = req.query;
  
  let query = 'SELECT * FROM tailors';
  let params = [];
  
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.get('/tailors/:tailor_id', (req, res) => {
  const { tailor_id } = req.params;
  
  db.get('SELECT * FROM tailors WHERE tailor_id = ?', [tailor_id], (err, tailor) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!tailor) {
      return res.status(404).json({ error: 'Tailor not found' });
    }

    // Get current and completed assignments for this tailor
    db.all(
      `SELECT * FROM work_assignments 
       WHERE tailor_id = ? 
       ORDER BY assigned_date DESC`,
      [tailor_id],
      (err, assignments) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          tailor,
          assignments,
          current_assignments: assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length,
          completed_assignments: assignments.filter(a => a.status === 'completed').length
        });
      }
    );
  });
});

router.put('/tailors/:tailor_id/status', (req, res) => {
  const { tailor_id } = req.params;
  const { status } = req.body;
  
  if (!['active', 'inactive', 'on_leave'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(
    `UPDATE tailors SET status = ? WHERE tailor_id = ?`,
    [status, tailor_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        message: 'Tailor status updated'
      });
    }
  );
});

// Work Assignment Routes
router.post('/assignments/create', (req, res) => {
  const { 
    tailor_id, 
    product_id, 
    garment_type, 
    fabric_type, 
    quantity, 
    expected_date,
    notes 
  } = req.body;
  
  if (!tailor_id || !garment_type || !fabric_type || !quantity) {
    return res.status(400).json({ 
      error: 'Tailor, garment type, fabric type, and quantity are required' 
    });
  }

  const assignment_id = generateAssignmentId();

  db.run(
    `INSERT INTO work_assignments 
     (assignment_id, tailor_id, product_id, garment_type, fabric_type, 
      quantity, expected_date, status, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'assigned', ?)`,
    [assignment_id, tailor_id, product_id, garment_type, fabric_type, 
     quantity, expected_date, notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        assignment_id,
        message: 'Work assigned successfully'
      });
    }
  );
});

router.get('/assignments', (req, res) => {
  const { tailor_id, status, from_date, to_date } = req.query;
  
  let query = `
    SELECT wa.*, t.name as tailor_name, p.name as product_name 
    FROM work_assignments wa
    JOIN tailors t ON wa.tailor_id = t.tailor_id
    LEFT JOIN products p ON wa.product_id = p.product_id
    WHERE 1=1
  `;
  let params = [];
  
  if (tailor_id) {
    query += ' AND wa.tailor_id = ?';
    params.push(tailor_id);
  }
  
  if (status) {
    query += ' AND wa.status = ?';
    params.push(status);
  }
  
  if (from_date) {
    query += ' AND wa.assigned_date >= ?';
    params.push(from_date);
  }
  
  if (to_date) {
    query += ' AND wa.assigned_date <= ?';
    params.push(to_date);
  }
  
  query += ' ORDER BY wa.assigned_date DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.put('/assignments/:assignment_id/status', (req, res) => {
  const { assignment_id } = req.params;
  const { status, notes } = req.body;
  
  if (!['assigned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  let updateQuery = `UPDATE work_assignments SET status = ?`;
  let params = [status];

  if (status === 'completed') {
    updateQuery += `, completed_date = CURRENT_TIMESTAMP`;
  }

  if (notes) {
    updateQuery += `, notes = ?`;
    params.push(notes);
  }

  updateQuery += ` WHERE assignment_id = ?`;
  params.push(assignment_id);

  db.run(updateQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      success: true,
      message: 'Assignment status updated'
    });
  });
});

router.get('/assignments/:assignment_id', (req, res) => {
  const { assignment_id } = req.params;
  
  db.get(
    `SELECT wa.*, t.name as tailor_name, t.contact_number as tailor_contact,
            p.name as product_name, p.type as product_type, p.size as product_size
     FROM work_assignments wa
     JOIN tailors t ON wa.tailor_id = t.tailor_id
     LEFT JOIN products p ON wa.product_id = p.product_id
     WHERE wa.assignment_id = ?`,
    [assignment_id],
    (err, assignment) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      res.json(assignment);
    }
  );
});

// Fabric Management Routes
router.post('/fabrics/create', (req, res) => {
  const { fabric_type, color, quantity_meters, location } = req.body;
  
  if (!fabric_type || !quantity_meters) {
    return res.status(400).json({ 
      error: 'Fabric type and quantity are required' 
    });
  }

  const fabric_id = generateFabricId(fabric_type);

  db.run(
    `INSERT INTO fabrics (fabric_id, fabric_type, color, quantity_meters, location) 
     VALUES (?, ?, ?, ?, ?)`,
    [fabric_id, fabric_type, color, quantity_meters, location],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        fabric_id,
        message: 'Fabric added successfully'
      });
    }
  );
});

router.get('/fabrics', (req, res) => {
  const { fabric_type, location } = req.query;
  
  let query = 'SELECT * FROM fabrics WHERE 1=1';
  let params = [];
  
  if (fabric_type) {
    query += ' AND fabric_type = ?';
    params.push(fabric_type);
  }
  
  if (location) {
    query += ' AND location = ?';
    params.push(location);
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.put('/fabrics/:fabric_id/update-quantity', (req, res) => {
  const { fabric_id } = req.params;
  const { quantity_meters, action } = req.body;
  
  if (!quantity_meters || !action) {
    return res.status(400).json({ 
      error: 'Quantity and action (add/remove) are required' 
    });
  }

  // First get current quantity
  db.get('SELECT quantity_meters FROM fabrics WHERE fabric_id = ?', [fabric_id], (err, fabric) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!fabric) {
      return res.status(404).json({ error: 'Fabric not found' });
    }

    let newQuantity = parseFloat(fabric.quantity_meters);
    if (action === 'add') {
      newQuantity += parseFloat(quantity_meters);
    } else if (action === 'remove') {
      newQuantity -= parseFloat(quantity_meters);
      if (newQuantity < 0) {
        return res.status(400).json({ 
          error: 'Insufficient fabric quantity',
          current: fabric.quantity_meters,
          requested: quantity_meters
        });
      }
    } else {
      return res.status(400).json({ error: 'Invalid action. Use add or remove' });
    }

    db.run(
      `UPDATE fabrics SET quantity_meters = ? WHERE fabric_id = ?`,
      [newQuantity, fabric_id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          success: true,
          message: 'Fabric quantity updated',
          previous_quantity: fabric.quantity_meters,
          new_quantity: newQuantity
        });
      }
    );
  });
});

// Dashboard Statistics
router.get('/dashboard/tailor-stats', (req, res) => {
  db.all(
    `SELECT 
      COUNT(DISTINCT t.tailor_id) as total_tailors,
      COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.tailor_id END) as active_tailors,
      COUNT(DISTINCT wa.assignment_id) as total_assignments,
      COUNT(DISTINCT CASE WHEN wa.status = 'assigned' THEN wa.assignment_id END) as pending_assignments,
      COUNT(DISTINCT CASE WHEN wa.status = 'in_progress' THEN wa.assignment_id END) as in_progress_assignments,
      COUNT(DISTINCT CASE WHEN wa.status = 'completed' THEN wa.assignment_id END) as completed_assignments
     FROM tailors t
     LEFT JOIN work_assignments wa ON t.tailor_id = wa.tailor_id`,
    [],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(stats[0]);
    }
  );
});

module.exports = router;