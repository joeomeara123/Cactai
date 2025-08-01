# CLAUDE.md

This file provides guidance to Claude Code when working with the CactAI project.

## Project Overview

**CactAI** is a social good AI chatbot platform that donates 40% of revenue to environmental causes. It's the "Ecosia for AI conversations" - every query users make helps plant trees while providing access to advanced AI models.

### Core Concept
- Users chat with AI models (GPT-4, Claude, etc.)
- Every query generates ~£0.04 in processing costs
- 40% (£0.016) goes to reforestation efforts
- £1 = 2.5 trees planted (based on Ecosia model)
- Result: ~0.04 trees planted per query

### Key Features
- 🤖 Multi-model AI chat interface
- 🌳 Real-time environmental impact tracking
- 🔐 Secure Google authentication via Supabase
- 📊 Personal dashboard showing trees planted
- 🎯 Milestone achievements and gamification

## Technical Architecture

### Tech Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **AI Integration**: OpenAI API (GPT-4o-mini, GPT-4o, GPT-4)
- **Hosting**: Vercel (Frontend), Supabase (Backend)
- **Icons**: Lucide React
- **Validation**: Zod for environment and data validation

### Project Structure
```
src/
├── app/
│   ├── api/chat/route.ts          # OpenAI chat completion API
│   ├── auth/callback/route.ts     # Supabase auth callback
│   ├── chat/page.tsx              # Main chat interface
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing page
├── components/
│   ├── auth/AuthButton.tsx        # Google sign-in component
│   └── chat/ChatInterface.tsx     # Main chat UI component
├── lib/
│   ├── config*.ts                 # Environment & model configuration
│   ├── database*.ts               # Database client and operations
│   ├── impact.ts                  # Tree calculation logic
│   ├── openai.ts                  # OpenAI API integration
│   └── supabase*.ts               # Supabase client configuration
└── types/index.ts                 # TypeScript type definitions

database/
├── README.md                      # Database setup guide
├── schema.sql                     # PostgreSQL schema
└── rls-policies.sql               # Row Level Security policies
```

## Database Schema

### Core Tables

**`user_profiles`** - Extended user information
- Links to Supabase auth.users
- Tracks total impact: queries, tokens, cost, trees planted
- User preferences: preferred_model, selected_charity

**`chat_sessions`** - Conversation groupings
- Groups related queries together
- Auto-generates titles from first message
- Tracks session-level statistics

**`queries`** - Individual LLM interactions
- Records every question/answer pair
- Detailed token usage and cost breakdown
- Impact calculation per query (trees_added, donation_amount)

**`user_milestones`** - Achievement tracking
- Records when users hit tree planting milestones (1, 5, 25, 100+ trees)
- Prevents duplicate milestone notifications

**`global_stats`** - Community statistics
- Aggregated platform statistics updated via database triggers
- Public read access for landing page metrics

### Key Database Features
- **Row Level Security (RLS)**: Users can only access their own data
- **Auto-updating Statistics**: User/global stats update automatically via triggers
- **Impact Functions**: `get_user_impact()`, `get_global_stats()`, `check_milestones()`
- **Performance Optimized**: Strategic indexes on common query patterns

## Development Workflow

### Setup Commands
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run development server with Turbopack
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup
1. Create Supabase project
2. Run `database/schema.sql` in SQL Editor
3. Run `database/rls-policies.sql` for security policies
4. Enable Google OAuth in Authentication settings

## Key Implementation Details

### Impact Calculation
- Located in `src/lib/impact.ts`
- Uses precise token-to-cost-to-trees conversion
- Models have different pricing (GPT-4o-mini: £0.15/1M input tokens)
- 40% donation rate × £1 = 2.5 trees = automatic tree calculation

### Authentication Flow
- Google OAuth via Supabase Auth
- User profiles auto-created on first login
- Server-side auth validation for API routes
- Automatic redirect: unauthenticated → landing, authenticated → chat

### Chat Interface Features
- Real-time tree counter with animations
- Model selector dropdown with pricing info
- Auto-scrolling message history
- Typing indicators and loading states
- Token usage tracking per message

### API Route Structure
- `POST /api/chat`: Main chat completion endpoint
- Validates authentication and input
- Calls OpenAI API with system prompt
- Records query metrics in database
- Returns response + trees added

## Development Guidelines

### Code Style
- TypeScript throughout with strict type checking
- Tailwind CSS for styling with consistent design tokens
- Component-based architecture with clear separation of concerns
- Server/client component distinction following Next.js 14 patterns

### State Management
- React useState for local component state
- Supabase real-time subscriptions for live data
- No external state management library (Redux, Zustand) - keeping it simple

### Error Handling
- Comprehensive error boundaries in API routes
- User-friendly error messages in UI
- Console logging for debugging
- Graceful fallbacks for failed API calls

### Performance Considerations
- Next.js 14 with Turbopack for fast development
- Strategic database indexing for common queries
- Efficient token counting to minimize API costs
- Component lazy loading where appropriate

## Testing Strategy

### Current Status
- No formal test suite implemented (MVP focus)
- Manual testing via development server
- Database functions tested via SQL Editor

### Recommended Testing Approach
```bash
# Add these dependencies for testing
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom

# Test structure
tests/
├── components/           # Component unit tests
├── api/                 # API route integration tests
├── lib/                 # Utility function tests
└── e2e/                 # End-to-end user flows
```

## MVP Development Timeline

### Completed (Day 1)
- ✅ Project setup with Next.js 14
- ✅ Supabase integration and authentication
- ✅ Database schema and RLS policies
- ✅ Basic chat interface structure

### Day 2 Goals
- Chat interface completion with real-time features
- Impact tracking implementation
- OpenAI API integration and token counting
- User profile dashboard

### Day 3 Goals
- Polish and bug fixes
- Performance optimization
- User testing and feedback incorporation
- Production deployment preparation

## Deployment

### Vercel Deployment
```bash
# Connect to Vercel
npx vercel

# Set environment variables in Vercel dashboard
# Deploy
git push origin main  # Auto-deploys via Vercel integration
```

### Supabase Configuration
- Ensure RLS policies are enabled
- Set up Google OAuth with production domain
- Configure weekly stats cron job: `SELECT update_weekly_stats();`

## Monitoring & Maintenance

### Key Metrics to Track
- User registration and retention rates
- Query volume and associated costs
- Tree planting milestones achieved
- API response times and error rates
- Database query performance

### Regular Maintenance Tasks
- Weekly global stats updates (automated via cron)
- Monthly cost analysis and pricing adjustments
- Quarterly database cleanup for very old data
- Model pricing updates as OpenAI changes rates

## Security Considerations

- All database access secured via RLS policies
- API routes validate user authentication
- Environment variables never exposed to client
- Input validation using Zod schemas
- No storage of sensitive user data beyond profiles

## Future Enhancements

### Planned Features
- Multiple AI provider support (Claude, Gemini)
- Charity selection options for users
- Social features and community leaderboards
- Mobile app development
- Carbon offset tracking beyond trees

### Technical Improvements
- Comprehensive test suite implementation
- Real-time typing indicators
- Message persistence and chat history
- Advanced analytics dashboard
- API rate limiting and abuse prevention

## Troubleshooting

### Common Issues

**"Permission denied for table" errors:**
- Check RLS policies are correctly applied
- Ensure user is authenticated with valid session
- Verify database client is using correct service role

**OpenAI API failures:**
- Check API key validity and quota limits
- Verify model names match configuration
- Monitor token usage against rate limits

**Authentication problems:**
- Confirm Google OAuth setup in Supabase
- Check redirect URLs match environment
- Verify Supabase project settings

**Development server issues:**
- Ensure all environment variables are set
- Check Node.js version compatibility (18+)
- Clear Next.js cache: `rm -rf .next`

### Performance Issues
- Monitor database query execution plans
- Check for N+1 query patterns in data fetching
- Optimize component re-renders with useMemo/useCallback
- Consider implementing request caching for expensive operations

---

## Additional Notes

This project represents a practical implementation of "AI for good" - demonstrating how AI applications can generate positive environmental impact while providing valuable user experiences. The MVP approach prioritizes core functionality over complexity, making it an ideal codebase for rapid iteration and feature development.

The impact model is transparent and trackable, giving users clear visibility into their environmental contribution while maintaining a sustainable business model for continued operation and growth.