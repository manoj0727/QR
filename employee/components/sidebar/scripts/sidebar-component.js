// Sidebar Component JavaScript
// This file contains all the functionality for the sidebar

class SidebarComponent {
    constructor() {
        this.isCollapsed = false;
        this.activeSection = 'dashboard';
        this.notificationCount = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserProfile();
        this.updateCounters();
        this.startAutoUpdate();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('sidebar-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => this.toggleMobileSidebar());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search focus
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.focusSearch();
            }
            // Ctrl/Cmd + B for sidebar toggle
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
    }

    loadUserProfile() {
        // Load user data from localStorage or API
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const profileName = document.getElementById('profile-name');
        const profileRole = document.getElementById('profile-role');
        const profileAvatar = document.getElementById('profile-avatar');

        if (profileName) profileName.textContent = userData.name || 'Admin User';
        if (profileRole) profileRole.textContent = userData.role || 'Manager';
        if (profileAvatar) profileAvatar.textContent = (userData.name || 'Admin')[0].toUpperCase();
    }

    handleSearch(searchTerm) {
        const menuItems = document.querySelectorAll('.nav-item');
        searchTerm = searchTerm.toLowerCase();

        menuItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            const parent = item.closest('li');
            if (parent) {
                parent.style.display = text.includes(searchTerm) ? '' : 'none';
            }
        });

        // Show "no results" message if all items are hidden
        const visibleItems = Array.from(menuItems).filter(item => {
            const parent = item.closest('li');
            return parent && parent.style.display !== 'none';
        });

        this.showSearchResults(visibleItems.length);
    }

    showSearchResults(count) {
        const noResults = document.getElementById('no-search-results');
        if (noResults) {
            noResults.style.display = count === 0 ? 'block' : 'none';
        }
    }

    focusSearch() {
        const searchInput = document.getElementById('sidebar-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    toggleSidebar() {
        this.isCollapsed = !this.isCollapsed;
        const sidebar = document.getElementById('sidebar');
        
        if (sidebar) {
            sidebar.classList.toggle('sidebar-collapsed', this.isCollapsed);
            
            // Save preference
            localStorage.setItem('sidebarCollapsed', this.isCollapsed);
            
            // Emit event for other components
            window.dispatchEvent(new CustomEvent('sidebarToggled', { 
                detail: { collapsed: this.isCollapsed } 
            }));
        }
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    }

    navigateTo(section, event) {
        if (event) event.preventDefault();
        
        // Update active state
        this.setActiveSection(section);
        
        // Call parent window function if in iframe
        if (window.parent && window.parent.showSection) {
            window.parent.showSection(section);
        } else if (window.showSection) {
            window.showSection(section);
        }
    }

    setActiveSection(section) {
        this.activeSection = section;
        
        // Update menu items
        document.querySelectorAll('.nav-item').forEach(item => {
            const itemSection = item.getAttribute('data-section');
            if (itemSection === section) {
                item.classList.add('nav-item-active');
            } else {
                item.classList.remove('nav-item-active');
            }
        });
    }

    updateCounters() {
        // Update inventory counter
        this.fetchAndUpdateCounter('/api/products', '.inventory-counter');
        
        // Update transactions counter
        this.fetchAndUpdateCounter('/api/transactions?limit=10', '.transactions-counter');
        
        // Update tailor counter
        this.fetchAndUpdateCounter('/api/tailor', '.tailor-counter');
        
        // Update notification badge
        this.updateNotificationBadge();
    }

    fetchAndUpdateCounter(endpoint, selector) {
        fetch(endpoint)
            .then(response => response.json())
            .then(data => {
                const counter = document.querySelector(selector);
                if (counter) {
                    const count = Array.isArray(data) ? data.length : 0;
                    counter.textContent = count;
                    counter.style.display = count > 0 ? 'flex' : 'none';
                }
            })
            .catch(error => console.error('Error updating counter:', error));
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            // This would normally fetch from an API
            this.notificationCount = Math.floor(Math.random() * 10);
            badge.textContent = this.notificationCount;
            badge.style.display = this.notificationCount > 0 ? 'flex' : 'none';
        }
    }

    startAutoUpdate() {
        // Update counters every 30 seconds
        setInterval(() => this.updateCounters(), 30000);
    }

    quickScan() {
        this.navigateTo('scan-qr');
        this.showNotification('Quick scan mode activated', 'success');
    }

    quickAdd() {
        this.navigateTo('create-product');
        this.showNotification('Opening product creation form', 'success');
    }

    refreshData() {
        this.showNotification('Refreshing all data...', 'info');
        
        // Refresh all data
        if (window.loadDashboardData) window.loadDashboardData();
        if (window.loadTransactions) window.loadTransactions();
        if (window.loadTailors) window.loadTailors();
        
        setTimeout(() => {
            this.updateCounters();
            this.showNotification('Data refreshed successfully!', 'success');
        }, 1000);
    }

    showSettings() {
        this.showNotification('Settings panel coming soon', 'info');
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.showNotification('Logging out...', 'info');
            localStorage.clear();
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1000);
        }
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    showNotifications() {
        this.showNotification(`You have ${this.notificationCount} new notifications`, 'info');
        // In a real app, this would open a notifications panel
    }
}

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sidebarComponent = new SidebarComponent();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarComponent;
}