const express = require('express');
const router = express.Router();
const databases = require('./database');

// Helper function to generate unique IDs
const generateTailorId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TLR-${timestamp}-${random}`.toUpperCase();
};

const generateAssignmentId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ASN-${timestamp}-${random}`.toUpperCase();
};

const generateNotificationId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `NOT-${timestamp}-${random}`.toUpperCase();
};

// Register new tailor
router.post('/register', async (req, res) => {
  try {
    const result = await databases.tailors.registerTailor(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Authenticate tailor login
router.post('/login', async (req, res) => {
  try {
    const result = await databases.tailors.authenticateTailor(req.body.username, req.body.password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all tailors
router.get('/all', (req, res) => {
  databases.tailors.getAllTailors((err, tailors) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(tailors || []);
  });
});

// Get tailor by ID
router.get('/:id', (req, res) => {
  databases.tailors.getTailorById(req.params.id, (err, tailor) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!tailor) {
      return res.status(404).json({ error: 'Tailor not found' });
    }
    res.json(tailor);
  });
});

// Create assignment
router.post('/assignments', (req, res) => {
  const assignmentData = {
    assignment_id: generateAssignmentId(),
    ...req.body
  };

  databases.tailors.createAssignment(assignmentData, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// Get assignments for a tailor
router.get('/:id/assignments', (req, res) => {
  databases.tailors.getAssignmentsByTailor(req.params.id, (err, assignments) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(assignments || []);
  });
});

// Update assignment status
router.put('/assignments/:id/status', (req, res) => {
  databases.tailors.updateAssignmentStatus(req.params.id, req.body.status, req.body.notes || '', (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// Send notification
router.post('/notifications', (req, res) => {
  const notificationData = {
    notification_id: generateNotificationId(),
    ...req.body
  };

  databases.tailors.sendNotification(notificationData, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// Get notifications for a tailor
router.get('/:id/notifications', (req, res) => {
  databases.tailors.getNotificationsByTailor(req.params.id, (err, notifications) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(notifications || []);
  });
});

// Mark notification as read
router.put('/notifications/:id/read', (req, res) => {
  databases.tailors.db.run(
    'UPDATE notifications SET is_read = 1 WHERE notification_id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Notification marked as read' });
    }
  );
});

// Dashboard stats for admin
router.get('/stats/dashboard', (req, res) => {
  const stats = {};
  
  // Get total tailors
  databases.tailors.db.get(
    'SELECT COUNT(*) as total, COUNT(CASE WHEN status = "active" THEN 1 END) as active FROM tailors',
    (err, tailorStats) => {
      if (err) return res.status(500).json({ error: err.message });
      
      stats.tailors = tailorStats;
      
      // Get assignment stats
      databases.tailors.db.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM assignments`,
        (err, assignmentStats) => {
          if (err) return res.status(500).json({ error: err.message });
          
          stats.assignments = assignmentStats;
          res.json(stats);
        }
      );
    }
  );
});

module.exports = router;