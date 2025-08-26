# Deployment Guide for QR Inventory System

Since SQLite doesn't work on Netlify (static hosting only), here's how to deploy:

## Option 1: Render (Free Tier) - RECOMMENDED

### Backend Deployment (Render):
1. Create account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: qr-inventory-backend
   - **Root Directory**: backend
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add PostgreSQL database (free tier)
6. Copy your backend URL (e.g., `https://qr-inventory-backend.onrender.com`)

### Frontend Deployment (Netlify):
1. Update `frontend/public/config.js`:
   ```javascript
   production: 'https://qr-inventory-backend.onrender.com/api'
   ```
2. Go to https://netlify.com
3. Drag & drop the `frontend` folder
4. Your frontend will be live!

## Option 2: Railway (Simple but Paid)

### Deploy Everything:
1. Go to https://railway.app
2. Click "Start New Project"
3. Select "Deploy from GitHub repo"
4. Railway will:
   - Detect Node.js backend
   - Provision PostgreSQL automatically
   - Deploy everything
5. Add environment variable: `PORT=3000`

## Option 3: Vercel + Supabase

### Backend (Vercel Functions):
1. Convert Express to Vercel Functions
2. Deploy backend to Vercel

### Database (Supabase):
1. Create free PostgreSQL at https://supabase.com
2. Get connection string
3. Update backend to use Supabase

## Option 4: Keep SQLite - Use VPS

### Deploy to a VPS (DigitalOcean, Linode):
- $5/month for complete control
- SQLite works perfectly
- Use PM2 for process management
- Nginx for reverse proxy

## Local SQLite to Cloud PostgreSQL Migration

To migrate your SQLite data to PostgreSQL:

```bash
# 1. Export from SQLite
sqlite3 inventory.db .dump > backup.sql

# 2. Convert SQLite to PostgreSQL syntax
# - Change AUTOINCREMENT to SERIAL
# - Change DATETIME to TIMESTAMP
# - Remove SQLite specific commands

# 3. Import to PostgreSQL
psql DATABASE_URL < backup_converted.sql
```

## Environment Variables Needed

```env
# Backend (.env)
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Frontend (update config.js)
API_URL=https://your-backend.onrender.com/api
```

## Quick Start with Render (Easiest)

1. **Fork/Push to GitHub**
2. **Deploy Backend to Render:**
   - New Web Service from GitHub
   - Auto-deploys on push
   - Free PostgreSQL database
3. **Deploy Frontend to Netlify:**
   - Drag & drop frontend folder
   - Update API URL in config.js
4. **Done!** 🎉

## Why This Setup?

- **Netlify**: Perfect for static frontend (free, fast CDN)
- **Render/Railway**: Handles backend + database (free tier available)
- **PostgreSQL**: Cloud-compatible alternative to SQLite
- **Separation**: Frontend and backend can scale independently

## Cost Comparison

| Service | Monthly Cost | Features |
|---------|-------------|----------|
| Render | FREE | 750 hrs/month, PostgreSQL included |
| Railway | ~$5 | Better performance, easier setup |
| Netlify | FREE | Unlimited for static sites |
| Vercel | FREE | Serverless functions + frontend |
| VPS | $5+ | Full control, keep SQLite |

## Notes

- SQLite only works where you have file system access
- Cloud platforms need cloud databases (PostgreSQL, MySQL)
- Free tiers may have cold starts (slower first request)
- For production, consider paid tiers for better performance