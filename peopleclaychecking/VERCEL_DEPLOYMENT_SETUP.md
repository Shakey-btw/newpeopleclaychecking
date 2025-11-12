# Vercel Deployment - Complete Setup Guide

## ✅ Prerequisites Completed

- ✅ Supabase tables created
- ✅ Data migrated to Supabase (22,755 records)
- ✅ Schema mismatches fixed
- ✅ Frontend configured for Supabase
- ✅ Backend writes to Supabase

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. **Ensure all changes are committed:**
   ```bash
   git add .
   git commit -m "Complete Supabase integration and migration"
   git push origin main
   ```

### Step 2: Connect to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Sign in or create an account

2. **Import Project:**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Project Settings:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `peopleclaychecking/frontend`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

4. **Add Environment Variables:**
   - Go to "Environment Variables" section
   - Add these variables for **Production, Preview, and Development**:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://micgjeldkzqxpexbxqfm.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pY2dqZWxka3pxeHBleGJ4cWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODQwMDcsImV4cCI6MjA3ODQ2MDAwN30.lF4lnzyFNn1GijceoUJ77tosxf7E4rYF-Q-9SA6rGVs
   ```

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live!

#### Option B: Via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Navigate to frontend:**
   ```bash
   cd peopleclaychecking/frontend
   ```

4. **Deploy:**
   ```bash
   vercel
   ```

5. **Add environment variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   # Enter: https://micgjeldkzqxpexbxqfm.supabase.co
   
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   # Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pY2dqZWxka3pxeHBleGJ4cWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODQwMDcsImV4cCI6MjA3ODQ2MDAwN30.lF4lnzyFNn1GijceoUJ77tosxf7E4rYF-Q-9SA6rGVs
   ```

6. **Deploy to production:**
   ```bash
   vercel --prod
   ```

### Step 3: Verify Deployment

1. **Check Build Logs:**
   - Go to Vercel dashboard → Your project → Deployments
   - Check that build completed successfully

2. **Test Your App:**
   - Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
   - Test the Overview page
   - Check browser console for any errors

3. **Verify Supabase Connection:**
   - Open browser DevTools → Console
   - Should see no Supabase connection errors
   - Data should load from Supabase

## 📋 Vercel Configuration

### Root Directory Setup

Since your frontend is in `peopleclaychecking/frontend`, you have two options:

**Option 1: Set Root Directory in Vercel (Recommended)**
- In Vercel project settings → General
- Set "Root Directory" to: `peopleclaychecking/frontend`
- Vercel will build from that directory

**Option 2: Use vercel.json**
- Already configured in `vercel.json`
- Vercel will use this configuration

### Build Settings

Vercel will automatically detect:
- **Framework:** Next.js
- **Node.js Version:** Auto (or specify in `package.json`)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

## 🔒 Security Checklist

- ✅ Environment variables set in Vercel (not in code)
- ✅ `.env.local` is in `.gitignore`
- ✅ Only `NEXT_PUBLIC_` variables exposed to browser
- ⚠️ Consider enabling Row Level Security (RLS) in Supabase

## 🐛 Troubleshooting

### Build Fails

**Issue:** Build errors
**Solution:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (check `package.json` for `engines` field)

### Environment Variables Not Working

**Issue:** Supabase connection fails
**Solution:**
- Verify variables are set in Vercel dashboard
- Make sure they're set for all environments (Production, Preview, Development)
- Redeploy after adding/changing variables
- Check variable names match exactly (case-sensitive)

### Supabase Connection Issues

**Issue:** Can't connect to Supabase
**Solution:**
- Verify Supabase project is active
- Check API keys are correct
- Review Supabase dashboard for service status
- Check browser console for specific error messages

### API Routes Not Working

**Issue:** API routes return errors
**Solution:**
- API routes in `src/app/api/` work automatically on Vercel
- Python scripts won't work directly - they need to be called via API routes
- Your existing API routes should work fine

## 📊 Post-Deployment

### What Works on Vercel

✅ **Frontend (Next.js):**
- All pages and components
- API routes (`/api/*`)
- Supabase client queries
- Static assets

✅ **Backend:**
- API routes that call Python scripts (via serverless functions)
- Supabase database operations

⚠️ **Limitations:**
- Python scripts need to be called via API routes
- Direct Python execution not available (use API routes instead)
- File system is read-only (except `/tmp`)

### Recommended Next Steps

1. **Set up Custom Domain** (optional)
   - Vercel → Project Settings → Domains
   - Add your custom domain

2. **Enable Analytics** (optional)
   - Vercel → Project Settings → Analytics
   - Enable Web Analytics

3. **Set up Monitoring**
   - Check Vercel logs regularly
   - Set up error tracking (Sentry, etc.)

4. **Configure Row Level Security (RLS)**
   - Go to Supabase Dashboard → Authentication → Policies
   - Set up RLS policies for your tables

## 🎉 Success!

Once deployed, your app will:
- ✅ Use Supabase as the database
- ✅ Work on Vercel's global CDN
- ✅ Auto-deploy on every git push
- ✅ Scale automatically

Your application is now production-ready!

