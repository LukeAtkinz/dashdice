# Deploy Go Backend to Vercel

## Steps to Deploy

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy from api-backend directory**:
```bash
cd api-backend
vercel --prod
```

## Configuration

The `vercel.json` file is already configured with:
- Individual Go serverless functions for each endpoint
- Proper routing for `/api/v1/*` paths
- CORS headers for browser requests
- Function timeouts optimized for each endpoint

## Environment Variables

You may need to set these in your Vercel dashboard:
- `FIREBASE_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS` (service account key as base64)

## Testing

After deployment, test the health endpoint:
```bash
curl https://your-vercel-deployment.vercel.app/health
```

## Integration

The frontend is already configured to:
1. Use the proxy system in production (`/api/proxy`)
2. Fall back to Firebase if Go backend is unavailable
3. Automatically detect production environment

Once deployed, update the proxy routes in the main app to point to your Vercel deployment instead of `https://api.dashdice.gg`.
