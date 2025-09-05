const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sslDir = path.join(__dirname, 'ssl');

// Create SSL directory if it doesn't exist
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir);
}

const keyPath = path.join(sslDir, 'key.pem');
const certPath = path.join(sslDir, 'cert.pem');

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('SSL certificates already exist in backend/ssl/');
  console.log('To regenerate, delete the existing certificates first.');
  process.exit(0);
}

console.log('Generating self-signed SSL certificates...');

try {
  // Generate self-signed certificate valid for 365 days
  execSync(`openssl req -x509 -newkey rsa:4096 -nodes -keyout ${keyPath} -out ${certPath} -days 365 -subj "/C=US/ST=State/L=City/O=QRInventory/CN=localhost"`, {
    stdio: 'inherit'
  });
  
  console.log('\n✅ SSL certificates generated successfully!');
  console.log(`   Key: ${keyPath}`);
  console.log(`   Certificate: ${certPath}`);
  console.log('\n⚠️  Note: These are self-signed certificates for development use only.');
  console.log('   Browsers will show a security warning that you can bypass.');
  
} catch (error) {
  console.error('Failed to generate SSL certificates:', error.message);
  console.error('\nMake sure OpenSSL is installed on your system.');
  process.exit(1);
}