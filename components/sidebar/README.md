# Sidebar Component

A modern, responsive sidebar component built with Tailwind CSS and vanilla JavaScript.

## 📁 File Structure

```
components/
└── sidebar/
    ├── index.js                 # Main entry point
    ├── templates/
    │   └── sidebar.html        # HTML template with Tailwind classes
    ├── styles/
    │   └── sidebar-tailwind.css # Custom styles and animations
    └── scripts/
        └── sidebar-component.js # JavaScript functionality
```

## 🚀 Features

- **User Profile Section** - Display user avatar, name, and role
- **Search Functionality** - Live search filtering for menu items
- **Quick Actions** - Fast access buttons for common tasks
- **Dynamic Counters** - Real-time updates for inventory, transactions, etc.
- **Responsive Design** - Mobile-friendly with collapsible states
- **Keyboard Shortcuts** - Ctrl+K for search, Ctrl+B for toggle
- **Dark Theme** - Built-in dark mode support
- **Tailwind CSS** - Fully customizable with utility classes

## 📦 Installation

### Method 1: Using the Loader (Recommended)

Add to your HTML:

```html
<!-- Add a container for the sidebar -->
<div id="sidebar-container"></div>

<!-- Load the sidebar component -->
<script src="/components/sidebar/index.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        SidebarLoader.loadSidebar('#sidebar-container');
    });
</script>
```

### Method 2: Direct Include

```html
<!-- In your HTML head -->
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="/components/sidebar/styles/sidebar-tailwind.css">

<!-- In your HTML body -->
<div id="sidebar-container"></div>

<!-- Before closing body -->
<script src="/components/sidebar/scripts/sidebar-component.js"></script>
```

### Method 3: As an iFrame

```html
<iframe 
    src="/components/sidebar/templates/sidebar.html" 
    class="sidebar-frame"
    style="width: 256px; height: 100vh; border: none;">
</iframe>
```

## 🎨 Customization

### Tailwind Configuration

The sidebar uses custom Tailwind colors that can be modified in `sidebar.html`:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'sidebar-bg': '#1a1f3a',
                'sidebar-hover': 'rgba(255, 255, 255, 0.1)',
                'sidebar-text': 'rgba(255, 255, 255, 0.9)',
                'sidebar-text-dim': 'rgba(255, 255, 255, 0.7)',
            }
        }
    }
}
```

### CSS Variables

Custom styles can be added in `sidebar-tailwind.css`:

```css
/* Example: Change sidebar width */
.sidebar {
    width: 280px; /* Default: 256px (w-64) */
}

/* Example: Change collapsed width */
.sidebar-collapsed {
    width: 60px !important;
}
```

## 🔧 API

### JavaScript Methods

```javascript
// Access the sidebar component
const sidebar = window.sidebarComponent;

// Toggle sidebar
sidebar.toggleSidebar();

// Navigate to section
sidebar.navigateTo('dashboard');

// Update counters
sidebar.updateCounters();

// Show notification
sidebar.showNotification('Message', 'success');

// Search menu items
sidebar.handleSearch('inventory');
```

### Events

The sidebar emits custom events:

```javascript
// Listen for sidebar toggle
window.addEventListener('sidebarToggled', (event) => {
    console.log('Sidebar collapsed:', event.detail.collapsed);
});

// Listen for navigation
window.addEventListener('sidebarNavigate', (event) => {
    console.log('Navigated to:', event.detail.section);
});
```

## 🎯 Usage Examples

### Update User Profile

```javascript
// Set user data in localStorage
localStorage.setItem('userData', JSON.stringify({
    name: 'John Doe',
    role: 'Administrator',
    avatar: 'JD'
}));

// Reload profile
sidebarComponent.loadUserProfile();
```

### Add Custom Menu Item

```html
<!-- Add to the navigation menu in sidebar.html -->
<li>
    <a href="#" onclick="navigateTo('custom-section')" 
       class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-hover transition-colors group">
        <i class="fas fa-star w-5 text-center text-sidebar-text-dim group-hover:text-white"></i>
        <span class="flex-1 text-sidebar-text-dim group-hover:text-white">Custom Item</span>
    </a>
</li>
```

### Customize Quick Actions

```javascript
// In sidebar-component.js
quickCustomAction() {
    this.navigateTo('custom-section');
    this.showNotification('Custom action triggered', 'info');
}
```

## 📱 Mobile Responsiveness

The sidebar automatically adapts to mobile devices:
- **Desktop**: Fixed sidebar (256px width)
- **Tablet**: Collapsible sidebar (80px collapsed)
- **Mobile**: Overlay sidebar with backdrop

## ⌨️ Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search box
- `Ctrl/Cmd + B` - Toggle sidebar
- `Escape` - Close mobile sidebar

## 🔄 Auto-Update

Counters and notifications automatically update every 30 seconds. To modify:

```javascript
// In sidebar-component.js
startAutoUpdate() {
    // Change interval (in milliseconds)
    setInterval(() => this.updateCounters(), 60000); // 60 seconds
}
```

## 🐛 Troubleshooting

### Sidebar not loading
- Check console for errors
- Verify file paths are correct
- Ensure target container exists

### Styles not applying
- Check if Tailwind CDN is loaded
- Verify custom CSS file is linked
- Clear browser cache

### JavaScript errors
- Ensure sidebar-component.js is loaded after DOM
- Check for conflicting global variables
- Verify API endpoints are accessible

## 📄 License

This component is part of the QR Inventory System.