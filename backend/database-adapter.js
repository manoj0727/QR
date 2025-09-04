const { Client } = require('pg');

console.log('Connecting to PostgreSQL database');

// Set timezone for PostgreSQL client
process.env.TZ = 'Asia/Kolkata';

// Configure database connection
const connectionConfig = {
  connectionString: process.env.DATABASE_URL
};

// Add SSL for production (Render requires SSL)
if (process.env.NODE_ENV === 'production') {
  connectionConfig.ssl = {
    rejectUnauthorized: false
  };
}

const client = new Client(connectionConfig);

// Helper function to convert UTC to IST
const convertToIST = (utcDate) => {
  if (!utcDate) return null;
  const date = new Date(utcDate);
  // Add 5 hours 30 minutes to UTC to get IST
  date.setHours(date.getHours() + 5);
  date.setMinutes(date.getMinutes() + 30);
  return date.toISOString();
};

// PostgreSQL adapter
const pgAdapter = {
  run: (query, params, callback) => {
    // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
    let pgQuery = query;
    let paramIndex = 1;
    while (pgQuery.includes('?')) {
      pgQuery = pgQuery.replace('?', `$${paramIndex}`);
      paramIndex++;
    }
    
    // Handle DATETIME -> TIMESTAMP conversion
    pgQuery = pgQuery.replace(/DATETIME/gi, 'TIMESTAMP WITH TIME ZONE');
    pgQuery = pgQuery.replace(/datetime\('now'[^)]*\)/gi, "CURRENT_TIMESTAMP");
    pgQuery = pgQuery.replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP");
    pgQuery = pgQuery.replace(/AUTOINCREMENT/gi, '');
    
    client.query(pgQuery, params, (err, result) => {
      if (callback) {
        if (typeof callback === 'function') {
          callback(err);
        } else if (callback.call) {
          callback.call({ lastID: result ? result.rows[0]?.id : null }, err);
        }
      }
    });
  },
  
  get: (query, params, callback) => {
    let pgQuery = query;
    let paramIndex = 1;
    while (pgQuery.includes('?')) {
      pgQuery = pgQuery.replace('?', `$${paramIndex}`);
      paramIndex++;
    }
    
    client.query(pgQuery, params, (err, result) => {
      if (callback) {
        const row = result ? result.rows[0] : null;
        if (row) {
          // Convert timestamps to IST
          if (row.created_at) row.created_at = convertToIST(row.created_at);
          if (row.updated_at) row.updated_at = convertToIST(row.updated_at);
          if (row.timestamp) row.timestamp = convertToIST(row.timestamp);
        }
        callback(err, row);
      }
    });
  },
  
  all: (query, params, callback) => {
    let pgQuery = query;
    let paramIndex = 1;
    while (pgQuery.includes('?')) {
      pgQuery = pgQuery.replace('?', `$${paramIndex}`);
      paramIndex++;
    }
    
    client.query(pgQuery, params, (err, result) => {
      if (callback) {
        const rows = result ? result.rows : [];
        // Convert timestamps to IST for all rows
        rows.forEach(row => {
          if (row.created_at) row.created_at = convertToIST(row.created_at);
          if (row.updated_at) row.updated_at = convertToIST(row.updated_at);
          if (row.timestamp) row.timestamp = convertToIST(row.timestamp);
        });
        callback(err, rows);
      }
    });
  },
  
  serialize: (callback) => {
    callback();
  }
};

const db = pgAdapter;

const initializeDatabase = async () => {
  // Set session timezone to IST
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');
    
    // Set timezone for this session to IST
    await client.query("SET TIME ZONE 'Asia/Kolkata'");
    console.log('Timezone set to IST (Asia/Kolkata)');
    
    // Create tables for PostgreSQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        size TEXT NOT NULL,
        color TEXT,
        quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        product_id TEXT NOT NULL,
        action TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        performed_by TEXT,
        location TEXT,
        notes TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id SERIAL PRIMARY KEY,
        product_id TEXT UNIQUE NOT NULL,
        qr_data TEXT NOT NULL,
        qr_image_base64 TEXT,
        qr_image_path TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tailors (
        id SERIAL PRIMARY KEY,
        tailor_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        specialization TEXT,
        contact_number TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_assignments (
        id SERIAL PRIMARY KEY,
        assignment_id TEXT UNIQUE NOT NULL,
        tailor_id TEXT NOT NULL,
        product_id TEXT,
        garment_type TEXT NOT NULL,
        fabric_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        assigned_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expected_date TIMESTAMP WITH TIME ZONE,
        completed_date TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'assigned',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fabrics (
        id SERIAL PRIMARY KEY,
        fabric_id TEXT UNIQUE NOT NULL,
        fabric_type TEXT NOT NULL,
        color TEXT,
        quantity_meters DECIMAL(10,2),
        location TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Supabase PostgreSQL tables initialized');
  } catch (err) {
    console.error('Supabase PostgreSQL initialization error:', err);
    console.error('Please check your DATABASE_URL in .env file');
    process.exit(1);
  }
};

module.exports = { db, initializeDatabase };