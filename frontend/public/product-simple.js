// Simple Product Management System with QR Generation
class SimpleProductManager {
    constructor() {
        this.productData = {};
        this.imageData = null;
        this.qrcode = null;
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.loadDraftIfExists();
    }

    attachEventListeners() {
        // Image upload
        const imageInput = document.getElementById('product-image');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Form submission
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Download QR button
        document.getElementById('download-qr').addEventListener('click', () => {
            this.downloadQR();
        });
        
        // Auto-generate SKU when category, size, or color changes
        ['product-category', 'product-size', 'product-color'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.autoGenerateSKU();
                });
            }
        });
        
        // Generate initial SKU when page loads
        setTimeout(() => {
            this.autoGenerateSKU();
        }, 100);
    }

    generateSKU() {
        // Manual regenerate - always create new code
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const timestamp = Date.now().toString(36).substring(-4).toUpperCase();
        const sku = `PRD-${random}-${timestamp}`;
        document.getElementById('product-sku').value = sku;
        this.showToast('New product code generated', 'info');
    }
    
    autoGenerateSKU() {
        // Auto-generate SKU based on category, size, color
        const category = document.getElementById('product-category').value;
        const size = document.getElementById('product-size').value;
        const color = document.getElementById('product-color').value;
        const random = Math.random().toString(36).substring(2, 4).toUpperCase();
        const timestamp = Date.now().toString(36).substring(-3).toUpperCase();
        
        let sku = '';
        
        if (category || size || color) {
            // Build SKU from available fields
            const parts = [];
            
            if (category) {
                parts.push(category.substring(0, 3).toUpperCase());
            }
            if (size && size !== 'Free') {
                parts.push(size);
            }
            if (color) {
                parts.push(color.substring(0, 2).toUpperCase());
            }
            
            // Add random identifier
            parts.push(random + timestamp);
            
            sku = parts.join('-');
        } else {
            // Default SKU if no fields selected
            sku = `PRD-${random}-${timestamp}`;
        }
        
        document.getElementById('product-sku').value = sku;
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 5 * 1024 * 1024) {
                this.showToast('Image size must be less than 5MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.imageData = e.target.result;
                this.displayImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    displayImage(imageUrl) {
        const preview = document.getElementById('image-preview');
        preview.innerHTML = `
            <img src="${imageUrl}" alt="Product preview">
            <button type="button" class="remove-btn" onclick="productManager.removeImage()">
                <i class="fas fa-times"></i> Remove
            </button>
        `;
    }

    removeImage() {
        this.imageData = null;
        const preview = document.getElementById('image-preview');
        preview.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Click to upload image</p>
            <span>JPG, PNG, GIF - Max 5MB</span>
        `;
        document.getElementById('product-image').value = '';
    }

    validateForm() {
        // Auto-generate SKU if not present
        if (!document.getElementById('product-sku').value) {
            this.autoGenerateSKU();
        }
        
        const requiredFields = ['product-name', 'product-category', 'product-size', 'product-color', 'product-material', 'initial-quantity'];
        
        for (let fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field.value || field.value.trim() === '') {
                field.focus();
                this.showToast('Please fill all required fields', 'error');
                return false;
            }
        }
        
        return true;
    }

    collectFormData() {
        // Ensure SKU is generated
        if (!document.getElementById('product-sku').value) {
            this.autoGenerateSKU();
        }
        
        const formData = {
            id: this.generateProductId(),
            name: document.getElementById('product-name').value,
            sku: document.getElementById('product-sku').value,
            price: parseFloat(document.getElementById('product-price').value) || 0,
            category: document.getElementById('product-category').value,
            size: document.getElementById('product-size').value,
            color: document.getElementById('product-color').value,
            description: document.getElementById('product-description').value,
            quantity: parseInt(document.getElementById('initial-quantity').value),
            minStock: parseInt(document.getElementById('min-stock').value) || 10,
            location: document.getElementById('location').value,
            material: document.getElementById('product-material').value,
            brand: document.getElementById('product-brand').value,
            image: this.imageData,
            status: this.calculateStatus(parseInt(document.getElementById('initial-quantity').value)),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return formData;
    }

    calculateStatus(quantity) {
        if (quantity === 0) return 'out-of-stock';
        if (quantity < 10) return 'low-stock';
        return 'in-stock';
    }

    generateProductId() {
        return 'PRD-' + Date.now().toString(36).toUpperCase();
    }

    async saveProduct() {
        if (!this.validateForm()) {
            return;
        }

        const productData = this.collectFormData();
        
        try {
            // Save to localStorage (simulating database)
            await this.saveToLocalStorage(productData);
            
            // Generate final QR Code and show QR section
            this.generateQRCode(productData);
            
            // Show QR section
            document.getElementById('qr-section').style.display = 'block';
            
            // Scroll to QR section
            document.getElementById('qr-section').scrollIntoView({ behavior: 'smooth' });
            
            // Show success message
            this.showToast('✓ Product Created Successfully!', 'success');
            
            // Don't reset the form - keep data for potential adjustments
            // Only update the SKU for the next product to avoid duplicates
            setTimeout(() => {
                // Generate new SKU for next product to avoid duplicates
                this.generateSKU();
            }, 500);
            
        } catch (error) {
            console.error('Error saving product:', error);
            this.showToast('Error saving product. Please try again.', 'error');
        }
    }

    async saveToLocalStorage(productData) {
        // Get existing products
        let products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
        
        // Check for duplicate SKU
        const existingProduct = products.find(p => p.sku === productData.sku);
        if (existingProduct) {
            // Generate new SKU if duplicate
            const timestamp = Date.now().toString(36).toUpperCase();
            productData.sku = productData.sku + '-' + timestamp;
            this.showToast('SKU was modified to avoid duplication', 'info');
        }
        
        // Add new product
        products.push(productData);
        
        // Save back to localStorage
        localStorage.setItem('inventory_products', JSON.stringify(products));
        
        // Update inventory count
        this.updateInventoryCount(products.length);
        
        // Save to MySQL database
        await this.saveToDatabase(productData);
    }
    
    async saveToDatabase(productData) {
        // Only try to save to database if we're not in a local file:// environment
        if (window.location.protocol === 'file:') {
            console.log('Running locally - database save skipped');
            return;
        }
        
        try {
            // Try localhost first for development
            const apiUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:3001/api/products/create'
                : '/api/products/create';
                
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Product saved to database:', result);
            } else {
                // API returned an error, but product is saved locally
                console.log('Product saved locally (API returned error)');
            }
        } catch (error) {
            // API might not be set up yet, but product is saved locally
            // Don't log as error since this is expected when backend isn't running
            console.log('Product saved locally (backend not connected)');
        }
    }

    updateInventoryCount(count) {
        // Update count in parent window if in iframe
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'inventory_update',
                count: count
            }, '*');
        }
    }

    generateQRCode(productData) {
        const qrContainer = document.getElementById('qr-display');
        
        // Clear any existing QR code completely
        while (qrContainer.firstChild) {
            qrContainer.removeChild(qrContainer.firstChild);
        }
        
        // Reset the qrcode object
        if (this.qrcode) {
            this.qrcode = null;
        }
        
        // Generate QR data
        const qrData = JSON.stringify({
            id: productData.id || this.generateProductId(),
            sku: productData.sku,
            name: productData.name,
            category: productData.category || '',
            size: productData.size || '',
            color: productData.color || '',
            timestamp: Date.now()
        });
        
        // Create a wrapper div for the QR code
        const qrWrapper = document.createElement('div');
        qrWrapper.id = 'qr-code-wrapper';
        qrWrapper.style.width = '200px';
        qrWrapper.style.height = '200px';
        qrContainer.appendChild(qrWrapper);
        
        // Create QR code with a slight delay to ensure DOM is ready
        setTimeout(() => {
            try {
                // Only create if wrapper exists and no QR code exists
                if (qrWrapper && !this.qrcode) {
                    this.qrcode = new QRCode(qrWrapper, {
                        text: qrData,
                        width: 200,
                        height: 200,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    
                    // Add product info below QR after a small delay to ensure QR is rendered
                    setTimeout(() => {
                        const infoDiv = document.createElement('div');
                        infoDiv.style.cssText = 'text-align: center; margin-top: 10px; font-size: 12px; color: #666;';
                        const priceDisplay = productData.price ? `<br>Price: ₹${productData.price}` : '';
                        infoDiv.innerHTML = `
                            <strong>Code: ${productData.sku}</strong><br>
                            ${productData.name || 'Product'}${priceDisplay}
                        `;
                        qrContainer.appendChild(infoDiv);
                    }, 100);
                }
            } catch (error) {
                console.error('Error generating QR code:', error);
                // Fallback to simple display
                const priceDisplay = productData.price ? `<br>Price: ₹${productData.price}` : '';
                qrContainer.innerHTML = `
                    <div style="padding: 20px; background: #f0f0f0; border-radius: 8px; text-align: center;">
                        <i class="fas fa-qrcode" style="font-size: 100px; color: #333;"></i>
                        <p style="margin-top: 10px; font-size: 12px;">
                            <strong>Code: ${productData.sku}</strong><br>
                            ${productData.name}${priceDisplay}
                        </p>
                    </div>
                `;
            }
        }, 50);
    }

    downloadQR() {
        const canvas = document.querySelector('#qr-display canvas');
        const productSku = document.getElementById('product-sku').value;
        
        if (canvas) {
            // Create a temporary link element
            const link = document.createElement('a');
            link.download = `QR-${productSku}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } else {
            this.showToast('Please generate QR code first', 'error');
        }
    }

    clearForm() {
        document.getElementById('product-form').reset();
        this.imageData = null;
        this.removeImage();
        
        // Hide QR section
        document.getElementById('qr-section').style.display = 'none';
        
        // Clear QR code
        document.getElementById('qr-display').innerHTML = '';
        
        // Clear saved draft
        localStorage.removeItem('product_draft');
    }
    
    prepareForNewProduct() {
        // Clear only the fields that should be unique for each product
        document.getElementById('product-name').value = '';
        document.getElementById('product-description').value = '';
        document.getElementById('initial-quantity').value = '0';
        
        // Generate new SKU
        this.generateSKU();
        
        // Hide QR section
        document.getElementById('qr-section').style.display = 'none';
        
        // Clear QR code
        document.getElementById('qr-display').innerHTML = '';
        
        // Scroll back to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Focus on product name field
        document.getElementById('product-name').focus();
        
        // Show info message
        this.showToast('Ready to create another product', 'info');
    }

    loadDraftIfExists() {
        const draft = localStorage.getItem('product_draft');
        if (draft) {
            const draftData = JSON.parse(draft);
            // Populate form with draft data
            Object.keys(draftData).forEach(key => {
                const element = document.querySelector(`[name="${key}"]`);
                if (element) {
                    element.value = draftData[key];
                }
            });
        }
    }

    saveDraft() {
        const formData = this.collectFormData();
        localStorage.setItem('product_draft', JSON.stringify(formData));
        this.showToast('Draft saved', 'info');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('success-toast');
        const icon = toast.querySelector('i');
        const text = toast.querySelector('span');
        
        // Update icon and color based on type
        if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
            toast.style.background = '#ef4444';
        } else if (type === 'info') {
            icon.className = 'fas fa-info-circle';
            toast.style.background = '#3b82f6';
        } else {
            icon.className = 'fas fa-check-circle';
            toast.style.background = '#10b981';
        }
        
        text.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Global functions
let productManager;

function saveProduct() {
    productManager.saveProduct();
}

function clearForm() {
    if (confirm('Are you sure you want to reset the form?')) {
        productManager.clearForm();
    }
}

function createAnother() {
    // Clear only specific fields for new product
    productManager.prepareForNewProduct();
}

// Auto-save draft every 30 seconds
setInterval(() => {
    if (document.getElementById('product-name')?.value) {
        productManager.saveDraft();
    }
}, 30000);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    productManager = new SimpleProductManager();
});