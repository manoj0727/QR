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
    showToast('Product history feature coming soon', 'info');
}