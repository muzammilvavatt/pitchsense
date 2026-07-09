# PitchSense ⚽

A modern, production-ready sports analytics dashboard built with Next.js, Tailwind CSS, and Supabase. Engage in live football debates, provide tactical justifications, compete against AI insights, and climb the global leaderboard.

## Features
- **Match Hub**: Explore upcoming matches and submit your score and tactical predictions.
- **AI vs Human Analysis**: Compare machine-generated insights directly with user analyst justifications.
- **Live Debate Feed**: A seamless real-time feed utilizing Supabase Realtime for instantaneous upvoting.
- **Dynamic Leaderboard**: An automatically updating SQL-View tracking pundits based on a weighted scoring formula.
- **Automated Backend**: Python scripts automated via GitHub Actions to fetch live matches and score completed games daily.

## 🚀 Deployment Guide (Vercel)
To put PitchSense live on the internet so anyone can use it, follow these steps:

1. **Push to GitHub**:
   Upload this entire `pitchsense` folder to a new repository on your GitHub account.

2. **Deploy to Vercel**:
   - Go to [Vercel.com](https://vercel.com) and sign in with GitHub.
   - Click **Add New Project** and select your `pitchsense` repository.
   - **Important**: In the "Framework Preset" dropdown, make sure it says **Next.js**. 
   - **Important**: Change the "Root Directory" to `web` (since your Next.js app is inside the `/web` folder).
   - In the **Environment Variables** section, add:
     - `NEXT_PUBLIC_SUPABASE_URL` = (Your Supabase URL)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Your Supabase Anon Key)
   - Click **Deploy**!

3. **Backend Automation (GitHub Actions)**:
   I have already created the `.github/workflows/automation.yml` file for you! To make it work:
   - Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
   - Click **New repository secret** and add these three secrets:
     1. `SUPABASE_URL`
     2. `SUPABASE_KEY`
     3. `API_FOOTBALL_KEY`
   - GitHub will now automatically fetch new matches every morning and score finished games every night!

## Local Development
```bash
cd web
npm install
npm run dev
```
