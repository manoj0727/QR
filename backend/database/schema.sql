-- Create database
CREATE DATABASE IF NOT EXISTS qr_inventory;
USE qr_inventory;

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    size VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    description TEXT,
    quantity INT DEFAULT 0,
    min_stock INT DEFAULT 10,
    location VARCHAR(100),
    material VARCHAR(100),
    brand VARCHAR(100),
    image LONGTEXT,
    status ENUM('in-stock', 'low-stock', 'out-of-stock') DEFAULT 'in-stock',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sku (sku),
    INDEX idx_category (category),
    INDEX idx_status (status)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    type ENUM('CREATE', 'INBOUND', 'OUTBOUND', 'UPDATE', 'DELETE') NOT NULL,
    quantity INT NOT NULL,
    notes TEXT,
    created_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_type (type),
    INDEX idx_date (created_at)
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    role VARCHAR(100),
    department VARCHAR(100),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- Tailors table
CREATE TABLE IF NOT EXISTS tailors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    specialization VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
);

-- QR Scans table
CREATE TABLE IF NOT EXISTS qr_scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    scan_type ENUM('check-in', 'check-out', 'inventory', 'verification') NOT NULL,
    scanned_by VARCHAR(100),
    location VARCHAR(255),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_type (scan_type),
    INDEX idx_date (created_at)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_parent (parent_id)
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES 
('Shirt', 'All types of shirts'),
('T-Shirt', 'T-shirts and casual wear'),
('Pants', 'Trousers, jeans, and pants'),
('Jacket', 'Jackets and outerwear'),
('Dress', 'Dresses and gowns'),
('Accessories', 'Fashion accessories'),
('Other', 'Other items')
ON DUPLICATE KEY UPDATE name=name;

-- Sample data for testing (optional)
INSERT INTO products (name, sku, category, size, color, description, quantity, location, material, brand, status) VALUES
('Blue Cotton Shirt', 'SHI-M-BLU-001', 'Shirt', 'M', 'Blue', 'Premium cotton shirt', 50, 'Rack A-12', 'Cotton', 'Brand A', 'in-stock'),
('Black Denim Jeans', 'PAN-L-BLA-001', 'Pants', 'L', 'Black', 'Classic denim jeans', 30, 'Rack B-05', 'Denim', 'Brand B', 'in-stock'),
('Red T-Shirt', 'TSH-S-RED-001', 'T-Shirt', 'S', 'Red', 'Casual t-shirt', 5, 'Rack C-03', 'Cotton', 'Brand A', 'low-stock')
ON DUPLICATE KEY UPDATE sku=sku;