// Database adapter that works with both SQLite and PostgreSQL
const path = require('path');

// Determine which database to use based on environment
const usePostgres = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';

let db, initializeDatabase;

if (usePostgres) {
  console.log('Using PostgreSQL database');
  const { Client } = require('pg');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

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
      pgQuery = pgQuery.replace(/DATETIME/gi, 'TIMESTAMP');
      pgQuery = pgQuery.replace(/CURRENT_TIMESTAMP/gi, 'NOW()');
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
          callback(err, result ? result.rows[0] : null);
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
          callback(err, result ? result.rows : []);
        }
      });
    },
    
    serialize: (callback) => {
      callback();
    }
  };

  db = pgAdapter;
  
  initializeDatabase = async () => {
    try {
      await client.connect();
      console.log('Connected to PostgreSQL');
      
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
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
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
          timestamp TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS qr_codes (
          id SERIAL PRIMARY KEY,
          product_id TEXT UNIQUE NOT NULL,
          qr_data TEXT NOT NULL,
          qr_image_base64 TEXT,
          qr_image_path TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('PostgreSQL tables initialized');
    } catch (err) {
      console.error('PostgreSQL initialization error:', err);
      process.exit(1);
    }
  };
  
} else {
  console.log('Using SQLite database');
  // Use original SQLite setup
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database(path.join(__dirname, 'inventory.db'));
  
  initializeDatabase = () => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          size TEXT NOT NULL,
          color TEXT,
          quantity INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id TEXT NOT NULL,
          action TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          performed_by TEXT,
          location TEXT,
          notes TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products (product_id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS qr_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id TEXT UNIQUE NOT NULL,
          qr_data TEXT NOT NULL,
          qr_image_base64 TEXT NOT NULL,
          qr_image_path TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products (product_id)
        )
      `);
      
      console.log('SQLite tables initialized');
    });
  };
}

module.exports = { db, initializeDatabase };