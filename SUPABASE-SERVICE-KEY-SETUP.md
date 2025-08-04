# 🔑 Supabase Service Role Key Setup

## CRITICAL: Add Service Role Key to Fix User Profile Creation

The chat functionality requires a **service role key** to bypass Row Level Security (RLS) policies when creating user profiles. This is needed because the automatic profile creation trigger isn't working properly.

## Step 1: Get Your Service Role Key

1. **Go to Supabase Dashboard** → https://supabase.com/dashboard
2. **Select your project**: `zcnugodtwqmgihcvyjba`
3. **Go to Settings** → **API**
4. **Copy the `service_role` key** (NOT the anon key)
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - This key has admin privileges and bypasses RLS

## Step 2: Add to Vercel Environment Variables

1. **Go to Vercel Dashboard** → Your project → **Settings** → **Environment Variables**
2. **Add new variable**:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Your service role key from Step 1
   - **Environment**: Production, Preview, Development (all)

## Step 3: Redeploy

After adding the service role key:
- Vercel will automatically redeploy
- The new admin endpoint will have the necessary permissions
- User profiles will be created successfully

## What This Fixes

The service role key allows the `/api/admin/create-profile` endpoint to:
✅ Bypass all Row Level Security policies
✅ Create user profiles with admin privileges  
✅ Fix the "Key is not present in table 'user_profiles'" error
✅ Enable chat functionality to work properly

## Security Note

⚠️ **IMPORTANT**: The service role key has admin privileges. It's only used server-side in a controlled endpoint that first validates user authentication.

---

**Once you add this key, the chat functionality should work immediately!** 🚀