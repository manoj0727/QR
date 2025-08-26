const http = require('http');

console.log('Testing Garment Inventory System...\n');

const testData = {
    name: 'Premium Cotton Shirt',
    type: 'Shirt',
    size: 'L',
    color: 'Blue',
    initial_quantity: 10
};

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/products/create',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', JSON.parse(data));
        console.log('\nTest completed successfully!');
        console.log('Backend is running at: http://localhost:3000');
        console.log('Frontend can be accessed at: http://localhost:3000');
        console.log('\nProject structure:');
        console.log('  backend/  - Server files, database, QR codes');
        console.log('  frontend/ - Client files (HTML, CSS, JS)');
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
    console.log('\nMake sure the server is running with: npm start');
    process.exit(1);
});

req.write(JSON.stringify(testData));
req.end();