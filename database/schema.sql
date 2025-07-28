-- CactAI Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    
    -- Impact tracking
    total_queries INTEGER DEFAULT 0 NOT NULL,
    total_input_tokens BIGINT DEFAULT 0 NOT NULL,
    total_output_tokens BIGINT DEFAULT 0 NOT NULL,
    total_cost DECIMAL(12,8) DEFAULT 0 NOT NULL,
    total_donated DECIMAL(12,8) DEFAULT 0 NOT NULL,
    trees_planted DECIMAL(12,6) DEFAULT 0 NOT NULL,
    
    -- Preferences
    preferred_model TEXT DEFAULT 'gpt-4o-mini' NOT NULL,
    selected_charity TEXT DEFAULT 'reforestation' NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Chat sessions table
CREATE TABLE chat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT, -- Auto-generated from first message
    
    -- Session stats
    message_count INTEGER DEFAULT 0 NOT NULL,
    total_tokens INTEGER DEFAULT 0 NOT NULL,
    session_cost DECIMAL(10,6) DEFAULT 0 NOT NULL,
    trees_from_session DECIMAL(8,4) DEFAULT 0 NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Individual queries/messages table
CREATE TABLE queries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Message content
    user_message TEXT NOT NULL,
    assistant_message TEXT NOT NULL,
    
    -- Token usage
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    model_used TEXT NOT NULL,
    
    -- Cost breakdown
    input_cost DECIMAL(10,8) NOT NULL,
    output_cost DECIMAL(10,8) NOT NULL,
    total_cost DECIMAL(10,8) NOT NULL,
    
    -- Impact
    donation_amount DECIMAL(10,8) NOT NULL,
    trees_added DECIMAL(8,6) NOT NULL,
    
    -- Metadata
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Milestones achieved table
CREATE TABLE user_milestones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    milestone_trees INTEGER NOT NULL, -- 1, 5, 25, 100, etc.
    achieved_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id, milestone_trees)
);

-- Global statistics view (updated via triggers)
CREATE TABLE global_stats (
    id INTEGER PRIMARY KEY DEFAULT 1, -- Only one row
    total_users INTEGER DEFAULT 0 NOT NULL,
    total_queries BIGINT DEFAULT 0 NOT NULL,
    total_trees DECIMAL(15,6) DEFAULT 0 NOT NULL,
    total_donated DECIMAL(15,8) DEFAULT 0 NOT NULL,
    trees_this_week DECIMAL(12,6) DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT single_row CHECK (id = 1)
);

-- Initialize global stats
INSERT INTO global_stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX idx_user_profiles_trees ON user_profiles(trees_planted DESC);
CREATE INDEX idx_queries_user_created ON queries(user_id, created_at DESC);
CREATE INDEX idx_queries_created_at ON queries(created_at DESC);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_user_milestones_user ON user_milestones(user_id, milestone_trees);

-- Function to update user profile stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user profile with new query stats
    UPDATE user_profiles SET
        total_queries = total_queries + 1,
        total_input_tokens = total_input_tokens + NEW.input_tokens,
        total_output_tokens = total_output_tokens + NEW.output_tokens,
        total_cost = total_cost + NEW.total_cost,
        total_donated = total_donated + NEW.donation_amount,
        trees_planted = trees_planted + NEW.trees_added,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Update session stats
    UPDATE chat_sessions SET
        message_count = message_count + 1,
        total_tokens = total_tokens + NEW.input_tokens + NEW.output_tokens,
        session_cost = session_cost + NEW.total_cost,
        trees_from_session = trees_from_session + NEW.trees_added,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    
    -- Update global stats
    UPDATE global_stats SET
        total_queries = total_queries + 1,
        total_trees = total_trees + NEW.trees_added,
        total_donated = total_donated + NEW.donation_amount,
        updated_at = NOW()
    WHERE id = 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when new query is inserted
CREATE TRIGGER trigger_update_user_stats
    AFTER INSERT ON queries
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

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