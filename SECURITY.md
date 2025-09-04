# Security Guidelines

## 🔒 Important Security Notes

### Never Commit These Files:
- `.env` files (contains database credentials)
- `*.pem`, `*.key`, `*.crt` (SSL certificates)
- `*.db`, `*.sqlite` (database files with user data)
- Any backup files (`*.backup`, `*.bak`)

### Default Credentials (CHANGE IN PRODUCTION!)
```
Username: admin
Password: admin123
```

## First-Time Setup

1. **Copy environment file:**
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Update .env with your credentials** (if using external database)

3. **SSL Certificates:**
   - Auto-generated on first run for HTTPS
   - Accept the self-signed certificate warning in browser

## Security Features

### Authentication & Authorization
- ✅ Session-based authentication
- ✅ Password hashing (SHA256)
- ✅ Role-based access control (Admin, Manager, Employee)
- ✅ Session expiry (24 hours)
- ✅ Activity logging for audit trail

### Best Practices Implemented
- ✅ HTTPS enforced for camera access
- ✅ CORS protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ Input validation
- ✅ Secure session management

## Production Deployment

### Before deploying to production:

1. **Change default admin password immediately**
2. **Use strong, unique passwords**
3. **Set up proper SSL certificates** (not self-signed)
4. **Use PostgreSQL or Supabase** instead of SQLite
5. **Enable proper backup strategy**
6. **Set NODE_ENV=production**
7. **Review and update CORS settings**
8. **Implement rate limiting**
9. **Set up monitoring and logging**
10. **Regular security updates**

## User Management

### Creating New Users:
1. Login as admin
2. Go to Admin Portal
3. Click "Add New User"
4. Assign appropriate role:
   - **Admin**: Full system access
   - **Manager**: Admin portal + inventory
   - **Employee**: Inventory access only

### Password Policy Recommendations:
- Minimum 8 characters
- Mix of upper/lowercase letters
- Include numbers and special characters
- Regular password rotation (90 days)
- No password reuse

## Data Protection

### Database Security:
- SQLite database is stored locally
- For production, use encrypted database connections
- Regular backups recommended
- Implement data retention policies

### Activity Logging:
- All user actions are logged
- Includes: login/logout, CRUD operations
- IP addresses tracked for security
- Review logs regularly for suspicious activity

## Incident Response

If you suspect a security breach:
1. Change all passwords immediately
2. Review activity logs
3. Deactivate suspicious user accounts
4. Backup current data
5. Document the incident
6. Update security measures

## Updates & Maintenance

- Keep all dependencies updated
- Regular security audits
- Monitor for vulnerabilities
- Test backup restoration procedures

## Contact

For security concerns or vulnerabilities, please create a private issue or contact the repository maintainer directly.

---
⚠️ **Remember**: Security is everyone's responsibility. Follow these guidelines to keep the system and data safe.