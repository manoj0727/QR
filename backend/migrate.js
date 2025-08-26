const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database(path.join(__dirname, 'inventory.db'));

console.log('Starting database migration...');

// First, check if the column already exists
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='qr_codes'", (err, row) => {
  if (err) {
    console.error('Error checking table structure:', err);
    process.exit(1);
  }
  
  if (row && row.sql.includes('qr_image_base64')) {
    console.log('Database already migrated!');
    process.exit(0);
  }
  
  // Add new column if it doesn't exist
  db.run('ALTER TABLE qr_codes ADD COLUMN qr_image_base64 TEXT', (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding column:', err);
      process.exit(1);
    }
    
    console.log('Column added successfully or already exists');
    
    // Now update any existing QR codes if they have file paths
    const qrDir = path.join(__dirname, 'qr_codes');
    
    db.all('SELECT product_id, qr_image_path FROM qr_codes WHERE qr_image_base64 IS NULL OR qr_image_base64 = ""', [], (err, rows) => {
      if (err) {
        console.error('Error fetching QR codes:', err);
        process.exit(1);
      }
      
      if (rows.length === 0) {
        console.log('No QR codes to migrate');
        db.close();
        process.exit(0);
      }
      
      let migrated = 0;
      rows.forEach(row => {
        if (row.qr_image_path) {
          const filePath = path.join(qrDir, row.qr_image_path);
          
          // Check if file exists
          if (fs.existsSync(filePath)) {
            const imageData = fs.readFileSync(filePath);
            const base64 = `data:image/png;base64,${imageData.toString('base64')}`;
            
            db.run(
              'UPDATE qr_codes SET qr_image_base64 = ? WHERE product_id = ?',
              [base64, row.product_id],
              (err) => {
                if (err) {
                  console.error(`Error updating QR for ${row.product_id}:`, err);
                } else {
                  migrated++;
                  console.log(`Migrated QR code for product: ${row.product_id}`);
                }
                
                if (migrated === rows.length) {
                  console.log(`Migration complete! Migrated ${migrated} QR codes.`);
                  db.close();
                }
              }
            );
          } else {
            console.log(`File not found for product ${row.product_id}, skipping...`);
          }
        }
      });
    });
  });
});