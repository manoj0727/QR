# 🚀 Deploy to Render - Step by Step Guide

## Prerequisites
1. GitHub account (to host your code)
2. Render account (free at render.com)

## Step 1: Push Code to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Ready for Render deployment"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/QR.git
git push -u origin main
```

## Step 2: Deploy Backend on Render

### A. Create Web Service
1. Go to [https://render.com](https://render.com)
2. Sign up/Login (use GitHub for easy connection)
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository

### B. Configure Backend Service
- **Name**: `qr-inventory-backend`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: Free

### C. Add PostgreSQL Database
1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `qr-inventory-db`
   - **Database**: `qr_inventory`
   - **User**: Leave default
   - **Region**: Same as your web service
   - **PostgreSQL Version**: 15
   - **Instance Type**: Free

3. After creation, go to database dashboard and copy the **Internal Database URL**

### D. Connect Database to Backend
1. Go to your backend service in Render
2. Click **"Environment"** tab
3. Add environment variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (paste the Internal Database URL from step C.3)

4. Click **"Save Changes"** - This will trigger a redeploy

## Step 3: Deploy Frontend

### Option A: Deploy Frontend on Render (Recommended)
1. Click **"New +"** → **"Static Site"**
2. Connect same GitHub repository
3. Configure:
   - **Name**: `qr-inventory-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: (leave empty)
   - **Publish Directory**: `public`

4. After deployment, get your frontend URL

### Option B: Deploy Frontend on Netlify
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the `frontend` folder
3. Get your Netlify URL

## Step 4: Update Frontend Configuration

1. Edit `frontend/public/config.js`:
```javascript
const API_CONFIG = {
  development: 'http://localhost:3000/api',
  production: 'https://qr-inventory-backend.onrender.com/api' // Your Render backend URL
};
```

2. Commit and push changes:
```bash
git add .
git commit -m "Update API endpoint for production"
git push
```

## Step 5: Verify Deployment

### Check Backend:
- Visit: `https://qr-inventory-backend.onrender.com/api/products`
- Should return JSON array (might be empty initially)

### Check Frontend:
- Visit your frontend URL
- Should load the application
- Test creating a product and scanning QR

## 🎉 Your App is Live!

### URLs:
- **Backend API**: `https://qr-inventory-backend.onrender.com`
- **Frontend**: `https://qr-inventory-frontend.onrender.com`
- **Database**: Managed by Render (PostgreSQL)

## Database Management on Render

### View Your Data:
1. Go to Render Dashboard
2. Click on your PostgreSQL database
3. Click **"Connect"** button
4. Use **PSQL Command** to connect via terminal, or
5. Use **External Connection String** with TablePlus/pgAdmin

### Run SQL Queries:
```bash
# Connect using Render's provided command
psql "postgresql://user:password@host/database"

# View tables
\dt

# Query data
SELECT * FROM products;
SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 10;
```

## Troubleshooting

### "Application Error" or Backend Not Working:
1. Check Render logs: Dashboard → Your Service → Logs
2. Verify DATABASE_URL is set correctly
3. Make sure all dependencies are in package.json

### Frontend Can't Connect to Backend:
1. Verify backend URL in `config.js`
2. Check CORS is enabled in backend
3. Make sure backend is deployed and running

### Database Issues:
1. PostgreSQL on Render takes 1-2 minutes to provision
2. Free tier may sleep after inactivity (first request will be slow)
3. Check connection string is correct

## Monitoring

### View Metrics:
- Render Dashboard shows:
  - Request count
  - Response times
  - Error rates
  - Database connections

### Logs:
- Real-time logs in Render Dashboard
- Filter by service (backend/database)

## Costs

### Free Tier Limits:
- **Web Service**: 750 hours/month (enough for 1 service 24/7)
- **PostgreSQL**: 1GB storage, 100 connections
- **Static Site**: Unlimited
- **Bandwidth**: 100GB/month

### When to Upgrade:
- Need better performance (no cold starts)
- More than 1GB database storage
- Custom domains with SSL
- Auto-scaling

## Next Steps

1. **Custom Domain**: 
   - Add your domain in Render settings
   - Update DNS records

2. **Backup Database**:
   - Render provides daily backups on paid plans
   - Manual backup: `pg_dump` command

3. **Monitor Performance**:
   - Set up alerts for errors
   - Monitor database size

4. **Security**:
   - Enable 2FA on Render account
   - Rotate database credentials periodically
   - Use environment variables for all secrets

## Quick Commands Reference

```bash
# View logs
render logs qr-inventory-backend

# Connect to database
psql "your-database-url"

# Backup database
pg_dump "your-database-url" > backup.sql

# Restart service
# Go to Render Dashboard → Manual Deploy

# Update code
git push origin main
# Render auto-deploys on push!
```

## Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Status Page**: https://status.render.com

---

**Remember**: 
- First deployment takes 5-10 minutes
- Free tier services sleep after 15 min of inactivity
- First request after sleep takes ~30 seconds (cold start)
- Database URL is provided automatically by Render