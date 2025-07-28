# CactAI Database Setup

This directory contains all the database schema and setup files for CactAI.

## Quick Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to be ready

### 2. Set Up Environment Variables
```bash
# Copy the example env file
cp .env.local.example .env.local

# Add your Supabase credentials:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Setup
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Run the SQL
5. Copy and paste the contents of `rls-policies.sql`
6. Run the SQL

### 4. Enable Authentication
1. Go to Authentication → Settings
2. Enable Google provider
3. Add your Google OAuth credentials
4. Set site URL to `http://localhost:3000` (for development)

## Database Schema Overview

### Core Tables

**`user_profiles`** - Extended user information
- Links to Supabase auth.users
- Tracks total impact: queries, tokens, cost, trees planted
- User preferences: model, charity selection

**`chat_sessions`** - Conversation groupings
- Groups related queries together
- Tracks session-level statistics
- Auto-generates titles from first message

**`queries`** - Individual LLM interactions
- Records every question/answer pair
- Detailed token usage and cost breakdown
- Impact calculation per query
- Links to user and session

**`user_milestones`** - Achievement tracking
- Records when users hit tree planting milestones
- Prevents duplicate milestone notifications
- Used for gamification features

**`global_stats`** - Community statistics
- Aggregated platform statistics
- Updated automatically via triggers
- Public read access for landing page

### Key Features

**🔒 Row Level Security (RLS)**
- Users can only access their own data
- Automatic data isolation
- Secure by default

**⚡ Auto-updating Statistics**
- User stats update automatically when queries are inserted
- Global stats maintained via database triggers
- No manual aggregation needed

**🎯 Impact Tracking**
- Precise token-to-trees calculation
- Cost breakdown by input/output tokens
- Milestone detection and recording

**📊 Performance Optimized**
- Strategic indexes on common query patterns
- Efficient aggregation functions
- Minimal N+1 query potential

## Database Functions

### `get_user_impact(user_uuid)`
Returns comprehensive user impact statistics as JSON:
```json
{
  "queries_count": 123,
  "trees_planted": 4.56,
  "trees_progress": 0.56,
  "whole_trees": 4,
  "total_donated": 0.92,
  "milestones": [1, 5]
}
```

### `get_global_stats()`
Returns platform-wide statistics:
```json
{
  "total_users": 1247,
  "total_queries": 15680,
  "total_trees": 628.34,
  "trees_this_week": 45.67,
  "total_donated": 251.34
}
```

### `check_milestones(user_uuid)`
Checks and records any new milestones for a user.

### `update_weekly_stats()`
Updates the weekly tree count (run via cron job).

## Usage in Code

```typescript
import { db } from '@/lib/database'

// Record a new query
const queryMetrics = await db.recordQuery({
  userId: user.id,
  sessionId: session.id,
  userMessage: "What is climate change?",
  assistantMessage: "Climate change refers to...",
  inputTokens: 50,
  outputTokens: 200,
  model: 'gpt-4o-mini'
})

// Get user impact
const impact = await db.getUserImpact(user.id)
console.log(`User has planted ${impact.trees_planted} trees!`)

// Get global stats for homepage
const globalStats = await db.getGlobalStats()
```

## Maintenance

### Weekly Stats Update
Set up a cron job to update weekly statistics:
```sql
SELECT update_weekly_stats();
```

### Database Cleanup (Optional)
For very old data cleanup (run quarterly):
```sql
-- Delete queries older than 2 years (adjust as needed)
DELETE FROM queries 
WHERE created_at < NOW() - INTERVAL '2 years';
```

### Performance Monitoring
Monitor these queries for performance:
- User profile updates (should be fast)
- Query insertion (should be < 100ms)
- Global stats retrieval (should be cached)

## Security Notes

- All tables have RLS enabled
- Users can only access their own data
- Global stats are read-only for users
- Service role has full access for system operations
- Anonymous users can only read global stats

## Troubleshooting

**"permission denied for table" errors:**
- Check RLS policies are correctly set up
- Ensure user is authenticated
- Verify auth.uid() is working

**Slow query insertion:**
- Check if triggers are working efficiently
- Monitor global_stats update performance
- Consider batching for high-volume users

**Missing milestones:**
- Run `SELECT check_milestones('user-uuid')` manually
- Check user_milestones table for existing records
- Verify milestone logic in impact.ts