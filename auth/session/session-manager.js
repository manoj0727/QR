class SessionManager {
    constructor() {
        this.storageKey = 'currentSession';
        this.onlineUsersKey = 'onlineUsers';
        this.userActivitiesKey = 'userActivities';
        this.productTrackingKey = 'productTracking';
        this.initializeTracking();
    }

    initializeTracking() {
        // Initialize storage keys if they don't exist
        if (!localStorage.getItem(this.onlineUsersKey)) {
            localStorage.setItem(this.onlineUsersKey, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.userActivitiesKey)) {
            localStorage.setItem(this.userActivitiesKey, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.productTrackingKey)) {
            localStorage.setItem(this.productTrackingKey, JSON.stringify({}));
        }

        // Clean up old sessions on page load
        this.cleanupOldSessions();
        
        // Update heartbeat for current session
        if (this.isLoggedIn()) {
            this.updateHeartbeat();
            // Set up periodic heartbeat
            setInterval(() => this.updateHeartbeat(), 10000);
        }

        // Listen for page unload to handle logout
        window.addEventListener('beforeunload', () => {
            if (this.isLoggedIn()) {
                this.updateUserStatus('offline');
            }
        });
    }

    startSession(user) {
        const session = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name || user.username
            },
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            sessionId: this.generateSessionId()
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        
        // Add to online users
        this.addOnlineUser(session.user);
        
        // Log activity
        this.logActivity('login', `${session.user.name} logged in`, session.user);
        
        return session;
    }

    endSession() {
        const session = this.getSession();
        if (session) {
            // Remove from online users
            this.removeOnlineUser(session.user.id);
            
            // Log activity
            this.logActivity('logout', `${session.user.name} logged out`, session.user);
        }
        
        localStorage.removeItem(this.storageKey);
    }

    getSession() {
        const sessionData = localStorage.getItem(this.storageKey);
        return sessionData ? JSON.parse(sessionData) : null;
    }

    isLoggedIn() {
        return this.getSession() !== null;
    }

    getCurrentUser() {
        const session = this.getSession();
        return session ? session.user : null;
    }

    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    }

    updateLastActivity() {
        const session = this.getSession();
        if (session) {
            session.lastActivity = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(session));
        }
    }

    // Real-time tracking methods
    addOnlineUser(user) {
        const onlineUsers = this.getOnlineUsers();
        const existingIndex = onlineUsers.findIndex(u => u.id === user.id);
        
        const onlineUser = {
            ...user,
            loginTime: new Date().toISOString(),
            lastHeartbeat: new Date().toISOString(),
            status: 'online'
        };
        
        if (existingIndex >= 0) {
            onlineUsers[existingIndex] = onlineUser;
        } else {
            onlineUsers.push(onlineUser);
        }
        
        localStorage.setItem(this.onlineUsersKey, JSON.stringify(onlineUsers));
        this.triggerStorageEvent(this.onlineUsersKey);
    }

    removeOnlineUser(userId) {
        const onlineUsers = this.getOnlineUsers();
        const filtered = onlineUsers.filter(u => u.id !== userId);
        localStorage.setItem(this.onlineUsersKey, JSON.stringify(filtered));
        this.triggerStorageEvent(this.onlineUsersKey);
    }

    getOnlineUsers() {
        const data = localStorage.getItem(this.onlineUsersKey);
        return data ? JSON.parse(data) : [];
    }

    updateHeartbeat() {
        const session = this.getSession();
        if (session) {
            const onlineUsers = this.getOnlineUsers();
            const userIndex = onlineUsers.findIndex(u => u.id === session.user.id);
            
            if (userIndex >= 0) {
                onlineUsers[userIndex].lastHeartbeat = new Date().toISOString();
                localStorage.setItem(this.onlineUsersKey, JSON.stringify(onlineUsers));
            } else {
                // Re-add user if not in list
                this.addOnlineUser(session.user);
            }
        }
    }

    updateUserStatus(status) {
        const session = this.getSession();
        if (session) {
            const onlineUsers = this.getOnlineUsers();
            const userIndex = onlineUsers.findIndex(u => u.id === session.user.id);
            
            if (userIndex >= 0) {
                onlineUsers[userIndex].status = status;
                localStorage.setItem(this.onlineUsersKey, JSON.stringify(onlineUsers));
                this.triggerStorageEvent(this.onlineUsersKey);
            }
        }
    }

    cleanupOldSessions() {
        const onlineUsers = this.getOnlineUsers();
        const now = new Date();
        const timeout = 30000; // 30 seconds timeout
        
        const activeUsers = onlineUsers.filter(user => {
            const lastHeartbeat = new Date(user.lastHeartbeat);
            return (now - lastHeartbeat) < timeout;
        });
        
        if (activeUsers.length !== onlineUsers.length) {
            localStorage.setItem(this.onlineUsersKey, JSON.stringify(activeUsers));
            this.triggerStorageEvent(this.onlineUsersKey);
        }
    }

    // Activity logging
    logActivity(type, description, user) {
        const activities = this.getActivities();
        const activity = {
            id: this.generateSessionId(),
            type: type,
            description: description,
            user: user,
            timestamp: new Date().toISOString()
        };
        
        activities.unshift(activity);
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.length = 100;
        }
        
        localStorage.setItem(this.userActivitiesKey, JSON.stringify(activities));
        this.triggerStorageEvent(this.userActivitiesKey);
    }

    getActivities(limit = 50) {
        const data = localStorage.getItem(this.userActivitiesKey);
        const activities = data ? JSON.parse(data) : [];
        return limit ? activities.slice(0, limit) : activities;
    }

    // Product tracking
    trackProductAddition(employeeId, employeeName, productCount = 1) {
        const tracking = this.getProductTracking();
        
        if (!tracking[employeeId]) {
            tracking[employeeId] = {
                id: employeeId,
                name: employeeName,
                totalProducts: 0,
                todayProducts: 0,
                lastUpdate: new Date().toISOString()
            };
        }
        
        tracking[employeeId].totalProducts += productCount;
        tracking[employeeId].todayProducts += productCount;
        tracking[employeeId].lastUpdate = new Date().toISOString();
        
        localStorage.setItem(this.productTrackingKey, JSON.stringify(tracking));
        
        // Log activity
        this.logActivity('product', `${employeeName} added ${productCount} product(s)`, {
            id: employeeId,
            name: employeeName
        });
        
        this.triggerStorageEvent(this.productTrackingKey);
    }

    getProductTracking() {
        const data = localStorage.getItem(this.productTrackingKey);
        return data ? JSON.parse(data) : {};
    }

    resetDailyProductCount() {
        const tracking = this.getProductTracking();
        Object.keys(tracking).forEach(key => {
            tracking[key].todayProducts = 0;
        });
        localStorage.setItem(this.productTrackingKey, JSON.stringify(tracking));
        this.triggerStorageEvent(this.productTrackingKey);
    }

    // Helper methods
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    triggerStorageEvent(key) {
        // Trigger storage event for cross-tab communication
        const event = new StorageEvent('storage', {
            key: key,
            newValue: localStorage.getItem(key),
            url: window.location.href
        });
        window.dispatchEvent(event);
    }

    // Get formatted time ago
    getTimeAgo(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const seconds = Math.floor((now - then) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    }
}

// Create global instance
window.SessionManager = new SessionManager();