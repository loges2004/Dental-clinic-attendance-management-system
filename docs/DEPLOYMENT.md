# Free-Tier Deployment Guide

## Production Architecture (Free Tier First)
- **Frontend**: Vercel Free Tier (PWA React Build)
- **Database**: Supabase PostgreSQL Free Tier (500MB storage)
- **Backend API**: Render / Railway / Free Java Cloud Service

## Environment Configuration
Set production environment variables according to `.env.example`.
Ensure `CORS_ALLOWED_ORIGINS` points to your Vercel frontend URL.
