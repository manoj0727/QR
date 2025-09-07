const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create attendance database
const dbPath = path.join(__dirname, 'attendance.db');
console.log('Attendance database location:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening attendance database:', err);
    } else {
        console.log('Connected to attendance database');
    }
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// Initialize database schema
const initializeDatabase = () => {
    db.serialize(() => {
        // Face registration table
        db.run(`
            CREATE TABLE IF NOT EXISTS face_registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                user_type TEXT NOT NULL CHECK(user_type IN ('employee', 'tailor', 'admin')),
                user_name TEXT NOT NULL,
                face_encoding TEXT NOT NULL, -- Store face encoding as JSON string
                photo_path TEXT,
                registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating face_registrations table:', err);
            else console.log('Face registrations table ready');
        });

        // Attendance records table
        db.run(`
            CREATE TABLE IF NOT EXISTS attendance_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                user_type TEXT NOT NULL,
                user_name TEXT NOT NULL,
                date DATE NOT NULL,
                check_in_time DATETIME,
                check_out_time DATETIME,
                total_hours REAL,
                status TEXT DEFAULT 'present' CHECK(status IN ('present', 'absent', 'late', 'half-day', 'holiday', 'leave')),
                location TEXT,
                check_in_photo TEXT,
                check_out_photo TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date),
                FOREIGN KEY (user_id) REFERENCES face_registrations(user_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating attendance_records table:', err);
            else console.log('Attendance records table ready');
        });

        // Attendance settings table
        db.run(`
            CREATE TABLE IF NOT EXISTS attendance_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT NOT NULL,
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating attendance_settings table:', err);
            else {
                console.log('Attendance settings table ready');
                insertDefaultSettings();
            }
        });

        // Leave requests table
        db.run(`
            CREATE TABLE IF NOT EXISTS leave_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                user_type TEXT NOT NULL,
                leave_type TEXT NOT NULL CHECK(leave_type IN ('sick', 'casual', 'emergency', 'vacation', 'other')),
                from_date DATE NOT NULL,
                to_date DATE NOT NULL,
                reason TEXT,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
                approved_by TEXT,
                approved_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES face_registrations(user_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating leave_requests table:', err);
            else console.log('Leave requests table ready');
        });

        // Monthly attendance summary table
        db.run(`
            CREATE TABLE IF NOT EXISTS attendance_summary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                user_type TEXT NOT NULL,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                total_days INTEGER DEFAULT 0,
                present_days INTEGER DEFAULT 0,
                absent_days INTEGER DEFAULT 0,
                late_days INTEGER DEFAULT 0,
                half_days INTEGER DEFAULT 0,
                holidays INTEGER DEFAULT 0,
                leaves INTEGER DEFAULT 0,
                total_hours REAL DEFAULT 0,
                overtime_hours REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, month, year),
                FOREIGN KEY (user_id) REFERENCES face_registrations(user_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating attendance_summary table:', err);
            else console.log('Attendance summary table ready');
        });
    });
};

// Insert default settings
const insertDefaultSettings = () => {
    const defaultSettings = [
        { key: 'work_start_time', value: '09:00', description: 'Office start time' },
        { key: 'work_end_time', value: '18:00', description: 'Office end time' },
        { key: 'late_mark_after', value: '09:15', description: 'Mark late after this time' },
        { key: 'half_day_after', value: '13:00', description: 'Mark half day if check-in after this time' },
        { key: 'min_hours_full_day', value: '8', description: 'Minimum hours for full day' },
        { key: 'enable_face_recognition', value: 'true', description: 'Enable face recognition for attendance' },
        { key: 'enable_location_tracking', value: 'false', description: 'Enable location tracking' },
        { key: 'working_days', value: 'Mon,Tue,Wed,Thu,Fri', description: 'Working days of the week' }
    ];

    defaultSettings.forEach(setting => {
        db.run(
            `INSERT OR IGNORE INTO attendance_settings (setting_key, setting_value, description) VALUES (?, ?, ?)`,
            [setting.key, setting.value, setting.description],
            (err) => {
                if (err) console.error('Error inserting setting:', err);
            }
        );
    });
};

// Database functions
const attendanceDB = {
    // Register face
    registerFace: (userData, faceEncoding, callback) => {
        const sql = `INSERT OR REPLACE INTO face_registrations 
                     (user_id, user_type, user_name, face_encoding, photo_path) 
                     VALUES (?, ?, ?, ?, ?)`;
        
        db.run(sql, [
            userData.user_id,
            userData.user_type,
            userData.user_name,
            JSON.stringify(faceEncoding),
            userData.photo_path
        ], callback);
    },

    // Get face registration
    getFaceRegistration: (userId, callback) => {
        const sql = `SELECT * FROM face_registrations WHERE user_id = ?`;
        db.get(sql, [userId], callback);
    },

    // Get all registered faces
    getAllFaces: (callback) => {
        const sql = `SELECT * FROM face_registrations ORDER BY user_name`;
        db.all(sql, callback);
    },

    // Mark attendance (check-in)
    markCheckIn: (attendanceData, callback) => {
        const sql = `INSERT INTO attendance_records 
                     (user_id, user_type, user_name, date, check_in_time, status, location, check_in_photo) 
                     VALUES (?, ?, ?, date('now'), datetime('now'), ?, ?, ?)`;
        
        db.run(sql, [
            attendanceData.user_id,
            attendanceData.user_type,
            attendanceData.user_name,
            attendanceData.status || 'present',
            attendanceData.location,
            attendanceData.check_in_photo
        ], callback);
    },

    // Mark check-out
    markCheckOut: (userId, checkOutPhoto, callback) => {
        const sql = `UPDATE attendance_records 
                     SET check_out_time = datetime('now'), 
                         check_out_photo = ?,
                         total_hours = ROUND((julianday(datetime('now')) - julianday(check_in_time)) * 24, 2)
                     WHERE user_id = ? AND date = date('now')`;
        
        db.run(sql, [checkOutPhoto, userId], callback);
    },

    // Get today's attendance
    getTodayAttendance: (userId, callback) => {
        const sql = `SELECT * FROM attendance_records 
                     WHERE user_id = ? AND date = date('now')`;
        db.get(sql, [userId], callback);
    },

    // Get attendance by date range
    getAttendanceByDateRange: (startDate, endDate, userType, callback) => {
        let sql = `SELECT * FROM attendance_records 
                   WHERE date BETWEEN ? AND ?`;
        const params = [startDate, endDate];
        
        if (userType) {
            sql += ` AND user_type = ?`;
            params.push(userType);
        }
        
        sql += ` ORDER BY date DESC, check_in_time DESC`;
        db.all(sql, params, callback);
    },

    // Get user attendance history
    getUserAttendance: (userId, month, year, callback) => {
        const sql = `SELECT * FROM attendance_records 
                     WHERE user_id = ? 
                     AND strftime('%m', date) = ? 
                     AND strftime('%Y', date) = ?
                     ORDER BY date DESC`;
        
        db.all(sql, [userId, month.toString().padStart(2, '0'), year.toString()], callback);
    },

    // Get attendance summary
    getAttendanceSummary: (month, year, userType, callback) => {
        const sql = `SELECT 
                        user_id,
                        user_name,
                        user_type,
                        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
                        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
                        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
                        COUNT(CASE WHEN status = 'half-day' THEN 1 END) as half_days,
                        COUNT(CASE WHEN status = 'leave' THEN 1 END) as leaves,
                        ROUND(SUM(total_hours), 2) as total_hours
                     FROM attendance_records 
                     WHERE strftime('%m', date) = ? 
                     AND strftime('%Y', date) = ?
                     ${userType ? 'AND user_type = ?' : ''}
                     GROUP BY user_id`;
        
        const params = [month.toString().padStart(2, '0'), year.toString()];
        if (userType) params.push(userType);
        
        db.all(sql, params, callback);
    },

    // Create leave request
    createLeaveRequest: (leaveData, callback) => {
        const sql = `INSERT INTO leave_requests 
                     (user_id, user_type, leave_type, from_date, to_date, reason) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [
            leaveData.user_id,
            leaveData.user_type,
            leaveData.leave_type,
            leaveData.from_date,
            leaveData.to_date,
            leaveData.reason
        ], callback);
    },

    // Get pending leave requests
    getPendingLeaves: (callback) => {
        const sql = `SELECT * FROM leave_requests 
                     WHERE status = 'pending' 
                     ORDER BY created_at DESC`;
        db.all(sql, callback);
    },

    // Approve/Reject leave
    updateLeaveStatus: (leaveId, status, approvedBy, callback) => {
        const sql = `UPDATE leave_requests 
                     SET status = ?, approved_by = ?, approved_at = datetime('now') 
                     WHERE id = ?`;
        
        db.run(sql, [status, approvedBy, leaveId], callback);
    },

    // Get settings
    getSettings: (callback) => {
        const sql = `SELECT * FROM attendance_settings`;
        db.all(sql, (err, rows) => {
            if (err) return callback(err);
            
            const settings = {};
            rows.forEach(row => {
                settings[row.setting_key] = row.setting_value;
            });
            callback(null, settings);
        });
    },

    // Update setting
    updateSetting: (key, value, callback) => {
        const sql = `UPDATE attendance_settings 
                     SET setting_value = ?, updated_at = datetime('now') 
                     WHERE setting_key = ?`;
        
        db.run(sql, [value, key], callback);
    }
};

// Initialize database
initializeDatabase();

module.exports = attendanceDB;