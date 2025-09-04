#!/bin/bash

echo "========================================="
echo "QR Inventory Database Viewer"
echo "========================================="
echo ""

DB_FILE="inventory.db"

if [ ! -f "$DB_FILE" ]; then
    echo "Database file not found at $DB_FILE"
    exit 1
fi

echo "Database Location: $DB_FILE"
echo "Database Size: $(du -h $DB_FILE | cut -f1)"
echo ""

echo "-----------------------------------------"
echo "PRODUCTS ($(sqlite3 $DB_FILE "SELECT COUNT(*) FROM products;") items)"
echo "-----------------------------------------"
sqlite3 $DB_FILE -header -column "SELECT id, product_id, name, type, size, color, quantity FROM products;"
echo ""

echo "-----------------------------------------"
echo "TAILORS ($(sqlite3 $DB_FILE "SELECT COUNT(*) FROM tailors;") registered)"
echo "-----------------------------------------"
sqlite3 $DB_FILE -header -column "SELECT id, tailor_id, name, specialization, status FROM tailors;"
echo ""

echo "-----------------------------------------"
echo "WORK ASSIGNMENTS ($(sqlite3 $DB_FILE "SELECT COUNT(*) FROM work_assignments;") assignments)"
echo "-----------------------------------------"
sqlite3 $DB_FILE -header -column "SELECT id, assignment_id, tailor_id, garment_type, fabric_type, quantity, status FROM work_assignments;"
echo ""

echo "-----------------------------------------"
echo "FABRICS ($(sqlite3 $DB_FILE "SELECT COUNT(*) FROM fabrics;") types)"
echo "-----------------------------------------"
sqlite3 $DB_FILE -header -column "SELECT id, fabric_id, fabric_type, color, quantity_meters FROM fabrics;"
echo ""

echo "-----------------------------------------"
echo "RECENT TRANSACTIONS (Last 10)"
echo "-----------------------------------------"
sqlite3 $DB_FILE -header -column "SELECT id, product_id, action, quantity, performed_by, timestamp FROM transactions ORDER BY timestamp DESC LIMIT 10;"
echo ""

echo "========================================="
echo "To backup database: cp $DB_FILE backup_$(date +%Y%m%d).db"
echo "========================================="