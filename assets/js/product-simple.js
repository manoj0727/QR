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
        this.checkEditMode();
        // Only load draft and set defaults if not editing
        if (!this.checkEditMode()) {
            this.loadDraftIfExists();
            this.setDefaultValues();
        }
    }
    
    setDefaultValues() {
        // Set default values only for new products
        const quantityField = document.getElementById('initial-quantity');
        if (quantityField && !quantityField.value) {
            quantityField.value = '0';
        }
    }
    
    checkEditMode() {
        // Check if we're in edit mode
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        
        if (editId) {
            // Load product data for editing
            const editData = sessionStorage.getItem('edit_product');
            if (editData) {
                const product = JSON.parse(editData);
                this.loadProductForEdit(product);
                
                // Update page title and header
                document.querySelector('.product-header h1').textContent = 'Edit Product';
                const submitBtn = document.querySelector('.btn-submit');
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
                }
                
                // Store the product ID for update
                this.editingProductId = product.id;
                return true; // Return true when in edit mode
            }
        }
        return false; // Return false when not in edit mode
    }
    
    loadProductForEdit(product) {
        // Store the original product data for reference
        this.originalProductData = { ...product };
        
        // Populate all form fields with product data
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-sku').value = product.sku || '';
        document.getElementById('product-price').value = product.price !== undefined ? product.price : '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-size').value = product.size || '';
        document.getElementById('product-color').value = product.color || '';
        document.getElementById('product-description').value = product.description || '';
        // Keep existing quantity, don't default to 0
        document.getElementById('initial-quantity').value = product.quantity !== undefined ? product.quantity : 0;
        document.getElementById('min-stock').value = product.minStock !== undefined ? product.minStock : 10;
        document.getElementById('location').value = product.location || '';
        document.getElementById('product-material').value = product.material || '';
        document.getElementById('product-brand').value = product.brand || '';
        
        // Load image if exists
        if (product.image) {
            this.imageData = product.image;
            this.displayImage(product.image);
        }
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
        
        // Start with original data if editing, otherwise empty object
        const baseData = this.editingProductId && this.originalProductData ? 
            { ...this.originalProductData } : {};
        
        // Get current form values
        const currentQuantity = parseInt(document.getElementById('initial-quantity').value);
        
        const formData = {
            ...baseData, // Preserve all original fields
            id: this.editingProductId || this.generateProductId(),
            name: document.getElementById('product-name').value,
            sku: document.getElementById('product-sku').value,
            price: parseFloat(document.getElementById('product-price').value) || baseData.price || 0,
            category: document.getElementById('product-category').value,
            size: document.getElementById('product-size').value,
            color: document.getElementById('product-color').value,
            description: document.getElementById('product-description').value,
            quantity: isNaN(currentQuantity) ? (baseData.quantity || 0) : currentQuantity,
            minStock: parseInt(document.getElementById('min-stock').value) || baseData.minStock || 10,
            location: document.getElementById('location').value || baseData.location || '',
            material: document.getElementById('product-material').value,
            brand: document.getElementById('product-brand').value || baseData.brand || '',
            image: this.imageData || baseData.image,
            status: this.calculateStatus(isNaN(currentQuantity) ? (baseData.quantity || 0) : currentQuantity),
            createdAt: baseData.createdAt || new Date().toISOString(),
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

    generateUniqueProductId(type, size) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const typeCode = (type || 'PRODUCT').substring(0, 3).toUpperCase();
        const sizeCode = (size || 'DEF').substring(0, 2).toUpperCase();
        return `${typeCode}-${sizeCode}-${timestamp}`;
    }

    async saveProduct() {
        if (!this.validateForm()) {
            return;
        }

        const productData = this.collectFormData();
        
        // If editing, preserve the original ID and creation date
        if (this.editingProductId) {
            productData.id = this.editingProductId;
            const existingProducts = JSON.parse(localStorage.getItem('inventory_products') || '[]');
            const existingProduct = existingProducts.find(p => p.id === this.editingProductId);
            if (existingProduct && existingProduct.createdAt) {
                productData.createdAt = existingProduct.createdAt;
            }
        }
        
        try {
            // Save to localStorage (simulating database)
            await this.saveToLocalStorage(productData);
            
            // Only generate QR for new products, not when editing
            if (!this.editingProductId) {
                // Generate final QR Code and show QR section
                this.generateQRCode(productData);
                
                // Show QR section
                document.getElementById('qr-section').style.display = 'block';
                
                // Scroll to QR section
                document.getElementById('qr-section').scrollIntoView({ behavior: 'smooth' });
            }
            
            // Show success message
            if (this.editingProductId) {
                this.showToast('✓ Product Updated Successfully!', 'success');
                // Redirect to inventory after successful edit
                setTimeout(() => {
                    window.location.href = 'inventory-advanced.html';
                }, 1000);
            } else {
                this.showToast('✓ Product Created Successfully!', 'success');
                // Don't reset the form - keep data for potential adjustments
                // Only update the SKU for the next product to avoid duplicates
                setTimeout(() => {
                    // Generate new SKU for next product to avoid duplicates
                    this.generateSKU();
                }, 500);
            }
            
        } catch (error) {
            console.error('Error saving product:', error);
            this.showToast('Error saving product. Please try again.', 'error');
        }
    }

    async saveToLocalStorage(productData) {
        // Get existing products
        let products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
        
        if (this.editingProductId) {
            // Update existing product
            const index = products.findIndex(p => p.id === this.editingProductId);
            if (index !== -1) {
                products[index] = productData;
                this.showToast('Product updated successfully', 'success');
            } else {
                // If not found, add as new
                products.push(productData);
            }
        } else {
            // Check for duplicate SKU only for new products
            const existingProduct = products.find(p => p.sku === productData.sku);
            if (existingProduct) {
                // Generate new SKU if duplicate
                const timestamp = Date.now().toString(36).toUpperCase();
                productData.sku = productData.sku + '-' + timestamp;
                this.showToast('SKU was modified to avoid duplication', 'info');
            }
            
            // Add new product
            products.push(productData);
        }
        
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
            // Determine if this is an update or create
            const isUpdate = this.editingProductId !== undefined;
            
            // Set appropriate API endpoint - using correct port 3000
            const apiUrl = window.location.hostname === 'localhost' 
                ? isUpdate 
                    ? `https://localhost:3000/api/products/${this.editingProductId}`
                    : 'https://localhost:3000/api/products/create'
                : isUpdate
                    ? `/api/products/${this.editingProductId}`
                    : '/api/products/create';
                
            const response = await fetch(apiUrl, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: productData.name,
                    type: productData.category,
                    size: productData.size,
                    color: productData.color,
                    initial_quantity: productData.quantity
                })
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
        
        // Generate QR data matching new database schema
        const qrData = JSON.stringify({
            product_id: productData.sku || this.generateUniqueProductId(productData.category, productData.size),
            name: productData.name,
            type: productData.category || '',
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