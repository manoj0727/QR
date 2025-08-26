// API_URL is now defined in config.js
let html5QrcodeScanner = null;
let scannedData = null;

function showSection(sectionId) {
    // Stop camera scanner when switching sections
    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        stopScanner();
    }
    
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    
    if (sectionId === 'dashboard') {
        loadDashboard();
    } else if (sectionId === 'inventory') {
        loadInventory();
    } else if (sectionId === 'transactions') {
        loadTransactions();
    }
}

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/inventory/summary`);
        const data = await response.json();
        
        document.getElementById('total-items').textContent = data.total_items || 0;
        
        const uniqueTypes = new Set(data.summary_by_type_size.map(item => item.type));
        document.getElementById('product-types').textContent = uniqueTypes.size;
        
        const transResponse = await fetch(`${API_URL}/transactions?limit=10`);
        const transactions = await transResponse.json();
        document.getElementById('recent-transactions').textContent = transactions.length;
        
        let summaryHTML = '<h3>Inventory by Type and Size</h3><table><thead><tr><th>Type</th><th>Size</th><th>Quantity</th><th>Products</th></tr></thead><tbody>';
        data.summary_by_type_size.forEach(item => {
            summaryHTML += `<tr>
                <td>${item.type}</td>
                <td>${item.size}</td>
                <td>${item.total_quantity}</td>
                <td>${item.product_count}</td>
            </tr>`;
        });
        summaryHTML += '</tbody></table>';
        document.getElementById('inventory-summary').innerHTML = summaryHTML;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadInventory() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        let tableHTML = '<table><thead><tr><th>Product ID</th><th>Name</th><th>Type</th><th>Size</th><th>Color</th><th>Quantity</th><th>Actions</th></tr></thead><tbody>';
        
        products.forEach(product => {
            tableHTML += `<tr>
                <td>${product.product_id}</td>
                <td>${product.name}</td>
                <td>${product.type}</td>
                <td>${product.size}</td>
                <td>${product.color || '-'}</td>
                <td>${product.quantity}</td>
                <td>
                    <button class="action-btn view-btn" onclick="viewProduct('${product.product_id}')">View QR</button>
                </td>
            </tr>`;
        });
        
        tableHTML += '</tbody></table>';
        document.getElementById('inventory-table').innerHTML = tableHTML;
        
        const searchInput = document.getElementById('search-inventory');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#inventory-table tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    } catch (error) {
        console.error('Error loading inventory:', error);
        document.getElementById('inventory-table').innerHTML = '<p>Error loading inventory</p>';
    }
}

async function loadTransactions() {
    try {
        const response = await fetch(`${API_URL}/transactions`);
        const transactions = await response.json();
        
        let tableHTML = '<table><thead><tr><th>Timestamp</th><th>Product ID</th><th>Product</th><th>Action</th><th>Quantity</th><th>By</th><th>Location</th></tr></thead><tbody>';
        
        transactions.forEach(trans => {
            const timestamp = new Date(trans.timestamp).toLocaleString();
            const actionClass = trans.action.includes('IN') ? 'view-btn' : 'btn-danger';
            // Display user-friendly action names
            let actionDisplay = trans.action;
            if (trans.action === 'IN' || trans.action === 'STOCK_IN') {
                actionDisplay = 'Added';
            } else if (trans.action === 'OUT' || trans.action === 'STOCK_OUT' || trans.action === 'SALE') {
                actionDisplay = 'Removed';
            } else if (trans.action === 'INITIAL_STOCK') {
                actionDisplay = 'Initial Stock';
            }
            tableHTML += `<tr>
                <td>${timestamp}</td>
                <td>${trans.product_id}</td>
                <td>${trans.name} (${trans.size})</td>
                <td><span class="action-btn ${actionClass}" style="padding: 2px 8px;">${actionDisplay}</span></td>
                <td>${trans.quantity}</td>
                <td>${trans.performed_by || '-'}</td>
                <td>${trans.location || '-'}</td>
            </tr>`;
        });
        
        tableHTML += '</tbody></table>';
        document.getElementById('transactions-table').innerHTML = tableHTML;
        
        const searchInput = document.getElementById('search-transactions');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#transactions-table tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactions-table').innerHTML = '<p>Error loading transactions</p>';
    }
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('product-name').value,
        type: document.getElementById('product-type').value,
        size: document.getElementById('product-size').value,
        color: document.getElementById('product-color').value,
        initial_quantity: parseInt(document.getElementById('initial-quantity').value) || 0
    };
    
    try {
        const response = await fetch(`${API_URL}/products/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('qr-result').style.display = 'block';
            document.getElementById('qr-display').innerHTML = `
                <img src="${result.qr_code}" alt="QR Code">
                <p><strong>Product ID:</strong> ${result.product_id}</p>
            `;
            
            document.getElementById('download-qr').onclick = () => {
                const link = document.createElement('a');
                link.href = result.qr_code;
                link.download = `${result.product_id}.png`;
                link.click();
            };
            
            document.getElementById('product-form').reset();
            
            setTimeout(() => {
                alert('Product created successfully! QR code has been generated.');
            }, 500);
        } else {
            alert('Error creating product: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating product');
    }
});

function startScanner() {
    document.getElementById('scanner-container').style.display = 'block';
    document.getElementById('manual-entry').style.display = 'none';
    
    html5QrcodeScanner = new Html5Qrcode("reader");
    
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            const cameraId = devices[0].id;
            html5QrcodeScanner.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    console.log('QR Code scanned:', decodedText);
                    processScannedQR(decodedText);
                    stopScanner();
                },
                (errorMessage) => {
                    // Handle scan error silently
                }
            ).catch((err) => {
                console.error('Unable to start scanner:', err);
                alert('Unable to access camera. Please check permissions.');
            });
        }
    }).catch(err => {
        console.error('Error getting cameras:', err);
        alert('No camera found. Please use manual entry.');
        showManualEntry();
    });
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            document.getElementById('scanner-container').style.display = 'none';
        }).catch((err) => {
            console.error('Error stopping scanner:', err);
        });
    }
}

function showManualEntry() {
    document.getElementById('manual-entry').style.display = 'block';
    document.getElementById('scanner-container').style.display = 'none';
    
    document.getElementById('manual-product-id').addEventListener('change', async (e) => {
        const productId = e.target.value;
        if (productId) {
            try {
                const response = await fetch(`${API_URL}/products/${productId}`);
                const data = await response.json();
                
                if (data.product) {
                    const qrData = JSON.stringify({
                        product_id: data.product.product_id,
                        name: data.product.name,
                        type: data.product.type,
                        size: data.product.size,
                        color: data.product.color
                    });
                    processScannedQR(qrData);
                } else {
                    alert('Product not found');
                }
            } catch (error) {
                alert('Error fetching product details');
            }
        }
    });
}

function processScannedQR(qrData) {
    try {
        scannedData = qrData;
        const parsedData = JSON.parse(qrData);
        
        document.getElementById('scan-result').style.display = 'block';
        document.getElementById('product-details').innerHTML = `
            <h4>Product Information</h4>
            <p><strong>Product ID:</strong> ${parsedData.product_id}</p>
            <p><strong>Name:</strong> ${parsedData.name}</p>
            <p><strong>Type:</strong> ${parsedData.type}</p>
            <p><strong>Size:</strong> ${parsedData.size}</p>
            <p><strong>Color:</strong> ${parsedData.color || 'N/A'}</p>
        `;
        
        fetch(`${API_URL}/products/${parsedData.product_id}`)
            .then(response => response.json())
            .then(data => {
                if (data.product) {
                    document.getElementById('product-details').innerHTML += `
                        <p><strong>Current Quantity:</strong> ${data.product.quantity}</p>
                    `;
                }
            });
    } catch (error) {
        console.error('Invalid QR code data:', error);
        alert('Invalid QR code format');
    }
}

document.getElementById('inventory-action-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!scannedData) {
        alert('Please scan a QR code first');
        return;
    }
    
    const formData = {
        qr_data: scannedData,
        action: document.getElementById('action').value,
        quantity: parseInt(document.getElementById('quantity').value),
        performed_by: document.getElementById('performed-by').value,
        location: document.getElementById('location').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/inventory/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            const actionType = formData.action === 'IN' ? 'added to' : 'removed from';
            alert(`✅ Success!\n\n` +
                  `Product: ${result.product.name}\n` +
                  `${formData.quantity} items ${actionType} inventory\n` +
                  `Stock before: ${result.product.previous_quantity} items\n` +
                  `Stock now: ${result.product.new_quantity} items`);
            
            document.getElementById('inventory-action-form').reset();
            document.getElementById('scan-result').style.display = 'none';
            scannedData = null;
            
            loadDashboard();
        } else {
            alert('Error: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error processing transaction');
    }
});

async function viewProduct(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        const data = await response.json();
        
        if (data.product && data.qr_code) {
            const qrWindow = window.open('', '_blank', 'width=400,height=500');
            qrWindow.document.write(`
                <html>
                <head>
                    <title>QR Code - ${productId}</title>
                    <style>
                        body { text-align: center; font-family: Arial; padding: 20px; }
                        img { border: 5px solid #667eea; padding: 10px; background: white; }
                    </style>
                </head>
                <body>
                    <h2>QR Code</h2>
                    <p><strong>Product ID:</strong> ${data.product.product_id}</p>
                    <p><strong>Name:</strong> ${data.product.name}</p>
                    <p><strong>Size:</strong> ${data.product.size}</p>
                    <img src="${data.qr_code}" alt="QR Code" width="300">
                    <br><br>
                    <button onclick="window.print()">Print QR Code</button>
                </body>
                </html>
            `);
        } else {
            alert('QR code not found for this product');
        }
    } catch (error) {
        alert('Error loading product details');
    }
}

showSection('dashboard');