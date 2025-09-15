#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Script to configure API routes for static export compatibility
 * Adds proper export declarations to API routes for Capacitor builds
 */

const API_ROUTES_PATTERN = 'src/app/api/**/route.ts';
const STATIC_EXPORT_CONFIG = `
// Static export configuration for Capacitor builds
export const dynamic = 'force-static';
export const revalidate = false;
export const fetchCache = 'force-cache';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
`;

async function configureApiRoutes() {
  console.log('🔧 Configuring API routes for static export...');
  
  try {
    // Find all API route files
    const apiRouteFiles = glob.sync(API_ROUTES_PATTERN);
    console.log(`Found ${apiRouteFiles.length} API route files`);
    
    let configuredCount = 0;
    
    for (const filePath of apiRouteFiles) {
      const fullPath = path.resolve(filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check if already configured
      if (content.includes('export const dynamic')) {
        console.log(`⏭️  Skipping ${filePath} (already configured)`);
        continue;
      }
      
      // Add static export configuration at the top of the file
      const lines = content.split('\n');
      let insertIndex = 0;
      
      // Find the first line that's not an import or comment
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('import') && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
          insertIndex = i;
          break;
        }
      }
      
      // Insert the static export configuration
      lines.splice(insertIndex, 0, STATIC_EXPORT_CONFIG);
      const newContent = lines.join('\n');
      
      // Write the updated content
      fs.writeFileSync(fullPath, newContent);
      console.log(`✅ Configured ${filePath}`);
      configuredCount++;
    }
    
    console.log(`\n🎉 Successfully configured ${configuredCount} API routes for static export`);
    
    if (configuredCount > 0) {
      console.log('\n📝 To revert these changes later, run:');
      console.log('node revert-api-routes-static.js');
    }
    
  } catch (error) {
    console.error('❌ Error configuring API routes:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  configureApiRoutes();
}

module.exports = { configureApiRoutes };
