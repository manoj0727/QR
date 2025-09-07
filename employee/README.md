# Employee Management System

A comprehensive employee management system for the QR Inventory Management System.

## 📁 Folder Structure

```
employee/
├── assets/
│   ├── css/
│   │   └── employee-styles.css     # Global styles for employee system
│   └── js/
│       ├── employee-auth.js        # Authentication module
│       └── employee-dashboard.js   # Dashboard functionality
├── pages/
│   └── dashboard.html              # Employee dashboard page
├── login.html                      # Employee login page
└── README.md                       # This file
```

## 🎯 Features

### For Employees:
- **Secure Login** - Username/password authentication
- **Dashboard Overview** - View statistics and notifications
- **QR Code Creation** - Create QR codes for new products
- **QR Code Scanning** - Scan QR codes to update inventory
- **Inventory Viewing** - Browse inventory database (read-only)
- **Notification Center** - Receive messages from administrators
- **Activity Tracking** - All actions are logged automatically

### For Administrators:
- **Employee Registration** - Add new employees with credentials
- **Notification System** - Send messages to employees
- **Activity Monitoring** - Track employee productivity
- **Performance Analytics** - View employee statistics

## 🚀 Usage

### Admin Access
1. Go to main admin dashboard
2. Navigate to "Employee Management" section
3. Register new employees, send notifications, view analytics

### Employee Access
1. Visit `/employee/login.html`
2. Login with provided credentials
3. Access dashboard to manage QR codes and view inventory

## 🔗 API Endpoints

- `POST /api/employee/register` - Register new employee
- `POST /api/employee/login` - Employee authentication
- `GET /api/employee/all` - Get all employees
- `POST /api/employee/notifications` - Send notification
- `GET /api/employee/:id/notifications` - Get employee notifications
- `POST /api/employee/activities` - Record activity
- `GET /api/employee/:id/activities` - Get employee activities
- `POST /api/employee/qr/create` - Create QR code
- `POST /api/employee/qr/scan` - Scan QR code
- `GET /api/employee/inventory/:id` - View inventory (read-only)
- `GET /api/employee/stats/:id` - Get employee statistics

## 💻 Technical Details

### Authentication
- Session-based authentication using localStorage
- Secure password hashing with bcryptjs
- Protected routes with authentication checks

### Database
- SQLite database with dedicated employee tables
- Separate tables for employees, notifications, activities, performance
- Foreign key relationships for data integrity

### Frontend
- Modular JavaScript architecture
- Responsive CSS design
- Font Awesome icons
- Modern UI components

## 🛠️ Installation & Setup

1. The employee system is integrated with the main QR Inventory System
2. Database tables are automatically created on server startup
3. No additional installation required

## 🔐 Security Features

- Password hashing with bcryptjs
- SQL injection protection
- Authentication middleware
- Secure session management
- Activity logging for audit trails

## 📱 Mobile Responsive

- Optimized for mobile devices
- Touch-friendly interface
- Responsive grid layouts
- Mobile-first design

## 🎨 Customization

### Styling
- Edit `assets/css/employee-styles.css` for custom styling
- CSS variables for easy theme customization
- Modular CSS architecture

### Functionality
- Extend classes in JavaScript modules
- Add new API endpoints as needed
- Database schema can be extended

## 🐛 Troubleshooting

### Common Issues:
1. **Login Issues**: Check database connection and credentials
2. **QR Operations Not Working**: Verify API endpoints are working
3. **Styling Issues**: Check CSS file paths and inclusion

### Debug Mode:
- Check browser console for JavaScript errors
- Verify network requests in browser dev tools
- Check server logs for backend issues

## 📝 Future Enhancements

- [ ] Advanced QR code creation with custom data
- [ ] Barcode scanning support
- [ ] Bulk inventory operations
- [ ] Advanced reporting and analytics
- [ ] Mobile app integration
- [ ] Real-time notifications with WebSocket
- [ ] Multi-language support
- [ ] Advanced role-based permissions

## 🔄 Integration

### With Main System:
- Shared authentication system
- Integrated inventory database
- Unified notification system
- Consistent UI/UX design

### API Integration:
- RESTful API design
- JSON data format
- Error handling and validation
- Activity logging and tracking

## 📄 License

Part of the QR Inventory Management System.