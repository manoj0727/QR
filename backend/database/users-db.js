const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Create users database
const dbPath = path.join(__dirname, 'users.db');
console.log('Users database location:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening users database:', err);
    } else {
        console.log('Connected to users database');
    }
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// Initialize database schema
const initializeDatabase = () => {
    db.serialize(() => {
        // Users table - for employees and managers
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'employee')),
                department TEXT,
                designation TEXT,
                employee_code TEXT UNIQUE,
                is_active INTEGER DEFAULT 1,
                permissions TEXT, -- JSON string for custom permissions
                created_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                profile_image TEXT
            )
        `, (err) => {
            if (err) console.error('Error creating users table:', err);
            else {
                console.log('Users table ready');
                createDefaultUsers();
            }
        });

        // User sessions table
        db.run(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating sessions table:', err);
            else console.log('Sessions table ready');
        });

        // Activity logs table
        db.run(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                description TEXT,
                entity_type TEXT,
                entity_id TEXT,
                ip_address TEXT,
                metadata TEXT, -- JSON string for additional data
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating activity_logs table:', err);
            else console.log('Activity logs table ready');
        });

        // Departments table
        db.run(`
            CREATE TABLE IF NOT EXISTS departments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dept_code TEXT UNIQUE NOT NULL,
                dept_name TEXT NOT NULL,
                manager_id TEXT,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (manager_id) REFERENCES users(user_id) ON DELETE SET NULL
            )
        `, (err) => {
            if (err) console.error('Error creating departments table:', err);
            else console.log('Departments table ready');
        });

        // Permissions table
        db.run(`
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                permission_code TEXT UNIQUE NOT NULL,
                permission_name TEXT NOT NULL,
                category TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating permissions table:', err);
            else console.log('Permissions table ready');
        });

        // Role permissions mapping
        db.run(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                permission_code TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role, permission_code),
                FOREIGN KEY (permission_code) REFERENCES permissions(permission_code) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating role_permissions table:', err);
            else console.log('Role permissions table ready');
        });
    });
};

// Create default users
const createDefaultUsers = () => {
    const defaultUsers = [
        {
            user_id: 'USR-ADMIN-001',
            username: 'admin',
            password: 'admin123',
            full_name: 'System Administrator',
            email: 'admin@qrinventory.com',
            role: 'admin',
            department: 'IT',
            designation: 'System Admin',
            employee_code: 'EMP-001'
        },
        {
            user_id: 'USR-MGR-001',
            username: 'manager',
            password: 'manager123',
            full_name: 'John Manager',
            email: 'manager@qrinventory.com',
            role: 'manager',
            department: 'Operations',
            designation: 'Operations Manager',
            employee_code: 'EMP-002'
        },
        {
            user_id: 'USR-EMP-001',
            username: 'employee1',
            password: 'employee123',
            full_name: 'Sarah Employee',
            email: 'employee1@qrinventory.com',
            role: 'employee',
            department: 'Warehouse',
            designation: 'Warehouse Staff',
            employee_code: 'EMP-003'
        },
        {
            user_id: 'USR-EMP-002',
            username: 'employee2',
            password: 'employee123',
            full_name: 'Mike Worker',
            email: 'employee2@qrinventory.com',
            role: 'employee',
            department: 'Production',
            designation: 'Production Staff',
            employee_code: 'EMP-004'
        }
    ];

    defaultUsers.forEach(user => {
        const passwordHash = crypto.createHash('sha256').update(user.password).digest('hex');
        
        db.run(`
            INSERT OR IGNORE INTO users (
                user_id, username, password_hash, full_name, email, 
                role, department, designation, employee_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user.user_id, user.username, passwordHash, user.full_name, 
            user.email, user.role, user.department, user.designation, 
            user.employee_code
        ], (err) => {
            if (!err) {
                console.log(`✓ Created default user: ${user.username} (password: ${user.password})`);
            }
        });
    });

    // Create default departments (after users are created)
    setTimeout(() => {
        const departments = [
            { dept_code: 'IT', dept_name: 'Information Technology', manager_id: 'USR-ADMIN-001' },
            { dept_code: 'OPS', dept_name: 'Operations', manager_id: 'USR-MGR-001' },
            { dept_code: 'WH', dept_name: 'Warehouse', manager_id: 'USR-MGR-001' },
            { dept_code: 'PROD', dept_name: 'Production', manager_id: 'USR-MGR-001' }
        ];

        departments.forEach(dept => {
            db.run(`
                INSERT OR IGNORE INTO departments (dept_code, dept_name, manager_id)
                VALUES (?, ?, ?)
            `, [dept.dept_code, dept.dept_name, dept.manager_id]);
        });
    }, 500);

    // Create default permissions
    const permissions = [
        // Product permissions
        { code: 'product.view', name: 'View Products', category: 'Products' },
        { code: 'product.create', name: 'Create Products', category: 'Products' },
        { code: 'product.edit', name: 'Edit Products', category: 'Products' },
        { code: 'product.delete', name: 'Delete Products', category: 'Products' },
        
        // Inventory permissions
        { code: 'inventory.view', name: 'View Inventory', category: 'Inventory' },
        { code: 'inventory.stockin', name: 'Stock In', category: 'Inventory' },
        { code: 'inventory.stockout', name: 'Stock Out', category: 'Inventory' },
        { code: 'inventory.adjust', name: 'Adjust Stock', category: 'Inventory' },
        
        // User management permissions
        { code: 'user.view', name: 'View Users', category: 'Users' },
        { code: 'user.create', name: 'Create Users', category: 'Users' },
        { code: 'user.edit', name: 'Edit Users', category: 'Users' },
        { code: 'user.delete', name: 'Delete Users', category: 'Users' },
        
        // Reports permissions
        { code: 'reports.view', name: 'View Reports', category: 'Reports' },
        { code: 'reports.export', name: 'Export Reports', category: 'Reports' },
        
        // System permissions
        { code: 'system.settings', name: 'System Settings', category: 'System' },
        { code: 'system.backup', name: 'Backup System', category: 'System' }
    ];

    permissions.forEach(perm => {
        db.run(`
            INSERT OR IGNORE INTO permissions (permission_code, permission_name, category)
            VALUES (?, ?, ?)
        `, [perm.code, perm.name, perm.category]);
    });

    // Assign permissions to roles
    const rolePermissions = {
        admin: ['*'], // All permissions
        manager: [
            'product.view', 'product.create', 'product.edit',
            'inventory.view', 'inventory.stockin', 'inventory.stockout', 'inventory.adjust',
            'user.view', 'user.create', 'user.edit',
            'reports.view', 'reports.export'
        ],
        employee: [
            'product.view',
            'inventory.view', 'inventory.stockin', 'inventory.stockout',
            'reports.view'
        ]
    };

    Object.entries(rolePermissions).forEach(([role, perms]) => {
        if (perms[0] === '*') {
            // Admin gets all permissions
            db.run(`
                INSERT OR IGNORE INTO role_permissions (role, permission_code)
                SELECT ?, permission_code FROM permissions
            `, [role]);
        } else {
            perms.forEach(perm => {
                db.run(`
                    INSERT OR IGNORE INTO role_permissions (role, permission_code)
                    VALUES (?, ?)
                `, [role, perm]);
            });
        }
    });
};

// Helper functions
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const generateUserId = (role) => {
    const prefix = role === 'admin' ? 'ADM' : role === 'manager' ? 'MGR' : 'EMP';
    const timestamp = Date.now().toString(36).toUpperCase();
    return `USR-${prefix}-${timestamp}`;
};

const generateSessionId = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Export database and helper functions
module.exports = {
    db,
    initializeDatabase,
    hashPassword,
    generateUserId,
    generateSessionId
};