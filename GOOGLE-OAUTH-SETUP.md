# 🔐 Google OAuth Setup Guide for CactAI

## If you DON'T have Google OAuth credentials yet:

### Step 1: Create Google Cloud Project
1. Go to: https://console.cloud.google.com
2. Click "Select a project" → "New Project"  
3. Project name: `CactAI` or similar
4. Click "Create"

### Step 2: Enable Google+ API
1. Go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - **App name**: CactAI
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click "Save and Continue"
5. Skip "Scopes" (click "Save and Continue")  
6. Skip "Test users" (click "Save and Continue")

### Step 4: Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Application type: "Web application"
4. Name: "CactAI"
5. **Authorized redirect URIs** - Add these:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://zcnugodtwqmgihcvyjba.supabase.co/auth/v1/callback` (for Supabase)
6. Click "Create"
7. **COPY** the Client ID and Client Secret - you'll need these!

---

## Configure in Supabase:

### Step 5: Add to Supabase
1. Go to Supabase dashboard → Authentication → Providers
2. Enable Google provider
3. Paste your **Client ID** and **Client Secret**  
4. **Site URL**: `http://localhost:3000` (for development)
5. **Redirect URLs**: Add these:
   - `http://localhost:3000/auth/callback`
   - `https://your-vercel-domain.vercel.app/auth/callback` (when you deploy)
6. Click "Save"

---

## Quick Test:
Once configured, your Google sign-in should work. Users will be redirected through Google and back to your app with authentication.

**The redirect flow**:
User clicks "Sign in with Google" → Google login → Redirect to `/auth/callback` → User authenticated → Redirect to `/chat`