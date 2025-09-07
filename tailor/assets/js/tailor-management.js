// Tailor Management Module (for Admin Portal)

class TailorManagement {
    constructor() {
        this.baseURL = '/api/tailor';
        this.tailors = [];
    }

    // Initialize tailor management
    init() {
        this.loadTailors();
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Password generation
        const generateBtn = document.querySelector('[onclick="generatePassword()"]');
        if (generateBtn) {
            generateBtn.onclick = (e) => {
                e.preventDefault();
                this.generatePassword();
            };
        }
    }

    // Load all tailors
    async loadTailors() {
        try {
            const response = await fetch(`${this.baseURL}/all`);
            const data = await response.json();
            this.tailors = Array.isArray(data) ? data : [];
            this.updateTailorStats();
            this.displayTailors();
        } catch (error) {
            console.error('Error loading tailors:', error);
            this.tailors = [];
        }
    }

    // Update tailor statistics
    updateTailorStats() {
        const totalTailorsEl = document.getElementById('total-tailors');
        const activeOrdersEl = document.getElementById('active-orders');
        
        if (totalTailorsEl) {
            totalTailorsEl.textContent = this.tailors.length;
        }
        
        if (activeOrdersEl) {
            // Placeholder calculation
            activeOrdersEl.textContent = Math.floor(this.tailors.length * 2.5);
        }
    }

    // Display tailors in table
    displayTailors() {
        const tbody = document.getElementById('tailors-table-body');
        if (!tbody) return;

        if (this.tailors.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #9ca3af;">
                        No tailors found. Add your first tailor above.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.tailors.map(tailor => this.getTailorRowHTML(tailor)).join('');
    }

    // Get HTML for tailor table row
    getTailorRowHTML(tailor) {
        return `
            <tr>
                <td>
                    <div class="tailor-info">
                        <div class="tailor-avatar">${tailor.name.charAt(0).toUpperCase()}</div>
                        <div class="tailor-details">
                            <h4>${tailor.name}</h4>
                            <p>ID: ${tailor.tailor_id}</p>
                        </div>
                    </div>
                </td>
                <td>
                    <p><i class="fas fa-phone"></i> ${tailor.phone || 'N/A'}</p>
                    <p><i class="fas fa-envelope"></i> ${tailor.email || 'N/A'}</p>
                </td>
                <td>${tailor.specialization || 'General'}</td>
                <td>${tailor.experience_years || 0} years</td>
                <td>₹${tailor.rate || 0}/hr</td>
                <td>
                    <span class="status-badge status-${tailor.status || 'active'}">${tailor.status || 'active'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline" onclick="tailorManager.editTailor('${tailor.tailor_id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="tailorManager.deleteTailor('${tailor.tailor_id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    // Add new tailor
    async addTailor(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const tailorData = Object.fromEntries(formData);
        
        // Map form fields to API expected fields
        const apiData = {
            name: tailorData.name,
            username: tailorData.username,
            password: tailorData.password,
            email: tailorData.email,
            phone: tailorData.phone,
            address: tailorData.address,
            specialization: tailorData.specialty,
            experience_years: parseInt(tailorData.experience) || 0
        };

        try {
            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(apiData)
            });
            
            const result = await response.json();
            
            if (result.error) {
                this.showNotification('Error: ' + result.error, 'error');
            } else {
                this.showNotification(
                    `Tailor registered successfully! Login credentials - Username: ${result.credentials.username}, Password: ${result.credentials.password}`, 
                    'success'
                );
                event.target.reset();
                this.loadTailors();
            }
        } catch (error) {
            this.showNotification('Network error: ' + error.message, 'error');
        }
    }

    // Generate password
    generatePassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        const passwordField = document.getElementById('tailor-password');
        if (passwordField) {
            passwordField.value = password;
        }
    }

    // Load tailors for select dropdown
    async loadTailorsForSelect(selectId = 'assignment-tailor') {
        try {
            const response = await fetch(`${this.baseURL}/all`);
            const data = await response.json();
            const select = document.getElementById(selectId);
            
            if (!select) return;
            
            const currentValue = select.value;
            
            // Clear existing options except first
            while (select.options.length > (selectId === 'notification-tailor' ? 2 : 1)) {
                select.remove(select.options.length - 1);
            }
            
            // Add tailor options
            data.forEach(tailor => {
                const option = document.createElement('option');
                option.value = tailor.tailor_id;
                option.textContent = `${tailor.name} - ${tailor.specialization || 'General'}`;
                select.appendChild(option);
            });
            
            if (currentValue) select.value = currentValue;
        } catch (error) {
            console.error('Error loading tailors for select:', error);
        }
    }

    // Create assignment
    async createAssignment(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const assignmentData = Object.fromEntries(formData);

        try {
            const response = await fetch(`${this.baseURL}/assignments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(assignmentData)
            });
            
            const result = await response.json();
            
            if (result.error) {
                this.showNotification('Error: ' + result.error, 'error');
            } else {
                this.showNotification('Assignment created successfully!', 'success');
                event.target.reset();
                this.loadAssignments();
            }
        } catch (error) {
            this.showNotification('Network error: ' + error.message, 'error');
        }
    }

    // Send notification
    async sendNotification(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const notificationData = Object.fromEntries(formData);
        
        try {
            if (notificationData.tailor_id === 'all') {
                // Send to all tailors
                const response = await fetch(`${this.baseURL}/all`);
                const tailors = await response.json();
                
                const promises = tailors.map(tailor => 
                    fetch(`${this.baseURL}/notifications`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...notificationData,
                            tailor_id: tailor.tailor_id
                        })
                    })
                );
                
                await Promise.all(promises);
                this.showNotification('Notification sent to all tailors!', 'success');
            } else {
                const response = await fetch(`${this.baseURL}/notifications`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(notificationData)
                });
                
                const result = await response.json();
                
                if (result.error) {
                    this.showNotification('Error: ' + result.error, 'error');
                } else {
                    this.showNotification('Notification sent successfully!', 'success');
                }
            }
            
            event.target.reset();
            this.loadNotifications();
        } catch (error) {
            this.showNotification('Network error: ' + error.message, 'error');
        }
    }

    // Switch tabs
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.modern-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.modern-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
            
            // Load data based on tab
            if (tabName === 'assignments') {
                this.loadAssignments();
                this.loadTailorsForSelect();
            } else if (tabName === 'notifications') {
                this.loadNotifications();
                this.loadTailorsForSelect('notification-tailor');
            }
        }
    }

    // Placeholder methods for future implementation
    async loadAssignments() {
        // Implementation for loading assignments
        console.log('Loading assignments...');
    }

    async loadNotifications() {
        // Implementation for loading notifications
        console.log('Loading notifications...');
    }

    editTailor(tailorId) {
        this.showNotification('Edit functionality coming soon', 'info');
    }

    deleteTailor(tailorId) {
        if (confirm('Are you sure you want to delete this tailor?')) {
            // Implementation for deleting tailor
            this.showNotification('Delete functionality coming soon', 'info');
        }
    }

    // Show notification (placeholder - should integrate with main app's notification system)
    showNotification(message, type) {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Try to use main app's notification system if available
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Export for global use
window.TailorManagement = TailorManagement;