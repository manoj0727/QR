// Tailor Authentication Module

class TailorAuth {
    constructor() {
        this.baseURL = '/api/tailor';
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
                // Store tailor info in localStorage
                localStorage.setItem('tailorSession', JSON.stringify(result.tailor));
                
                this.showAlert('Login successful! Redirecting...', 'success');
                
                // Redirect to tailor dashboard
                setTimeout(() => {
                    window.location.href = '/tailor/pages/dashboard.html';
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

    // Check if tailor is authenticated
    isAuthenticated() {
        const tailorSession = localStorage.getItem('tailorSession');
        if (!tailorSession) return null;
        
        try {
            return JSON.parse(tailorSession);
        } catch (error) {
            console.error('Error parsing tailor session:', error);
            this.logout();
            return null;
        }
    }

    // Logout tailor
    logout() {
        // Clear all session data
        sessionStorage.clear();
        localStorage.removeItem('tailorSession');
        localStorage.removeItem('rememberedUser');
        
        // Redirect to unified login page
        window.location.href = '../../unified-login.html';
    }

    // Require authentication for protected pages
    requireAuth() {
        const tailor = this.isAuthenticated();
        if (!tailor) {
            window.location.href = '../../unified-login.html';
            return null;
        }
        return tailor;
    }
}

// Export for use in other files
window.TailorAuth = TailorAuth;