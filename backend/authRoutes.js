const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const databases = require('./database');

// Helper function to generate session ID
const generateSessionId = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Helper function to generate user ID
const generateUserId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `USR-${timestamp}-${random}`.toUpperCase();
};

// Helper function to hash password
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Middleware to verify session
const verifySession = (req, res, next) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionId) {
        return res.status(401).json({ error: 'No session token provided' });
    }
    
    databases.users.db.get(
        `SELECT s.*, u.* FROM user_sessions s 
         JOIN users u ON s.user_id = u.user_id 
         WHERE s.session_id = ? AND s.expires_at > datetime('now') AND u.is_active = 1`,
        [sessionId],
        (err, session) => {
            if (err || !session) {
                return res.status(401).json({ error: 'Invalid or expired session' });
            }
            
            req.user = {
                user_id: session.user_id,
                username: session.username,
                full_name: session.full_name,
                role: session.role,
                department: session.department
            };
            next();
        }
    );
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Login endpoint
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const passwordHash = hashPassword(password);
    
    databases.users.db.get(
        'SELECT * FROM users WHERE username = ? AND password_hash = ? AND is_active = 1',
        [username, passwordHash],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Create session
            const sessionId = generateSessionId();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            
            databases.users.db.run(
                `INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent, expires_at) 
                 VALUES (?, ?, ?, ?, ?)`,
                [sessionId, user.user_id, req.ip, req.headers['user-agent'], expiresAt.toISOString()],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create session' });
                    }
                    
                    // Update last login
                    databases.users.db.run(
                        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
                        [user.user_id]
                    );
                    
                    // Log activity
                    databases.users.db.run(
                        `INSERT INTO activity_logs (user_id, action_type, description, ip_address) 
                         VALUES (?, 'LOGIN', 'User logged in', ?)`,
                        [user.user_id, req.ip]
                    );
                    
                    res.json({
                        success: true,
                        session_id: sessionId,
                        user: {
                            user_id: user.user_id,
                            username: user.username,
                            full_name: user.full_name,
                            role: user.role,
                            department: user.department,
                            email: user.email
                        }
                    });
                }
            );
        }
    );
});

// Logout endpoint
router.post('/logout', verifySession, (req, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    databases.users.db.run('DELETE FROM user_sessions WHERE session_id = ?', [sessionId], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        
        // Log activity
        databases.users.db.run(
            `INSERT INTO activity_logs (user_id, action_type, description, ip_address) 
             VALUES (?, 'LOGOUT', 'User logged out', ?)`,
            [req.user.user_id, req.ip]
        );
        
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Get current user info
router.get('/me', verifySession, (req, res) => {
    res.json({ success: true, user: req.user });
});

// Create new user (Admin only)
router.post('/users/create', verifySession, requireAdmin, (req, res) => {
    const { username, password, full_name, email, role, department } = req.body;
    
    if (!username || !password || !full_name || !role) {
        return res.status(400).json({ error: 'Required fields missing' });
    }
    
    const userId = generateUserId();
    const passwordHash = hashPassword(password);
    
    databases.users.db.run(
        `INSERT INTO users (user_id, username, password_hash, full_name, email, role, department, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, username, passwordHash, full_name, email, role, department, req.user.user_id],
        (err) => {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Failed to create user' });
            }
            
            // Log activity
            databases.users.db.run(
                `INSERT INTO activity_logs (user_id, action_type, description, entity_type, entity_id, ip_address) 
                 VALUES (?, 'CREATE_USER', ?, 'USER', ?, ?)`,
                [req.user.user_id, `Created user: ${username}`, userId, req.ip]
            );
            
            res.json({
                success: true,
                user_id: userId,
                message: 'User created successfully'
            });
        }
    );
});

// Get all users (Admin only)
router.get('/users', verifySession, requireAdmin, (req, res) => {
    db.all(
        `SELECT user_id, username, full_name, email, role, department, is_active, last_login, created_at 
         FROM users ORDER BY created_at DESC`,
        [],
        (err, users) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch users' });
            }
            res.json({ success: true, users });
        }
    );
});

// Update user (Admin only)
router.put('/users/:user_id', verifySession, requireAdmin, (req, res) => {
    const { user_id } = req.params;
    const { full_name, email, role, department, is_active, password } = req.body;
    
    let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    let params = [];
    
    if (full_name !== undefined) {
        updateQuery += ', full_name = ?';
        params.push(full_name);
    }
    if (email !== undefined) {
        updateQuery += ', email = ?';
        params.push(email);
    }
    if (role !== undefined) {
        updateQuery += ', role = ?';
        params.push(role);
    }
    if (department !== undefined) {
        updateQuery += ', department = ?';
        params.push(department);
    }
    if (is_active !== undefined) {
        updateQuery += ', is_active = ?';
        params.push(is_active ? 1 : 0);
    }
    if (password) {
        updateQuery += ', password_hash = ?';
        params.push(hashPassword(password));
    }
    
    updateQuery += ' WHERE user_id = ?';
    params.push(user_id);
    
    databases.users.db.run(updateQuery, params, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update user' });
        }
        
        // Log activity
        databases.users.db.run(
            `INSERT INTO activity_logs (user_id, action_type, description, entity_type, entity_id, ip_address) 
             VALUES (?, 'UPDATE_USER', ?, 'USER', ?, ?)`,
            [req.user.user_id, `Updated user: ${user_id}`, user_id, req.ip]
        );
        
        res.json({ success: true, message: 'User updated successfully' });
    });
});

// Delete user (Admin only)
router.delete('/users/:user_id', verifySession, requireAdmin, (req, res) => {
    const { user_id } = req.params;
    
    if (user_id === 'USR-ADMIN') {
        return res.status(400).json({ error: 'Cannot delete admin user' });
    }
    
    databases.users.db.run('UPDATE users SET is_active = 0 WHERE user_id = ?', [user_id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete user' });
        }
        
        // Log activity
        databases.users.db.run(
            `INSERT INTO activity_logs (user_id, action_type, description, entity_type, entity_id, ip_address) 
             VALUES (?, 'DELETE_USER', ?, 'USER', ?, ?)`,
            [req.user.user_id, `Deactivated user: ${user_id}`, user_id, req.ip]
        );
        
        res.json({ success: true, message: 'User deactivated successfully' });
    });
});

// Get activity logs (Admin only)
router.get('/activity-logs', verifySession, requireAdmin, (req, res) => {
    const { user_id, limit = 100 } = req.query;
    
    let query = `
        SELECT a.*, u.username, u.full_name 
        FROM activity_logs a 
        JOIN users u ON a.user_id = u.user_id
    `;
    let params = [];
    
    if (user_id) {
        query += ' WHERE a.user_id = ?';
        params.push(user_id);
    }
    
    query += ' ORDER BY a.timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, logs) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch activity logs' });
        }
        res.json({ success: true, logs });
    });
});

// Get dashboard stats (Admin only)
router.get('/admin/stats', verifySession, requireAdmin, (req, res) => {
    const stats = {};
    
    // Get user stats
    databases.users.db.get('SELECT COUNT(*) as total_users, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users FROM users', (err, userStats) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch stats' });
        stats.users = userStats;
        
        // Get activity stats for today
        databases.users.db.get(
            `SELECT COUNT(*) as today_activities FROM activity_logs 
             WHERE DATE(timestamp) = DATE('now')`,
            (err, activityStats) => {
                if (err) return res.status(500).json({ error: 'Failed to fetch stats' });
                stats.today_activities = activityStats.today_activities;
                
                // Get active sessions
                databases.users.db.get(
                    `SELECT COUNT(*) as active_sessions FROM user_sessions 
                     WHERE expires_at > datetime('now')`,
                    (err, sessionStats) => {
                        if (err) return res.status(500).json({ error: 'Failed to fetch stats' });
                        stats.active_sessions = sessionStats.active_sessions;
                        
                        // Get recent activities
                        db.all(
                            `SELECT a.*, u.username, u.full_name 
                             FROM activity_logs a 
                             JOIN users u ON a.user_id = u.user_id 
                             ORDER BY a.timestamp DESC 
                             LIMIT 10`,
                            (err, recentActivities) => {
                                if (err) return res.status(500).json({ error: 'Failed to fetch stats' });
                                stats.recent_activities = recentActivities;
                                
                                res.json({ success: true, stats });
                            }
                        );
                    }
                );
            }
        );
    });
});

module.exports = { router, verifySession };