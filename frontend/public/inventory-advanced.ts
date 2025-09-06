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
        column: 'name',
        direction: 'desc'
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
        
        return `
            <tr data-id="${product.id}">
                <td class="checkbox-col">
                    <input type="checkbox" class="row-checkbox" ${isChecked}>
                </td>
                <td class="product-id">
                    <a href="#" class="link">${product.id}</a>
                </td>
                <td class="image-col">
                    <div class="product-image">
                        <img src="https://via.placeholder.com/40" alt="${product.name}">
                    </div>
                </td>
                <td class="product-name">
                    <div class="name-cell">
                        <span class="name">${product.name}</span>
                        <span class="sub-info">${product.category} Collection</span>
                    </div>
                </td>
                <td class="sku">${product.sku}</td>
                <td class="category">
                    <span class="category-badge">${product.category}</span>
                </td>
                <td class="size">${product.size}</td>
                <td class="color">
                    <div class="color-display">
                        <span class="color-dot" style="background: ${this.getColorHex(product.color)};"></span>
                        ${product.color}
                    </div>
                </td>
                <td class="quantity">
                    <div class="stock-info">
                        <span class="stock-number ${product.quantity < 20 ? 'low' : ''}">${product.quantity}</span>
                        <div class="stock-bar">
                            <div class="stock-level ${product.quantity < 20 ? 'low' : ''}" style="width: ${stockPercentage}%;"></div>
                        </div>
                    </div>
                </td>
                <td class="status">
                    <span class="status-badge ${product.status}">${this.formatStatus(product.status)}</span>
                </td>
                <td class="price">$${product.price.toFixed(2)}</td>
                <td class="last-updated">
                    <span class="date">${this.formatDate(product.lastUpdated)}</span>
                    <span class="time">${this.formatTime(product.lastUpdated)}</span>
                </td>
                <td class="actions-col">
                    <div class="actions">
                        <button class="action-btn" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" title="QR Code">
                            <i class="fas fa-qrcode"></i>
                        </button>
                        <div class="dropdown">
                            <button class="action-btn" title="More">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu">
                                <a href="#">Duplicate</a>
                                <a href="#">Print Label</a>
                                <a href="#">View History</a>
                                <div class="divider"></div>
                                <a href="#" class="danger">Delete</a>
                            </div>
                        </div>
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

    private getColorHex(color: string): string {
        const colors: { [key: string]: string } = {
            'Blue': '#2196f3',
            'Black': '#000000',
            'Red': '#ef4444',
            'White': '#ffffff',
            'Green': '#22c55e',
            'Yellow': '#f59e0b'
        };
        return colors[color] || '#6b7280';
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new InventoryManager();
});