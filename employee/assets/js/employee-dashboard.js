// Employee Dashboard Module

class EmployeeDashboard {
    constructor() {
        this.baseURL = '/api/employee';
        this.auth = new EmployeeAuth();
        this.employee = null;
        this.currentTab = 'notifications';
        this.inventory = [];
        this.filteredInventory = [];
        this.currentQRCode = null;
        this.scanner = null;
        this.scannedProduct = null;
    }

    // Initialize dashboard
    init() {
        // Check authentication
        this.employee = this.auth.requireAuth();
        if (!this.employee) return;

        // Update UI with employee info
        this.updateEmployeeInfo();
        
        // Load dashboard data
        this.loadDashboardStats();
        this.loadNotifications();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup global logout detection (for multi-tab/window support)
        this.auth.checkGlobalLogout();
        
        // Auto-refresh data every 30 seconds
        setInterval(() => {
            this.loadDashboardStats();
            if (this.currentTab === 'notifications') {
                this.loadNotifications();
            } else if (this.currentTab === 'activities') {
                this.loadActivities();
            }
        }, 30000);
    }

    // Update employee info in UI
    updateEmployeeInfo() {
        const employeeName = document.getElementById('employee-name');
        const userAvatar = document.getElementById('user-avatar');
        
        if (employeeName) {
            employeeName.textContent = this.employee.name;
        }
        
        if (userAvatar) {
            userAvatar.textContent = this.employee.name.charAt(0).toUpperCase();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Action buttons
        const createQRBtn = document.getElementById('create-qr-btn');
        const scanQRBtn = document.getElementById('scan-qr-btn');
        const viewInventoryBtn = document.getElementById('view-inventory-btn');

        if (createQRBtn) {
            createQRBtn.addEventListener('click', () => this.openQRModal());
        }
        
        if (scanQRBtn) {
            scanQRBtn.addEventListener('click', () => this.openScannerModal());
        }
        
        if (viewInventoryBtn) {
            viewInventoryBtn.addEventListener('click', () => this.openInventoryModal());
        }

        // Notification bell
        const notificationBell = document.querySelector('.notification-bell');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => this.showTab('notifications'));
        }
    }

    // Load dashboard statistics
    async loadDashboardStats() {
        try {
            const response = await fetch(`${this.baseURL}/stats/${this.employee.employee_id}`);
            const stats = await response.json();
            
            this.updateStatsCards(stats);
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    // Update statistics cards
    updateStatsCards(stats) {
        const createdCount = document.getElementById('created-count');
        const scannedCount = document.getElementById('scanned-count');
        const inventoryCount = document.getElementById('inventory-count');
        const notificationsCount = document.getElementById('notifications-count');
        const unreadCount = document.getElementById('unread-count');

        if (createdCount && stats.today) {
            createdCount.textContent = stats.today.qr_created || 0;
        }
        
        if (scannedCount && stats.today) {
            scannedCount.textContent = stats.today.qr_scanned || 0;
        }
        
        if (inventoryCount && stats.today) {
            inventoryCount.textContent = stats.today.inventory_viewed || 0;
        }
        
        if (notificationsCount && stats.notifications) {
            notificationsCount.textContent = stats.notifications.unread_count || 0;
        }
        
        if (unreadCount && stats.notifications) {
            const count = stats.notifications.unread_count || 0;
            if (count > 0) {
                unreadCount.textContent = count;
                unreadCount.style.display = 'flex';
            } else {
                unreadCount.style.display = 'none';
            }
        }
    }

    // Load notifications
    async loadNotifications() {
        try {
            const response = await fetch(`${this.baseURL}/${this.employee.employee_id}/notifications`);
            const notifications = await response.json();
            
            this.displayNotifications(notifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    // Display notifications
    displayNotifications(notifications) {
        const notificationsList = document.getElementById('notifications-list');
        if (!notificationsList) return;

        if (!notifications || notifications.length === 0) {
            notificationsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #9ca3af;">
                    <i class="fas fa-bell-slash" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>No notifications yet</p>
                </div>
            `;
            return;
        }

        notificationsList.innerHTML = notifications.map(notification => `
            <div class="notification-item ${!notification.is_read ? 'unread' : ''}" 
                 onclick="dashboard.markNotificationAsRead('${notification.notification_id}')">
                <div class="notification-icon-wrapper">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <h5>${notification.title}</h5>
                    <p>${notification.message}</p>
                    <span class="notification-time">${this.formatDate(notification.created_at)}</span>
                </div>
            </div>
        `).join('');
    }

    // Get notification icon based on type
    getNotificationIcon(type) {
        const icons = {
            info: 'info-circle',
            task: 'tasks',
            reminder: 'clock',
            urgent: 'exclamation-triangle',
            system: 'cog',
            inventory: 'boxes'
        };
        return icons[type] || 'bell';
    }

    // Load activities
    async loadActivities() {
        try {
            const response = await fetch(`${this.baseURL}/${this.employee.employee_id}/activities?limit=20`);
            const activities = await response.json();
            
            this.displayActivities(activities);
        } catch (error) {
            console.error('Error loading activities:', error);
        }
    }

    // Display activities
    displayActivities(activities) {
        const activitiesList = document.getElementById('activities-list');
        if (!activitiesList) return;

        if (!activities || activities.length === 0) {
            activitiesList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #9ca3af;">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>No activities yet</p>
                </div>
            `;
            return;
        }

        activitiesList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.activity_type.replace('_', '')}">
                    <i class="fas fa-${this.getActivityIcon(activity.activity_type)}"></i>
                </div>
                <div class="activity-content">
                    <h5>${activity.details}</h5>
                    <p>${activity.product_name ? `Product: ${activity.product_name}` : ''} ${activity.location ? `• Location: ${activity.location}` : ''}</p>
                </div>
                <span class="activity-time">${this.formatDate(activity.created_at)}</span>
            </div>
        `).join('');
    }

    // Get activity icon based on type
    getActivityIcon(type) {
        const icons = {
            qr_create: 'plus-circle',
            qr_scan: 'qrcode',
            inventory_view: 'eye',
            login: 'sign-in-alt',
            logout: 'sign-out-alt'
        };
        return icons[type] || 'circle';
    }

    // Show tab
    showTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[onclick*="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
            
            // Load data based on tab
            if (tabName === 'notifications') {
                this.loadNotifications();
            } else if (tabName === 'activities') {
                this.loadActivities();
            }
        }
    }

    // Mark notification as read
    async markNotificationAsRead(notificationId) {
        try {
            await fetch(`${this.baseURL}/notifications/${notificationId}/read`, {
                method: 'PUT'
            });
            
            // Refresh notifications and stats
            this.loadNotifications();
            this.loadDashboardStats();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    // Open QR Modal
    openQRModal() {
        const modal = document.getElementById('qr-modal');
        if (modal) {
            modal.classList.add('active');
            // Reload iframe to reset form
            const iframe = document.getElementById('product-iframe');
            if (iframe) {
                iframe.src = iframe.src;
            }
            
            // Record activity when opening create product
            this.recordActivity('qr_create_view', null, 'Viewed create product form');
        }
    }

    // Close QR Modal
    closeQRModal() {
        const modal = document.getElementById('qr-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        // Refresh stats in case product was created
        this.loadDashboardStats();
    }

    // Open Scanner Modal
    openScannerModal() {
        const modal = document.getElementById('scanner-modal');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('scan-result').style.display = 'none';
            this.initializeScanner();
        }
    }

    // Close Scanner Modal
    closeScannerModal() {
        const modal = document.getElementById('scanner-modal');
        if (modal) {
            modal.classList.remove('active');
            this.stopScanner();
        }
    }

    // Initialize Scanner
    initializeScanner() {
        const videoContainer = document.getElementById('scanner-video-container');
        if (!videoContainer) return;

        // Initialize ZXing scanner if available
        if (typeof ZXing !== 'undefined') {
            this.scanner = new ZXing.BrowserQRCodeReader();
        }
    }

    // Start Scanner
    async startScanner() {
        if (!this.scanner) {
            this.showNotification('Scanner not initialized', 'error');
            return;
        }

        try {
            const videoElement = document.getElementById('scanner-video');
            const devices = await this.scanner.listVideoInputDevices();
            
            if (devices.length === 0) {
                throw new Error('No camera devices found');
            }

            await this.scanner.decodeFromVideoDevice(devices[0].deviceId, videoElement, (result, err) => {
                if (result) {
                    this.handleScanResult(result.text);
                    this.stopScanner();
                }
            });

            this.showNotification('Scanner started', 'success');
        } catch (error) {
            console.error('Error starting scanner:', error);
            this.showNotification('Could not start scanner: ' + error.message, 'error');
        }
    }

    // Stop Scanner
    stopScanner() {
        if (this.scanner) {
            this.scanner.reset();
        }
        const videoElement = document.getElementById('scanner-video');
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
        }
    }

    // Handle Scan Result
    async handleScanResult(qrData) {
        try {
            const parsedData = JSON.parse(qrData);
            const productId = parsedData.product_id;

            // Fetch product details
            const response = await fetch(`/api/products/${productId}`);
            const product = await response.json();

            if (product) {
                this.scannedProduct = product;
                this.displayScannedProduct(product);
            } else {
                throw new Error('Product not found');
            }
        } catch (error) {
            console.error('Error processing scan:', error);
            this.showNotification('Invalid QR code or product not found', 'error');
        }
    }

    // Display Scanned Product
    displayScannedProduct(product) {
        document.getElementById('scanned-product-id').textContent = product.product_id;
        document.getElementById('scanned-product-name').textContent = product.name;
        document.getElementById('scanned-product-type').textContent = product.type;
        document.getElementById('scanned-product-stock').textContent = product.quantity;
        
        document.getElementById('scan-result').style.display = 'block';
    }

    // Update Stock
    async updateStock() {
        if (!this.scannedProduct) {
            this.showNotification('No product scanned', 'error');
            return;
        }

        const action = document.getElementById('stock-action').value;
        const quantity = parseInt(document.getElementById('stock-quantity').value) || 1;
        const notes = document.getElementById('stock-notes').value;

        try {
            const response = await fetch('/api/inventory/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    product_id: this.scannedProduct.product_id,
                    action: action,
                    quantity: quantity,
                    notes: notes,
                    performed_by: this.employee.employee_id
                })
            });

            const result = await response.json();

            if (result.success) {
                // Record activity for employee
                await this.recordActivity('qr_scan', this.scannedProduct.product_id, this.scannedProduct.name);
                
                this.showNotification(`Stock ${action === 'IN' ? 'added' : 'removed'} successfully!`, 'success');
                this.closeScannerModal();
                this.loadDashboardStats();
            } else {
                throw new Error(result.error || 'Failed to update stock');
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            this.showNotification('Error updating stock: ' + error.message, 'error');
        }
    }

    // Open Inventory Modal
    async openInventoryModal() {
        const modal = document.getElementById('inventory-modal');
        if (modal) {
            modal.classList.add('active');
            await this.loadInventory();
            
            // Record activity for viewing inventory
            await this.recordActivity('inventory_view', null, null);
            this.loadDashboardStats();
        }
    }

    // Close Inventory Modal
    closeInventoryModal() {
        const modal = document.getElementById('inventory-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Load Inventory
    async loadInventory() {
        try {
            const response = await fetch('/api/inventory');
            const inventory = await response.json();
            
            this.inventory = inventory;
            this.filteredInventory = inventory;
            this.displayInventory();
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.showNotification('Error loading inventory', 'error');
        }
    }

    // Display Inventory
    displayInventory() {
        const inventoryList = document.getElementById('inventory-list');
        if (!inventoryList) return;

        if (this.filteredInventory.length === 0) {
            inventoryList.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px; color: #9ca3af;">
                        No inventory items found
                    </td>
                </tr>
            `;
            return;
        }

        inventoryList.innerHTML = this.filteredInventory.map(item => `
            <tr>
                <td>${item.product_id}</td>
                <td>${item.name}</td>
                <td>${item.type}</td>
                <td>${item.size}</td>
                <td>${item.color || 'N/A'}</td>
                <td>${item.quantity}</td>
                <td>
                    <span class="status-badge ${item.quantity > 10 ? 'active' : 'low'}">
                        ${item.quantity > 10 ? 'In Stock' : 'Low Stock'}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // Filter Inventory
    filterInventory() {
        const searchTerm = document.getElementById('inventory-search').value.toLowerCase();
        const typeFilter = document.getElementById('inventory-type-filter').value;

        this.filteredInventory = this.inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm) ||
                                 item.product_id.toLowerCase().includes(searchTerm);
            const matchesType = !typeFilter || item.type === typeFilter;
            
            return matchesSearch && matchesType;
        });

        this.displayInventory();
    }

    // Record Activity
    async recordActivity(activityType, productId, productName) {
        try {
            await fetch(`${this.baseURL}/activities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    employee_id: this.employee.employee_id,
                    activity_type: activityType,
                    product_id: productId,
                    product_name: productName,
                    details: this.getActivityDescription(activityType, productName)
                })
            });
        } catch (error) {
            console.error('Error recording activity:', error);
        }
    }

    // Get Activity Description
    getActivityDescription(activityType, productName) {
        switch(activityType) {
            case 'qr_create':
                return `Created QR code for ${productName}`;
            case 'qr_scan':
                return `Scanned QR code for ${productName}`;
            case 'inventory_view':
                return 'Viewed inventory list';
            default:
                return activityType.replace('_', ' ');
        }
    }

    // Handle logout
    async handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            await this.auth.logout();
        }
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    // Show notification (utility function)
    showNotification(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Simple notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 15px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white; border-radius: 8px; z-index: 10000;
            font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Export for global use
window.EmployeeDashboard = EmployeeDashboard;