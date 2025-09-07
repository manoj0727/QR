const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const attendanceDB = require('./database/attendance-db');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/faces/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.body.user_id}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPEG and PNG images are allowed'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to run Python scripts
const runPythonScript = (scriptPath, args) => {
    return new Promise((resolve, reject) => {
        const python = spawn('python3', [scriptPath, ...args]);
        let result = '';
        let error = '';
        
        python.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        python.on('close', (code) => {
            if (code !== 0) {
                reject(error);
            } else {
                try {
                    resolve(JSON.parse(result));
                } catch (e) {
                    resolve(result);
                }
            }
        });
    });
};

// Register face for attendance
router.post('/register-face', upload.single('face_photo'), async (req, res) => {
    try {
        const { user_id, user_name, user_type } = req.body;
        const photoPath = req.file.path;
        
        // Call Python face recognition script
        const pythonScript = path.join(__dirname, 'face_recognition', 'register_face.py');
        const result = await runPythonScript(pythonScript, [
            photoPath, user_id, user_name, user_type
        ]);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Face registered successfully',
                user_id: user_id
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Face registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register face'
        });
    }
});

// Mark attendance with face recognition
router.post('/mark-attendance', upload.single('face_photo'), async (req, res) => {
    try {
        const photoPath = req.file.path;
        const { location } = req.body;
        
        // Call Python face recognition script
        const pythonScript = path.join(__dirname, 'face_recognition', 'mark_attendance.py');
        const result = await runPythonScript(pythonScript, [photoPath, location || '']);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Attendance marking error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark attendance'
        });
    }
});

// Get today's attendance status for a user
router.get('/status/:userId', (req, res) => {
    const userId = req.params.userId;
    
    attendanceDB.getTodayAttendance(userId, (err, record) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json({
                hasCheckedIn: !!record,
                hasCheckedOut: record ? !!record.check_out_time : false,
                record: record
            });
        }
    });
});

// Get attendance records
router.get('/records', (req, res) => {
    const { start_date, end_date, user_type, user_id } = req.query;
    
    if (user_id) {
        // Get specific user's attendance
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();
        
        attendanceDB.getUserAttendance(user_id, month, year, (err, records) => {
            if (err) {
                res.status(500).json({ error: 'Database error' });
            } else {
                res.json(records);
            }
        });
    } else {
        // Get all attendance by date range
        attendanceDB.getAttendanceByDateRange(start_date, end_date, user_type, (err, records) => {
            if (err) {
                res.status(500).json({ error: 'Database error' });
            } else {
                res.json(records);
            }
        });
    }
});

// Get attendance summary
router.get('/summary', (req, res) => {
    const { month, year, user_type } = req.query;
    const currentMonth = month || (new Date().getMonth() + 1);
    const currentYear = year || new Date().getFullYear();
    
    attendanceDB.getAttendanceSummary(currentMonth, currentYear, user_type, (err, summary) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(summary);
        }
    });
});

// Export attendance to Excel
router.get('/export', async (req, res) => {
    try {
        const { start_date, end_date, user_type } = req.query;
        
        attendanceDB.getAttendanceByDateRange(start_date, end_date, user_type, async (err, records) => {
            if (err) {
                res.status(500).json({ error: 'Database error' });
            } else {
                // Call Python script to generate Excel
                const pythonScript = path.join(__dirname, 'face_recognition', 'export_attendance.py');
                const outputPath = path.join(__dirname, 'exports', `attendance_${Date.now()}.xlsx`);
                
                const result = await runPythonScript(pythonScript, [
                    JSON.stringify(records), outputPath
                ]);
                
                if (result.success) {
                    res.download(outputPath);
                } else {
                    res.status(500).json({ error: 'Failed to generate Excel file' });
                }
            }
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});

// Create leave request
router.post('/leave-request', (req, res) => {
    const leaveData = req.body;
    
    attendanceDB.createLeaveRequest(leaveData, (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Failed to create leave request' });
        } else {
            res.json({
                success: true,
                message: 'Leave request submitted successfully',
                id: result.lastID
            });
        }
    });
});

// Get pending leave requests (admin)
router.get('/leave-requests/pending', (req, res) => {
    attendanceDB.getPendingLeaves((err, requests) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(requests);
        }
    });
});

// Approve/Reject leave request (admin)
router.put('/leave-request/:id', (req, res) => {
    const { id } = req.params;
    const { status, approved_by } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    attendanceDB.updateLeaveStatus(id, status, approved_by, (err) => {
        if (err) {
            res.status(500).json({ error: 'Failed to update leave request' });
        } else {
            res.json({
                success: true,
                message: `Leave request ${status}`
            });
        }
    });
});

// Get attendance settings
router.get('/settings', (req, res) => {
    attendanceDB.getSettings((err, settings) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(settings);
        }
    });
});

// Update attendance setting
router.put('/settings/:key', (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    
    attendanceDB.updateSetting(key, value, (err) => {
        if (err) {
            res.status(500).json({ error: 'Failed to update setting' });
        } else {
            res.json({
                success: true,
                message: 'Setting updated successfully'
            });
        }
    });
});

// Get all registered faces
router.get('/registered-faces', (req, res) => {
    attendanceDB.getAllFaces((err, faces) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(faces);
        }
    });
});

module.exports = router;