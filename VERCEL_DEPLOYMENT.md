# Vercel Deployment Guide

## Prerequisites

Your Next.js application is now ready for Vercel deployment with all sensitive credentials moved to environment variables.

## Environment Variables Setup

### Required Environment Variables

You need to configure the following environment variables in your Vercel project settings:

#### Firebase Configuration (Client-side)
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBlihcyw8FMR-Wox3ttXzn5LMG8Vd3eMn0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kiconu-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kiconu-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kiconu-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=999055210705
NEXT_PUBLIC_FIREBASE_APP_ID=1:999055210705:web:2232750efc2dd7273f2df0
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-Z9BYCL16CS
```

#### Mux Configuration (Server-side)
```
MUX_TOKEN_ID=15a7e9c7-0bac-4cdc-9e11-2c73c8b6f897
MUX_TOKEN_SECRET=ay8Ytx69SZjK9TXmmz3ECfbDxodkwh5X4lDWy0rgso9m1IjfbDOR2Cd/goujGEGoaT0CQWKCrP+
```

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Add environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
   vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
   vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   vercel env add NEXT_PUBLIC_FIREBASE_APP_ID
   vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
   vercel env add MUX_TOKEN_ID
   vercel env add MUX_TOKEN_SECRET
   ```

5. Redeploy with environment variables:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your Git repository
4. Configure environment variables:
   - Go to Project Settings → Environment Variables
   - Add all the environment variables listed above
5. Deploy

## Local Development

For local development, create a `.env.local` file in the root directory with all the environment variables:

```bash
cp .env.example .env.local
```

Then fill in the actual values from the list above.

## Important Notes

- **Firebase credentials** use the `NEXT_PUBLIC_` prefix because they need to be accessible on the client-side
- **Mux credentials** do NOT use the prefix as they should only be accessible server-side
- Never commit `.env.local` or any file containing actual credentials to version control
- The `.env.example` file serves as a template and should be committed

## Security Considerations

⚠️ **IMPORTANT**: Consider rotating your Mux credentials since they were previously hardcoded. You can generate new credentials in your Mux dashboard.

Firebase public configuration (API keys, etc.) is generally safe to expose as they're meant for client-side use, but they should still be protected by Firebase Security Rules.

## Vercel Configuration

The project uses Next.js 15.5.5 which is fully supported by Vercel. No additional `vercel.json` configuration is required for basic deployment.

## Build Command

Vercel will automatically detect and use:
- **Build Command**: `npm run build` or `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

## Post-Deployment

After deployment:
1. Test all functionality, especially video uploads (Mux integration)
2. Verify Firebase authentication works correctly
3. Check that all environment variables are properly loaded
4. Update your Firebase authorized domains to include your Vercel domain
5. Update Mux CORS settings if needed to allow your Vercel domain
