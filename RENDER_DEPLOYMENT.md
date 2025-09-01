# Render Deployment Guide

This guide will help you deploy the QR Inventory Management System on Render.

## Prerequisites

1. A GitHub account with this repository forked/cloned
2. A Render account (free tier works)
3. Supabase database URL (already configured)

## Deployment Steps

### Step 1: Deploy Backend API

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the backend service:
   - **Name**: `qr-inventory-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

5. Add Environment Variables:
   - Click "Environment" tab
   - Add these variables:
     ```
     NODE_ENV=production
     DATABASE_URL=your_supabase_connection_string
     PORT=3000
     FRONTEND_URL=https://your-frontend-url.onrender.com
     ```

6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. Note your backend URL: `https://qr-inventory-backend.onrender.com`

### Step 2: Deploy Frontend

1. In Render Dashboard, click "New +" → "Static Site"
2. Connect the same GitHub repository
3. Configure the frontend:
   - **Name**: `qr-inventory-frontend`
   - **Branch**: `main`
   - **Build Command**: `echo "No build required"`
   - **Publish Directory**: `frontend/public`

4. Click "Create Static Site"
5. Wait for deployment (2-3 minutes)
6. Note your frontend URL: `https://qr-inventory-frontend.onrender.com`

### Step 3: Update Configuration

1. Update `frontend/public/config.js` in your repository:
   ```javascript
   production: 'https://qr-inventory-backend.onrender.com/api'
   ```

2. Update backend environment variable:
   - Go to backend service settings
   - Update `FRONTEND_URL` with your actual frontend URL

3. Commit and push changes:
   ```bash
   git add .
   git commit -m "Update API URL for Render deployment"
   git push
   ```

### Step 4: Verify Deployment

1. Visit your frontend URL
2. Check if the dashboard loads with data
3. Test creating a product
4. Test scanning QR codes

## Alternative: Using render.yaml (Blueprint)

1. This repository includes a `render.yaml` file
2. In Render Dashboard, click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Review the configuration and click "Create"
6. Add environment variables as needed

## Environment Variables

### Backend Required Variables:
- `NODE_ENV`: Set to `production`
- `DATABASE_URL`: Your Supabase PostgreSQL connection string
- `PORT`: Usually 3000 (Render sets this automatically)
- `FRONTEND_URL`: Your frontend URL (for CORS)

### Database URL Format:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## Troubleshooting

### Backend not starting:
- Check logs in Render dashboard
- Verify DATABASE_URL is correct
- Ensure all dependencies are in package.json

### Frontend showing 0 0 0:
- Check browser console for errors
- Verify API URL in config.js
- Check CORS settings in backend

### Database connection issues:
- Verify DATABASE_URL format
- Check if Supabase project is active
- Ensure SSL is enabled (already configured)

### CORS errors:
- Update FRONTEND_URL environment variable
- Clear browser cache
- Check backend CORS configuration

## Free Tier Limitations

- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-50 seconds
- Limited to 750 hours/month (enough for one service running 24/7)

## Production Tips

1. **Custom Domain**: Add custom domains in Render settings
2. **Auto-Deploy**: Enable auto-deploy for automatic updates
3. **Health Checks**: Already configured at `/health` endpoint
4. **Monitoring**: Use Render's built-in metrics
5. **Scaling**: Upgrade to paid tier for always-on services

## Support

- Check Render logs for errors
- Verify all environment variables are set
- Ensure database is accessible
- Test API endpoints directly: `https://your-backend.onrender.com/api/products`