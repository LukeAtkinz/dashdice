# Local Development Setup Guide

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Firebase project credentials

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template file and configure your local environment:

```bash
# Windows PowerShell
Copy-Item env-local-template.txt .env.local

# Mac/Linux
cp env-local-template.txt .env.local
```

Then edit `.env.local` and replace all placeholder values with your actual Firebase credentials from:
- Firebase Console > Project Settings > General > Your apps
- Firebase Console > Project Settings > Service Accounts > Generate Private Key

**Important:** `.env.local` is gitignored and should NEVER be committed to version control.

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Environment Files

- `.env.local` - Local development (gitignored, create from template)
- `.env.staging` - Staging environment (tracked in git)
- `.env.production` - Production environment (tracked in git)
- `env-local-template.txt` - Template for .env.local setup (tracked in git)

## Common Issues

### Firebase: Error (auth/invalid-api-key)
- **Cause:** Missing or incorrect `.env.local` file
- **Solution:** Create `.env.local` from template and add valid Firebase credentials

### Module not found errors
- **Cause:** Missing dependencies
- **Solution:** Run `npm install`

### Port 3000 already in use
- **Cause:** Another process is using port 3000
- **Solution:** Kill the process or use a different port: `npm run dev -- -p 3001`

## Deployment

### Production Deployment
```bash
npm run deploy:production
```

This will:
1. Build the production bundle
2. Deploy to Vercel
3. Use environment variables from Vercel dashboard

## Important Notes

1. **Never commit `.env.local`** - It contains sensitive credentials
2. **Always use the template** - Update `env-local-template.txt` when adding new environment variables
3. **Check .gitignore** - Ensure sensitive files are ignored
4. **Restart dev server** - After changing environment variables, restart the dev server

## Package.json Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run dev:webpack` - Start development server with Webpack
- `npm run build` - Build production bundle
- `npm run start` - Start production server locally
- `npm run lint` - Run ESLint
- `npm run deploy:production` - Deploy to production (Vercel)

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Hosting:** Vercel
- **Mobile:** Capacitor (iOS/Android)
