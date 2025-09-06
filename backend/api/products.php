<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Database configuration
$host = 'localhost';
$dbname = 'qr_inventory';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die(json_encode(['error' => 'Connection failed: ' . $e->getMessage()]));
}

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['action']) ? $_GET['action'] : '';

// Handle different endpoints
switch($method) {
    case 'POST':
        if ($path === 'create') {
            createProduct();
        }
        break;
    case 'GET':
        if ($path === 'list') {
            getProducts();
        } elseif ($path === 'get' && isset($_GET['id'])) {
            getProduct($_GET['id']);
        }
        break;
    case 'PUT':
        if ($path === 'update' && isset($_GET['id'])) {
            updateProduct($_GET['id']);
        }
        break;
    case 'DELETE':
        if ($path === 'delete' && isset($_GET['id'])) {
            deleteProduct($_GET['id']);
        }
        break;
}

// Create new product
function createProduct() {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $sql = "INSERT INTO products (
            name, sku, category, size, color, description, 
            quantity, min_stock, location, material, brand, 
            image, status, created_at, updated_at
        ) VALUES (
            :name, :sku, :category, :size, :color, :description,
            :quantity, :min_stock, :location, :material, :brand,
            :image, :status, :created_at, :updated_at
        )";
        
        $stmt = $pdo->prepare($sql);
        
        $stmt->execute([
            ':name' => $data['name'],
            ':sku' => $data['sku'],
            ':category' => $data['category'],
            ':size' => $data['size'],
            ':color' => $data['color'],
            ':description' => $data['description'] ?? '',
            ':quantity' => $data['quantity'],
            ':min_stock' => $data['minStock'] ?? 10,
            ':location' => $data['location'] ?? '',
            ':material' => $data['material'] ?? '',
            ':brand' => $data['brand'] ?? '',
            ':image' => $data['image'] ?? null,
            ':status' => $data['status'],
            ':created_at' => $data['createdAt'],
            ':updated_at' => $data['updatedAt']
        ]);
        
        $productId = $pdo->lastInsertId();
        
        // Log the transaction
        logTransaction($productId, 'CREATE', $data['quantity'], 'Product created');
        
        echo json_encode([
            'success' => true,
            'id' => $productId,
            'message' => 'Product created successfully'
        ]);
        
    } catch(PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to create product: ' . $e->getMessage()
        ]);
    }
}

// Get all products
function getProducts() {
    global $pdo;
    
    try {
        $sql = "SELECT * FROM products ORDER BY created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $products
        ]);
        
    } catch(PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch products: ' . $e->getMessage()
        ]);
    }
}

// Get single product
function getProduct($id) {
    global $pdo;
    
    try {
        $sql = "SELECT * FROM products WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($product) {
            echo json_encode([
                'success' => true,
                'data' => $product
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'Product not found'
            ]);
        }
        
    } catch(PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch product: ' . $e->getMessage()
        ]);
    }
}

// Update product
function updateProduct($id) {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $sql = "UPDATE products SET 
            name = :name,
            category = :category,
            size = :size,
            color = :color,
            description = :description,
            quantity = :quantity,
            min_stock = :min_stock,
            location = :location,
            material = :material,
            brand = :brand,
            status = :status,
            updated_at = :updated_at
            WHERE id = :id";
        
        $stmt = $pdo->prepare($sql);
        
        $stmt->execute([
            ':id' => $id,
            ':name' => $data['name'],
            ':category' => $data['category'],
            ':size' => $data['size'],
            ':color' => $data['color'],
            ':description' => $data['description'] ?? '',
            ':quantity' => $data['quantity'],
            ':min_stock' => $data['minStock'] ?? 10,
            ':location' => $data['location'] ?? '',
            ':material' => $data['material'] ?? '',
            ':brand' => $data['brand'] ?? '',
            ':status' => $data['status'],
            ':updated_at' => date('Y-m-d H:i:s')
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Product updated successfully'
        ]);
        
    } catch(PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to update product: ' . $e->getMessage()
        ]);
    }
}

// Delete product
function deleteProduct($id) {
    global $pdo;
    
    try {
        $sql = "DELETE FROM products WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Product deleted successfully'
        ]);
        
    } catch(PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to delete product: ' . $e->getMessage()
        ]);
    }
}

// Log transaction
function logTransaction($productId, $type, $quantity, $notes = '') {
    global $pdo;
    
    try {
        $sql = "INSERT INTO transactions (product_id, type, quantity, notes, created_at) 
                VALUES (:product_id, :type, :quantity, :notes, :created_at)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':product_id' => $productId,
            ':type' => $type,
            ':quantity' => $quantity,
            ':notes' => $notes,
            ':created_at' => date('Y-m-d H:i:s')
        ]);
        
    } catch(PDOException $e) {
        // Log error but don't stop the main operation
        error_log('Failed to log transaction: ' . $e->getMessage());
    }
}
?>