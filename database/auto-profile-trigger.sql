-- Auto-create user profiles when users sign up
-- This trigger runs automatically when a new user is inserted into auth.users

-- First, create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert a new profile for the user
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    avatar_url,
    trees_planted,
    total_queries,
    total_cost,
    total_donated,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, 'user-' || NEW.id || '@temp.com'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    0,
    0,
    0,
    0,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger that fires after a user is inserted
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Also create profiles for any existing users who don't have them
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through users in auth.users who don't have profiles
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
        FROM auth.users au
        LEFT JOIN public.user_profiles up ON au.id = up.id
        WHERE up.id IS NULL
    LOOP
        -- Create profile for this user
        INSERT INTO public.user_profiles (
            id,
            email,
            full_name,
            avatar_url,
            trees_planted,
            total_queries,
            total_cost,
            total_donated,
            created_at,
            updated_at
        )
        VALUES (
            user_record.id,
            COALESCE(user_record.email, 'user-' || user_record.id || '@temp.com'),
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name'),
            COALESCE(user_record.raw_user_meta_data->>'avatar_url', user_record.raw_user_meta_data->>'picture'),
            0,
            0,
            0,
            0,
            COALESCE(user_record.created_at, NOW()),
            NOW()
        );
        
        RAISE NOTICE 'Created profile for user: %', user_record.id;
    END LOOP;
END
$$;

-- Verify the trigger was created
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' 
AND n.nspname = 'auth'
AND t.tgname = 'on_auth_user_created';