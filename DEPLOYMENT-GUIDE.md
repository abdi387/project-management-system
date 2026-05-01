# FYP Management System - Free Deployment Guide

This guide provides step-by-step instructions to deploy your FYP Management System completely **FREE** using:
- **Frontend**: Vercel (React + Vite)
- **Backend**: Railway (Node.js + Express)
- **Database**: Railway (MySQL)

---

## Prerequisites

Before starting, gather these:
1. A **GitHub** account
2. A **Vercel** account (sign up with GitHub)
3. A **Railway** account (sign up with GitHub)
4. A **Gmail** account (for sending emails)

---

## Phase 1: Prepare Your Code for Deployment

### Step 1.1: Update Backend for Production

The backend needs a few changes to work on Railway:

1. Open `backend/server.js` and update CORS:
```javascript
// Replace the existing cors middleware with:
app.use(cors({
  origin: ['https://your-vercel-app.vercel.app'], // Your Vercel URL
  credentials: true,
  optionsSuccessStatus: 200
}));
```

2. Create/edit `backend/.env` - You'll fill real values later:
```
# Database (Railway)
DB_HOST=containers.railway.com
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=fyp_management
DB_PORT=3306

# Server
PORT=5001
NODE_ENV=production

# JWT
JWT_SECRET=generate-a-random-secret-key

# Email (Gmail App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL for CORS
FRONTEND_URL=https://your-app.vercel.app
```

### Step 1.2: Update Frontend for Production

1. Open `src/services/apiConfig.js` and update:
```javascript
// Replace with your Railway backend URL
const BASE_URL = 'https://your-backend-name.railway.app/api';
```

2. Also update `src/utils/fileUrlUtils.js`:
```javascript
const API_HOST = 'https://your-backend-name.railway.app';
```

---

## Phase 2: Deploy MySQL Database on Railway (FREE)

### Step 2.1: Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Click **"Login with GitHub"**
3. Authorize Railway to access your GitHub account

### Step 2.2: Create MySQL Database
1. In Railway dashboard, click **"+ New"** → **"Database"** → **"MySQL"**
2. Railway will automatically create a MySQL database
3. Wait for it to provision (usually takes 30-60 seconds)
4. Click on the **"MySQL"** service to see details

### Step 2.3: Get Database Credentials
1. In the MySQL service, click on **"Variables"** tab
2. You'll see these generated variables:
   - `MYSQL_PASSWORD`
   - `MYSQL_ROOT_PASSWORD`
   - `MYSQL_DATABASE`
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`

3. Copy these values - you'll need them for your backend `.env`

### Step 2.4: Note Your Railway MySQL Host
1. Click on the **"Connect"** tab
2. Look for the connection string - it will be something like:
   ```
   mysql://root:password@containers.railway.com:port/database
   ```
3. Note the hostname (like `containers.railway.com`) and port

---

## Phase 3: Deploy Backend on Railway (FREE)

### Step 3.1: Push Code to GitHub

1. Create a new repository on GitHub:
   - Go to [GitHub](https://github.com)
   - Click **"+"** → **"New repository"**
   - Name: `fyp-backend`
   - Make it **Public** (free)
   - Click **"Create repository"**

2. Push your backend folder to GitHub:
```bash
# In your project folder
cd backend

# Initialize git if not already initialized
git init

# Add all files
git add -A

# Commit
git commit -m "Initial commit - Backend"

# Add your GitHub repository
git remote add origin https://github.com/yourusername/fyp-backend.git

# Push
git push -u origin master
```

### Step 3.2: Deploy Backend to Railway

1. Go to Railway dashboard
2. Click **"+ New"** → **"GitHub Repo"**
3. Select your `fyp-backend` repository
4. Click **"Deploy Now"**

### Step 3.3: Configure Environment Variables

1. In Railway, go to your backend service
2. Click on **"Variables"** tab
3. Add these variables:

| Variable | Value |
|----------|-------|
| DB_HOST | Your MySQL host from Phase 2.3 |
| DB_USER | `root` |
| DB_PASSWORD | Your MySQL password from Phase 2.3 |
| DB_NAME | Your MySQL database name from Phase 2.3 |
| DB_PORT | `3306` |
| PORT | `5001` |
| NODE_ENV | `production` |
| JWT_SECRET | Generate a random string (use a password generator, 32+ chars) |
| EMAIL_HOST | `smtp.gmail.com` |
| EMAIL_PORT | `587` |
| EMAIL_USER | Your Gmail address |
| EMAIL_PASS | Your Gmail App Password (16 chars, generate in Phase 4) |
| FRONTEND_URL | Your future Vercel URL |
| CACHE_ENABLED | `false` |

4. Click **"Add"** after each variable
5. Click **"Deploy"** to trigger a new deployment

### Step 3.4: Get Your Backend URL

1. Once deployed, go to the **"Settings"** → **"Domains"**
2. You'll see your backend URL like: `https://fyp-backend-name.railway.app`
3. Copy this URL - you'll need it for the frontend

---

## Phase 4: Configure Gmail for Emails

### Step 4.1: Enable 2-Factor Authentication
1. Go to [Google Account](https://myaccount.google.com)
2. Click **"Security"**
3. Under **"How you sign in to Google"**, turn on **"2-Step Verification"**

### Step 4.2: Generate App Password
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. If prompted, sign in again
3. In the **"Select app"** dropdown, choose **"Other (Custom name)"**
4. Enter a name like: `FYP Management System`
5. Click **"Generate"**
6. You'll see a 16-character password - this is your `EMAIL_PASS`
7. **Copy and save this password** - it's only shown once!

---

## Phase 5: Deploy Frontend on Vercel (FREE)

### Step 5.1: Push Frontend to GitHub

1. Create a new repository on GitHub:
   - Go to [GitHub](https://github.com)
   - Click **"+"** → **"New repository"**
   - Name: `fyp-frontend`
   - Make it **Public**
   - Click **"Create repository"**

2. Push your frontend (root folder, excluding node_modules, etc.) to GitHub:
```bash
# In your project root folder (not backend)
# Create .gitignore if needed to exclude node_modules, etc.

git init
git add -A
git commit -m "Initial commit - Frontend"
git remote add origin https://github.com/yourusername/fyp-frontend.git
git push -u origin master
```

### Step 5.2: Deploy Frontend to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Under **"Import Git Repository"**, find your `fyp-frontend`
4. Click **"Import"**

### Step 5.3: Configure Environment Variables

1. In Vercel project settings, go to **"Environment Variables"**
2. Add this variable:

| Variable | Value |
|----------|-------|
| VITE_API_URL | Your Railway backend URL (e.g., `https://fyp-backend.railway.app`) |

3. Click **"Deploy"**

### Step 5.4: Get Your Frontend URL

1. Once deployed, Vercel will show your live URL
2. It will be something like: `https://fyp-frontend.vercel.app`
3. Copy this URL

---

## Phase 6: Connect Everything

### Step 6.1: Update Backend CORS

1. Go back to Railway → your backend service
2. Update the `FRONTEND_URL` variable to your Vercel frontend URL
3. In `backend/server.js`, update CORS:
```javascript
app.use(cors({
  origin: ['https://your-frontend.vercel.app'],
  credentials: true,
  optionsSuccessStatus: 200
}));
```
4. Redeploy

### Step 6.2: Test the Connection

1. Open your Vercel frontend URL
2. Try to log in - the frontend should connect to the Railway backend

---

## Phase 7: Create Admin User

Once everything is connected, create your admin user:

### Option A: Using Railway Shell

1. In Railway → Backend service → **"Shell"** tab
2. Run:
```bash
npm run create-admin
```

### Option B: Using Local Development

1. Update your local `.env` with the Railway database credentials
2. Run locally:
```bash
cd backend
npm run create-admin
```
3. This will create admin with email: `admin@gmail.com` and password: `admin123`

4. Now log in to your deployed FYP System with these credentials

---

## Troubleshooting Common Issues

### Issue 1: Database Connection Failed
- Check that Railway MySQL is running
- Verify DB_HOST, DB_USER, DB_PASSWORD are correct
- Make sure the database name exists in Railway

### Issue 2: CORS Errors
- Add your Vercel URL to CORS whitelist in `backend/server.js`
- Make sure to redeploy after changes

### Issue 3: Emails Not Sending
- Verify Gmail App Password is correct (16 characters)
- Make sure 2-Factor Authentication is enabled on Google Account
- Check email credentials in Railway environment variables

### Issue 4: Frontend Can't Connect to Backend
- Update `VITE_API_URL` in Vercel to your Railway backend URL
- Redeploy frontend after changing environment variables

### Issue 5: Build Failed on Vercel
- Check that `package.json` has correct build script
- Make sure all dependencies are in `package.json` (not package-lock.json only)
- Verify Node.js version compatibility

---

## Deployment Summary

| Component | Platform | URL Format |
|-----------|-----------|------------|
| Frontend | Vercel | `https://fyp-frontend.vercel.app` |
| Backend | Railway | `https://fyp-backend.railway.app` |
| Database | Railway | `containers.railway.com:port` |

---

## Important Notes

1. **Free Limits**:
   - Railway: 500 hours/month, $5 credit/month
   - Vercel: 100GB bandwidth/month
   - Both are sufficient for a school project

2. **Keep Alike Credentials**:
   - Save all your passwords and URLs in a safe place
   - You won't need to remember them daily, but you'll need them for troubleshooting

3. **Deployment Updates**:
   - When you push changes to GitHub, Vercel/Railway will auto-deploy
   - Make sure to push to the correct repository (frontend vs backend)

---

## Quick Reference Commands

```bash
# Test backend locally with Railway DB
cd backend
npm install
# Update .env with Railway credentials
npm run dev

# Build frontend for production
cd ..
npm run build

# Create admin user
cd backend
npm run create-admin
```

---

**Congratulations! Your FYP Management System is now deployed and live!** 🎉

If you encounter any issues, refer to the troubleshooting section or check your environment variables on both Vercel and Railway.
