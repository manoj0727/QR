#!/bin/bash

echo "========================================="
echo "Starting QR Inventory Local Server"
echo "========================================="

cd backend

# Get local IP
LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)

echo ""
echo "Starting server..."
node server.js &

sleep 2

echo ""
echo "========================================="
echo "Server is now running!"
echo "========================================="
echo ""
echo "Access the application from:"
echo "  - This computer: http://localhost:3000"
echo "  - Other devices on same network: http://$LOCAL_IP:3000"
echo ""
echo "Share this IP with your team members: $LOCAL_IP"
echo ""
echo "All data is stored locally in: backend/inventory.db"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================="

wait