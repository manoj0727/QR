// API Service for connecting to backend database
class APIService {
    constructor() {
        // Detect if running locally or on server
        this.baseURL = this.getBaseURL();
        this.headers = {
            'Content-Type': 'application/json'
        };
    }

    getBaseURL() {
        // Check if running from file:// protocol
        if (window.location.protocol === 'file:') {
            // Local development without server
            return 'https://localhost:3000/api';
        }
        
        // Check if running on localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return `https://${window.location.hostname}:3000/api`;
        }
        
        // Production or network access
        return '/api';
    }

    // Helper method for API calls
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.headers,
                    ...options.headers
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Product Management
    async getProducts() {
        return this.request('/products');
    }

    async getProduct(productId) {
        return this.request(`/products/${productId}`);
    }

    async createProduct(productData) {
        return this.request('/products/create', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    async updateProduct(productId, updateData) {
        return this.request(`/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    async deleteProduct(productId) {
        return this.request(`/products/${productId}`, {
            method: 'DELETE'
        });
    }

    // Inventory Operations
    async scanProduct(scanData) {
        return this.request('/inventory/scan', {
            method: 'POST',
            body: JSON.stringify(scanData)
        });
    }

    async getInventorySummary() {
        return this.request('/inventory/summary');
    }

    // Transaction Management
    async getTransactions(productId = null, limit = 50) {
        const params = new URLSearchParams();
        if (productId) params.append('product_id', productId);
        params.append('limit', limit);
        
        return this.request(`/transactions?${params}`);
    }

    // QR Code Operations
    async getQRCode(productId) {
        return this.request(`/qr/${productId}`);
    }

    // Authentication
    async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    }

    async getCurrentUser() {
        return this.request('/auth/current-user');
    }

    // Tailor Management
    async getTailors() {
        return this.request('/tailor/all');
    }

    async createTailor(tailorData) {
        return this.request('/tailor/create', {
            method: 'POST',
            body: JSON.stringify(tailorData)
        });
    }

    async assignWork(assignmentData) {
        return this.request('/tailor/assign-work', {
            method: 'POST',
            body: JSON.stringify(assignmentData)
        });
    }

    // Local Storage Fallback (for offline mode)
    useLocalStorage() {
        return window.location.protocol === 'file:' && !navigator.onLine;
    }

    // Convert backend product format to frontend format
    formatProductForFrontend(product) {
        return {
            id: product.product_id,
            sku: product.product_id,
            name: product.name,
            category: product.type,
            size: product.size,
            color: product.color || 'N/A',
            quantity: product.quantity || 0,
            price: product.price || 0,
            material: product.material || 'Not specified',
            brand: product.brand || '',
            location: product.location || '',
            minStock: product.min_stock || 10,
            status: this.getStockStatus(product.quantity, product.min_stock || 10),
            createdAt: product.created_at,
            updatedAt: product.updated_at || product.created_at,
            lastUpdated: new Date(product.updated_at || product.created_at)
        };
    }

    // Convert frontend product format to backend format
    formatProductForBackend(product) {
        return {
            product_id: product.id || product.sku,
            name: product.name,
            type: product.category,
            size: product.size,
            color: product.color,
            quantity: product.quantity,
            price: product.price,
            material: product.material,
            brand: product.brand,
            location: product.location,
            min_stock: product.minStock
        };
    }

    getStockStatus(quantity, minStock) {
        if (quantity === 0) return 'out-of-stock';
        if (quantity <= minStock) return 'low-stock';
        return 'in-stock';
    }

    // Error handling helper
    handleError(error, fallbackMessage = 'An error occurred') {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return 'Network error. Please check your connection.';
        }
        return error.message || fallbackMessage;
    }
}

// Create global instance
window.apiService = new APIService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}