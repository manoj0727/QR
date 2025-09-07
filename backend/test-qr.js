#!/usr/bin/env node

// Test script to verify QR code generation from backend

const https = require('https');

const testData = {
    name: "Test Product",
    type: "Shirt",
    size: "M",
    color: "Blue",
    initial_quantity: 10,
    price: 299,
    description: "Test product for QR code generation",
    minStock: 5,
    location: "A-12",
    material: "Cotton",
    brand: "Test Brand"
};

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/products/create',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(testData))
    },
    rejectUnauthorized: false // For self-signed certificate
};

const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            console.log('Response Status:', res.statusCode);
            console.log('Response Data:', JSON.stringify(response, null, 2));
            
            if (response.qr_code) {
                console.log('\n✅ QR Code received!');
                console.log('QR Code Data URL length:', response.qr_code.length);
                console.log('QR Code starts with:', response.qr_code.substring(0, 50));
                console.log('Product ID:', response.product_id);
            } else {
                console.log('\n❌ No QR code in response');
            }
        } catch (e) {
            console.error('Failed to parse response:', e);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Request error:', error);
});

req.write(JSON.stringify(testData));
req.end();

console.log('Testing QR code generation from backend...');