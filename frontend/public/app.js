// API_URL is now defined in config.js
let html5QrcodeScanner = null;
let scannedData = null;
let availableCameras = [];
let currentCameraIndex = 0;

// Toggle mobile menu
function toggleMenu() {
    const nav = document.getElementById('nav-menu');
    nav.classList.toggle('active');
    const menuToggle = document.getElementById('menu-toggle');
    menuToggle.textContent = nav.classList.contains('active') ? '✕' : '☰';
}

function showSection(sectionId, evt) {
    // Stop camera scanner when switching sections
    if (html5QrcodeScanner) {
        try {
            const state = html5QrcodeScanner.getState();
            if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                stopScanner();
            }
        } catch (err) {
            // If there's an error checking state, try to stop anyway
            stopScanner();
        }
    }
    
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    
    // Update active button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Only add active class if event exists (button was clicked)
    if (evt && evt.target) {
        evt.target.classList.add('active');
    } else if (!evt) {
        // If no event (page load), find and activate the appropriate button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if ((btn.textContent === 'Dashboard' && sectionId === 'dashboard') ||
                (btn.textContent === 'Create Product' && sectionId === 'create-product') ||
                (btn.textContent === 'Scan QR' && sectionId === 'scan-qr') ||
                (btn.textContent === 'Inventory' && sectionId === 'inventory') ||
                (btn.textContent === 'History' && sectionId === 'transactions')) {
                btn.classList.add('active');
            }
        });
    }
    
    // Close mobile menu after selection
    if (window.innerWidth <= 480) {
        const nav = document.getElementById('nav-menu');
        nav.classList.remove('active');
        document.getElementById('menu-toggle').textContent = '☰';
    }
    
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
        // Reset values first to avoid showing stale data
        document.getElementById('total-items').textContent = 'Loading...';
        document.getElementById('product-types').textContent = 'Loading...';
        document.getElementById('recent-transactions').textContent = 'Loading...';
        
        const response = await fetch(`${API_URL}/inventory/summary`);
        if (!response.ok) throw new Error('Failed to load inventory summary');
        const data = await response.json();
        
        document.getElementById('total-items').textContent = data.total_items || 0;
        
        const uniqueTypes = new Set((data.summary_by_type_size || []).map(item => item.type));
        document.getElementById('product-types').textContent = uniqueTypes.size;
        
        const transResponse = await fetch(`${API_URL}/transactions?limit=10`);
        if (!transResponse.ok) throw new Error('Failed to load transactions');
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
        // Set default values on error
        document.getElementById('total-items').textContent = '0';
        document.getElementById('product-types').textContent = '0';
        document.getElementById('recent-transactions').textContent = '0';
        document.getElementById('inventory-summary').innerHTML = '<p>Unable to load inventory summary. Please check your connection.</p>';
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
            // Convert to IST (Indian Standard Time)
            const timestamp = new Date(trans.timestamp).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
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

async function startScanner() {
    document.getElementById('scanner-container').style.display = 'block';
    document.getElementById('manual-entry').style.display = 'none';
    document.getElementById('camera-info').textContent = 'Requesting camera permission...';
    document.getElementById('camera-loading').style.display = 'block';
    document.getElementById('reader').style.display = 'none';
    
    try {
        // Check if Html5Qrcode library is loaded
        if (typeof Html5Qrcode === 'undefined') {
            document.getElementById('camera-loading').style.display = 'none';
            document.getElementById('camera-info').textContent = 'Scanner library not loaded';
            alert('QR scanner library failed to load. Please refresh the page and try again.');
            showManualEntry();
            return;
        }
        
        // Check if we're in a secure context (HTTPS or localhost)
        if (!window.isSecureContext) {
            document.getElementById('camera-loading').style.display = 'none';
            document.getElementById('camera-info').textContent = 'Camera requires secure connection';
            alert('Camera access requires HTTPS. Please access this site using https:// or from localhost.');
            showManualEntry();
            return;
        }
        
        // First check if browser supports camera access
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            document.getElementById('camera-loading').style.display = 'none';
            document.getElementById('camera-info').textContent = 'Camera not supported';
            alert('Camera access is not supported in this browser. Please use Chrome, Firefox, or Safari.');
            showManualEntry();
            return;
        }
        
        // Update status
        document.getElementById('camera-info').textContent = 'Please allow camera access when prompted...';
        
        // Request camera permission explicitly
        let permissionGranted = false;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            // Permission granted, stop the test stream
            stream.getTracks().forEach(track => track.stop());
            permissionGranted = true;
        } catch (permissionError) {
            // Try again without facingMode constraint
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop());
                permissionGranted = true;
            } catch (secondError) {
                console.error('Camera permission error:', secondError);
                document.getElementById('camera-loading').style.display = 'none';
                
                if (secondError.name === 'NotAllowedError' || secondError.name === 'PermissionDeniedError') {
                    document.getElementById('camera-info').textContent = 'Camera permission denied';
                    alert('Camera permission was denied. Please:\n1. Click the camera icon in your browser address bar\n2. Allow camera access\n3. Refresh the page and try again');
                } else if (secondError.name === 'NotFoundError' || secondError.name === 'DevicesNotFoundError') {
                    document.getElementById('camera-info').textContent = 'No camera found';
                    alert('No camera found on this device. Please connect a camera or use manual entry.');
                } else if (secondError.name === 'NotReadableError' || secondError.name === 'TrackStartError') {
                    document.getElementById('camera-info').textContent = 'Camera is busy';
                    alert('Camera is already in use by another application. Please close other apps using the camera and try again.');
                } else if (secondError.name === 'OverconstrainedError') {
                    document.getElementById('camera-info').textContent = 'Camera constraints error';
                    alert('Camera constraints could not be satisfied. Please try again.');
                } else {
                    document.getElementById('camera-info').textContent = 'Camera error';
                    alert('Unable to access camera: ' + secondError.message);
                }
                showManualEntry();
                return;
            }
        }
        
        if (!permissionGranted) {
            showManualEntry();
            return;
        }
        
        document.getElementById('camera-info').textContent = 'Camera permission granted, initializing...';
        
        // Get available cameras
        try {
            availableCameras = await Html5Qrcode.getCameras();
        } catch (getCameraError) {
            console.error('Error getting cameras list:', getCameraError);
            document.getElementById('camera-loading').style.display = 'none';
            document.getElementById('camera-info').textContent = 'Error getting cameras';
            
            // Try to proceed with default camera
            availableCameras = [{ id: "default", label: "Default Camera" }];
        }
        
        if (!availableCameras || availableCameras.length === 0) {
            document.getElementById('camera-loading').style.display = 'none';
            alert('No camera found. Please use manual entry.');
            showManualEntry();
            return;
        }
        
        console.log('Found cameras:', availableCameras);
        
        // Create scanner instance
        html5QrcodeScanner = new Html5Qrcode("reader");
        
        // Try to find and use back camera first on mobile
        currentCameraIndex = 0;
        if (window.innerWidth <= 768) { // Mobile device
            for (let i = 0; i < availableCameras.length; i++) {
                const label = availableCameras[i].label ? availableCameras[i].label.toLowerCase() : '';
                if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
                    currentCameraIndex = i;
                    console.log('Selected back camera:', availableCameras[i]);
                    break;
                }
            }
        }
        
        // Show reader div before starting camera
        document.getElementById('reader').style.display = 'block';
        
        startCameraAtIndex(currentCameraIndex);
        
    } catch (err) {
        console.error('Error in startScanner:', err);
        alert('Error initializing camera: ' + err.message);
        showManualEntry();
    }
}

function startCameraAtIndex(index) {
    if (!availableCameras || index >= availableCameras.length) {
        return;
    }
    
    const camera = availableCameras[index];
    const cameraLabel = camera.label || `Camera ${index + 1}`;
    
    // Update camera info
    document.getElementById('camera-info').textContent = `Starting: ${cameraLabel}`;
    
    // Simple configuration for scanning with smaller box
    const config = {
        fps: 10,
        qrbox: { width: 200, height: 200 },
        aspectRatio: 1.0,
        // Additional config to control video size
        videoConstraints: {
            width: { ideal: 400 },
            height: { ideal: 400 },
            facingMode: { ideal: "environment" }
        }
    };
    
    console.log('Starting camera with ID:', camera.id);
    console.log('Config:', config);
    
    // Start the scanner with selected camera
    const startPromise = camera.id === "default" 
        ? html5QrcodeScanner.start(
            { facingMode: "environment" }, // Try environment facing first
            config,
            onScanSuccess,
            onScanError
          )
        : html5QrcodeScanner.start(
            camera.id,
            config,
            onScanSuccess,
            onScanError
          );
    
    startPromise.then(() => {
        // Successfully started
        console.log('Camera started successfully');
        document.getElementById('camera-loading').style.display = 'none';
        document.getElementById('reader').style.display = 'block';
        document.getElementById('camera-info').textContent = `Scanning with: ${cameraLabel}`;
    }).catch((err) => {
        console.error('Error starting camera:', err);
        document.getElementById('camera-loading').style.display = 'none';
        document.getElementById('reader').style.display = 'block'; // Show reader anyway
        
        // If using default, try without facingMode
        if (camera.id === "default") {
            console.log('Trying without facingMode constraint...');
            html5QrcodeScanner.start(
                { facingMode: { exact: "environment" } },
                config,
                onScanSuccess,
                onScanError
            ).catch((err2) => {
                // Try with any camera
                html5QrcodeScanner.start(
                    { facingMode: "user" },
                    config,
                    onScanSuccess,
                    onScanError
                ).catch((err3) => {
                    document.getElementById('camera-info').textContent = 'Camera failed to start';
                    alert('Unable to start camera. Please try refreshing the page or use manual entry.');
                    showManualEntry();
                });
            });
        } else if (availableCameras.length > 1 && index < availableCameras.length - 1) {
            // Try next camera if available
            currentCameraIndex = index + 1;
            document.getElementById('camera-info').textContent = 'Trying next camera...';
            startCameraAtIndex(currentCameraIndex);
        } else {
            document.getElementById('camera-info').textContent = 'Camera failed to start';
            alert('Unable to start camera. Error: ' + err.message + '\n\nPlease try refreshing the page or use manual entry.');
            showManualEntry();
        }
    });
}

function onScanSuccess(decodedText, decodedResult) {
    console.log('QR Code scanned:', decodedText);
    processScannedQR(decodedText);
    stopScanner();
}

function onScanError(errorMessage) {
    // Scan error - ignore silently as this is called frequently when no QR code is visible
}

// Switch camera functionality removed as per requirement

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            document.getElementById('scanner-container').style.display = 'none';
            html5QrcodeScanner = null;
            availableCameras = [];
            currentCameraIndex = 0;
        }).catch((err) => {
            console.error('Error stopping scanner:', err);
            document.getElementById('scanner-container').style.display = 'none';
            html5QrcodeScanner = null;
            availableCameras = [];
            currentCameraIndex = 0;
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Show dashboard section on page load
    showSection('dashboard');
    
    // Also ensure dashboard data is loaded even if API_URL isn't ready yet
    if (typeof API_URL !== 'undefined') {
        loadDashboard();
    } else {
        // Wait a bit for config.js to load
        setTimeout(() => {
            if (typeof API_URL !== 'undefined') {
                loadDashboard();
            }
        }, 100);
    }
});