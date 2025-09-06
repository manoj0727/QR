// Admin portal JavaScript

let currentUser = null;
let sessionId = null;

// Check authentication on page load
window.addEventListener('load', async () => {
    sessionId = localStorage.getItem('session_id');
    const userStr = localStorage.getItem('user');
    
    if (!sessionId || !userStr) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    
    // Check if user has admin/manager role
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        alert('Access denied. Admin privileges required.');
        window.location.href = 'index.html';
        return;
    }
    
    // Display current user
    document.getElementById('current-user').textContent = `👤 ${currentUser.full_name} (${currentUser.role})`;
    
    // Hide all sections first
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show dashboard section by default
    const dashboardSection = document.getElementById('admin-dashboard');
    if (dashboardSection) {
        dashboardSection.style.display = 'block';
    }
    
    // Activate dashboard button in navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.textContent === 'Dashboard') {
            btn.classList.add('active');
        }
    });
    
    // Load dashboard data
    loadAdminDashboard();
});

// Admin section navigation
function showAdminSection(sectionId, evt) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const section = document.getElementById(`admin-${sectionId}`);
    if (section) {
        section.style.display = 'block';
    }
    
    // Update active button
    if (evt && evt.target) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        evt.target.classList.add('active');
    }
    
    // Load section data
    switch (sectionId) {
        case 'dashboard':
            loadAdminDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'activity':
            loadActivityLogs();
            break;
    }
}

// Load admin dashboard stats
async function loadAdminDashboard() {
    try {
        const [statsResponse, productsResponse] = await Promise.all([
            fetch(`${API_URL}/api/auth/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${sessionId}`
                }
            }),
            fetch(`${API_URL}/api/products`)
        ]);
        
        if (statsResponse.ok) {
            const { stats } = await statsResponse.json();
            
            // Update user stats
            document.getElementById('total-users').textContent = stats.users.total_users || 0;
            document.getElementById('active-users').textContent = `${stats.users.active_users || 0} active`;
            document.getElementById('active-sessions').textContent = stats.active_sessions || 0;
            document.getElementById('today-activities').textContent = stats.today_activities || 0;
            
            // Display recent activities
            displayRecentActivities(stats.recent_activities || []);
        }
        
        if (productsResponse.ok) {
            const products = await productsResponse.json();
            document.getElementById('total-products').textContent = products.length;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Display recent activities
function displayRecentActivities(activities) {
    const container = document.getElementById('recent-activities');
    
    if (activities.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No recent activities</p>';
        return;
    }
    
    let html = '';
    activities.forEach(activity => {
        const timestamp = new Date(activity.timestamp).toLocaleString('en-IN');
        html += `
            <div class="activity-item">
                <div class="activity-info">
                    <span class="activity-user">${activity.full_name || activity.username}</span>
                    <div class="activity-action">${activity.description || activity.action_type}</div>
                </div>
                <span class="activity-time">${timestamp}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/api/auth/users`, {
            headers: {
                'Authorization': `Bearer ${sessionId}`
            }
        });
        
        if (response.ok) {
            const { users } = await response.json();
            displayUsers(users);
            setupUserSearch(users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('users-table-body');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users found</td></tr>';
        return;
    }
    
    let html = '';
    users.forEach(user => {
        const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString('en-IN') : 'Never';
        const isActive = user.is_active === 1;
        
        html += `
            <tr>
                <td>${user.username}</td>
                <td>${user.full_name}</td>
                <td><span class="role-badge ${user.role}">${user.role}</span></td>
                <td>${user.department || '-'}</td>
                <td><span class="status-badge ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span></td>
                <td>${lastLogin}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editUser('${user.user_id}')">Edit</button>
                    ${user.user_id !== 'USR-ADMIN' ? `
                        <button class="action-btn ${isActive ? 'delete-btn' : 'view-btn'}" 
                                onclick="${isActive ? `deactivateUser('${user.user_id}')` : `activateUser('${user.user_id}')`}">
                            ${isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Setup user search
function setupUserSearch(users) {
    const searchInput = document.getElementById('search-users');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredUsers = users.filter(user => 
            user.username.toLowerCase().includes(searchTerm) ||
            user.full_name.toLowerCase().includes(searchTerm) ||
            (user.department && user.department.toLowerCase().includes(searchTerm))
        );
        displayUsers(filteredUsers);
    });
}

// Load activity logs
async function loadActivityLogs() {
    try {
        const response = await fetch(`${API_URL}/api/auth/activity-logs?limit=100`, {
            headers: {
                'Authorization': `Bearer ${sessionId}`
            }
        });
        
        if (response.ok) {
            const { logs } = await response.json();
            displayActivityLogs(logs);
            setupActivityFilters(logs);
        }
    } catch (error) {
        console.error('Error loading activity logs:', error);
    }
}

// Display activity logs
function displayActivityLogs(logs) {
    const container = document.getElementById('activity-list');
    
    if (logs.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No activity logs found</p>';
        return;
    }
    
    let html = '';
    logs.forEach(log => {
        const timestamp = new Date(log.timestamp).toLocaleString('en-IN');
        html += `
            <div class="activity-item">
                <div class="activity-info">
                    <span class="activity-user">${log.full_name || log.username}</span>
                    <div class="activity-action">
                        <strong>${log.action_type}</strong>: ${log.description || ''}
                        ${log.entity_type ? `(${log.entity_type}: ${log.entity_id})` : ''}
                    </div>
                </div>
                <span class="activity-time">${timestamp}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Setup activity filters
function setupActivityFilters(logs) {
    // Populate user filter
    const userFilter = document.getElementById('filter-user');
    const uniqueUsers = [...new Set(logs.map(log => log.username))];
    
    userFilter.innerHTML = '<option value="">All Users</option>';
    uniqueUsers.forEach(username => {
        userFilter.innerHTML += `<option value="${username}">${username}</option>`;
    });
    
    // Setup filter handlers
    const actionFilter = document.getElementById('filter-action');
    
    const applyFilters = () => {
        const selectedUser = userFilter.value;
        const selectedAction = actionFilter.value;
        
        let filteredLogs = logs;
        
        if (selectedUser) {
            filteredLogs = filteredLogs.filter(log => log.username === selectedUser);
        }
        
        if (selectedAction) {
            filteredLogs = filteredLogs.filter(log => log.action_type.includes(selectedAction));
        }
        
        displayActivityLogs(filteredLogs);
    };
    
    userFilter.addEventListener('change', applyFilters);
    actionFilter.addEventListener('change', applyFilters);
}

// Show create user modal
function showCreateUserModal() {
    document.getElementById('create-user-modal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('create-user-modal').classList.remove('active');
    document.getElementById('create-user-form').reset();
}

// Create user form handler
document.getElementById('create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userData = {
        username: document.getElementById('new-username').value,
        password: document.getElementById('new-password').value,
        full_name: document.getElementById('new-fullname').value,
        email: document.getElementById('new-email').value,
        role: document.getElementById('new-role').value,
        department: document.getElementById('new-department').value
    };
    
    try {
        const response = await fetch(`${API_URL}/api/auth/users/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionId}`
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('User created successfully!');
            closeModal();
            loadUsers(); // Reload users list
        } else {
            alert('Error: ' + (result.error || 'Failed to create user'));
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Error creating user');
    }
});

// Edit user (placeholder function)
function editUser(userId) {
    // TODO: Implement edit user functionality
    alert('Edit user functionality coming soon!');
}

// Deactivate user
async function deactivateUser(userId) {
    if (!confirm('Are you sure you want to deactivate this user?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/auth/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sessionId}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('User deactivated successfully');
            loadUsers(); // Reload users list
        } else {
            alert('Error: ' + (result.error || 'Failed to deactivate user'));
        }
    } catch (error) {
        console.error('Error deactivating user:', error);
        alert('Error deactivating user');
    }
}

// Activate user
async function activateUser(userId) {
    try {
        const response = await fetch(`${API_URL}/api/auth/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionId}`
            },
            body: JSON.stringify({ is_active: true })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('User activated successfully');
            loadUsers(); // Reload users list
        } else {
            alert('Error: ' + (result.error || 'Failed to activate user'));
        }
    } catch (error) {
        console.error('Error activating user:', error);
        alert('Error activating user');
    }
}

// Logout function
async function logout() {
    try {
        await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionId}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    // Clear local storage and redirect
    localStorage.removeItem('session_id');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}