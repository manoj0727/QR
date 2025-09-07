// Tailor Dashboard Module

class TailorDashboard {
    constructor() {
        this.baseURL = '/api/tailor';
        this.auth = new TailorAuth();
        this.currentTailor = null;
    }

    // Initialize dashboard
    async init() {
        // Check authentication
        this.currentTailor = this.auth.requireAuth();
        if (!this.currentTailor) return;

        // Update header with tailor info
        this.updateHeader();
        
        // Load dashboard data
        await this.loadData();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    // Update header information
    updateHeader() {
        const tailorNameEl = document.getElementById('tailor-name');
        const userAvatarEl = document.getElementById('user-avatar');
        
        if (tailorNameEl) {
            tailorNameEl.textContent = this.currentTailor.name;
        }
        
        if (userAvatarEl) {
            userAvatarEl.textContent = this.currentTailor.name.charAt(0).toUpperCase();
        }
    }

    // Load all dashboard data
    async loadData() {
        try {
            await Promise.all([
                this.loadAssignments(),
                this.loadNotifications()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    // Load assignments for current tailor
    async loadAssignments() {
        try {
            const response = await fetch(`${this.baseURL}/${this.currentTailor.tailor_id}/assignments`);
            const assignments = await response.json();
            
            this.displayAssignments(assignments);
            this.updateAssignmentStats(assignments);
        } catch (error) {
            console.error('Error loading assignments:', error);
            this.showError('assignments-list', 'Error loading assignments');
        }
    }

    // Load notifications for current tailor
    async loadNotifications() {
        try {
            const response = await fetch(`${this.baseURL}/${this.currentTailor.tailor_id}/notifications`);
            const notifications = await response.json();
            
            this.displayNotifications(notifications);
            this.updateNotificationStats(notifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.showError('notifications-list', 'Error loading notifications');
        }
    }

    // Display assignments
    displayAssignments(assignments) {
        const container = document.getElementById('assignments-list');
        if (!container) return;

        if (!assignments || assignments.length === 0) {
            container.innerHTML = this.getEmptyState('tasks', 'No Assignments', 'You don\'t have any assignments at the moment.');
            return;
        }

        container.innerHTML = assignments.map(assignment => this.getAssignmentHTML(assignment)).join('');
    }

    // Display notifications
    displayNotifications(notifications) {
        const container = document.getElementById('notifications-list');
        if (!container) return;

        if (!notifications || notifications.length === 0) {
            container.innerHTML = this.getEmptyState('bell', 'No Notifications', 'You don\'t have any notifications.');
            return;
        }

        container.innerHTML = notifications.map(notification => this.getNotificationHTML(notification)).join('');
    }

    // Update assignment statistics
    updateAssignmentStats(assignments) {
        const pending = assignments.filter(a => a.status === 'pending').length;
        const progress = assignments.filter(a => a.status === 'in_progress' || a.status === 'accepted').length;
        const completed = assignments.filter(a => a.status === 'completed').length;

        this.updateStatElement('pending-count', pending);
        this.updateStatElement('progress-count', progress);
        this.updateStatElement('completed-count', completed);
    }

    // Update notification statistics
    updateNotificationStats(notifications) {
        const unread = notifications.filter(n => !n.is_read).length;
        this.updateStatElement('notifications-count', unread);
        
        const badge = document.getElementById('unread-count');
        if (badge) {
            if (unread > 0) {
                badge.textContent = unread;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Update assignment status
    async updateAssignmentStatus(assignmentId, status) {
        try {
            const response = await fetch(`${this.baseURL}/assignments/${assignmentId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            const result = await response.json();
            
            if (result.success) {
                await this.loadAssignments(); // Reload assignments
                this.showNotification('Assignment updated successfully!', 'success');
            } else {
                this.showNotification('Error updating assignment status', 'error');
            }
        } catch (error) {
            console.error('Error updating assignment:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    // Mark notification as read
    async markAsRead(notificationId) {
        try {
            await fetch(`${this.baseURL}/notifications/${notificationId}/read`, {
                method: 'PUT'
            });
            
            await this.loadNotifications(); // Reload notifications
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    // Show tab
    showTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`.tab-btn:nth-child(${tabName === 'assignments' ? '1' : '2'})`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const activeTab = document.getElementById(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.querySelector('[onclick="logout()"]');
        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                this.handleLogout();
            };
        }

        // Notification bell
        const notificationBell = document.querySelector('[onclick="showTab(\'notifications\')"]');
        if (notificationBell) {
            notificationBell.onclick = (e) => {
                e.preventDefault();
                this.showTab('notifications');
            };
        }
    }

    // Handle logout
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.auth.logout();
        }
    }

    // Utility methods
    updateStatElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    getEmptyState(icon, title, message) {
        return `
            <div class="empty-state">
                <i class="fas fa-${icon}"></i>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }

    getAssignmentHTML(assignment) {
        const statusActions = this.getAssignmentActions(assignment);
        
        return `
            <div class="assignment-item">
                <div class="assignment-header">
                    <div class="assignment-title">${assignment.title}</div>
                    <div class="priority-badge priority-${assignment.priority || 'normal'}">${assignment.priority || 'Normal'}</div>
                </div>
                <div class="assignment-details">
                    <p><i class="fas fa-calendar"></i> Deadline: ${this.formatDate(assignment.deadline)}</p>
                    <p><i class="fas fa-sort-numeric-up"></i> Quantity: ${assignment.quantity}</p>
                    ${assignment.description ? `<p><i class="fas fa-info-circle"></i> ${assignment.description}</p>` : ''}
                    ${assignment.order_number ? `<p><i class="fas fa-receipt"></i> Order: ${assignment.order_number}</p>` : ''}
                </div>
                ${statusActions}
            </div>
        `;
    }

    getAssignmentActions(assignment) {
        const actions = [];
        
        if (assignment.status === 'pending') {
            actions.push(`
                <button class="btn btn-primary" onclick="dashboard.updateAssignmentStatus('${assignment.assignment_id}', 'accepted')">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="btn btn-outline" onclick="dashboard.updateAssignmentStatus('${assignment.assignment_id}', 'rejected')">
                    <i class="fas fa-times"></i> Reject
                </button>
            `);
        } else if (assignment.status === 'accepted') {
            actions.push(`
                <button class="btn btn-primary" onclick="dashboard.updateAssignmentStatus('${assignment.assignment_id}', 'in_progress')">
                    <i class="fas fa-play"></i> Start Work
                </button>
            `);
        } else if (assignment.status === 'in_progress') {
            actions.push(`
                <button class="btn btn-success" onclick="dashboard.updateAssignmentStatus('${assignment.assignment_id}', 'completed')">
                    <i class="fas fa-check-circle"></i> Mark Complete
                </button>
            `);
        }
        
        return actions.length > 0 ? `<div class="assignment-actions">${actions.join('')}</div>` : '';
    }

    getNotificationHTML(notification) {
        const icon = this.getNotificationIcon(notification.type);
        const unreadClass = notification.is_read ? '' : 'unread';
        
        return `
            <div class="notification-item ${unreadClass}" onclick="dashboard.markAsRead('${notification.notification_id}')">
                <div class="notification-icon-wrapper">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="notification-content">
                    <h5>${notification.title}</h5>
                    <p>${notification.message}</p>
                    <div class="notification-time">${this.timeAgo(notification.created_at)}</div>
                </div>
            </div>
        `;
    }

    getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'assignment': 'tasks',
            'reminder': 'clock',
            'urgent': 'exclamation-triangle',
            'system': 'cog'
        };
        return icons[type] || 'bell';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    timeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }

    showNotification(message, type) {
        // Simple notification - could be enhanced with a proper notification system
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Export for global use
window.TailorDashboard = TailorDashboard;