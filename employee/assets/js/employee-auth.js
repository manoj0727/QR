// Employee Authentication Module

class EmployeeAuth {
    constructor() {
        this.baseURL = '/api/employee';
    }

    // Handle login form submission
    async handleLogin(event) {
        event.preventDefault();
        
        const loginBtn = document.getElementById('login-btn');
        const loginText = document.getElementById('login-text');
        const loginIcon = document.getElementById('login-icon');
        const loadingSpinner = document.getElementById('loading-spinner');
        
        // Show loading state
        this.setLoadingState(true, { loginBtn, loginText, loginIcon, loadingSpinner });
        
        const formData = new FormData(event.target);
        const credentials = Object.fromEntries(formData);
        
        try {
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Store employee info in localStorage
                localStorage.setItem('employeeSession', JSON.stringify(result.employee));
                
                this.showAlert('Login successful! Redirecting...', 'success');
                
                // Redirect to employee dashboard
                setTimeout(() => {
                    window.location.href = '/employee/pages/dashboard.html';
                }, 1500);
            } else {
                this.showAlert(result.error || 'Invalid login credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Connection error. Please try again.', 'error');
        } finally {
            // Reset button state
            this.setLoadingState(false, { loginBtn, loginText, loginIcon, loadingSpinner });
        }
    }

    // Set loading state for login button
    setLoadingState(isLoading, elements) {
        const { loginBtn, loginText, loginIcon, loadingSpinner } = elements;
        
        loginBtn.disabled = isLoading;
        loginText.textContent = isLoading ? 'Signing In...' : 'Sign In';
        loginIcon.style.display = isLoading ? 'none' : 'inline';
        loadingSpinner.style.display = isLoading ? 'block' : 'none';
    }

    // Show alert message
    showAlert(message, type) {
        const alert = document.getElementById('alert');
        const alertMessage = document.getElementById('alert-message');
        
        if (!alert || !alertMessage) return;
        
        alert.className = `alert alert-${type}`;
        alertMessage.textContent = message;
        alert.style.display = 'flex';
        
        if (type === 'success') {
            setTimeout(() => {
                alert.style.display = 'none';
            }, 3000);
        }
    }

    // Check if employee is authenticated
    isAuthenticated() {
        const employeeSession = localStorage.getItem('employeeSession');
        if (!employeeSession) return null;
        
        try {
            return JSON.parse(employeeSession);
        } catch (error) {
            console.error('Error parsing employee session:', error);
            this.logout();
            return null;
        }
    }

    // Logout employee
    async logout() {
        const employee = this.isAuthenticated();
        
        if (employee) {
            // Call logout API to record activity
            try {
                await fetch(`${this.baseURL}/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employee_id: employee.employee_id })
                });
            } catch (error) {
                console.error('Error recording logout:', error);
            }
        }
        
        // Broadcast logout event to other tabs/windows
        localStorage.setItem('employeeLogoutEvent', Date.now().toString());
        
        // Clear session and redirect
        localStorage.removeItem('employeeSession');
        localStorage.removeItem('employeeLogoutEvent');
        window.location.href = '/login.html';
    }

    // Require authentication for protected pages
    requireAuth() {
        const employee = this.isAuthenticated();
        if (!employee) {
            window.location.href = '/login.html';
            return null;
        }
        
        // Set up periodic session check
        this.startSessionCheck();
        
        return employee;
    }
    
    // Start periodic session checking
    startSessionCheck() {
        // Check session every 5 seconds
        setInterval(() => {
            const employee = this.isAuthenticated();
            if (!employee) {
                // Session has been cleared, redirect to login
                window.location.href = '/login.html';
            }
        }, 5000);
    }
    
    // Check if another tab/window logged out
    checkGlobalLogout() {
        // Listen for storage events (changes in other tabs)
        window.addEventListener('storage', (e) => {
            // Check if session was cleared
            if (e.key === 'employeeSession' && e.newValue === null) {
                // Session was cleared in another tab
                window.location.href = '/login.html';
            }
            
            // Check for logout event broadcast
            if (e.key === 'employeeLogoutEvent' && e.newValue) {
                // Another tab initiated logout
                localStorage.removeItem('employeeSession');
                window.location.href = '/login.html';
            }
        });
    }
}

// Export for use in other files
window.EmployeeAuth = EmployeeAuth;