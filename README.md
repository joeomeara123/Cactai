# CactAI 🌵

**The Social Good LLM** - Like Ecosia for AI conversations. Every query you make helps plant trees!

CactAI is an AI chatbot platform that donates 40% of revenue to environmental causes. Users can chat with advanced AI models while knowing their conversations are helping to reforest the planet.

## Features

- 🤖 **Multi-Model AI Chat** - Access GPT-4, Claude, and other leading AI models
- 🌳 **Environmental Impact Tracking** - See how many trees your queries have planted
- 🚀 **Fast & Responsive** - Built with Next.js 14 and modern web technologies
- 🔐 **Secure Authentication** - Google sign-in via Supabase
- 📊 **Personal Dashboard** - Track your environmental impact over time

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (Database + Auth)
- **AI**: OpenAI GPT-4, with support for multiple providers
- **Hosting**: Vercel (Frontend), Supabase (Backend)

## Getting Started

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Add your Supabase and OpenAI credentials
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Impact Model

- Every query costs ~£0.04 to process
- 40% (£0.016) goes to environmental causes
- £1 = 2.5 trees planted (based on Ecosia model)
- Result: ~0.04 trees planted per query

## MVP Timeline

- **Day 1**: Project setup ✅
- **Day 2**: Chat interface + Auth + Impact tracking
- **Day 3**: Dashboard + Polish + Testing

## Contributing

This is an MVP built for rapid iteration. Current focus is on core functionality before adding complexity.
