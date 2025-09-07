const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Create employee database
const dbPath = path.join(__dirname, 'employees.db');
console.log('Employee database location:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening employee database:', err);
    } else {
        console.log('Connected to employee database');
    }
});

// Initialize database schema
const initializeDatabase = () => {
    db.serialize(() => {
        // Employees table
        db.run(`
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                department TEXT,
                role TEXT DEFAULT 'employee' CHECK(role IN ('employee', 'supervisor', 'manager')),
                status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating employees table:', err);
            else console.log('Employees table ready');
        });

        // Employee notifications table
        db.run(`
            CREATE TABLE IF NOT EXISTS employee_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                notification_id TEXT UNIQUE NOT NULL,
                employee_id TEXT NOT NULL,
                type TEXT DEFAULT 'info' CHECK(type IN ('info', 'task', 'reminder', 'urgent', 'system', 'inventory')),
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                read_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating employee_notifications table:', err);
            else console.log('Employee notifications table ready');
        });

        // Employee activities table (for tracking QR operations)
        db.run(`
            CREATE TABLE IF NOT EXISTS employee_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activity_id TEXT UNIQUE NOT NULL,
                employee_id TEXT NOT NULL,
                activity_type TEXT NOT NULL CHECK(activity_type IN ('qr_create', 'qr_scan', 'inventory_view', 'login', 'logout')),
                product_id TEXT,
                product_name TEXT,
                details TEXT,
                location TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating employee_activities table:', err);
            else console.log('Employee activities table ready');
        });

        // Employee performance metrics table
        db.run(`
            CREATE TABLE IF NOT EXISTS employee_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT NOT NULL,
                date DATE NOT NULL,
                qr_codes_created INTEGER DEFAULT 0,
                qr_codes_scanned INTEGER DEFAULT 0,
                inventory_items_viewed INTEGER DEFAULT 0,
                total_activities INTEGER DEFAULT 0,
                efficiency_score REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating employee_performance table:', err);
            else console.log('Employee performance table ready');
        });
    });
};

// Helper functions
const generateEmployeeId = () => {
    return 'EMP-' + Date.now().toString(36).toUpperCase();
};

const generateActivityId = () => {
    return 'ACT-' + Date.now().toString(36).toUpperCase();
};

const generateNotificationId = () => {
    return 'NOT-' + Date.now().toString(36).toUpperCase();
};

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const verifyPassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

// Business logic functions
const registerEmployee = async (employeeData) => {
    const {
        name,
        username,
        password,
        email,
        phone,
        department,
        role
    } = employeeData;

    const employee_id = generateEmployeeId();
    const hashedPassword = await hashPassword(password);

    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO employees (employee_id, name, username, password, email, phone, department, role)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [employee_id, name, username, hashedPassword, email, phone, department, role || 'employee'],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        success: true,
                        employee_id,
                        message: 'Employee registered successfully',
                        credentials: { username, password }
                    });
                }
            }
        );
    });
};

const authenticateEmployee = async (username, password) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM employees WHERE username = ?', [username], async (err, employee) => {
            if (err) {
                reject(err);
            } else if (!employee) {
                reject(new Error('Invalid username or password'));
            } else {
                const isValidPassword = await verifyPassword(password, employee.password);
                if (isValidPassword) {
                    // Record login activity
                    recordActivity({
                        employee_id: employee.employee_id,
                        activity_type: 'login',
                        details: 'Employee logged in'
                    });

                    resolve({
                        success: true,
                        employee: {
                            employee_id: employee.employee_id,
                            name: employee.name,
                            username: employee.username,
                            email: employee.email,
                            department: employee.department,
                            role: employee.role
                        }
                    });
                } else {
                    reject(new Error('Invalid username or password'));
                }
            }
        });
    });
};

const getAllEmployees = (callback) => {
    db.all('SELECT * FROM employees ORDER BY created_at DESC', [], callback);
};

const getEmployeeById = (employee_id, callback) => {
    db.get('SELECT * FROM employees WHERE employee_id = ?', [employee_id], callback);
};

const sendNotification = (notificationData, callback) => {
    const {
        notification_id,
        employee_id,
        title,
        message,
        type
    } = notificationData;

    db.run(
        `INSERT INTO employee_notifications (notification_id, employee_id, title, message, type)
         VALUES (?, ?, ?, ?, ?)`,
        [notification_id, employee_id, title, message, type],
        function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, {
                    success: true,
                    notification_id,
                    message: 'Notification sent successfully'
                });
            }
        }
    );
};

const getNotificationsByEmployee = (employee_id, callback) => {
    db.all('SELECT * FROM employee_notifications WHERE employee_id = ? ORDER BY created_at DESC', [employee_id], callback);
};

const recordActivity = (activityData, callback = null) => {
    const {
        employee_id,
        activity_type,
        product_id,
        product_name,
        details,
        location
    } = activityData;

    const activity_id = generateActivityId();

    db.run(
        `INSERT INTO employee_activities (activity_id, employee_id, activity_type, product_id, product_name, details, location)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [activity_id, employee_id, activity_type, product_id, product_name, details, location],
        function(err) {
            if (callback) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, {
                        success: true,
                        activity_id,
                        message: 'Activity recorded successfully'
                    });
                }
            }
        }
    );
};

const getEmployeeActivities = (employee_id, limit = 50, callback) => {
    db.all(
        'SELECT * FROM employee_activities WHERE employee_id = ? ORDER BY created_at DESC LIMIT ?', 
        [employee_id, limit], 
        callback
    );
};

const updateEmployeePerformance = (employee_id, performanceData, callback) => {
    const {
        qr_codes_created = 0,
        qr_codes_scanned = 0,
        inventory_items_viewed = 0
    } = performanceData;

    const today = new Date().toISOString().split('T')[0];
    const total_activities = qr_codes_created + qr_codes_scanned + inventory_items_viewed;
    const efficiency_score = Math.min(total_activities * 0.1, 10); // Simple scoring system

    db.run(
        `INSERT OR REPLACE INTO employee_performance 
         (employee_id, date, qr_codes_created, qr_codes_scanned, inventory_items_viewed, total_activities, efficiency_score, updated_at)
         VALUES (?, ?, 
                 COALESCE((SELECT qr_codes_created FROM employee_performance WHERE employee_id = ? AND date = ?), 0) + ?,
                 COALESCE((SELECT qr_codes_scanned FROM employee_performance WHERE employee_id = ? AND date = ?), 0) + ?,
                 COALESCE((SELECT inventory_items_viewed FROM employee_performance WHERE employee_id = ? AND date = ?), 0) + ?,
                 COALESCE((SELECT total_activities FROM employee_performance WHERE employee_id = ? AND date = ?), 0) + ?,
                 ?, CURRENT_TIMESTAMP)`,
        [employee_id, today, employee_id, today, qr_codes_created, 
         employee_id, today, qr_codes_scanned, employee_id, today, inventory_items_viewed,
         employee_id, today, total_activities, efficiency_score],
        function(err) {
            if (err) {
                callback && callback(err);
            } else {
                callback && callback(null, {
                    success: true,
                    message: 'Performance updated successfully'
                });
            }
        }
    );
};

const getEmployeePerformance = (employee_id, callback) => {
    db.all('SELECT * FROM employee_performance WHERE employee_id = ? ORDER BY date DESC LIMIT 30', [employee_id], callback);
};

// Export database and functions
module.exports = {
    db,
    initializeDatabase,
    generateEmployeeId,
    generateActivityId,
    generateNotificationId,
    hashPassword,
    verifyPassword,
    registerEmployee,
    authenticateEmployee,
    getAllEmployees,
    getEmployeeById,
    sendNotification,
    getNotificationsByEmployee,
    recordActivity,
    getEmployeeActivities,
    updateEmployeePerformance,
    getEmployeePerformance
};