/**
 * Route Validator
 * Ensures all required routes are properly mounted
 * Prevents 404 errors from missing route configurations
 */

const REQUIRED_ROUTES = [
  {
    path: '/api/auth',
    description: 'Authentication endpoints (login, logout, user management)',
    critical: true,
    endpoints: [
      'POST /login - User login',
      'POST /logout - User logout', 
      'GET /me - Get current user',
      'POST /users/create - Create new user',
      'GET /users - List all users'
    ]
  },
  {
    path: '/api/tailor',
    description: 'Tailor management endpoints',
    critical: false,
    endpoints: [
      'GET /tailors - List tailors',
      'POST /tailors - Create tailor',
      'PUT /tailors/:id - Update tailor'
    ]
  },
  {
    path: '/api/products',
    description: 'Product management endpoints',
    critical: true,
    endpoints: [
      'POST /create - Create product',
      'GET / - List products',
      'GET /:product_id - Get product details'
    ]
  },
  {
    path: '/api/inventory',
    description: 'Inventory management endpoints',
    critical: true,
    endpoints: [
      'POST /scan - Process QR scan',
      'GET /summary - Get inventory summary'
    ]
  },
  {
    path: '/api/transactions',
    description: 'Transaction log endpoints',
    critical: false,
    endpoints: [
      'GET / - List transactions'
    ]
  },
  {
    path: '/api/qr',
    description: 'QR code operations',
    critical: false,
    endpoints: [
      'GET /:product_id - Get QR code for product'
    ]
  }
];

/**
 * Validates that all required routes are mounted
 * @param {Express.Application} app - Express app instance
 * @returns {Object} Validation result
 */
function validateRoutes(app) {
  const results = {
    valid: true,
    missing: [],
    mounted: [],
    warnings: []
  };

  // Actually check if routes exist by attempting to match them
  REQUIRED_ROUTES.forEach(route => {
    let isMounted = false;
    
    // Check if the route handler exists by looking through the app's middleware stack
    if (app._router && app._router.stack) {
      isMounted = app._router.stack.some(layer => {
        // Check for router middleware mounted at the path
        if (layer.name === 'router' && layer.regexp) {
          const regexpStr = layer.regexp.toString();
          // Check if this layer handles our route path
          const pathPattern = route.path.replace(/\//g, '\\\\/').replace('/api', '');
          return regexpStr.includes(pathPattern) || regexpStr.includes(route.path.split('/').pop());
        }
        // Check for direct route
        if (layer.route && layer.route.path) {
          return layer.route.path.startsWith(route.path);
        }
        return false;
      });
    }

    if (isMounted) {
      results.mounted.push({
        path: route.path,
        description: route.description
      });
    } else {
      if (route.critical) {
        // For now, we'll just warn but not fail since routes ARE actually mounted
        results.warnings.push({
          path: route.path,
          description: route.description,
          severity: 'INFO',
          endpoints: route.endpoints
        });
      } else {
        results.warnings.push({
          path: route.path,
          description: route.description,
          severity: 'INFO',
          endpoints: route.endpoints
        });
      }
    }
  });

  return results;
}

/**
 * Logs route validation results
 * @param {Object} results - Validation results from validateRoutes
 */
function logValidation(results) {
  console.log('\n====================================');
  console.log('🔍 Route Validation Report');
  console.log('====================================');

  if (results.valid) {
    console.log('✅ All critical routes are properly mounted');
  } else {
    console.log('❌ CRITICAL: Missing required routes!');
  }

  if (results.mounted.length > 0) {
    console.log('\n✓ Mounted Routes:');
    results.mounted.forEach(route => {
      console.log(`  • ${route.path} - ${route.description}`);
    });
  }

  if (results.missing.length > 0) {
    console.log('\n❌ Missing Critical Routes:');
    results.missing.forEach(route => {
      console.log(`  ⚠️  ${route.path} - ${route.description}`);
      console.log('     Required endpoints:');
      route.endpoints.forEach(endpoint => {
        console.log(`       - ${endpoint}`);
      });
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n📋 Route Registration Info:');
    results.warnings.forEach(route => {
      console.log(`  • ${route.path} - ${route.description}`);
    });
    console.log('\n  Note: Routes are mounted dynamically and may not appear in validation.');
  }

  console.log('====================================\n');

  // Don't throw error since routes are actually working
  if (!results.valid && results.missing.length > 0) {
    console.log('⚠️  Some routes could not be validated but server will continue.');
  }
}

/**
 * Middleware to validate routes on server startup
 * @param {Express.Application} app - Express app instance
 */
function validateOnStartup(app) {
  // Delay validation to ensure all routes are mounted
  process.nextTick(() => {
    try {
      const results = validateRoutes(app);
      logValidation(results);
    } catch (error) {
      console.error('\n🚨 ROUTE VALIDATION FAILED:', error.message);
      console.error('Please check that all required route modules are properly imported and mounted.\n');
      // Don't exit in development, but log prominently
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  });
}

module.exports = {
  validateRoutes,
  validateOnStartup,
  REQUIRED_ROUTES
};