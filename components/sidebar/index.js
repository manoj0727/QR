/**
 * Sidebar Component Index
 * Main entry point for the sidebar component
 */

// Import paths
const SIDEBAR_PATHS = {
    template: './templates/sidebar.html',
    styles: './styles/sidebar-tailwind.css',
    script: './scripts/sidebar-component.js'
};

/**
 * Load sidebar component into a target element
 * @param {string} targetSelector - CSS selector for the target element
 */
async function loadSidebar(targetSelector = '#sidebar-container') {
    try {
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.error('Sidebar target element not found:', targetSelector);
            return;
        }

        // Load the sidebar HTML
        const response = await fetch('/components/sidebar/templates/sidebar.html');
        const html = await response.text();
        
        // Extract just the sidebar content (not the full HTML document)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const sidebarContent = doc.querySelector('aside');
        
        if (sidebarContent) {
            target.innerHTML = sidebarContent.outerHTML;
            
            // Load styles if not already loaded
            if (!document.querySelector('link[href*="sidebar-tailwind.css"]')) {
                const styleLink = document.createElement('link');
                styleLink.rel = 'stylesheet';
                styleLink.href = '/components/sidebar/styles/sidebar-tailwind.css';
                document.head.appendChild(styleLink);
            }
            
            // Load Tailwind if not already loaded
            if (!document.querySelector('script[src*="tailwindcss"]')) {
                const tailwindScript = document.createElement('script');
                tailwindScript.src = 'https://cdn.tailwindcss.com';
                document.head.appendChild(tailwindScript);
            }
            
            // Load sidebar script
            const script = document.createElement('script');
            script.src = '/components/sidebar/scripts/sidebar-component.js';
            script.onload = () => {
                console.log('Sidebar component loaded successfully');
            };
            document.body.appendChild(script);
        }
    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadSidebar, SIDEBAR_PATHS };
}

// Make available globally
window.SidebarLoader = { loadSidebar, SIDEBAR_PATHS };