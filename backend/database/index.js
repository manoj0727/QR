// Main database module - manages users, inventory, transactions, tailor, and employee databases
const usersDB = require('./users-db');
const inventoryDB = require('./inventory-db');
const transactionsDB = require('./transactions-db');
const tailorDB = require('./tailor-db');
const employeeDB = require('./employee-db');

// Initialize both databases
const initializeAllDatabases = () => {
    console.log('\n========================================');
    console.log('🗄️  Initializing Database System');
    console.log('========================================\n');
    
    // Initialize users database
    console.log('📁 Initializing Users Database...');
    usersDB.initializeDatabase();
    
    // Initialize inventory database
    console.log('\n📁 Initializing Inventory Database...');
    inventoryDB.initializeDatabase();
    
    // Initialize transactions database
    console.log('\n📁 Initializing Transactions Database...');
    console.log('Transactions database location:', require('path').join(__dirname, 'transactions.db'));
    
    // Initialize tailor database
    console.log('\n📁 Initializing Tailor Database...');
    tailorDB.initializeDatabase();
    
    // Initialize employee database
    console.log('\n📁 Initializing Employee Database...');
    employeeDB.initializeDatabase();
    
    console.log('\n========================================');
    console.log('✅ Database System Ready');
    console.log('========================================\n');
    
    console.log('📊 Database Structure:');
    console.log('├── users.db');
    console.log('│   ├── users (employees, managers, admins)');
    console.log('│   ├── user_sessions');
    console.log('│   ├── activity_logs');
    console.log('│   ├── departments');
    console.log('│   ├── permissions');
    console.log('│   └── role_permissions');
    console.log('├── inventory.db');
    console.log('│   ├── products');
    console.log('│   ├── categories');
    console.log('│   ├── stock_transactions');
    console.log('│   ├── suppliers');
    console.log('│   ├── purchase_orders');
    console.log('│   ├── inventory_adjustments');
    console.log('│   ├── stock_alerts');
    console.log('│   ├── qr_codes');
    console.log('│   └── warehouses');
    console.log('├── transactions.db');
    console.log('│   ├── transactions (all stock movements)');
    console.log('│   └── transaction_summary (product summaries)');
    console.log('├── tailors.db');
    console.log('│   ├── tailors (tailor profiles)');
    console.log('│   ├── assignments (work assignments)');
    console.log('│   ├── notifications (system messages)');
    console.log('│   └── performance_tracking (work metrics)');
    console.log('└── employees.db');
    console.log('    ├── employees (employee profiles)');
    console.log('    ├── employee_notifications (notifications)');
    console.log('    ├── employee_activities (QR operations)');
    console.log('    └── employee_performance (work metrics)');
    console.log('\n========================================\n');
};

// Database cleanup function (for resetting)
const resetDatabases = (callback) => {
    console.log('\n⚠️  Resetting all databases...');
    
    // Close connections
    usersDB.db.close((err) => {
        if (err) console.error('Error closing users database:', err);
    });
    
    inventoryDB.db.close((err) => {
        if (err) console.error('Error closing inventory database:', err);
    });
    
    // Delete database files
    const fs = require('fs');
    const path = require('path');
    
    setTimeout(() => {
        try {
            fs.unlinkSync(path.join(__dirname, 'users.db'));
            fs.unlinkSync(path.join(__dirname, 'inventory.db'));
            console.log('✓ Databases deleted');
            
            if (callback) callback();
        } catch (error) {
            console.error('Error deleting databases:', error);
        }
    }, 100);
};

// Export databases and functions
module.exports = {
    // Databases
    usersDB: usersDB.db,
    inventoryDB: inventoryDB.db,
    
    // Initialization
    initializeAllDatabases,
    resetDatabases,
    
    // User database functions
    users: {
        db: usersDB.db,
        hashPassword: usersDB.hashPassword,
        generateUserId: usersDB.generateUserId,
        generateSessionId: usersDB.generateSessionId
    },
    
    // Inventory database functions
    inventory: {
        db: inventoryDB.db,
        generateProductId: inventoryDB.generateProductId,
        generateSKU: inventoryDB.generateSKU,
        generateTransactionId: inventoryDB.generateTransactionId,
        generatePONumber: inventoryDB.generatePONumber,
        checkStockLevel: inventoryDB.checkStockLevel,
        createStockAlert: inventoryDB.createStockAlert
    },
    
    // Transactions database functions
    transactions: {
        db: transactionsDB.db,
        recordTransaction: transactionsDB.recordTransaction,
        getAllTransactions: transactionsDB.getAllTransactions,
        getTransactionById: transactionsDB.getTransactionById,
        getProductTransactionHistory: transactionsDB.getProductTransactionHistory,
        getProductTransactionSummary: transactionsDB.getProductTransactionSummary,
        getDashboardStats: transactionsDB.getDashboardStats,
        updateTransactionSummary: transactionsDB.updateTransactionSummary,
        generateTransactionId: transactionsDB.generateTransactionId
    },
    
    // Tailor database functions
    tailors: {
        db: tailorDB.db,
        registerTailor: tailorDB.registerTailor,
        authenticateTailor: tailorDB.authenticateTailor,
        getAllTailors: tailorDB.getAllTailors,
        getTailorById: tailorDB.getTailorById,
        createAssignment: tailorDB.createAssignment,
        getAssignmentsByTailor: tailorDB.getAssignmentsByTailor,
        updateAssignmentStatus: tailorDB.updateAssignmentStatus,
        sendNotification: tailorDB.sendNotification,
        getNotificationsByTailor: tailorDB.getNotificationsByTailor,
        recordPerformance: tailorDB.recordPerformance,
        getTailorPerformance: tailorDB.getTailorPerformance
    },
    
    // Employee database functions
    employees: {
        db: employeeDB.db,
        registerEmployee: employeeDB.registerEmployee,
        authenticateEmployee: employeeDB.authenticateEmployee,
        getAllEmployees: employeeDB.getAllEmployees,
        getEmployeeById: employeeDB.getEmployeeById,
        sendNotification: employeeDB.sendNotification,
        getNotificationsByEmployee: employeeDB.getNotificationsByEmployee,
        recordActivity: employeeDB.recordActivity,
        getEmployeeActivities: employeeDB.getEmployeeActivities,
        updateEmployeePerformance: employeeDB.updateEmployeePerformance,
        getEmployeePerformance: employeeDB.getEmployeePerformance
    }
};