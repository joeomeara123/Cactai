# 🗄️ CactAI Database Setup Guide

## Critical Next Step: Deploy Missing Database Functions and RLS Policies

Your database tables exist, but **critical functions and security policies are missing**. Follow these steps exactly:

## Step 1: Deploy Database Functions (CRITICAL)

1. **Open Supabase Dashboard** → Go to https://supabase.com/dashboard
2. **Select your project**: `zcnugodtwqmgihcvyjba` 
3. **Navigate to SQL Editor** (left sidebar)
4. **Create New Query** 
5. **Copy and paste this SQL** (from the missing functions in schema.sql):

```sql
-- Function to get global stats
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', total_users,
        'total_queries', total_queries,
        'total_trees', total_trees,
        'trees_this_week', trees_this_week,
        'total_donated', total_donated
    ) INTO result
    FROM global_stats
    WHERE id = 1;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get user impact stats
CREATE OR REPLACE FUNCTION get_user_impact(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'queries_count', total_queries,
        'trees_planted', trees_planted,
        'trees_progress', trees_planted - FLOOR(trees_planted),
        'whole_trees', FLOOR(trees_planted),
        'total_donated', total_donated,
        'milestones', (
            SELECT json_agg(milestone_trees ORDER BY milestone_trees)
            FROM user_milestones
            WHERE user_id = user_uuid
        )
    ) INTO result
    FROM user_profiles
    WHERE id = user_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check and record milestones
CREATE OR REPLACE FUNCTION check_milestones(user_uuid UUID)
RETURNS void AS $$
DECLARE
    current_trees DECIMAL(8,6);
    milestone_values INTEGER[] := ARRAY[1, 5, 25, 100, 500, 1000];
    milestone_val INTEGER;
BEGIN
    -- Get current tree count for user
    SELECT trees_planted INTO current_trees
    FROM user_profiles
    WHERE id = user_uuid;
    
    -- Check each milestone
    FOREACH milestone_val IN ARRAY milestone_values
    LOOP
        -- If user has reached this milestone and hasn't recorded it yet
        IF current_trees >= milestone_val THEN
            INSERT INTO user_milestones (user_id, milestone_trees)
            VALUES (user_uuid, milestone_val)
            ON CONFLICT (user_id, milestone_trees) DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update weekly stats (run via cron)
CREATE OR REPLACE FUNCTION update_weekly_stats()
RETURNS void AS $$
BEGIN
    UPDATE global_stats SET
        trees_this_week = (
            SELECT COALESCE(SUM(trees_added), 0)
            FROM queries
            WHERE created_at >= NOW() - INTERVAL '7 days'
        ),
        updated_at = NOW()
    WHERE id = 1;
END;
$$ LANGUAGE plpgsql;
```

6. **Click "Run"** to execute the functions

## Step 2: Enable Row Level Security (CRITICAL)

1. **In the same SQL Editor**, create a **new query**
2. **Copy and paste this SQL**:

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

-- USER PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- CHAT SESSIONS POLICIES
CREATE POLICY "Users can view own chat sessions"
    ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions"
    ON chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
    ON chat_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
    ON chat_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- QUERIES POLICIES
CREATE POLICY "Users can view own queries"
    ON queries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own queries"
    ON queries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- USER MILESTONES POLICIES
CREATE POLICY "Users can view own milestones"
    ON user_milestones FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own milestones"
    ON user_milestones FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Grant permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant read access to global stats for anonymous users
GRANT SELECT ON global_stats TO anon;
```

3. **Click "Run"** to execute the RLS policies

## Step 3: Set Up User Profile Auto-Creation

1. **Create another new query** in SQL Editor
2. **Copy and paste this SQL**:

```sql
-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- Update global user count
    UPDATE global_stats SET
        total_users = total_users + 1,
        updated_at = NOW()
    WHERE id = 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
```

3. **Click "Run"** to execute the trigger

## Step 4: Configure Google OAuth

1. **Go to Authentication** → **Providers** in Supabase dashboard
2. **Enable Google** provider
3. **Add your OAuth credentials**:
   - Get these from Google Cloud Console
   - Client ID and Client Secret
4. **Configure Redirect URLs**:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.vercel.app/auth/callback`

## Step 5: Test the Setup

Run this command to verify everything is working:

```bash
node scripts/test-db-connection.js
```

**Expected Results:**
- ✅ Database connection successful
- ✅ All tables exist and accessible  
- ✅ Function get_global_stats() working
- ✅ RLS is properly configured (access denied without auth)

## Step 6: Deploy to Production

1. **Push your code to GitHub** (already done)
2. **Set environment variables in Vercel**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your production domain)

## 🚨 Critical Success Criteria

After completing these steps, your application should:
- ✅ Allow users to sign up via Google OAuth
- ✅ Create user profiles automatically
- ✅ Process chat messages with tree calculations
- ✅ Store all data securely with RLS protection
- ✅ Display accurate tree counts and milestones

---

**This setup is CRITICAL for the application to function. Without these database functions and security policies, the core features will not work.**