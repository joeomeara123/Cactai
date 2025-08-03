# 🚀 CactAI Production Deployment Guide

## Quick Production Deployment Steps

### Step 1: Verify Environment Variables for Production

In Vercel Dashboard, set these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://zcnugodtwqmgihcvyjba.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnVnb2R0d3FtZ2loY3Z5amJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzM0OTQsImV4cCI6MjA2OTMwOTQ5NH0.AU8KGFdZCWSQdKBBXby6mwcGHjt12hPypuQYgBlxEow
OPENAI_API_KEY=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
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

### Step 2: Update Google OAuth Redirect URLs

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add production redirect URL:
   - `https://your-vercel-domain.vercel.app/auth/callback`

### Step 3: Update Supabase Auth Settings

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL**: `https://your-vercel-domain.vercel.app`
3. Add **Redirect URLs**:
   - `https://your-vercel-domain.vercel.app/auth/callback`

### Step 4: Deploy to Vercel

Since your GitHub is already connected to Vercel:

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

Vercel will automatically deploy!

### Step 5: Test Production

1. Visit your production URL
2. Test Google sign-in
3. Test chat functionality
4. Verify tree counting works

---

## Success Checklist

- [ ] Environment variables set in Vercel
- [ ] Google OAuth redirect URLs updated
- [ ] Supabase auth URLs updated  
- [ ] Application deployed to production
- [ ] Authentication working in production
- [ ] Chat functionality working
- [ ] Tree counting accurate
- [ ] Database recording all activity