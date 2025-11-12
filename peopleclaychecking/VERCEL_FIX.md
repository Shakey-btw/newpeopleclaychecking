# Vercel 404 Error - Fix Guide

## Problem
Getting 404 error after deployment to Vercel.

## Solution

The issue was with the `vercel.json` configuration. When using `rootDirectory`, all paths should be relative to that directory.

### Fixed Configuration

I've updated `vercel.json` to:
- Set `rootDirectory` to `peopleclaychecking/frontend`
- Remove `cd frontend` from build commands (since root is already set)
- Set `outputDirectory` to `.next` (relative to root directory)

## Steps to Fix

### Option 1: Update Vercel Project Settings (Recommended)

1. Go to your Vercel project dashboard
2. Go to **Settings** → **General**
3. Set **Root Directory** to: `peopleclaychecking/frontend`
4. Leave build settings as default (Vercel will auto-detect Next.js)
5. **Redeploy** your project

### Option 2: Use vercel.json (Already Fixed)

The `vercel.json` file has been updated. Just:
1. Commit and push the changes
2. Vercel will automatically redeploy

## Verify Configuration

After redeploying, check:
- ✅ Build logs show successful build
- ✅ No 404 errors on the homepage
- ✅ Routes work correctly

## Alternative: Move vercel.json

If the above doesn't work, you can also:
1. Delete the root `vercel.json`
2. Keep only `peopleclaychecking/frontend/vercel.json`
3. Set Root Directory in Vercel dashboard to `peopleclaychecking/frontend`

## Common Issues

### Still Getting 404?
- Check build logs in Vercel dashboard
- Verify environment variables are set
- Check that `src/app/page.tsx` exists
- Ensure Next.js build completed successfully

### Build Fails?
- Check Node.js version (should be >= 18)
- Verify all dependencies are in `package.json`
- Check for TypeScript errors

