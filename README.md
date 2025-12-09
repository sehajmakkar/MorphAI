# MorphAI - Autonomous AI Manager for Teams

An AI-first SaaS platform that acts as an autonomous project/engineering manager for teams.

## Phase 1 Implementation

This repository contains Phase 1 of the MorphAI MVP, which includes:

- User authentication with Supabase
- Project and Room creation
- Document upload and processing
- Vector storage for AI context

## Getting Started

See `GUIDE.md` for detailed setup and testing instructions.

## Technology Stack

- **Frontend**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini AI
- **Deployment**: Vercel

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Dashboard pages
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase client utilities
│   └── ai/               # AI-related utilities
└── supabase/             # Database migrations
```

## License

MIT

