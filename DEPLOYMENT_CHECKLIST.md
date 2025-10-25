# ✅ Vercel Deployment Checklist

## Changes Made

### 🔒 Security Improvements
- ✅ Moved hardcoded Mux credentials to environment variables
- ✅ Moved Firebase configuration to environment variables
- ✅ Updated CORS configuration to use Vercel domain in production
- ✅ Created `.env.example` template file
- ✅ Updated `.gitignore` to allow `.env.example` while blocking other env files

### 📝 Files Modified
1. **`/lib/mux.ts`**
   - Replaced hardcoded `tokenId` and `tokenSecret` with `process.env.MUX_TOKEN_ID` and `process.env.MUX_TOKEN_SECRET`
   - Updated CORS origin to use `NEXT_PUBLIC_VERCEL_URL` when available

2. **`/lib/firebase.ts`**
   - Replaced all hardcoded Firebase config values with `NEXT_PUBLIC_*` environment variables

3. **`.gitignore`**
   - Added exception for `.env.example` file

### 📄 Files Created
1. **`.env.example`** - Template for required environment variables
2. **`VERCEL_DEPLOYMENT.md`** - Complete deployment guide with all credentials
3. **`DEPLOYMENT_CHECKLIST.md`** - This file

## ⚠️ Before Deployment

### 1. Install Dependencies (if not already done)
```bash
npm install
```

### 2. Create Local Environment File
```bash
cp .env.example .env.local
```

Then edit `.env.local` with the actual values from `VERCEL_DEPLOYMENT.md`

### 3. Test Locally
```bash
npm run dev
```

Verify:
- Firebase authentication works
- Video uploads to Mux work
- All pages load correctly

### 4. Test Build
```bash
npm run build
npm start
```

## 🚀 Deployment Options

### Option A: Vercel Dashboard (Recommended)
1. Push code to Git repository
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables from `VERCEL_DEPLOYMENT.md`
5. Deploy

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel
```

Then add environment variables via CLI or dashboard.

## 🔐 Environment Variables Required

See `VERCEL_DEPLOYMENT.md` for the complete list with actual values.

**Client-side (NEXT_PUBLIC_):**
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

**Server-side:**
- MUX_TOKEN_ID
- MUX_TOKEN_SECRET

**Auto-provided by Vercel:**
- NEXT_PUBLIC_VERCEL_URL (automatically set by Vercel)

## 📋 Post-Deployment Tasks

1. **Update Firebase Settings**
   - Add your Vercel domain to Firebase authorized domains
   - Go to Firebase Console → Authentication → Settings → Authorized domains

2. **Verify Mux CORS**
   - Test video uploads from production domain
   - If issues occur, check Mux dashboard CORS settings

3. **Security Review**
   - ⚠️ Consider rotating Mux credentials (they were previously exposed in code)
   - Review Firebase Security Rules
   - Verify all API routes are properly secured

4. **Test Production**
   - Test authentication flow
   - Test video upload functionality
   - Check all pages and routes
   - Verify environment variables are loaded correctly

## 🎯 Build Configuration

The project is configured for Vercel with:
- **Framework**: Next.js 15.5.5 (App Router)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Node Version**: 20.x (from `@types/node: ^20`)
- **Package Manager**: npm

No `vercel.json` is required - Vercel auto-detects Next.js configuration.

## ✨ Ready for Deployment

Your application is now ready for Vercel deployment with:
- ✅ All sensitive credentials moved to environment variables
- ✅ Production-ready CORS configuration
- ✅ Proper environment variable documentation
- ✅ Security best practices implemented

Follow the deployment guide in `VERCEL_DEPLOYMENT.md` to deploy your application.
