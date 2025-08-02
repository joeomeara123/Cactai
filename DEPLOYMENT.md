# CactAI Production Deployment Guide

This guide provides step-by-step instructions for deploying CactAI to production with Vercel and Supabase.

## Prerequisites

- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) account  
- [OpenAI](https://openai.com) API key
- [Google Cloud Console](https://console.cloud.google.com) project for OAuth

## 1. Supabase Database Setup

### 1.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and enter project details
4. Wait for project to be created (~3 minutes)

### 1.2 Set Up Database Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the entire contents of `database/schema.sql`
3. Click **Run** to execute
4. Verify tables are created in **Table Editor**

### 1.3 Set Up Row Level Security
1. In **SQL Editor**, run the contents of `database/rls-policies.sql`
2. This enables RLS and creates all necessary policies
3. Verify policies are active in **Authentication → Policies**

### 1.4 Configure Authentication
1. Go to **Authentication → Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Set **Redirect URL** to: `https://your-domain.vercel.app/auth/callback`

## 2. Google OAuth Setup

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing one
3. Enable **Google+ API** and **OAuth consent screen**

### 2.2 Configure OAuth Consent Screen
1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** user type
3. Fill in application details:
   - **App name**: CactAI
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes: `openid`, `email`, `profile`
5. Add test users if in development

### 2.3 Create OAuth Credentials
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client IDs**
3. Select **Web application**
4. Add authorized redirect URIs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.vercel.app/auth/callback`
5. Copy **Client ID** and **Client Secret**

## 3. Environment Variables

Create these environment variables in both development (`.env.local`) and production:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration  
OPENAI_API_KEY=sk-your_openai_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn
ANALYTICS_ID=your_analytics_id
```

## 4. Vercel Deployment

### 4.1 Deploy from GitHub
1. Connect your repository to Vercel
2. Import the project
3. Configure build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 4.2 Set Environment Variables
1. Go to **Settings → Environment Variables**
2. Add all variables from step 3
3. Make sure `NEXT_PUBLIC_APP_URL` points to your Vercel domain

### 4.3 Deploy
1. Push to main branch or click **Deploy**
2. Wait for deployment to complete
3. Test the application

## 5. Post-Deployment Testing

### 5.1 Database Connection Test
Run the test script locally pointing to production:
```bash
npm run test:db
```

### 5.2 Authentication Flow Test
1. Visit your deployed application
2. Try Google sign-in
3. Check if user profile is created in Supabase
4. Verify tree counter appears

### 5.3 Chat Functionality Test
1. Send a test message
2. Verify response is received
3. Check database for recorded query
4. Confirm tree count increases

## 6. Monitoring Setup

### 6.1 Supabase Monitoring
1. Go to **Settings → API**
2. Monitor request volume and performance
3. Set up alerts for high usage

### 6.2 Vercel Analytics
1. Enable Vercel Analytics in project settings
2. Monitor Core Web Vitals
3. Track user engagement

### 6.3 Error Tracking (Optional)
1. Sign up for [Sentry](https://sentry.io)
2. Add `SENTRY_DSN` environment variable
3. Install Sentry SDK: `npm install @sentry/nextjs`

## 7. Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] OAuth redirect URLs limited to your domains  
- [ ] API keys stored as environment variables
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] Input validation in place

## 8. Performance Optimization

### 8.1 Database Optimization
- Ensure indexes are created (done in schema.sql)
- Monitor query performance in Supabase
- Consider connection pooling for high traffic

### 8.2 Frontend Optimization
- Enable Vercel Edge Functions if needed
- Configure proper caching headers
- Optimize images and fonts

## 9. Backup Strategy

### 9.1 Supabase Backups
- Daily automatic backups enabled by default
- Test restore procedure monthly
- Consider point-in-time recovery for critical data

### 9.2 Code Backups
- Repository hosted on GitHub
- Tagged releases for major deployments
- Environment variables documented securely

## 10. Troubleshooting

### Common Issues

**Authentication not working:**
- Check OAuth redirect URLs match exactly
- Verify Google OAuth credentials
- Check Supabase provider configuration

**Database errors:**
- Verify RLS policies are correctly applied
- Check user permissions
- Review SQL execution logs

**API errors:**
- Verify OpenAI API key is valid and has credits
- Check rate limiting configuration
- Review error logs in Vercel

**Performance issues:**
- Monitor database query performance
- Check for N+1 query problems
- Optimize React component renders

### Getting Help

1. Check [Supabase Documentation](https://supabase.com/docs)
2. Review [Next.js Documentation](https://nextjs.org/docs)
3. Check [Vercel Documentation](https://vercel.com/docs)
4. Open issue in project repository

## 11. Maintenance

### Regular Tasks
- Monitor error rates and performance
- Update dependencies monthly
- Review and rotate API keys quarterly
- Test backup and restore procedures

### Scaling Considerations
- Monitor Supabase usage limits
- Consider upgrading plans as user base grows
- Implement Redis for advanced caching
- Set up CDN for static assets

---

This deployment guide ensures a production-ready setup with proper security, monitoring, and performance optimization.