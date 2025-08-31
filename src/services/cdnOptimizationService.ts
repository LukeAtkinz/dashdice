/**
 * CDN Optimization Service
 * Serves static assets from global CDN with intelligent caching
 */
export class CDNOptimizationService {
  
  // CDN configuration
  private static readonly CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.dashdice.com';
  private static readonly FALLBACK_BASE_URL = '/'; // Local fallback
  
  // Asset categories with different cache strategies
  private static readonly ASSET_CATEGORIES = {
    backgrounds: {
      path: 'backgrounds',
      cacheDuration: '31536000', // 1 year
      compression: 'br, gzip',
      formats: ['webp', 'jpg', 'png', 'mp4']
    },
    diceModels: {
      path: 'dice-models',
      cacheDuration: '2592000', // 30 days
      compression: 'br, gzip',
      formats: ['glb', 'obj', 'fbx']
    },
    audio: {
      path: 'audio',
      cacheDuration: '604800', // 7 days
      compression: 'br, gzip',
      formats: ['mp3', 'wav', 'ogg']
    },
    ui: {
      path: 'ui',
      cacheDuration: '86400', // 1 day
      compression: 'br, gzip',
      formats: ['svg', 'png', 'webp']
    }
  };
  
  // Asset cache for client-side optimization
  private static assetCache: Map<string, {
    url: string;
    blob?: Blob;
    lastAccessed: number;
    cacheExpiry: number;
  }> = new Map();
  
  /**
   * Get optimized URL for asset with CDN routing
   */
  static getAssetUrl(category: keyof typeof CDNOptimizationService.ASSET_CATEGORIES, filename: string): string {
    const config = this.ASSET_CATEGORIES[category];
    if (!config) {
      console.warn(`Unknown asset category: ${category}`);
      return `${this.FALLBACK_BASE_URL}${filename}`;
    }
    
    // Check if CDN is available
    if (this.isCDNAvailable()) {
      const optimizedUrl = this.buildCDNUrl(category, filename);
      console.log(`🌐 Serving ${filename} from CDN: ${optimizedUrl}`);
      return optimizedUrl;
    } else {
      console.log(`📁 Serving ${filename} locally: fallback mode`);
      return `${this.FALLBACK_BASE_URL}${config.path}/${filename}`;
    }
  }
  
  /**
   * Build optimized CDN URL with parameters
   */
  private static buildCDNUrl(category: keyof typeof CDNOptimizationService.ASSET_CATEGORIES, filename: string): string {
    const config = this.ASSET_CATEGORIES[category];
    const baseUrl = `${this.CDN_BASE_URL}/${config.path}/${filename}`;
    
    // Add optimization parameters
    const params = new URLSearchParams();
    
    // Add cache control
    params.set('cache', config.cacheDuration);
    
    // Add compression preference
    params.set('compress', config.compression);
    
    // Add format optimization for images
    if (category === 'backgrounds' || category === 'ui') {
      params.set('format', 'webp');
      params.set('quality', '85');
    }
    
    // Add responsive sizing for backgrounds
    if (category === 'backgrounds') {
      params.set('auto', 'compress,format');
      params.set('fit', 'cover');
    }
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  /**
   * Preload critical assets
   */
  static async preloadCriticalAssets(): Promise<void> {
    console.log('🚀 Preloading critical assets...');
    
    const criticalAssets = [
      { category: 'backgrounds' as const, files: ['Relax.png', 'New Day.mp4'] },
      { category: 'ui' as const, files: ['dice-icon.svg', 'loading-spinner.svg'] },
      { category: 'diceModels' as const, files: ['standard-dice.glb'] }
    ];
    
    const preloadPromises = criticalAssets.flatMap(({ category, files }) =>
      files.map(filename => this.preloadAsset(category, filename))
    );
    
    try {
      await Promise.allSettled(preloadPromises);
      console.log('✅ Critical assets preloaded');
    } catch (error) {
      console.error('❌ Error preloading assets:', error);
    }
  }
  
  /**
   * Preload individual asset with caching
   */
  static async preloadAsset(category: keyof typeof CDNOptimizationService.ASSET_CATEGORIES, filename: string): Promise<void> {
    const url = this.getAssetUrl(category, filename);
    const cacheKey = `${category}_${filename}`;
    
    // Check if already cached
    if (this.assetCache.has(cacheKey)) {
      const cached = this.assetCache.get(cacheKey)!;
      if (Date.now() < cached.cacheExpiry) {
        console.log(`💾 Asset ${filename} already cached`);
        return;
      }
    }
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept-Encoding': 'br, gzip, deflate',
          'Cache-Control': 'max-age=31536000'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Cache the asset
      this.assetCache.set(cacheKey, {
        url,
        blob,
        lastAccessed: Date.now(),
        cacheExpiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      });
      
      console.log(`✅ Preloaded and cached: ${filename}`);
      
    } catch (error) {
      console.error(`❌ Failed to preload ${filename}:`, error);
    }
  }
  
  /**
   * Get cached asset blob URL
   */
  static getCachedAssetUrl(category: keyof typeof CDNOptimizationService.ASSET_CATEGORIES, filename: string): string | null {
    const cacheKey = `${category}_${filename}`;
    const cached = this.assetCache.get(cacheKey);
    
    if (!cached || Date.now() > cached.cacheExpiry) {
      return null;
    }
    
    if (cached.blob) {
      cached.lastAccessed = Date.now();
      return URL.createObjectURL(cached.blob);
    }
    
    return cached.url;
  }
  
  /**
   * Browser-specific asset optimization
   */
  static getBrowserOptimizedUrl(category: keyof typeof CDNOptimizationService.ASSET_CATEGORIES, filename: string): string {
    const supportsWebP = this.supportsWebP();
    const supportsAVIF = this.supportsAVIF();
    
    // Return optimized format based on browser support
    if (category === 'backgrounds' || category === 'ui') {
      if (supportsAVIF && filename.endsWith('.jpg') || filename.endsWith('.png')) {
        filename = filename.replace(/\.(jpg|png)$/, '.avif');
      } else if (supportsWebP && filename.endsWith('.jpg') || filename.endsWith('.png')) {
        filename = filename.replace(/\.(jpg|png)$/, '.webp');
      }
    }
    
    return this.getAssetUrl(category, filename);
  }
  
  /**
   * Progressive loading for large assets
   */
  static async loadAssetProgressively(
    category: keyof typeof CDNOptimizationService.ASSET_CATEGORIES, 
    filename: string,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<Blob> {
    const url = this.getAssetUrl(category, filename);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }
    
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        if (onProgress && total > 0) {
          onProgress(loaded, total);
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return new Blob(chunks as BlobPart[]);
  }
  
  /**
   * Cleanup expired cache entries
   */
  static cleanupCache(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [key, cached] of this.assetCache.entries()) {
      if (now > cached.cacheExpiry) {
        expired.push(key);
        
        // Revoke blob URLs to free memory
        if (cached.blob) {
          URL.revokeObjectURL(cached.url);
        }
      }
    }
    
    expired.forEach(key => this.assetCache.delete(key));
    
    if (expired.length > 0) {
      console.log(`🧹 Cleaned up ${expired.length} expired cache entries`);
    }
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats(): any {
    const stats = {
      totalEntries: this.assetCache.size,
      totalSize: 0,
      oldestEntry: Date.now(),
      newestEntry: 0,
      hitRate: 0
    };
    
    for (const cached of this.assetCache.values()) {
      if (cached.blob) {
        stats.totalSize += cached.blob.size;
      }
      stats.oldestEntry = Math.min(stats.oldestEntry, cached.lastAccessed);
      stats.newestEntry = Math.max(stats.newestEntry, cached.lastAccessed);
    }
    
    return stats;
  }
  
  // Browser capability detection
  private static supportsWebP(): boolean {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  
  private static supportsAVIF(): boolean {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }
  
  // CDN availability check
  private static isCDNAvailable(): boolean {
    // In production, always try CDN first
    if (process.env.NODE_ENV === 'production') {
      return true;
    }
    
    // In development, check if CDN URL is configured
    return !!process.env.NEXT_PUBLIC_CDN_URL;
  }
  
  /**
   * Initialize CDN optimization
   */
  static initialize(): void {
    console.log('🌐 CDN Optimization Service initialized');
    
    // Preload critical assets
    this.preloadCriticalAssets();
    
    // Set up periodic cache cleanup
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.cleanupCache();
      }, 5 * 60 * 1000); // Every 5 minutes
    }
    
    // Monitor cache performance
    if (typeof window !== 'undefined') {
      setInterval(() => {
        const stats = this.getCacheStats();
        console.log('📊 CDN Cache Stats:', stats);
      }, 10 * 60 * 1000); // Every 10 minutes
    }
  }
}
