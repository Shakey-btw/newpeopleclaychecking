# Vercel Deployment Guide

This guide explains how to deploy your application to Vercel with Supabase integration.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- Supabase project set up
- GitHub repository (recommended) or GitLab/Bitbucket

## Environment Variables for Vercel

When deploying to Vercel, you need to set environment variables in the Vercel dashboard.

### Frontend Environment Variables

Go to your Vercel project → Settings → Environment Variables and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://micgjeldkzqxpexbxqfm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pY2dqZWxka3pxeHBleGJ4cWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODQwMDcsImV4cCI6MjA3ODQ2MDAwN30.lF4lnzyFNn1GijceoUJ77tosxf7E4rYF-Q-9SA6rGVs
```

**Important:** 
- These variables are safe to expose in the browser (they're prefixed with `NEXT_PUBLIC_`)
- Set them for all environments: Production, Preview, and Development

### Backend Environment Variables (if using Vercel Serverless Functions)

If you're using Vercel serverless functions for your Python backend, you'll need:

```
SUPABASE_URL=https://micgjeldkzqxpexbxqfm.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pY2dqZWxka3pxeHBleGJ4cWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODQwMDcsImV4cCI6MjA3ODQ2MDAwN30.lF4lnzyFNn1GijceoUJ77tosxf7E4rYF-Q-9SA6rGVs
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.micgjeldkzqxpexbxqfm.supabase.co:5432/postgres
```

**Note:** For serverless functions, you might want to use Supabase's connection pooling URL instead of direct connection.

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard

1. **Connect your repository:**
   - Go to https://vercel.com/new
   - Import your GitHub/GitLab/Bitbucket repository
   - Vercel will auto-detect Next.js

2. **Configure project:**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `peopleclaychecking/frontend` (if your frontend is in a subdirectory)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

3. **Add environment variables:**
   - Go to Settings → Environment Variables
   - Add the variables listed above
   - Make sure to set them for all environments

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live!

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd peopleclaychecking/frontend
   vercel
   ```

4. **Add environment variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## Vercel Configuration

Your `vercel.json` file should already be configured. If not, here's a basic setup:

```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "installCommand": "cd frontend && npm install"
}
```

## Important Notes for Vercel

### 1. Root Directory Configuration

If your frontend is in a subdirectory (`peopleclaychecking/frontend`), you need to:

- Set "Root Directory" in Vercel project settings to `peopleclaychecking/frontend`
- OR update `vercel.json` to handle the build correctly

### 2. Environment Variables

- Environment variables are case-sensitive
- Changes to environment variables require a new deployment
- Use Vercel's environment variable UI for easier management

### 3. Python Backend on Vercel

If you want to run Python scripts on Vercel:

- Use Vercel Serverless Functions (API routes in Next.js)
- Your existing API routes in `src/app/api/` will work
- Python scripts will need to be called via serverless functions
- Consider using Supabase Edge Functions for Python code

### 4. Database Connections

- For serverless functions, use Supabase's connection pooling
- Direct PostgreSQL connections may hit connection limits
- Supabase client library handles this automatically

## Post-Deployment Checklist

- [ ] Environment variables are set in Vercel
- [ ] Application builds successfully
- [ ] Supabase connection works (check browser console)
- [ ] API routes are accessible
- [ ] Custom domain is configured (optional)

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Environment Variables Not Working

- Make sure variables are prefixed with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding/changing environment variables
- Check variable names match exactly (case-sensitive)

### Supabase Connection Issues

- Verify your Supabase project is active
- Check if Row Level Security (RLS) is enabled (may block queries)
- Verify API keys are correct
- Check Supabase dashboard for any service issues

## Continuous Deployment

Once connected to GitHub:
- Every push to `main` branch = Production deployment
- Every pull request = Preview deployment
- All deployments are automatic

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use environment variables** - Never hardcode secrets
3. **Enable RLS in Supabase** - Protect your data
4. **Use service role key only server-side** - Never expose in frontend
5. **Review Vercel logs** - Monitor for any issues

## Next Steps

After deployment:
1. Test all functionality
2. Set up custom domain (optional)
3. Configure analytics (optional)
4. Set up monitoring/alerts

