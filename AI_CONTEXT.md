# CactAI - AI Assistant Context Guide

This document provides comprehensive context about the CactAI project for AI assistants, CLI tools, and new developers working with the codebase.

## 🌟 Executive Summary

**CactAI** is a social good AI platform that combines environmental impact with AI conversations. Think "Ecosia for AI chat" - every conversation plants trees while providing access to advanced AI models.

### Core Concept
- Users chat with AI models (GPT-4, Claude, etc.)
- 40% of processing costs (£0.016 per query) fund reforestation
- Real-time tree counter shows environmental impact
- Gamified experience with milestones and achievements

### Current Status: ✅ **STABLE & WORKING**
- **Working Commit**: `08c8a4d` - "Fix sidebar tree counter not updating in real-time"
- **Environment**: Local development fully operational
- **All Systems**: OpenAI API, Database, Authentication, UI - all verified working

## 🏗️ Technical Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **AI**: OpenAI API (GPT-4o-mini, GPT-4o, GPT-4)
- **Hosting**: Vercel (Frontend), Supabase (Backend)
- **Authentication**: Google OAuth via Supabase Auth

### Key Architecture Pattern
```
Frontend (ChatInterface) → API Route (/api/chat) → OpenAI API → Database → Response with Tree Count
```

## 📁 Project Structure Quick Reference

### Critical Files
```
src/
├── app/
│   ├── api/chat/route.ts           # 🎯 Main API endpoint - OpenAI integration
│   ├── chat/page.tsx               # 🎯 Chat interface page
│   └── page.tsx                    # Landing page with auth redirect
├── components/
│   ├── chat/ChatInterface.tsx      # 🎯 Main chat UI component
│   ├── chat/Sidebar.tsx            # Tree counter sidebar
│   └── auth/AuthWrapper.tsx        # Authentication context
├── lib/
│   ├── openai.ts                  # 🎯 OpenAI API integration
│   ├── database.ts                # 🎯 Database operations
│   ├── supabase-client.ts         # Client-side Supabase
│   └── supabase-server.ts         # Server-side Supabase
└── types/index.ts                 # TypeScript definitions
```

### Database Tables
- `user_profiles` - User info and tree count
- `chat_sessions` - Conversation groupings  
- `queries` - Individual AI interactions
- `user_milestones` - Achievement tracking
- `global_stats` - Platform statistics

## 🔧 Development Workflow

### Quick Start
```bash
# Environment setup
npm install
cp .env.local.example .env.local
# Configure: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY

# Development
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Production build
npm run lint                   # Code quality check
npx tsc --noEmit              # TypeScript validation
```

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=sk-your_openai_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Testing Commands
```bash
node scripts/test-db-connection.js    # Test database connectivity
npm run build                         # Verify production build
npm run lint                          # Check code quality
```

## ⚠️ Critical Issues & Troubleshooting

### The 405 Error Problem (AVOID commits 72e6b9b+)

**⛔ DO NOT USE** commits after `08c8a4d` - they contain broken implementations

**What Happened:**
- Later commits tried to fix "405 Method Not Allowed" errors
- Switched from working API routes to broken Server Actions
- Removed OpenAI integration and database operations
- Created architectural mismatches

**Symptoms of Broken Commits:**
- Chat returns hardcoded diagnostic messages instead of AI responses
- Tree counter doesn't update properly
- Database operations don't work
- Missing OpenAI integration

**If You Encounter 405 Errors:**
1. **Don't change application code** - it's likely a deployment issue
2. Check Vercel deployment configuration
3. Verify environment variables in production
4. Ensure proper API route headers/CORS
5. Stay at commit `08c8a4d` for reliable functionality

### Common Development Issues

**Build Errors:**
```bash
# TypeScript errors
npx tsc --noEmit
# Fix any type issues before proceeding

# Lint errors  
npm run lint
# Address ESLint warnings
```

**Database Connection Issues:**
```bash
# Test database connectivity
node scripts/test-db-connection.js
# Check environment variables and Supabase configuration
```

**OpenAI API Issues:**
- Verify API key is set and valid
- Check quota limits in OpenAI dashboard
- Test with: `node -e "console.log(process.env.OPENAI_API_KEY)"`

## 🎯 Key Features & Business Logic

### Tree Calculation Logic
```javascript
// Located in: src/lib/impact.ts
const costPerQuery = (inputTokens * inputRate + outputTokens * outputRate) / 1000
const donation = costPerQuery * 0.4  // 40% donated
const treesPlanted = donation * 2.5  // £1 = 2.5 trees (Ecosia model)
```

### Authentication Flow
1. User lands on homepage (/)
2. If not authenticated → show sign-in with Google
3. If authenticated → redirect to /chat
4. Google OAuth via Supabase creates user profile automatically

### Chat Flow
1. User submits message in ChatInterface
2. Frontend calls `fetch('/api/chat')` with message, model, sessionId
3. API route validates auth, processes with OpenAI, records in database
4. Response includes AI message + trees planted count
5. Frontend updates chat history and tree counter

## 🔍 Debugging Guide

### Verify System Health
```bash
# 1. Check if dev server starts
npm run dev

# 2. Test database connection
node scripts/test-db-connection.js

# 3. Verify OpenAI API
# Visit: http://localhost:3000/api/chat (should get 405 for GET)

# 4. Check TypeScript
npx tsc --noEmit

# 5. Test build
npm run build
```

### Debug Chat Issues
1. **No AI Response**: Check OpenAI API key and quota
2. **Trees Not Updating**: Verify database connection and impact calculation
3. **Auth Issues**: Check Supabase configuration and Google OAuth setup
4. **UI Issues**: Check browser console for JavaScript errors

## 📋 Quick Commands Reference

```bash
# Development
npm run dev                           # Start development server
npm run build                         # Production build
npm run lint                          # Code quality check
npm run format                        # Format code

# Testing  
node scripts/test-db-connection.js    # Test database
npx tsc --noEmit                     # TypeScript check

# Git (IMPORTANT)
git checkout 08c8a4d                 # Switch to stable working commit
git status                           # Check current state
git stash                            # Backup uncommitted changes
```

## 🎖️ Best Practices for AI Assistants

1. **Always verify current commit**: Use `git log --oneline -5` to check
2. **Stay at 08c8a4d**: Don't use later commits unless explicitly asked
3. **Test changes locally**: Use `npm run dev` to verify functionality
4. **Check environment**: Run database connection test before major changes
5. **Preserve working code**: Don't refactor working components unless necessary
6. **Focus on stability**: Prioritize maintaining current functionality over new features

## 🆘 Emergency Procedures

**If Development Environment Breaks:**
```bash
# 1. Return to working state
git stash                            # Save any work
git checkout 08c8a4d                 # Go to stable commit
npm install                          # Reinstall dependencies
npm run dev                          # Start fresh

# 2. If still broken, check environment
node scripts/test-db-connection.js   # Verify database
echo $OPENAI_API_KEY                # Check API key
```

**If Asked to "Fix" 405 Errors:**
- **DON'T** modify application code
- **DON'T** switch to Server Actions
- **DO** investigate deployment/environment issues
- **DO** stay at commit 08c8a4d for reliable baseline

---

**Last Updated**: August 2025  
**Stable Commit**: 08c8a4d - "Fix sidebar tree counter not updating in real-time"  
**Status**: All systems operational and verified working