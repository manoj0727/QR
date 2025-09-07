// Simple Product Management System with Backend Integration
class SimpleProductManager {
    constructor() {
        this.productData = {};
        this.imageData = null;
        this.qrcode = null;
        this.apiBaseUrl = window.location.protocol + '//' + window.location.hostname + ':3000';
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.setDefaultValues();
    }
    
    setDefaultValues() {
        // Set default values only for new products
        const quantityField = document.getElementById('initial-quantity');
        if (quantityField && !quantityField.value) {
            quantityField.value = '0';
        }
        
        const minStockField = document.getElementById('min-stock');
        if (minStockField && !minStockField.value) {
            minStockField.value = '10';
        }
    }

    attachEventListeners() {
        // Image upload
        const imageInput = document.getElementById('product-image');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Form submission
        const form = document.getElementById('product-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });
        }

        // Download QR button
        const downloadBtn = document.getElementById('download-qr');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadQR();
            });
        }
        
        // Create another button
        const createAnotherBtn = document.getElementById('create-another');
        if (createAnotherBtn) {
            createAnotherBtn.addEventListener('click', () => {
                this.resetForm();
            });
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imageData = e.target.result;
                this.displayImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    displayImage(imageSrc) {
        const previewContainer = document.getElementById('image-preview');
        if (previewContainer) {
            previewContainer.innerHTML = `<img src="${imageSrc}" alt="Product Image" style="max-width: 100%; max-height: 180px; border-radius: 8px;">`;
        }
    }

    validateForm() {
        const requiredFields = ['product-name', 'product-category', 'product-size', 'product-color'];
        
        for (let fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value || field.value.trim() === '') {
                field.focus();
                this.showToast('Please fill all required fields', 'error');
                return false;
            }
        }
        
        return true;
    }

    collectFormData() {
        const formData = {
            name: document.getElementById('product-name').value,
            type: document.getElementById('product-category').value, // Backend expects 'type' not 'category'
            size: document.getElementById('product-size').value,
            color: document.getElementById('product-color').value,
            initial_quantity: parseInt(document.getElementById('initial-quantity').value) || 0,
            // Additional fields for local storage if needed
            price: parseFloat(document.getElementById('product-price').value) || 0,
            description: document.getElementById('product-description').value || '',
            minStock: parseInt(document.getElementById('min-stock').value) || 10,
            location: document.getElementById('location').value || '',
            material: document.getElementById('product-material').value || '',
            brand: document.getElementById('product-brand').value || '',
            image: this.imageData
        };
        
        return formData;
    }

    async saveProduct() {
        if (!this.validateForm()) {
            return;
        }

        const productData = this.collectFormData();
        
        // Show loading state
        const submitBtn = document.querySelector('.btn-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        try {
            console.log('Sending request to:', `${this.apiBaseUrl}/api/products/create`);
            console.log('Product data:', productData);
            
            // Send to backend API
            const response = await fetch(`${this.apiBaseUrl}/api/products/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });
            
            const result = await response.json();
            console.log('Server response:', result);
            
            if (response.ok && result.success) {
                // Save additional data to localStorage for compatibility
                this.saveToLocalStorage({
                    ...productData,
                    id: result.product_id,
                    product_id: result.product_id,
                    createdAt: new Date().toISOString(),
                    status: this.calculateStatus(productData.initial_quantity)
                });
                
                // Display the QR code returned from backend
                console.log('Displaying QR code:', result.qr_code);
                this.displayQRCode(result.qr_code, result.product_id);
                
                // Show success message
                this.showToast('✓ Product Created Successfully!', 'success');
                
                // Show QR section
                const qrSection = document.getElementById('qr-section');
                if (qrSection) {
                    qrSection.style.display = 'block';
                    // Scroll to QR section
                    qrSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                    console.error('QR section not found');
                }
                
                // Update stats
                this.updateDashboardStats();
            } else {
                throw new Error(result.error || 'Failed to create product');
            }
            
        } catch (error) {
            console.error('Error saving product:', error);
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            // Reset button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Product & Generate QR';
            }
        }
    }

    saveToLocalStorage(productData) {
        // Also save to localStorage for local features
        let products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
        products.push(productData);
        localStorage.setItem('inventory_products', JSON.stringify(products));
        
        // Update local inventory count
        let stats = JSON.parse(localStorage.getItem('dashboardStats') || '{}');
        stats.totalInventory = products.length;
        stats.productsToday = (stats.productsToday || 0) + 1;
        localStorage.setItem('dashboardStats', JSON.stringify(stats));
    }

    displayQRCode(qrDataUrl, productId) {
        const qrDisplay = document.getElementById('qr-display');
        if (qrDisplay) {
            console.log('QR Display element found, adding QR code image');
            console.log('QR Data URL (first 100 chars):', qrDataUrl.substring(0, 100));
            
            // Clear any existing content
            qrDisplay.innerHTML = '';
            
            // Create container div for better styling
            const container = document.createElement('div');
            container.style.textAlign = 'center';
            container.style.padding = '20px';
            
            // Create image element for QR code
            const img = document.createElement('img');
            img.src = qrDataUrl;
            img.style.width = '256px';
            img.style.height = '256px';
            img.style.display = 'block';
            img.style.margin = '0 auto';
            img.style.border = '2px solid #e0e0e0';
            img.style.borderRadius = '8px';
            img.style.padding = '10px';
            img.style.backgroundColor = 'white';
            img.id = 'generated-qr';
            img.alt = 'QR Code for ' + productId;
            
            // Add error handling for image
            img.onerror = () => {
                console.error('Failed to load QR code image');
                console.error('Data URL was:', qrDataUrl);
                qrDisplay.innerHTML = '<p style="color: red;">Failed to display QR code. Please try again.</p>';
            };
            
            img.onload = () => {
                console.log('QR code image loaded successfully');
                console.log('Image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
            };
            
            container.appendChild(img);
            qrDisplay.appendChild(container);
            
            // Store for download
            this.currentQRCode = {
                dataUrl: qrDataUrl,
                productId: productId
            };
            
            // Make sure the download button is properly attached
            const downloadBtn = document.getElementById('download-qr');
            if (downloadBtn) {
                // Remove any existing listeners
                const newDownloadBtn = downloadBtn.cloneNode(true);
                downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
                
                // Add new listener
                newDownloadBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Download button clicked');
                    this.downloadQR();
                });
            }
        } else {
            console.error('QR Display element not found!');
            // Try to find parent and debug
            const qrSection = document.getElementById('qr-section');
            console.log('QR Section found:', !!qrSection);
            if (qrSection) {
                console.log('QR Section HTML:', qrSection.innerHTML);
            }
        }
    }

    downloadQR() {
        if (!this.currentQRCode) {
            this.showToast('No QR code to download', 'error');
            return;
        }
        
        const link = document.createElement('a');
        link.href = this.currentQRCode.dataUrl;
        link.download = `QR_${this.currentQRCode.productId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('QR Code downloaded successfully', 'success');
    }

    calculateStatus(quantity) {
        if (quantity === 0) return 'out-of-stock';
        if (quantity < 10) return 'low-stock';
        return 'in-stock';
    }

    updateDashboardStats() {
        // Update today's product count
        const stats = JSON.parse(localStorage.getItem('dashboardStats') || '{}');
        const today = new Date().toDateString();
        
        if (stats.lastUpdate !== today) {
            stats.productsToday = 1;
            stats.lastUpdate = today;
        } else {
            stats.productsToday = (stats.productsToday || 0) + 1;
        }
        
        localStorage.setItem('dashboardStats', JSON.stringify(stats));
    }

    resetForm() {
        document.getElementById('product-form').reset();
        this.imageData = null;
        document.getElementById('image-preview').innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Click to upload image</p>
            <span>JPG, PNG, GIF - Max 5MB</span>
        `;
        document.getElementById('qr-section').style.display = 'none';
        this.setDefaultValues();
        this.showToast('Form reset successfully', 'success');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('success-toast');
        if (toast) {
            // Update message
            toast.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            `;
            
            // Update background color based on type
            if (type === 'error') {
                toast.style.background = '#ef4444';
            } else if (type === 'info') {
                toast.style.background = '#3b82f6';
            } else {
                toast.style.background = '#10b981';
            }
            
            // Show toast
            toast.classList.add('show');
            
            // Hide after 3 seconds
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize once
    if (!window.productManager) {
        window.productManager = new SimpleProductManager();
    }
});

// Global functions for backward compatibility
function clearForm() {
    if (window.productManager) {
        window.productManager.resetForm();
    }
}

function createAnother() {
    if (window.productManager) {
        window.productManager.resetForm();
    }
}