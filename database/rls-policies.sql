-- Row Level Security (RLS) Policies for CactAI
-- Run this SQL after creating the main schema

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

-- Global stats is read-only for everyone, no RLS needed
-- ALTER TABLE global_stats ENABLE ROW LEVEL SECURITY;

-- USER PROFILES POLICIES
-- Users can only see and edit their own profile
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
-- Users can only access their own chat sessions
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
-- Users can only access their own queries
CREATE POLICY "Users can view own queries"
    ON queries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own queries"
    ON queries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Note: Users typically don't update or delete queries (audit trail)
-- But if needed:
-- CREATE POLICY "Users can update own queries"
--     ON queries FOR UPDATE
--     USING (auth.uid() = user_id);

-- USER MILESTONES POLICIES
-- Users can only see their own milestones
CREATE POLICY "Users can view own milestones"
    ON user_milestones FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own milestones"
    ON user_milestones FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- GLOBAL STATS POLICIES
-- Everyone can read global stats (no RLS, public read access)
-- Only service role can update (handled by triggers)

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

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Update global stats when user is deleted
    UPDATE global_stats SET
        total_users = total_users - 1,
        total_queries = total_queries - OLD.total_queries,
        total_trees = total_trees - OLD.trees_planted,
        total_donated = total_donated - OLD.total_donated,
        updated_at = NOW()
    WHERE id = 1;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for user deletion
CREATE TRIGGER on_user_profile_deleted
    AFTER DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_delete();

-- Grant permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant read access to global stats for anonymous users (public stats page)
GRANT SELECT ON global_stats TO anon;

-- Additional security: Ensure service role can update global stats
GRANT ALL ON global_stats TO service_role;