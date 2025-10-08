// Development environment bypass for testing abilities
// This allows testing the abilities system locally safely

// Check if running in development/staging and bypass protection
export function isDevelopmentEnvironment() {
  return process.env.NODE_ENV === 'development' || 
         process.env.NEXT_PUBLIC_ENV === 'staging' ||
         process.env.VERCEL_ENV === 'preview';
}

// Safe development configuration
export function getDevelopmentConfig() {
  return {
    // Use production backend but with development safety checks
    backendUrl: process.env.GO_BACKEND_URL || 'https://go-backend-production-448a.up.railway.app',
    
    // Disable cache in development for easier testing
    disableCache: isDevelopmentEnvironment(),
    
    // Add development headers for identification
    developmentHeaders: isDevelopmentEnvironment() ? {
      'X-Development-Mode': 'true',
      'X-Testing-Abilities': 'true'
    } : {}
  };
}