#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Script to revert API route static export configurations
 * Removes static export declarations added by configure-api-routes-for-static.js
 */

const API_ROUTES_PATTERN = 'src/app/api/**/route.ts';

async function revertApiRoutes() {
  console.log('🔄 Reverting API routes static export configuration...');
  
  try {
    // Find all API route files
    const apiRouteFiles = glob.sync(API_ROUTES_PATTERN);
    console.log(`Found ${apiRouteFiles.length} API route files`);
    
    let revertedCount = 0;
    
    for (const filePath of apiRouteFiles) {
      const fullPath = path.resolve(filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check if has static export configuration
      if (!content.includes('export const dynamic')) {
        console.log(`⏭️  Skipping ${filePath} (no static config found)`);
        continue;
      }
      
      // Remove the static export configuration block
      const lines = content.split('\n');
      const filteredLines = [];
      let skipBlock = false;
      
      for (const line of lines) {
        if (line.includes('// Static export configuration for Capacitor builds')) {
          skipBlock = true;
          continue;
        }
        
        if (skipBlock && line.trim() === '') {
          skipBlock = false;
          continue;
        }
        
        if (skipBlock && (
          line.includes('export const dynamic') ||
          line.includes('export const revalidate') ||
          line.includes('export const fetchCache') ||
          line.includes('export const runtime') ||
          line.includes('export const preferredRegion')
        )) {
          continue;
        }
        
        if (skipBlock && line.trim() !== '') {
          skipBlock = false;
        }
        
        if (!skipBlock) {
          filteredLines.push(line);
        }
      }
      
      const newContent = filteredLines.join('\n');
      
      // Write the updated content
      fs.writeFileSync(fullPath, newContent);
      console.log(`✅ Reverted ${filePath}`);
      revertedCount++;
    }
    
    console.log(`\n🎉 Successfully reverted ${revertedCount} API routes`);
    
  } catch (error) {
    console.error('❌ Error reverting API routes:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  revertApiRoutes();
}

module.exports = { revertApiRoutes };
