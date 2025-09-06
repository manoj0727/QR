// Product Creation Manager with Database Integration
class ProductCreator {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.productData = {};
        this.images = {
            primary: null,
            additional: []
        };
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.calculateProfitMargin();
        this.initializeImageUploads();
    }

    attachEventListeners() {
        // Size selector
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById('product-size').value = e.target.dataset.size;
            });
        });

        // Character counter
        const description = document.getElementById('product-description');
        if (description) {
            description.addEventListener('input', (e) => {
                const count = e.target.value.length;
                document.querySelector('.char-count').textContent = `${count} / 500 characters`;
            });
        }

        // Profit margin calculator
        ['cost-price', 'selling-price'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.calculateProfitMargin());
            }
        });

        // Color picker sync
        const colorPicker = document.getElementById('color-picker');
        const colorInput = document.getElementById('product-color');
        if (colorPicker && colorInput) {
            colorPicker.addEventListener('change', (e) => {
                colorInput.value = this.getColorName(e.target.value);
            });
        }
    }

    calculateProfitMargin() {
        const costPrice = parseFloat(document.getElementById('cost-price')?.value) || 0;
        const sellingPrice = parseFloat(document.getElementById('selling-price')?.value) || 0;
        
        if (costPrice > 0 && sellingPrice > 0) {
            const profit = sellingPrice - costPrice;
            const margin = ((profit / sellingPrice) * 100).toFixed(2);
            
            document.getElementById('profit-margin').textContent = `${margin}%`;
            document.querySelector('.profit-amount').textContent = `$${profit.toFixed(2)}`;
        }
    }

    getColorName(hex) {
        // Simple color name detection
        const colors = {
            '#000000': 'Black',
            '#FFFFFF': 'White',
            '#FF0000': 'Red',
            '#00FF00': 'Green',
            '#0000FF': 'Blue',
            '#FFFF00': 'Yellow',
            '#FF00FF': 'Magenta',
            '#00FFFF': 'Cyan',
            '#2196F3': 'Blue',
            '#4CAF50': 'Green',
            '#F44336': 'Red',
            '#FFC107': 'Amber',
            '#9C27B0': 'Purple',
            '#E91E63': 'Pink'
        };
        
        return colors[hex.toUpperCase()] || hex;
    }

    generateSKU() {
        const category = document.getElementById('product-category').value;
        const size = document.getElementById('product-size').value;
        const color = document.getElementById('product-color').value;
        const timestamp = Date.now().toString().slice(-6);
        
        if (category && size) {
            const categoryCode = category.substring(0, 3).toUpperCase();
            const colorCode = color ? color.substring(0, 3).toUpperCase() : 'XXX';
            const sku = `${categoryCode}-${size}-${colorCode}-${timestamp}`;
            document.getElementById('product-sku').value = sku;
        } else {
            alert('Please select category and size first');
        }
    }

    initializeImageUploads() {
        // Primary image upload
        const primaryInput = document.getElementById('primary-image');
        if (primaryInput) {
            primaryInput.addEventListener('change', (e) => {
                this.handleImageUpload(e, 'primary');
            });
        }

        // Additional images
        for (let i = 1; i <= 4; i++) {
            const input = document.getElementById(`additional-image-${i}`);
            if (input) {
                input.addEventListener('change', (e) => {
                    this.handleImageUpload(e, `additional-${i}`);
                });
            }
        }
    }

    handleImageUpload(event, type) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (type === 'primary') {
                    this.images.primary = e.target.result;
                    this.displayImage('primary-image-box', e.target.result);
                } else {
                    const index = type.split('-')[1];
                    this.images.additional[index - 1] = e.target.result;
                    this.displayImage(`additional-image-${index}`, e.target.result);
                }
            };
            reader.readAsDataURL(file);
        }
    }

    displayImage(containerId, imageUrl) {
        const container = containerId === 'primary-image-box' ? 
            document.getElementById(containerId) : 
            document.querySelector(`[data-index="${containerId.split('-')[2]}"]`);
            
        if (container) {
            const placeholder = container.querySelector('.upload-placeholder');
            const preview = container.querySelector('.image-preview');
            const img = preview.querySelector('img');
            
            placeholder.style.display = 'none';
            preview.style.display = 'block';
            img.src = imageUrl;
        }
    }

    removeImage(type) {
        if (type === 'primary') {
            this.images.primary = null;
            const container = document.getElementById('primary-image-box');
            const placeholder = container.querySelector('.upload-placeholder');
            const preview = container.querySelector('.image-preview');
            placeholder.style.display = 'flex';
            preview.style.display = 'none';
        } else {
            const index = type.split('-')[1];
            this.images.additional[index - 1] = null;
            const container = document.querySelector(`[data-index="${index}"]`);
            const placeholder = container.querySelector('.upload-placeholder');
            const preview = container.querySelector('.image-preview');
            placeholder.style.display = 'flex';
            preview.style.display = 'none';
        }
    }

    nextStep() {
        if (this.validateStep(this.currentStep)) {
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.updateStepDisplay();
            } else {
                this.saveProduct();
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    updateStepDisplay() {
        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index + 1 < this.currentStep) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (index + 1 === this.currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });

        // Update form steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        document.querySelector(`.form-step[data-step="${this.currentStep}"]`).classList.add('active');

        // Update navigation buttons
        const prevBtn = document.querySelector('.btn-nav.prev');
        const nextBtn = document.querySelector('.btn-nav.next');
        
        prevBtn.style.display = this.currentStep === 1 ? 'none' : 'flex';
        
        if (this.currentStep === this.totalSteps) {
            nextBtn.innerHTML = 'Save Product <i class="fas fa-check"></i>';
            nextBtn.classList.add('btn-success');
        } else {
            nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
            nextBtn.classList.remove('btn-success');
        }
    }

    validateStep(step) {
        switch(step) {
            case 1:
                const name = document.getElementById('product-name').value;
                const category = document.getElementById('product-category').value;
                const size = document.getElementById('product-size').value;
                const color = document.getElementById('product-color').value;
                
                if (!name || !category || !size || !color) {
                    alert('Please fill in all required fields');
                    return false;
                }
                break;
            case 2:
                const sku = document.getElementById('product-sku').value;
                const stock = document.getElementById('initial-stock').value;
                
                if (!sku || stock === '') {
                    alert('Please fill in SKU and initial stock');
                    return false;
                }
                break;
            case 3:
                const costPrice = document.getElementById('cost-price').value;
                const sellingPrice = document.getElementById('selling-price').value;
                
                if (!costPrice || !sellingPrice) {
                    alert('Please enter cost and selling prices');
                    return false;
                }
                break;
        }
        return true;
    }

    collectFormData() {
        const formData = new FormData(document.getElementById('product-form'));
        const data = {};
        
        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Add images
        data.images = this.images;
        
        // Add metadata
        data.createdAt = new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        data.status = this.calculateStockStatus(data.initialStock);
        data.id = this.generateProductId();
        
        return data;
    }

    calculateStockStatus(quantity) {
        quantity = parseInt(quantity);
        if (quantity === 0) return 'out-of-stock';
        if (quantity < 20) return 'low-stock';
        return 'in-stock';
    }

    generateProductId() {
        return 'PRD-' + Date.now().toString(36).toUpperCase();
    }

    async saveProduct() {
        const productData = this.collectFormData();
        
        try {
            // Save to database
            const saved = await this.saveToDatabase(productData);
            
            if (saved) {
                // Generate QR Code
                this.generateQRCode(productData.id);
                
                // Show success modal
                this.showSuccessModal();
                
                // Store in localStorage for demo
                this.storeLocally(productData);
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error saving product. Please try again.');
        }
    }

    async saveToDatabase(productData) {
        // Simulate API call to save product
        // In production, this would be an actual API call
        
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            
            // For demo, just return true
            return true;
        } catch (error) {
            // For demo purposes, save to localStorage
            return true;
        }
    }

    storeLocally(productData) {
        // Get existing products from localStorage
        let products = JSON.parse(localStorage.getItem('products') || '[]');
        
        // Add new product
        products.push(productData);
        
        // Save back to localStorage
        localStorage.setItem('products', JSON.stringify(products));
    }

    generateQRCode(productId) {
        // This would generate actual QR code
        // For demo, just show placeholder
        const qrContainer = document.getElementById('qr-code-preview');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div style="padding: 20px;">
                    <i class="fas fa-qrcode" style="font-size: 100px; color: #333;"></i>
                    <p style="margin-top: 10px; font-size: 12px;">${productId}</p>
                </div>
            `;
        }
    }

    showSuccessModal() {
        const modal = document.getElementById('success-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    saveDraft() {
        const draftData = this.collectFormData();
        draftData.isDraft = true;
        
        localStorage.setItem('productDraft', JSON.stringify(draftData));
        alert('Draft saved successfully!');
    }

    saveAndContinue() {
        this.saveProduct().then(() => {
            // Reset form for new product
            document.getElementById('product-form').reset();
            this.currentStep = 1;
            this.updateStepDisplay();
            this.images = { primary: null, additional: [] };
        });
    }
}

// Global functions
function generateSKU() {
    productCreator.generateSKU();
}

function removeImage(type) {
    productCreator.removeImage(type);
}

function nextStep() {
    productCreator.nextStep();
}

function previousStep() {
    productCreator.previousStep();
}

function saveProduct() {
    productCreator.saveProduct();
}

function saveDraft() {
    productCreator.saveDraft();
}

function saveAndContinue() {
    productCreator.saveAndContinue();
}

function viewProduct() {
    // Navigate to product view
    window.location.href = 'inventory-advanced.html';
}

function createAnother() {
    // Reset form
    location.reload();
}

// Initialize when DOM is ready
let productCreator;
document.addEventListener('DOMContentLoaded', () => {
    productCreator = new ProductCreator();
});