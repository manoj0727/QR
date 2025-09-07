class InventoryManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentFilters = {
            status: 'all',
            category: 'all'
        };
        this.currentSort = {
            column: 'createdAt',
            direction: 'desc' // Newest first
        };
        this.pagination = {
            page: 1,
            perPage: 25,
            total: 0
        };
        this.debounceSearch = this.debounce(() => {
            this.applyFilters();
        }, 300);
        this.init();
    }
    async init() {
        this.attachEventListeners();
        await this.loadProducts();
        // render() is already called at the end of loadProducts through applyFilters
    }
    async loadProducts() {
        try {
            // Try to load from database first
            if (window.apiService) {
                console.log('Loading products from database...');
                const dbProducts = await window.apiService.getProducts();
                
                if (dbProducts && dbProducts.length > 0) {
                    // Convert backend format to frontend format
                    this.products = dbProducts.map(p => {
                        // Ensure price has a default value
                        const product = window.apiService.formatProductForFrontend(p);
                        product.price = product.price || 0;
                        return product;
                    });
                    
                    // Sort by creation date - newest first
                    this.products.sort((a, b) => {
                        const dateA = new Date(a.createdAt || a.lastUpdated).getTime();
                        const dateB = new Date(b.createdAt || b.lastUpdated).getTime();
                        return dateB - dateA;
                    });
                    
                    console.log(`Loaded ${this.products.length} products from database`);
                    
                    // Also save to localStorage for offline access
                    localStorage.setItem('inventory_products', JSON.stringify(this.products));
                } else {
                    console.log('No products in database, checking localStorage');
                    this.loadFromLocalStorage();
                }
            } else {
                console.log('API service not available, using localStorage');
                this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('Error loading from database:', error);
            console.log('Falling back to localStorage');
            this.loadFromLocalStorage();
        }
        
        this.applyFilters();
    }
    
    loadFromLocalStorage() {
        const savedProducts = localStorage.getItem('inventory_products');
        if (savedProducts) {
            try {
                const products = JSON.parse(savedProducts);
                this.products = products.map((p) => ({
                    ...p,
                    lastUpdated: p.updatedAt ? new Date(p.updatedAt) : new Date(),
                    createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                    material: p.material || 'Not specified',
                    brand: p.brand || '',
                    location: p.location || '',
                    minStock: p.minStock || 10,
                    price: p.price !== undefined ? p.price : 0,
                    quantity: p.quantity || 0,
                    status: p.status || 'in-stock'
                }));
                // Sort by creation date - newest first
                this.products.sort((a, b) => {
                    const dateA = a.createdAt ? a.createdAt.getTime() : 0;
                    const dateB = b.createdAt ? b.createdAt.getTime() : 0;
                    return dateB - dateA;
                });
                console.log(`Loaded ${this.products.length} products from localStorage`);
            } catch (error) {
                console.error('Error loading products from localStorage:', error);
                // Don't load sample data, just use empty array
                this.products = [];
            }
        } else {
            console.log('No saved products found');
            // Don't load sample data automatically
            this.products = [];
        }
    }
    loadSampleData() {
        // Sample data with all new fields
        this.products = [
            {
                id: 'PRD-001',
                sku: 'SHI-M-BL-001',
                name: 'Blue Cotton Shirt',
                category: 'Shirt',
                size: 'M',
                color: 'Blue',
                material: 'Cotton',
                brand: 'Fashion Brand',
                quantity: 145,
                minStock: 20,
                price: 599,
                location: 'Rack A-12',
                status: 'in-stock',
                lastUpdated: new Date(),
                createdAt: new Date()
            },
            {
                id: 'PRD-002',
                sku: 'PAN-L-BL-002',
                name: 'Black Denim Jeans',
                category: 'Pants',
                size: 'L',
                color: 'Black',
                material: 'Denim',
                brand: 'Denim Co',
                quantity: 12,
                minStock: 15,
                price: 1299,
                location: 'Rack B-05',
                status: 'low-stock',
                lastUpdated: new Date(),
                createdAt: new Date()
            },
            {
                id: 'PRD-003',
                sku: 'JAC-XL-RE-003',
                name: 'Red Leather Jacket',
                category: 'Jacket',
                size: 'XL',
                color: 'Red',
                material: 'Leather',
                brand: 'Premium Wear',
                quantity: 0,
                minStock: 5,
                price: 3499,
                location: 'Rack C-01',
                status: 'out-of-stock',
                lastUpdated: new Date(),
                createdAt: new Date()
            }
        ];
    }
    attachEventListeners() {
        var _a, _b, _c, _d, _f;
        // Filter listeners
        (_a = document.getElementById('status-filter')) === null || _a === void 0 ? void 0 : _a.addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.applyFilters();
        });
        (_b = document.getElementById('category-filter')) === null || _b === void 0 ? void 0 : _b.addEventListener('change', (e) => {
            this.currentFilters.category = e.target.value;
            this.applyFilters();
        });
        (_c = document.getElementById('search-input')) === null || _c === void 0 ? void 0 : _c.addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.debounceSearch();
        });
        // Sort listeners for Price and Stock columns only
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                if (column === 'price' || column === 'quantity') {
                    this.handleSort(column);
                }
            });
        });
        // Pagination listeners
        (_d = document.getElementById('per-page')) === null || _d === void 0 ? void 0 : _d.addEventListener('change', (e) => {
            this.pagination.perPage = parseInt(e.target.value);
            this.pagination.page = 1;
            this.render();
        });
        // Clear filters
        (_f = document.querySelector('.clear-filter')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => {
            this.clearFilters();
        });
    }
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    applyFilters() {
        this.filteredProducts = this.products.filter(product => {
            // Status filter
            if (this.currentFilters.status !== 'all' && product.status !== this.currentFilters.status) {
                return false;
            }
            // Category filter
            if (this.currentFilters.category !== 'all' &&
                product.category.toLowerCase() !== this.currentFilters.category.toLowerCase()) {
                return false;
            }
            // Search filter
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const searchFields = [
                    product.id,
                    product.sku,
                    product.name,
                    product.category,
                    product.color
                ].join(' ').toLowerCase();
                if (!searchFields.includes(searchTerm)) {
                    return false;
                }
            }
            return true;
        });
        this.pagination.total = this.filteredProducts.length;
        this.pagination.page = 1;
        this.render();
    }
    handleSort(column) {
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        }
        else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }
        this.updateSortIndicators(column);
        this.applySort();
    }
    applySort() {
        const column = this.currentSort.column;
        const direction = this.currentSort.direction;
        this.filteredProducts.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];
            if (column === 'last_updated') {
                aVal = a.lastUpdated.getTime();
                bVal = b.lastUpdated.getTime();
            }
            else if (column === 'createdAt') {
                aVal = a.createdAt ? a.createdAt.getTime() : 0;
                bVal = b.createdAt ? b.createdAt.getTime() : 0;
            }
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            if (direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            else {
                return aVal < bVal ? 1 : -1;
            }
        });
        this.render();
    }
    updateSortIndicators(column) {
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('active', 'asc', 'desc');
            const icon = header.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-sort';
            }
        });
        const activeHeader = document.querySelector(`.sortable[data-column="${column}"]`);
        if (activeHeader) {
            activeHeader.classList.add('active', this.currentSort.direction);
            const icon = activeHeader.querySelector('i');
            if (icon) {
                icon.className = this.currentSort.direction === 'asc' ?
                    'fas fa-sort-up' : 'fas fa-sort-down';
            }
        }
    }
    clearFilters() {
        this.currentFilters = {
            status: 'all',
            category: 'all'
        };
        document.getElementById('status-filter').value = 'all';
        document.getElementById('category-filter').value = 'all';
        document.getElementById('search-input').value = '';
        this.applyFilters();
    }
    getCurrentPageProducts() {
        const start = (this.pagination.page - 1) * this.pagination.perPage;
        const end = start + this.pagination.perPage;
        return this.filteredProducts.slice(start, end);
    }
    render() {
        this.renderTable();
        this.renderPagination();
        this.updateRecordCount();
    }
    renderTable() {
        const tbody = document.getElementById('inventory-tbody');
        const emptyState = document.querySelector('.empty-state');
        if (!tbody)
            return;
        const products = this.getCurrentPageProducts();
        if (products.length === 0) {
            this.showEmptyState();
            return;
        }
        // Hide empty state when we have products
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        tbody.innerHTML = products.map(product => this.renderTableRow(product)).join('');
        this.attachRowEventListeners();
    }
    renderTableRow(product) {
        const stockPercentage = Math.min((product.quantity / 200) * 100, 100);
        // Show "No Image" text if no image is available
        const imageDisplay = product.image
            ? `<img src="${product.image}" alt="${product.name}" onerror="this.parentElement.innerHTML='<span style=\\'color: #999; font-size: 11px;\\'>No Image</span>'">`
            : '<span style="color: #999; font-size: 11px;">No Image</span>';
        // Show only important columns: ID, Image, Name, Quantity, Price, Status, Actions
        return `
            <tr data-id="${product.id}">
                <td class="product-id">
                    <a href="#" class="link">${product.id}</a>
                </td>
                <td class="image-col">
                    <div class="product-image" style="display: flex; align-items: center; justify-content: center; min-height: 40px;">
                        ${imageDisplay}
                    </div>
                </td>
                <td class="product-name">
                    <div class="name-cell">
                        <span class="name">${product.name}</span>
                        <span class="sub-info">${product.category}</span>
                    </div>
                </td>
                <td class="quantity">
                    <div class="stock-info">
                        <span class="stock-number ${product.quantity < (product.minStock || 20) ? 'low' : ''}">${product.quantity}</span>
                        <div class="stock-bar">
                            <div class="stock-level ${product.quantity < (product.minStock || 20) ? 'low' : ''}" style="width: ${stockPercentage}%;"></div>
                        </div>
                    </div>
                </td>
                <td class="price">₹${(product.price || 0).toFixed(0)}</td>
                <td class="status">
                    <span class="status-badge ${product.status}">${this.formatStatus(product.status)}</span>
                </td>
                <td class="actions-col">
                    <div class="actions">
                        <button class="action-btn" title="View Details" onclick="viewProduct('${product.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" title="Edit" onclick="editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" title="QR Code" onclick="showQRCode('${product.id}')">
                            <i class="fas fa-qrcode"></i>
                        </button>
                        <button class="action-btn danger" title="Delete" onclick="deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    attachRowEventListeners() {
        // Row event listeners will be added here if needed
    }
    renderPagination() {
        const totalPages = Math.ceil(this.pagination.total / this.pagination.perPage);
        const pagination = document.querySelector('.pagination');
        if (!pagination)
            return;
        let paginationHTML = `
            <button class="page-btn" ${this.pagination.page === 1 ? 'disabled' : ''} data-page="${this.pagination.page - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        // Page numbers logic
        const maxVisible = 5;
        let startPage = Math.max(1, this.pagination.page - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        if (startPage > 1) {
            paginationHTML += `<button class="page-number" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
        }
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-number ${i === this.pagination.page ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
            paginationHTML += `<button class="page-number" data-page="${totalPages}">${totalPages}</button>`;
        }
        paginationHTML += `
            <button class="page-btn" ${this.pagination.page === totalPages ? 'disabled' : ''} data-page="${this.pagination.page + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        pagination.innerHTML = paginationHTML;
        // Update pagination info
        const start = (this.pagination.page - 1) * this.pagination.perPage + 1;
        const end = Math.min(start + this.pagination.perPage - 1, this.pagination.total);
        document.getElementById('start-record').textContent = start.toString();
        document.getElementById('end-record').textContent = end.toString();
        document.getElementById('total-records').textContent = this.pagination.total.toString();
        // Attach pagination event listeners
        pagination.querySelectorAll('button:not([disabled])').forEach(button => {
            button.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page);
                if (page) {
                    this.pagination.page = page;
                    this.render();
                }
            });
        });
    }
    updateRecordCount() {
        const recordCount = document.querySelector('.record-count');
        if (recordCount) {
            recordCount.textContent = `${this.filteredProducts.length} Records`;
        }
    }
    showEmptyState() {
        const tbody = document.getElementById('inventory-tbody');
        const emptyState = document.querySelector('.empty-state');
        if (tbody)
            tbody.innerHTML = '';
        if (emptyState)
            emptyState.style.display = 'block';
    }
    getColorBorder(color) {
        const colorLower = color.toLowerCase().trim();
        // Add border for white and light colors for visibility
        if (colorLower === 'white' || colorLower.includes('white') ||
            colorLower === 'cream' || colorLower === 'ivory' ||
            colorLower === 'beige' || colorLower === 'yellow' ||
            colorLower.includes('light')) {
            return 'border: 1px solid #D1D5DB;';
        }
        return '';
    }
    getColorHex(color) {
        // Convert to lowercase for better matching
        const colorLower = color.toLowerCase().trim();
        const colors = {
            // Basic colors
            'blue': '#2196F3',
            'black': '#000000',
            'red': '#DC2626',
            'white': '#FFFFFF',
            'green': '#16A34A',
            'yellow': '#FFC107',
            'orange': '#FF6B35',
            'purple': '#9333EA',
            'pink': '#EC4899',
            'brown': '#92400E',
            'grey': '#6B7280',
            'gray': '#6B7280',
            // Extended colors
            'navy': '#1E3A8A',
            'navy blue': '#1E3A8A',
            'dark blue': '#1E40AF',
            'light blue': '#60A5FA',
            'sky blue': '#38BDF8',
            'royal blue': '#2563EB',
            'dark red': '#991B1B',
            'maroon': '#7F1D1D',
            'light red': '#FCA5A5',
            'wine': '#881337',
            'dark green': '#14532D',
            'light green': '#86EFAC',
            'olive': '#65A30D',
            'mint': '#6EE7B7',
            'lime': '#84CC16',
            'gold': '#F59E0B',
            'golden': '#F59E0B',
            'silver': '#9CA3AF',
            'beige': '#D4A574',
            'cream': '#FEF3C7',
            'ivory': '#FFF7ED',
            'violet': '#7C3AED',
            'indigo': '#4F46E5',
            'lavender': '#C7D2FE',
            'magenta': '#D946EF',
            'fuchsia': '#D946EF',
            'teal': '#0D9488',
            'cyan': '#06B6D4',
            'turquoise': '#14B8A6',
            'aqua': '#06B6D4',
            'coral': '#FB923C',
            'salmon': '#FDA4AF',
            'peach': '#FED7AA',
            'khaki': '#D97706',
            'charcoal': '#1F2937',
            'ash': '#9CA3AF',
            'smoke': '#E5E7EB',
            // Multi-word colors
            'off white': '#FAF9F6',
            'off-white': '#FAF9F6',
            'dark gray': '#4B5563',
            'light gray': '#D1D5DB',
            'dark grey': '#4B5563',
            'light grey': '#D1D5DB'
        };
        // Check exact match first
        if (colors[colorLower]) {
            return colors[colorLower];
        }
        // Check if the color contains any known color word
        for (const [key, value] of Object.entries(colors)) {
            if (colorLower.includes(key) || key.includes(colorLower)) {
                return value;
            }
        }
        // For white color, add border
        if (colorLower === 'white' || colorLower.includes('white')) {
            return '#FFFFFF';
        }
        // Default gray if no match
        return '#6B7280';
    }
    formatStatus(status) {
        return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    formatDate(date) {
        const options = {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    }
    formatTime(date) {
        const options = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleTimeString('en-US', options);
    }
}
// View product - expand row inline to show details (no popup)
function viewProduct(productId) {
    const row = document.querySelector(`tr[data-id="${productId}"]`);
    if (!row)
        return;
    // Check if details row already exists
    const nextRow = row.nextElementSibling;
    if (nextRow && nextRow.classList.contains('details-row')) {
        // Toggle visibility
        nextRow.remove();
        return;
    }
    // Get product data
    const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
    const product = products.find((p) => p.id === productId);
    if (!product)
        return;
    // Create expanded details row
    const detailsRow = document.createElement('tr');
    detailsRow.className = 'details-row';
    detailsRow.innerHTML = `
        <td colspan="8" class="details-cell">
            <div class="product-details-expanded">
                <div class="details-header">
                    <h3>Product Details: ${product.name}</h3>
                    <button onclick="this.closest('tr').remove()" class="close-details">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Product ID:</label>
                        <span>${product.id}</span>
                    </div>
                    <div class="detail-item">
                        <label>SKU:</label>
                        <span>${product.sku}</span>
                    </div>
                    <div class="detail-item">
                        <label>Category:</label>
                        <span>${product.category}</span>
                    </div>
                    <div class="detail-item">
                        <label>Size:</label>
                        <span>${product.size}</span>
                    </div>
                    <div class="detail-item">
                        <label>Color:</label>
                        <span>${product.color}</span>
                    </div>
                    <div class="detail-item">
                        <label>Material:</label>
                        <span>${product.material || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Brand:</label>
                        <span>${product.brand || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Price:</label>
                        <span>₹${product.price || 0}</span>
                    </div>
                    <div class="detail-item">
                        <label>Stock:</label>
                        <span>${product.quantity}</span>
                    </div>
                    <div class="detail-item">
                        <label>Min Stock:</label>
                        <span>${product.minStock || 10}</span>
                    </div>
                    <div class="detail-item">
                        <label>Location:</label>
                        <span>${product.location || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-badge ${product.status}">${product.status.replace('-', ' ')}</span>
                    </div>
                    ${product.description ? `
                    <div class="detail-item full-width">
                        <label>Description:</label>
                        <span>${product.description}</span>
                    </div>
                    ` : ''}
                    <div class="detail-item">
                        <label>Created:</label>
                        <span>${new Date(product.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Updated:</label>
                        <span>${new Date(product.updatedAt || product.lastUpdated).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </td>
    `;
    // Insert after current row
    row.insertAdjacentElement('afterend', detailsRow);
}
// Edit product - navigate to edit page
async function editProduct(productId) {
    try {
        let product = null;
        
        // Try to get from database first
        if (window.apiService) {
            try {
                const response = await window.apiService.getProduct(productId);
                if (response && response.product) {
                    product = window.apiService.formatProductForFrontend(response.product);
                }
            } catch (error) {
                // Failed to fetch from database, using local data
            }
        }
        
        // Fallback to localStorage if database not available
        if (!product) {
            const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
            product = products.find((p) => p.id === productId);
        }
        
        if (!product) {
            showToast('Product not found', 'error');
            return;
        }
        
        // Store product data for editing
        sessionStorage.setItem('edit_product', JSON.stringify(product));
        
        // Navigate to edit page
        window.location.href = `product-simple.html?edit=${productId}`;
    }
    catch (error) {
        console.error('Error editing product:', error);
        showToast('Error editing product', 'error');
    }
}
// Generate and show QR Code in new window
async function showQRCode(productId) {
    try {
        // Get product data
        const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
        const product = products.find((p) => p.id === productId);
        if (!product) {
            showToast('Product not found', 'error');
            return;
        }
        // Create QR data with only important info
        const qrData = JSON.stringify({
            id: product.id,
            sku: product.sku,
            name: product.name,
            price: product.price,
            qty: product.quantity
        });
        // Open new window for QR code
        const qrWindow = window.open('', '_blank', 'width=400,height=500,toolbar=no,menubar=no');
        if (!qrWindow) {
            showToast('Please allow popups for QR code display', 'error');
            return;
        }
        // Write HTML content to new window
        qrWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code - ${product.sku}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        margin: 0;
                        background: #f9f9f9;
                    }
                    .qr-container {
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    h2 {
                        margin: 0 0 20px 0;
                        color: #333;
                        font-size: 20px;
                    }
                    #qrcode {
                        margin: 20px auto;
                        padding: 15px;
                        background: white;
                        border: 1px solid #ddd;
                    }
                    .product-info {
                        margin-top: 20px;
                        padding: 15px;
                        background: #f5f5f5;
                        border-radius: 5px;
                        text-align: left;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                        font-size: 14px;
                    }
                    .info-label {
                        font-weight: bold;
                        color: #666;
                    }
                    .info-value {
                        color: #333;
                    }
                    .actions {
                        margin-top: 20px;
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                    }
                    button {
                        padding: 10px 20px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: opacity 0.2s;
                    }
                    button:hover {
                        opacity: 0.8;
                    }
                    .print-btn {
                        background: #10b981;
                        color: white;
                    }
                    .download-btn {
                        background: #3b82f6;
                        color: white;
                    }
                    .close-btn {
                        background: #6b7280;
                        color: white;
                    }
                </style>
                <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
            </head>
            <body>
                <div class="qr-container">
                    <h2>Product QR Code</h2>
                    <div id="qrcode"></div>
                    <div class="product-info">
                        <div class="info-row">
                            <span class="info-label">Product:</span>
                            <span class="info-value">${product.name}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">SKU:</span>
                            <span class="info-value">${product.sku}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Price:</span>
                            <span class="info-value">₹${product.price || 0}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Stock:</span>
                            <span class="info-value">${product.quantity} units</span>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="print-btn" onclick="window.print()">Print</button>
                        <button class="download-btn" onclick="downloadQR()">Download</button>
                        <button class="close-btn" onclick="window.close()">Close</button>
                    </div>
                </div>
                <script>
                    // Generate QR code
                    const qrcode = new QRCode(document.getElementById("qrcode"), {
                        text: '${qrData.replace(/'/g, "\\'")}',
                        width: 200,
                        height: 200,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    
                    // Download function
                    function downloadQR() {
                        const canvas = document.querySelector('#qrcode canvas');
                        if (canvas) {
                            const link = document.createElement('a');
                            link.download = 'QR-${product.sku}.png';
                            link.href = canvas.toDataURL();
                            link.click();
                        }
                    }
                </script>
            </body>
            </html>
        `);
        showToast('QR Code opened in new window', 'success');
    }
    catch (error) {
        console.error('Error generating QR code:', error);
        showToast('Error generating QR code', 'error');
    }
}
// Delete product with confirmation
async function deleteProduct(productId) {
    let product = null;
    
    // Try to get product details
    if (window.apiService) {
        try {
            const response = await window.apiService.getProduct(productId);
            if (response && response.product) {
                product = window.apiService.formatProductForFrontend(response.product);
            }
        } catch (error) {
            // Failed to fetch from database
        }
    }
    
    // Fallback to localStorage
    if (!product) {
        const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
        product = products.find((p) => p.id === productId);
    }
    
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        let deletedFromDB = false;
        
        // Try to delete from database first (soft delete - sets status to inactive)
        if (window.apiService) {
            try {
                const response = await window.apiService.deleteProduct(productId);
                if (response && response.success) {
                    deletedFromDB = true;
                    // Remove from localStorage as well to keep UI in sync
                    const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
                    const updatedProducts = products.filter((p) => p.id !== productId);
                    localStorage.setItem('inventory_products', JSON.stringify(updatedProducts));
                    
                    showToast('Product removed from inventory', 'success');
                    // Refresh the page to show updated list
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    throw new Error('Failed to delete product');
                }
            } catch (error) {
                console.error('Database deletion failed:', error);
                // Fallback to localStorage deletion
                const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
                const updatedProducts = products.filter((p) => p.id !== productId);
                localStorage.setItem('inventory_products', JSON.stringify(updatedProducts));
                
                showToast('Product removed from local storage', 'info');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } else {
            // No API service, delete from localStorage only
            const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
            const updatedProducts = products.filter((p) => p.id !== productId);
            localStorage.setItem('inventory_products', JSON.stringify(updatedProducts));
            
            showToast('Product removed from inventory', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }
    catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product', 'error');
    }
}
// Toast notification function
function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    // Set color based on type
    if (type === 'error') {
        toast.style.background = '#DC2626';
    }
    else if (type === 'info') {
        toast.style.background = '#3B82F6';
    }
    else {
        toast.style.background = '#10B981';
    }
    // Add icon
    const icon = type === 'error' ? 'fa-exclamation-circle' :
        type === 'info' ? 'fa-info-circle' : 'fa-check-circle';
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}
// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .details-row {
        background: #F9FAFB;
    }
    
    .details-cell {
        padding: 0 !important;
    }
    
    .product-details-expanded {
        padding: 20px;
        background: white;
        margin: 10px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .details-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #E5E7EB;
    }
    
    .details-header h3 {
        margin: 0;
        color: #1F2937;
        font-size: 18px;
    }
    
    .close-details {
        background: none;
        border: none;
        color: #6B7280;
        cursor: pointer;
        font-size: 20px;
        padding: 5px;
    }
    
    .close-details:hover {
        color: #DC2626;
    }
    
    .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
    }
    
    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    
    .detail-item.full-width {
        grid-column: 1 / -1;
    }
    
    .detail-item label {
        font-size: 12px;
        color: #6B7280;
        font-weight: 500;
    }
    
    .detail-item span {
        font-size: 14px;
        color: #1F2937;
    }
`;
document.head.appendChild(style);
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new InventoryManager();
    // Handle dropdown menu for more actions
    document.addEventListener('click', (e) => {
        var _a, _b, _c;
        const target = e.target;
        const dropdown = target.closest('.dropdown');
        if (dropdown) {
            const menu = dropdown.querySelector('.dropdown-menu');
            if (menu) {
                // Toggle menu
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                // Handle menu item clicks
                if (target.tagName === 'A') {
                    e.preventDefault();
                    const row = target.closest('tr');
                    const productId = row === null || row === void 0 ? void 0 : row.getAttribute('data-id');
                    if (productId) {
                        if (target.classList.contains('danger')) {
                            deleteProduct(productId);
                        }
                        else if ((_a = target.textContent) === null || _a === void 0 ? void 0 : _a.includes('Duplicate')) {
                            // Duplicate functionality
                            duplicateProduct(productId);
                        }
                        else if ((_b = target.textContent) === null || _b === void 0 ? void 0 : _b.includes('Print')) {
                            // Print label
                            printLabel(productId);
                        }
                        else if ((_c = target.textContent) === null || _c === void 0 ? void 0 : _c.includes('History')) {
                            // View history
                            viewHistory(productId);
                        }
                    }
                    menu.style.display = 'none';
                }
            }
        }
        else {
            // Close all dropdowns when clicking outside
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });
});
// Additional helper functions
function duplicateProduct(productId) {
    const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
    const product = products.find((p) => p.id === productId);
    if (product) {
        const newProduct = Object.assign(Object.assign({}, product), { id: 'PRD-' + Date.now().toString(36).toUpperCase(), sku: product.sku + '-COPY-' + Date.now().toString(36).substring(-4).toUpperCase(), name: product.name + ' (Copy)', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        products.unshift(newProduct);
        localStorage.setItem('inventory_products', JSON.stringify(products));
        showToast('Product duplicated successfully', 'success');
        setTimeout(() => window.location.reload(), 1000);
    }
}
function printLabel(productId) {
    const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
    const product = products.find((p) => p.id === productId);
    if (product) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Product Label - ${product.sku}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .label { border: 2px solid #000; padding: 20px; width: 300px; }
                        h2 { margin: 0 0 10px 0; }
                        .info { margin: 5px 0; }
                        .barcode { margin-top: 15px; text-align: center; font-family: monospace; font-size: 24px; }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <h2>${product.name}</h2>
                        <div class="info"><strong>SKU:</strong> ${product.sku}</div>
                        <div class="info"><strong>Size:</strong> ${product.size}</div>
                        <div class="info"><strong>Color:</strong> ${product.color}</div>
                        <div class="info"><strong>Price:</strong> ₹${product.price}</div>
                        <div class="barcode">||||| ${product.sku} |||||</div>
                    </div>
                    <script>window.print(); setTimeout(() => window.close(), 1000);</script>
                </body>
                </html>
            `);
        }
    }
}
function viewHistory(productId) {
    showToast('Product history feature coming soon', 'info');
}
