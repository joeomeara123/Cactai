-- CactAI Missing Database Functions
-- Copy this entire file and paste into Supabase SQL Editor, then click RUN

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

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();