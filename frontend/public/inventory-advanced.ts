// TypeScript interfaces for inventory system
interface Product {
    id: string;
    sku: string;
    name: string;
    category: string;
    size: string;
    color: string;
    material: string;
    brand?: string;
    quantity: number;
    minStock?: number;
    price: number;
    location?: string;
    status: 'in-stock' | 'low-stock' | 'out-of-stock';
    image?: string;
    lastUpdated: Date;
    createdAt?: Date;
    description?: string;
}

interface FilterOptions {
    status: string;
    category: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

interface SortOptions {
    column: string;
    direction: 'asc' | 'desc';
}

interface PaginationOptions {
    page: number;
    perPage: number;
    total: number;
}

class InventoryManager {
    private products: Product[] = [];
    private filteredProducts: Product[] = [];
    private currentFilters: FilterOptions = {
        status: 'all',
        category: 'all'
    };
    private currentSort: SortOptions = {
        column: 'createdAt',
        direction: 'desc'  // Newest first
    };
    private pagination: PaginationOptions = {
        page: 1,
        perPage: 25,
        total: 0
    };
    private selectedRows: Set<string> = new Set();

    constructor() {
        this.init();
    }

    private init(): void {
        this.loadProducts();
        this.attachEventListeners();
        this.render();
    }

    private loadProducts(): void {
        // Load products from localStorage (saved by create product form)
        const savedProducts = localStorage.getItem('inventory_products');
        
        if (savedProducts) {
            try {
                const products = JSON.parse(savedProducts);
                this.products = products.map((p: any) => ({
                    ...p,
                    lastUpdated: p.updatedAt ? new Date(p.updatedAt) : new Date(),
                    createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                    // Ensure all required fields have values
                    material: p.material || 'Not specified',
                    brand: p.brand || '',
                    location: p.location || '',
                    minStock: p.minStock || 10,
                    price: p.price || 0
                }));
                
                // Sort by creation date - newest first
                this.products.sort((a, b) => {
                    const dateA = a.createdAt ? a.createdAt.getTime() : 0;
                    const dateB = b.createdAt ? b.createdAt.getTime() : 0;
                    return dateB - dateA; // Newest first
                });
            } catch (error) {
                console.error('Error loading products from localStorage:', error);
                this.loadSampleData();
            }
        } else {
            // Load sample data if no saved products
            this.loadSampleData();
        }
        
        this.applyFilters();
    }
    
    private loadSampleData(): void {
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

    private attachEventListeners(): void {
        // Filter listeners
        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.currentFilters.status = (e.target as HTMLSelectElement).value;
            this.applyFilters();
        });

        document.getElementById('category-filter')?.addEventListener('change', (e) => {
            this.currentFilters.category = (e.target as HTMLSelectElement).value;
            this.applyFilters();
        });

        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.currentFilters.search = (e.target as HTMLInputElement).value;
            this.debounceSearch();
        });

        // Sort listeners
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = (e.currentTarget as HTMLElement).dataset.column!;
                this.handleSort(column);
            });
        });

        // Pagination listeners
        document.getElementById('per-page')?.addEventListener('change', (e) => {
            this.pagination.perPage = parseInt((e.target as HTMLSelectElement).value);
            this.pagination.page = 1;
            this.render();
        });

        // Select all checkbox
        document.getElementById('select-all-header')?.addEventListener('change', (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            this.handleSelectAll(checked);
        });

        // Clear filters
        document.querySelector('.clear-filter')?.addEventListener('click', () => {
            this.clearFilters();
        });
    }

    private debounceSearch = this.debounce(() => {
        this.applyFilters();
    }, 300);

    private debounce(func: Function, wait: number) {
        let timeout: any;
        return (...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    private applyFilters(): void {
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
        this.applySort();
    }

    private handleSort(column: string): void {
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }
        
        this.updateSortIndicators(column);
        this.applySort();
    }

    private applySort(): void {
        const column = this.currentSort.column;
        const direction = this.currentSort.direction;

        this.filteredProducts.sort((a, b) => {
            let aVal: any = a[column as keyof Product];
            let bVal: any = b[column as keyof Product];

            if (column === 'last_updated') {
                aVal = a.lastUpdated.getTime();
                bVal = b.lastUpdated.getTime();
            } else if (column === 'createdAt') {
                aVal = a.createdAt ? a.createdAt.getTime() : 0;
                bVal = b.createdAt ? b.createdAt.getTime() : 0;
            }

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        this.render();
    }

    private updateSortIndicators(column: string): void {
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

    private handleSelectAll(checked: boolean): void {
        const currentPageProducts = this.getCurrentPageProducts();
        
        if (checked) {
            currentPageProducts.forEach(product => {
                this.selectedRows.add(product.id);
            });
        } else {
            currentPageProducts.forEach(product => {
                this.selectedRows.delete(product.id);
            });
        }

        this.updateRowCheckboxes();
        this.updateBulkActions();
    }

    private updateRowCheckboxes(): void {
        document.querySelectorAll('.row-checkbox').forEach((checkbox, index) => {
            const products = this.getCurrentPageProducts();
            if (products[index]) {
                (checkbox as HTMLInputElement).checked = this.selectedRows.has(products[index].id);
            }
        });
    }

    private updateBulkActions(): void {
        const bulkActions = document.querySelector('.bulk-actions') as HTMLElement;
        const selectedCount = document.querySelector('.selected-count');
        
        if (this.selectedRows.size > 0) {
            bulkActions.style.display = 'flex';
            if (selectedCount) {
                selectedCount.textContent = `${this.selectedRows.size} selected`;
            }
        } else {
            bulkActions.style.display = 'none';
        }
    }

    private clearFilters(): void {
        this.currentFilters = {
            status: 'all',
            category: 'all'
        };

        (document.getElementById('status-filter') as HTMLSelectElement).value = 'all';
        (document.getElementById('category-filter') as HTMLSelectElement).value = 'all';
        (document.getElementById('search-input') as HTMLInputElement).value = '';
        
        this.applyFilters();
    }

    private getCurrentPageProducts(): Product[] {
        const start = (this.pagination.page - 1) * this.pagination.perPage;
        const end = start + this.pagination.perPage;
        return this.filteredProducts.slice(start, end);
    }

    private render(): void {
        this.renderTable();
        this.renderPagination();
        this.updateRecordCount();
    }

    private renderTable(): void {
        const tbody = document.getElementById('inventory-tbody');
        if (!tbody) return;

        const products = this.getCurrentPageProducts();
        
        if (products.length === 0) {
            this.showEmptyState();
            return;
        }

        tbody.innerHTML = products.map(product => this.renderTableRow(product)).join('');
        this.attachRowEventListeners();
    }

    private renderTableRow(product: Product): string {
        const stockPercentage = Math.min((product.quantity / 200) * 100, 100);
        const isChecked = this.selectedRows.has(product.id) ? 'checked' : '';
        
        // Show "No Image" text if no image is available
        const imageDisplay = product.image 
            ? `<img src="${product.image}" alt="${product.name}" onerror="this.parentElement.innerHTML='<span style=\\'color: #999; font-size: 11px;\\'>No Image</span>'">`
            : '<span style="color: #999; font-size: 11px;">No Image</span>';
        
        // Show only important columns: ID, Image, Name, Category, Quantity, Price, Status, Actions
        return `
            <tr data-id="${product.id}">
                <td class="checkbox-col">
                    <input type="checkbox" class="row-checkbox" ${isChecked}>
                </td>
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
                <td class="price">₹${product.price.toFixed(0)}</td>
                <td class="status">
                    <span class="status-badge ${product.status}">${this.formatStatus(product.status)}</span>
                </td>
                <td class="actions-col">
                    <div class="actions">
                        <button class="action-btn" title="View All Details" onclick="viewProduct('${product.id}')">
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

    private attachRowEventListeners(): void {
        document.querySelectorAll('.row-checkbox').forEach((checkbox, index) => {
            checkbox.addEventListener('change', (e) => {
                const products = this.getCurrentPageProducts();
                const product = products[index];
                if (product) {
                    if ((e.target as HTMLInputElement).checked) {
                        this.selectedRows.add(product.id);
                    } else {
                        this.selectedRows.delete(product.id);
                    }
                    this.updateBulkActions();
                }
            });
        });
    }

    private renderPagination(): void {
        const totalPages = Math.ceil(this.pagination.total / this.pagination.perPage);
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

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
        
        document.getElementById('start-record')!.textContent = start.toString();
        document.getElementById('end-record')!.textContent = end.toString();
        document.getElementById('total-records')!.textContent = this.pagination.total.toString();

        // Attach pagination event listeners
        pagination.querySelectorAll('button:not([disabled])').forEach(button => {
            button.addEventListener('click', (e) => {
                const page = parseInt((e.currentTarget as HTMLElement).dataset.page!);
                if (page) {
                    this.pagination.page = page;
                    this.render();
                }
            });
        });
    }

    private updateRecordCount(): void {
        const recordCount = document.querySelector('.record-count');
        if (recordCount) {
            recordCount.textContent = `${this.filteredProducts.length} Records`;
        }
    }

    private showEmptyState(): void {
        const tbody = document.getElementById('inventory-tbody');
        const emptyState = document.querySelector('.empty-state') as HTMLElement;
        
        if (tbody) tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    }

    private getColorBorder(color: string): string {
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
    
    private getColorHex(color: string): string {
        // Convert to lowercase for better matching
        const colorLower = color.toLowerCase().trim();
        
        const colors: { [key: string]: string } = {
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

    private formatStatus(status: string): string {
        return status.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    private formatDate(date: Date): string {
        const options: Intl.DateTimeFormatOptions = { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    }

    private formatTime(date: Date): string {
        const options: Intl.DateTimeFormatOptions = { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        };
        return date.toLocaleTimeString('en-US', options);
    }
}

// Global action functions for backend integration
declare var QRCode: any;

// View product - expand row inline to show details (no popup)
function viewProduct(productId: string): void {
    const row = document.querySelector(`tr[data-id="${productId}"]`) as HTMLTableRowElement;
    if (!row) return;
    
    // Check if details row already exists
    const nextRow = row.nextElementSibling;
    if (nextRow && nextRow.classList.contains('details-row')) {
        // Toggle visibility
        nextRow.remove();
        return;
    }
    
    // Get product data
    const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
    const product = products.find((p: any) => p.id === productId);
    
    if (!product) return;
    
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
async function editProduct(productId: string): Promise<void> {
    try {
        // Get product data
        const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
        const product = products.find((p: any) => p.id === productId);
        
        if (!product) {
            showToast('Product not found', 'error');
            return;
        }
        
        // Store product data for editing
        sessionStorage.setItem('edit_product', JSON.stringify(product));
        
        // If backend is available, fetch latest data
        if (window.location.protocol !== 'file:') {
            try {
                const apiUrl = window.location.hostname === 'localhost' 
                    ? `http://localhost:3001/api/products/${productId}`
                    : `/api/products/${productId}`;
                    
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const latestProduct = await response.json();
                    sessionStorage.setItem('edit_product', JSON.stringify(latestProduct));
                }
            } catch (error) {
                console.log('Using local data for editing');
            }
        }
        
        // Navigate to edit page (or convert create page to edit mode)
        window.location.href = `product-simple.html?edit=${productId}`;
        
    } catch (error) {
        console.error('Error editing product:', error);
        showToast('Error editing product', 'error');
    }
}

// Generate and show QR Code in new window
async function showQRCode(productId: string): Promise<void> {
    try {
        // Get product data
        const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
        const product = products.find((p: any) => p.id === productId);
        
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
        
    } catch (error) {
        console.error('Error generating QR code:', error);
        showToast('Error generating QR code', 'error');
    }
}

// Delete product with confirmation
async function deleteProduct(productId: string): Promise<void> {
    // Get product for display
    const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
    const product = products.find((p: any) => p.id === productId);
    
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        // Delete from backend if available
        if (window.location.protocol !== 'file:') {
            try {
                const apiUrl = window.location.hostname === 'localhost' 
                    ? `http://localhost:3001/api/products/${productId}`
                    : `/api/products/${productId}`;
                    
                const response = await fetch(apiUrl, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error('Backend deletion failed');
                }
            } catch (error) {
                console.log('Deleting from local storage only');
            }
        }
        
        // Delete from localStorage
        const updatedProducts = products.filter((p: any) => p.id !== productId);
        localStorage.setItem('inventory_products', JSON.stringify(updatedProducts));
        
        // Refresh the page to show updated list
        showToast('Product deleted successfully', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product', 'error');
    }
}

// Toast notification function
function showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
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
    } else if (type === 'info') {
        toast.style.background = '#3B82F6';
    } else {
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
        const target = e.target as HTMLElement;
        const dropdown = target.closest('.dropdown');
        
        if (dropdown) {
            const menu = dropdown.querySelector('.dropdown-menu') as HTMLElement;
            if (menu) {
                // Toggle menu
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                
                // Handle menu item clicks
                if (target.tagName === 'A') {
                    e.preventDefault();
                    const row = target.closest('tr');
                    const productId = row?.getAttribute('data-id');
                    
                    if (productId) {
                        if (target.classList.contains('danger')) {
                            deleteProduct(productId);
                        } else if (target.textContent?.includes('Duplicate')) {
                            // Duplicate functionality
                            duplicateProduct(productId);
                        } else if (target.textContent?.includes('Print')) {
                            // Print label
                            printLabel(productId);
                        } else if (target.textContent?.includes('History')) {
                            // View history
                            viewHistory(productId);
                        }
                    }
                    menu.style.display = 'none';
                }
            }
        } else {
            // Close all dropdowns when clicking outside
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                (menu as HTMLElement).style.display = 'none';
            });
        }
    });
});


// Additional helper functions
function duplicateProduct(productId: string): void {
    const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
    const product = products.find((p: any) => p.id === productId);
    
    if (product) {
        const newProduct = {
            ...product,
            id: 'PRD-' + Date.now().toString(36).toUpperCase(),
            sku: product.sku + '-COPY-' + Date.now().toString(36).substring(-4).toUpperCase(),
            name: product.name + ' (Copy)',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        products.unshift(newProduct);
        localStorage.setItem('inventory_products', JSON.stringify(products));
        showToast('Product duplicated successfully', 'success');
        setTimeout(() => window.location.reload(), 1000);
    }
}

function printLabel(productId: string): void {
    const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
    const product = products.find((p: any) => p.id === productId);
    
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

function viewHistory(productId: string): void {
    // Get product and history data
    const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
    const product = products.find((p: any) => p.id === productId);
    
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    // Get history for this product
    const allHistory = JSON.parse(localStorage.getItem('inventory_history') || '[]');
    const productHistory = allHistory.filter((h: any) => h.productId === productId);
    
    // If no history, generate sample data
    if (productHistory.length === 0) {
        generateSampleHistory(productId);
    }
    
    // Helper values for display
    const stockChanges = Math.floor(Math.random() * 20) + 5;
    const priceChanges = Math.floor(Math.random() * 10) + 1;
    const totalChanges = Math.floor(Math.random() * 50) + 20;
    const lastActivity = '2 hours ago';
    const historyCount = productHistory.length || Math.floor(Math.random() * 30) + 10;
    
    // Open history window
    const historyWindow = window.open('', '_blank', 'width=' + screen.width + ',height=' + screen.height);
    if (!historyWindow) {
        showToast('Please allow popups for history view', 'error');
        return;
    }
    
    // Generate history HTML with matching design
    historyWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Transaction History - ${product.name}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                :root {
                    --primary: #6366f1;
                    --primary-hover: #4f46e5;
                    --success: #10b981;
                    --warning: #f59e0b;
                    --danger: #ef4444;
                    --info: #3b82f6;
                    --gray-50: #f9fafb;
                    --gray-100: #f3f4f6;
                    --gray-200: #e5e7eb;
                    --gray-300: #d1d5db;
                    --gray-400: #9ca3af;
                    --gray-500: #6b7280;
                    --gray-600: #4b5563;
                    --gray-700: #374151;
                    --gray-800: #1f2937;
                    --gray-900: #111827;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
                    background: var(--gray-50);
                    color: var(--gray-900);
                    line-height: 1.6;
                }
                
                /* Header */
                .header {
                    background: white;
                    border-bottom: 1px solid var(--gray-200);
                    padding: 1.5rem 2rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }
                
                .header-content {
                    max-width: 1400px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .back-btn {
                    padding: 0.5rem 0.75rem;
                    background: var(--gray-100);
                    border: 1px solid var(--gray-200);
                    border-radius: 6px;
                    color: var(--gray-600);
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 14px;
                }
                
                .back-btn:hover {
                    background: var(--gray-200);
                    color: var(--gray-700);
                }
                
                .header-title h1 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--gray-900);
                }
                
                .header-subtitle {
                    font-size: 14px;
                    color: var(--gray-500);
                }
                
                .header-actions {
                    display: flex;
                    gap: 0.75rem;
                }
                
                .btn {
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .btn-primary {
                    background: var(--primary);
                    color: white;
                }
                
                .btn-primary:hover {
                    background: var(--primary-hover);
                }
                
                .btn-secondary {
                    background: white;
                    color: var(--gray-700);
                    border: 1px solid var(--gray-300);
                }
                
                .btn-secondary:hover {
                    background: var(--gray-50);
                    border-color: var(--gray-400);
                }
                
                /* Product Info Card */
                .product-info {
                    max-width: 1400px;
                    margin: 2rem auto;
                    padding: 0 2rem;
                }
                
                .info-card {
                    background: white;
                    border-radius: 12px;
                    padding: 1.5rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    margin-bottom: 2rem;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                }
                
                .info-item {
                    display: flex;
                    flex-direction: column;
                }
                
                .info-label {
                    font-size: 12px;
                    color: var(--gray-500);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 0.25rem;
                }
                
                .info-value {
                    font-size: 16px;
                    color: var(--gray-900);
                    font-weight: 500;
                }
                
                /* Stats Cards */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .stat-card {
                    background: white;
                    border-radius: 12px;
                    padding: 1.25rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    border: 1px solid var(--gray-200);
                    transition: all 0.2s;
                }
                
                .stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                
                .stat-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1rem;
                    font-size: 18px;
                }
                
                .stat-icon.stock {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--success);
                }
                
                .stat-icon.price {
                    background: rgba(99, 102, 241, 0.1);
                    color: var(--primary);
                }
                
                .stat-icon.changes {
                    background: rgba(245, 158, 11, 0.1);
                    color: var(--warning);
                }
                
                .stat-icon.activity {
                    background: rgba(59, 130, 246, 0.1);
                    color: var(--info);
                }
                
                .stat-value {
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--gray-900);
                    margin-bottom: 0.25rem;
                }
                
                .stat-label {
                    font-size: 14px;
                    color: var(--gray-500);
                }
                
                .stat-change {
                    font-size: 12px;
                    margin-top: 0.5rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                }
                
                .stat-change.positive {
                    color: var(--success);
                    background: rgba(16, 185, 129, 0.1);
                }
                
                .stat-change.negative {
                    color: var(--danger);
                    background: rgba(239, 68, 68, 0.1);
                }
                
                /* Filter Bar */
                .filter-bar {
                    background: white;
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                
                .search-box {
                    flex: 1;
                    min-width: 250px;
                    position: relative;
                }
                
                .search-box input {
                    width: 100%;
                    padding: 0.5rem 1rem 0.5rem 2.5rem;
                    border: 1px solid var(--gray-300);
                    border-radius: 6px;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                .search-box input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
                
                .search-box i {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--gray-400);
                }
                
                .filter-pills {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .filter-pill {
                    padding: 0.5rem 1rem;
                    background: var(--gray-100);
                    border: 1px solid var(--gray-200);
                    border-radius: 20px;
                    font-size: 14px;
                    color: var(--gray-700);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .filter-pill:hover {
                    background: var(--gray-200);
                }
                
                .filter-pill.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }
                
                .date-range {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .date-input {
                    padding: 0.5rem;
                    border: 1px solid var(--gray-300);
                    border-radius: 6px;
                    font-size: 14px;
                }
                
                /* Timeline */
                .timeline-container {
                    background: white;
                    border-radius: 12px;
                    padding: 1.5rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }
                
                .timeline-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--gray-200);
                }
                
                .timeline-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--gray-900);
                }
                
                .timeline-count {
                    font-size: 14px;
                    color: var(--gray-500);
                    background: var(--gray-100);
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                }
                
                .timeline {
                    position: relative;
                    padding-left: 2rem;
                }
                
                .timeline::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: var(--gray-200);
                }
                
                .timeline-item {
                    position: relative;
                    padding-bottom: 2rem;
                    animation: fadeIn 0.5s ease;
                }
                
                .timeline-item:last-child {
                    padding-bottom: 0;
                }
                
                .timeline-marker {
                    position: absolute;
                    left: -2.5rem;
                    top: 0.25rem;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: white;
                    border: 2px solid var(--gray-400);
                }
                
                .timeline-marker.created {
                    border-color: var(--success);
                    background: var(--success);
                }
                
                .timeline-marker.edited {
                    border-color: var(--info);
                    background: var(--info);
                }
                
                .timeline-marker.stock {
                    border-color: var(--warning);
                    background: var(--warning);
                }
                
                .timeline-marker.price {
                    border-color: var(--primary);
                    background: var(--primary);
                }
                
                .timeline-content {
                    background: var(--gray-50);
                    border: 1px solid var(--gray-200);
                    border-radius: 8px;
                    padding: 1rem;
                    margin-left: 0.5rem;
                    transition: all 0.2s;
                }
                
                .timeline-content:hover {
                    background: white;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }
                
                .timeline-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                    margin-bottom: 0.5rem;
                }
                
                .timeline-action {
                    font-weight: 500;
                    color: var(--gray-900);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .timeline-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                }
                
                .timeline-icon.created {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--success);
                }
                
                .timeline-icon.edited {
                    background: rgba(59, 130, 246, 0.1);
                    color: var(--info);
                }
                
                .timeline-icon.stock {
                    background: rgba(245, 158, 11, 0.1);
                    color: var(--warning);
                }
                
                .timeline-icon.price {
                    background: rgba(99, 102, 241, 0.1);
                    color: var(--primary);
                }
                
                .timeline-time {
                    font-size: 12px;
                    color: var(--gray-500);
                }
                
                .timeline-details {
                    font-size: 14px;
                    color: var(--gray-600);
                    margin-top: 0.5rem;
                }
                
                .timeline-changes {
                    margin-top: 0.75rem;
                    padding-top: 0.75rem;
                    border-top: 1px solid var(--gray-200);
                }
                
                .change-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 13px;
                    color: var(--gray-700);
                    margin-bottom: 0.25rem;
                }
                
                .change-label {
                    font-weight: 500;
                    min-width: 80px;
                }
                
                .change-value {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .old-value {
                    color: var(--danger);
                    text-decoration: line-through;
                }
                
                .new-value {
                    color: var(--success);
                    font-weight: 500;
                }
                
                .timeline-user {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-top: 0.75rem;
                    padding: 0.25rem 0.5rem;
                    background: white;
                    border: 1px solid var(--gray-200);
                    border-radius: 4px;
                    font-size: 12px;
                    color: var(--gray-600);
                }
                
                /* Empty State */
                .empty-state {
                    text-align: center;
                    padding: 3rem;
                }
                
                .empty-icon {
                    font-size: 3rem;
                    color: var(--gray-300);
                    margin-bottom: 1rem;
                }
                
                .empty-title {
                    font-size: 18px;
                    color: var(--gray-900);
                    margin-bottom: 0.5rem;
                }
                
                .empty-text {
                    font-size: 14px;
                    color: var(--gray-500);
                }
                
                /* Responsive */
                @media (max-width: 768px) {
                    .header-content {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: stretch;
                    }
                    
                    .header-actions {
                        justify-content: stretch;
                    }
                    
                    .btn {
                        flex: 1;
                        justify-content: center;
                    }
                    
                    .stats-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                    
                    .filter-bar {
                        flex-direction: column;
                    }
                    
                    .search-box {
                        width: 100%;
                    }
                    
                    .filter-pills {
                        width: 100%;
                        overflow-x: auto;
                    }
                    
                    .timeline {
                        padding-left: 1.5rem;
                    }
                    
                    .timeline-marker {
                        left: -2rem;
                    }
                }
                
                @media (max-width: 480px) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .info-grid {
                        grid-template-columns: 1fr;
                    }
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
        </head>
        <body>
            <!-- Header -->
            <div class="header">
                <div class="header-content">
                    <div class="header-left">
                        <button class="back-btn" onclick="window.close()">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                        <div class="header-title">
                            <h1>Transaction History</h1>
                            <div class="header-subtitle">${product.name} - ${product.sku}</div>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="window.print()">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="btn btn-primary" onclick="exportHistory()">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Main Content -->
            <div class="product-info">
                <!-- Product Info Card -->
                <div class="info-card">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Product ID</span>
                            <span class="info-value">${product.id}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Category</span>
                            <span class="info-value">${product.category}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Current Stock</span>
                            <span class="info-value">${product.quantity} units</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Current Price</span>
                            <span class="info-value">₹${product.price || 0}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Status</span>
                            <span class="info-value">${product.status}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Last Updated</span>
                            <span class="info-value">${new Date(product.lastUpdated || product.updatedAt).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Stats Cards -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon stock">
                            <i class="fas fa-boxes"></i>
                        </div>
                        <div class="stat-value">${stockChanges}</div>
                        <div class="stat-label">Stock Changes</div>
                        <div class="stat-change positive">
                            <i class="fas fa-arrow-up"></i> 12% this month
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon price">
                            <i class="fas fa-tag"></i>
                        </div>
                        <div class="stat-value">${priceChanges}</div>
                        <div class="stat-label">Price Updates</div>
                        <div class="stat-change negative">
                            <i class="fas fa-arrow-down"></i> 5% decrease
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon changes">
                            <i class="fas fa-edit"></i>
                        </div>
                        <div class="stat-value">${totalChanges}</div>
                        <div class="stat-label">Total Changes</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon activity">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-value">${lastActivity}</div>
                        <div class="stat-label">Last Activity</div>
                    </div>
                </div>
                
                <!-- Filter Bar -->
                <div class="filter-bar">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Search history..." id="search-history">
                    </div>
                    
                    <div class="filter-pills">
                        <button class="filter-pill active" onclick="filterHistory('all')">All</button>
                        <button class="filter-pill" onclick="filterHistory('stock')">Stock</button>
                        <button class="filter-pill" onclick="filterHistory('price')">Price</button>
                        <button class="filter-pill" onclick="filterHistory('edits')">Edits</button>
                    </div>
                    
                    <div class="date-range">
                        <input type="date" class="date-input" id="date-from">
                        <span>to</span>
                        <input type="date" class="date-input" id="date-to">
                    </div>
                </div>
                
                <!-- Timeline -->
                <div class="timeline-container">
                    <div class="timeline-header">
                        <div class="timeline-title">Activity Timeline</div>
                        <div class="timeline-count">${historyCount} events</div>
                    </div>
                    
                    <div class="timeline" id="timeline">
                        <!-- Timeline items will be generated by JavaScript -->
                    </div>
                </div>
            </div>
            
            <script>
                // Generate timeline on load
                document.addEventListener('DOMContentLoaded', function() {
                    generateTimelineItems();
                });
                
                function generateTimelineItems() {
                    const events = [
                        {
                            type: 'created',
                            icon: 'fa-plus',
                            action: 'Product Created',
                            time: '2 days ago',
                            details: 'Initial product entry with 100 units',
                            user: 'Admin User'
                        },
                        {
                            type: 'stock',
                            icon: 'fa-boxes',
                            action: 'Stock Updated',
                            time: '1 day ago',
                            details: 'Stock adjustment after inventory count',
                            changes: [
                                { label: 'Quantity', old: '100', new: '${product.quantity}' }
                            ],
                            user: 'Warehouse Manager'
                        },
                        {
                            type: 'price',
                            icon: 'fa-tag',
                            action: 'Price Changed',
                            time: '12 hours ago',
                            details: 'Price updated based on market conditions',
                            changes: [
                                { label: 'Price', old: '₹${(product.price || 0) * 1.1}', new: '₹${product.price || 0}' }
                            ],
                            user: 'Sales Team'
                        },
                        {
                            type: 'edited',
                            icon: 'fa-edit',
                            action: 'Product Edited',
                            time: '5 hours ago',
                            details: 'Product information updated',
                            changes: [
                                { label: 'Category', old: 'Other', new: '${product.category}' }
                            ],
                            user: 'Staff Member'
                        }
                    ];
                    
                    const timeline = document.getElementById('timeline');
                    if (!timeline) return;
                    
                    timeline.innerHTML = events.map(event => \`
                        <div class="timeline-item">
                            <div class="timeline-marker \${event.type}"></div>
                            <div class="timeline-content">
                                <div class="timeline-header-row">
                                    <div class="timeline-action">
                                        <div class="timeline-icon \${event.type}">
                                            <i class="fas \${event.icon}"></i>
                                        </div>
                                        \${event.action}
                                    </div>
                                    <div class="timeline-time">\${event.time}</div>
                                </div>
                                <div class="timeline-details">\${event.details}</div>
                                \${event.changes ? \`
                                    <div class="timeline-changes">
                                        \${event.changes.map(change => \`
                                            <div class="change-item">
                                                <span class="change-label">\${change.label}:</span>
                                                <div class="change-value">
                                                    <span class="old-value">\${change.old}</span>
                                                    <i class="fas fa-arrow-right" style="font-size: 10px; color: var(--gray-400);"></i>
                                                    <span class="new-value">\${change.new}</span>
                                                </div>
                                            </div>
                                        \`).join('')}
                                    </div>
                                \` : ''}
                                <div class="timeline-user">
                                    <i class="fas fa-user"></i> \${event.user}
                                </div>
                            </div>
                        </div>
                    \`).join('');
                }
                
                function filterHistory(type) {
                    // Update active filter
                    document.querySelectorAll('.filter-pill').forEach(pill => {
                        pill.classList.remove('active');
                    });
                    event.target.classList.add('active');
                    
                    // Filter logic would go here
                    console.log('Filtering by:', type);
                }
                
                function exportHistory() {
                    // Export logic would go here
                    alert('Exporting history to CSV...');
                }
                
                // Search functionality
                document.getElementById('search-history')?.addEventListener('input', (e) => {
                    console.log('Searching:', e.target.value);
                });
            </script>
        </body>
        </html>
    `);
    
    showToast('History opened in new window', 'success');
}

// Generate sample history for demonstration
function generateSampleHistory(productId: string): void {
    const now = new Date();
    const history = [
        {
            id: `HIST-${Date.now()}-1`,
            productId: productId,
            type: 'created',
            timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000),
            user: 'Admin User',
            details: {
                field: 'product',
                newValue: 'Product created with initial stock'
            }
        },
        {
            id: `HIST-${Date.now()}-2`,
            productId: productId,
            type: 'stock_added',
            timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            user: 'Warehouse Manager',
            details: {
                quantity: 50,
                reason: 'New shipment received'
            }
        },
        {
            id: `HIST-${Date.now()}-3`,
            productId: productId,
            type: 'price_changed',
            timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000),
            user: 'Sales Team',
            details: {
                field: 'price',
                oldValue: 299,
                newValue: 279
            }
        }
    ];
    
    const existingHistory = JSON.parse(localStorage.getItem('inventory_history') || '[]');
    localStorage.setItem('inventory_history', JSON.stringify([...existingHistory, ...history]));
}