class InventoryManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentFilters = {
            status: 'all',
            category: 'all'
        };
        this.currentSort = {
            column: 'name',
            direction: 'desc'
        };
        this.pagination = {
            page: 1,
            perPage: 25,
            total: 0
        };
        this.selectedRows = new Set();
        this.debounceSearch = this.debounce(() => {
            this.applyFilters();
        }, 300);
        this.init();
    }
    init() {
        this.loadProducts();
        this.attachEventListeners();
        this.render();
    }
    loadProducts() {
        // Sample data - replace with API call
        this.products = [
            {
                id: 'PRD-001',
                sku: 'BCS-M-001',
                name: 'Blue Cotton Shirt',
                category: 'Shirt',
                size: 'M',
                color: 'Blue',
                quantity: 145,
                price: 45.00,
                status: 'in-stock',
                lastUpdated: new Date()
            },
            {
                id: 'PRD-002',
                sku: 'BDJ-L-002',
                name: 'Black Denim Jeans',
                category: 'Pants',
                size: 'L',
                color: 'Black',
                quantity: 12,
                price: 65.00,
                status: 'low-stock',
                lastUpdated: new Date()
            },
            {
                id: 'PRD-003',
                sku: 'RLJ-XL-003',
                name: 'Red Leather Jacket',
                category: 'Jacket',
                size: 'XL',
                color: 'Red',
                quantity: 0,
                price: 120.00,
                status: 'out-of-stock',
                lastUpdated: new Date()
            }
        ];
        // Generate more sample data
        for (let i = 4; i <= 100; i++) {
            const categories = ['Shirt', 'Pants', 'Jacket', 'T-Shirt'];
            const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
            const colors = ['Blue', 'Black', 'Red', 'White', 'Green', 'Yellow'];
            const category = categories[Math.floor(Math.random() * categories.length)];
            const size = sizes[Math.floor(Math.random() * sizes.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const quantity = Math.floor(Math.random() * 200);
            this.products.push({
                id: `PRD-${String(i).padStart(3, '0')}`,
                sku: `${category.substring(0, 3).toUpperCase()}-${size}-${String(i).padStart(3, '0')}`,
                name: `${color} ${category} ${i}`,
                category: category,
                size: size,
                color: color,
                quantity: quantity,
                price: Math.floor(Math.random() * 150) + 20,
                status: quantity === 0 ? 'out-of-stock' : quantity < 20 ? 'low-stock' : 'in-stock',
                lastUpdated: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
            });
        }
        this.applyFilters();
    }
    attachEventListeners() {
        var _a, _b, _c, _d, _e, _f;
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
        // Sort listeners
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.currentTarget.dataset.column;
                this.handleSort(column);
            });
        });
        // Pagination listeners
        (_d = document.getElementById('per-page')) === null || _d === void 0 ? void 0 : _d.addEventListener('change', (e) => {
            this.pagination.perPage = parseInt(e.target.value);
            this.pagination.page = 1;
            this.render();
        });
        // Select all checkbox
        (_e = document.getElementById('select-all-header')) === null || _e === void 0 ? void 0 : _e.addEventListener('change', (e) => {
            const checked = e.target.checked;
            this.handleSelectAll(checked);
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
        this.applySort();
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
    handleSelectAll(checked) {
        const currentPageProducts = this.getCurrentPageProducts();
        if (checked) {
            currentPageProducts.forEach(product => {
                this.selectedRows.add(product.id);
            });
        }
        else {
            currentPageProducts.forEach(product => {
                this.selectedRows.delete(product.id);
            });
        }
        this.updateRowCheckboxes();
        this.updateBulkActions();
    }
    updateRowCheckboxes() {
        document.querySelectorAll('.row-checkbox').forEach((checkbox, index) => {
            const products = this.getCurrentPageProducts();
            if (products[index]) {
                checkbox.checked = this.selectedRows.has(products[index].id);
            }
        });
    }
    updateBulkActions() {
        const bulkActions = document.querySelector('.bulk-actions');
        const selectedCount = document.querySelector('.selected-count');
        if (this.selectedRows.size > 0) {
            bulkActions.style.display = 'flex';
            if (selectedCount) {
                selectedCount.textContent = `${this.selectedRows.size} selected`;
            }
        }
        else {
            bulkActions.style.display = 'none';
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
        if (!tbody)
            return;
        const products = this.getCurrentPageProducts();
        if (products.length === 0) {
            this.showEmptyState();
            return;
        }
        tbody.innerHTML = products.map(product => this.renderTableRow(product)).join('');
        this.attachRowEventListeners();
    }
    renderTableRow(product) {
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
    attachRowEventListeners() {
        document.querySelectorAll('.row-checkbox').forEach((checkbox, index) => {
            checkbox.addEventListener('change', (e) => {
                const products = this.getCurrentPageProducts();
                const product = products[index];
                if (product) {
                    if (e.target.checked) {
                        this.selectedRows.add(product.id);
                    }
                    else {
                        this.selectedRows.delete(product.id);
                    }
                    this.updateBulkActions();
                }
            });
        });
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
    getColorHex(color) {
        const colors = {
            'Blue': '#2196f3',
            'Black': '#000000',
            'Red': '#ef4444',
            'White': '#ffffff',
            'Green': '#22c55e',
            'Yellow': '#f59e0b'
        };
        return colors[color] || '#6b7280';
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
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new InventoryManager();
});
