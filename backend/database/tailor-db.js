const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Create tailor database
const dbPath = path.join(__dirname, 'tailors.db');
console.log('Tailor database location:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening tailor database:', err);
    } else {
        console.log('Connected to tailor database');
    }
});

// Initialize database schema
const initializeDatabase = () => {
    db.serialize(() => {
        // Tailors table
        db.run(`
            CREATE TABLE IF NOT EXISTS tailors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tailor_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                address TEXT,
                specialization TEXT,
                experience_years INTEGER,
                status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating tailors table:', err);
            else console.log('Tailors table ready');
        });

        // Assignments table
        db.run(`
            CREATE TABLE IF NOT EXISTS assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assignment_id TEXT UNIQUE NOT NULL,
                tailor_id TEXT NOT NULL,
                product_id TEXT,
                order_number TEXT,
                title TEXT NOT NULL,
                description TEXT,
                quantity INTEGER DEFAULT 1,
                priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
                status TEXT DEFAULT 'pending' CHECK(
                    status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled')
                ),
                deadline DATETIME,
                accepted_at DATETIME,
                completed_at DATETIME,
                notes TEXT,
                created_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tailor_id) REFERENCES tailors(tailor_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating assignments table:', err);
            else console.log('Assignments table ready');
        });

        // Notifications table
        db.run(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                notification_id TEXT UNIQUE NOT NULL,
                tailor_id TEXT NOT NULL,
                type TEXT DEFAULT 'info' CHECK(type IN ('info', 'assignment', 'reminder', 'urgent', 'system')),
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                read_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tailor_id) REFERENCES tailors(tailor_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating notifications table:', err);
            else console.log('Notifications table ready');
        });

        // Tailor performance table
        db.run(`
            CREATE TABLE IF NOT EXISTS tailor_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tailor_id TEXT NOT NULL,
                total_assignments INTEGER DEFAULT 0,
                completed_assignments INTEGER DEFAULT 0,
                on_time_deliveries INTEGER DEFAULT 0,
                late_deliveries INTEGER DEFAULT 0,
                rejected_assignments INTEGER DEFAULT 0,
                average_completion_time REAL,
                rating REAL CHECK(rating >= 1 AND rating <= 5),
                last_assignment_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tailor_id) REFERENCES tailors(tailor_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating tailor_performance table:', err);
            else console.log('Tailor performance table ready');
        });
    });
};

// Helper functions
const generateTailorId = () => {
    return 'TLR-' + Date.now().toString(36).toUpperCase();
};

const generateAssignmentId = () => {
    return 'ASN-' + Date.now().toString(36).toUpperCase();
};

const generateNotificationId = () => {
    return 'NTF-' + Date.now().toString(36).toUpperCase();
};

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const verifyPassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

// Business logic functions
const registerTailor = async (tailorData) => {
    const {
        name,
        username,
        password,
        email,
        phone,
        address,
        specialization,
        experience_years
    } = tailorData;

    const tailor_id = generateTailorId();
    const hashedPassword = await hashPassword(password);

    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO tailors (tailor_id, name, username, password, email, phone, address, specialization, experience_years)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tailor_id, name, username, hashedPassword, email, phone, address, specialization, experience_years],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        success: true,
                        tailor_id,
                        message: 'Tailor registered successfully',
                        credentials: { username, password }
                    });
                }
            }
        );
    });
};

const authenticateTailor = async (username, password) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM tailors WHERE username = ?', [username], async (err, tailor) => {
            if (err) {
                reject(err);
            } else if (!tailor) {
                reject(new Error('Invalid username or password'));
            } else {
                const isValidPassword = await verifyPassword(password, tailor.password);
                if (isValidPassword) {
                    resolve({
                        success: true,
                        tailor: {
                            tailor_id: tailor.tailor_id,
                            name: tailor.name,
                            username: tailor.username,
                            email: tailor.email,
                            specialization: tailor.specialization
                        }
                    });
                } else {
                    reject(new Error('Invalid username or password'));
                }
            }
        });
    });
};

const getAllTailors = (callback) => {
    db.all('SELECT * FROM tailors ORDER BY created_at DESC', [], callback);
};

const getTailorById = (tailor_id, callback) => {
    db.get('SELECT * FROM tailors WHERE tailor_id = ?', [tailor_id], callback);
};

const createAssignment = (assignmentData, callback) => {
    const {
        assignment_id,
        tailor_id,
        product_id,
        order_number,
        title,
        description,
        priority,
        deadline
    } = assignmentData;

    db.run(
        `INSERT INTO assignments (assignment_id, tailor_id, product_id, order_number, title, description, priority, deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [assignment_id, tailor_id, product_id, order_number, title, description, priority, deadline],
        function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, {
                    success: true,
                    assignment_id,
                    message: 'Assignment created successfully'
                });
            }
        }
    );
};

const getAssignmentsByTailor = (tailor_id, callback) => {
    db.all('SELECT * FROM assignments WHERE tailor_id = ? ORDER BY created_at DESC', [tailor_id], callback);
};

const updateAssignmentStatus = (assignment_id, status, notes, callback) => {
    db.run(
        'UPDATE assignments SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE assignment_id = ?',
        [status, notes, assignment_id],
        function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, {
                    success: true,
                    message: 'Assignment status updated'
                });
            }
        }
    );
};

const sendNotification = (notificationData, callback) => {
    const {
        notification_id,
        tailor_id,
        title,
        message,
        type
    } = notificationData;

    db.run(
        `INSERT INTO notifications (notification_id, tailor_id, title, message, type)
         VALUES (?, ?, ?, ?, ?)`,
        [notification_id, tailor_id, title, message, type],
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

const getNotificationsByTailor = (tailor_id, callback) => {
    db.all('SELECT * FROM notifications WHERE tailor_id = ? ORDER BY created_at DESC', [tailor_id], callback);
};

const recordPerformance = (performanceData, callback) => {
    const {
        tailor_id,
        assignment_id,
        completion_time_hours,
        quality_score,
        rating
    } = performanceData;

    db.run(
        `INSERT INTO tailor_performance (tailor_id, assignment_id, completion_time_hours, quality_score, rating, last_assignment_date)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [tailor_id, assignment_id, completion_time_hours, quality_score, rating],
        function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, {
                    success: true,
                    message: 'Performance recorded successfully'
                });
            }
        }
    );
};

const getTailorPerformance = (tailor_id, callback) => {
    db.all('SELECT * FROM tailor_performance WHERE tailor_id = ? ORDER BY created_at DESC', [tailor_id], callback);
};

// Export database and functions
module.exports = {
    db,
    initializeDatabase,
    generateTailorId,
    generateAssignmentId,
    generateNotificationId,
    hashPassword,
    verifyPassword,
    registerTailor,
    authenticateTailor,
    getAllTailors,
    getTailorById,
    createAssignment,
    getAssignmentsByTailor,
    updateAssignmentStatus,
    sendNotification,
    getNotificationsByTailor,
    recordPerformance,
    getTailorPerformance
};