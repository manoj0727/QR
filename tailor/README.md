# Tailor Management System

A comprehensive tailor management system for the QR Inventory Management System.

## 📁 Folder Structure

```
tailor/
├── assets/
│   ├── css/
│   │   └── tailor-styles.css      # Global styles for tailor system
│   └── js/
│       ├── tailor-auth.js         # Authentication module
│       ├── tailor-dashboard.js    # Dashboard functionality
│       └── tailor-management.js   # Admin management functions
├── pages/
│   └── dashboard.html             # Tailor dashboard page
├── login.html                     # Tailor login page
└── README.md                      # This file
```

## 🎯 Features

### For Tailors:
- **Secure Login** - Username/password authentication
- **Dashboard Overview** - View assignments and notifications
- **Assignment Management** - Accept, start, and complete assignments
- **Notification Center** - Receive updates from management
- **Status Tracking** - Track work progress

### For Administrators:
- **Tailor Registration** - Add new tailors with credentials
- **Assignment Creation** - Assign work to specific tailors
- **Notification System** - Send messages to tailors
- **Performance Monitoring** - Track tailor productivity

## 🚀 Usage

### Admin Access
1. Go to main admin dashboard
2. Navigate to "Tailor Management" section
3. Register new tailors, create assignments, send notifications

### Tailor Access
1. Visit `/tailor/login.html`
2. Login with provided credentials
3. Access dashboard to view assignments and notifications

## 🔗 API Endpoints

- `POST /api/tailor/register` - Register new tailor
- `POST /api/tailor/login` - Tailor authentication
- `GET /api/tailor/all` - Get all tailors
- `POST /api/tailor/assignments` - Create assignment
- `GET /api/tailor/:id/assignments` - Get tailor assignments
- `PUT /api/tailor/assignments/:id/status` - Update assignment status
- `POST /api/tailor/notifications` - Send notification

## 💻 Technical Details

### Authentication
- Session-based authentication using localStorage
- Secure password hashing with bcryptjs
- Protected routes with authentication checks

### Database
- SQLite database with dedicated tailor tables
- Separate tables for tailors, assignments, notifications
- Foreign key relationships for data integrity

### Frontend
- Modular JavaScript architecture
- Responsive CSS design
- Font Awesome icons
- Modern UI components

## 🛠️ Installation & Setup

1. The tailor system is integrated with the main QR Inventory System
2. Database tables are automatically created on server startup
3. No additional installation required

## 🔐 Security Features

- Password hashing with bcryptjs
- SQL injection protection
- Authentication middleware
- Secure session management

## 📱 Mobile Responsive

- Optimized for mobile devices
- Touch-friendly interface
- Responsive grid layouts
- Mobile-first design

## 🎨 Customization

### Styling
- Edit `assets/css/tailor-styles.css` for custom styling
- CSS variables for easy theme customization
- Modular CSS architecture

### Functionality
- Extend classes in JavaScript modules
- Add new API endpoints as needed
- Database schema can be extended

## 🐛 Troubleshooting

### Common Issues:
1. **Login Issues**: Check database connection and credentials
2. **Assignments Not Loading**: Verify API endpoints are working
3. **Styling Issues**: Check CSS file paths and inclusion

### Debug Mode:
- Check browser console for JavaScript errors
- Verify network requests in browser dev tools
- Check server logs for backend issues

## 📝 Future Enhancements

- [ ] Real-time notifications with WebSocket
- [ ] File upload for assignment attachments
- [ ] Advanced reporting and analytics
- [ ] Mobile app integration
- [ ] Multi-language support
- [ ] Advanced role-based permissions

## 📄 License

Part of the QR Inventory Management System.