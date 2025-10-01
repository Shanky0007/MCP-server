/**
 * Advanced in-memory cache with TTL, LRU eviction, and metrics
 */
export class AdvancedCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.cache = new Map();
    this.accessTimes = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      totalRequests: 0
    };
  }

  /**
   * Generate cache key from API endpoint and parameters
   */
  generateKey(apiName, endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${apiName}:${endpoint}:${sortedParams}`;
  }

  /**
   * Get item from cache
   */
  get(key) {
    this.metrics.totalRequests++;
    
    const item = this.cache.get(key);
    if (!item) {
      this.metrics.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      this.metrics.misses++;
      return null;
    }

    // Update access time for LRU
    this.accessTimes.set(key, Date.now());
    this.metrics.hits++;
    
    return item.data;
  }

  /**
   * Set item in cache with TTL
   */
  set(key, data, ttl = null) {
    const actualTTL = ttl || this.defaultTTL;
    const expiresAt = Date.now() + actualTTL;
    
    // If at capacity, evict least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now()
    });
    
    this.accessTimes.set(key, Date.now());
    this.metrics.sets++;
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Clear expired items
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get cache size
   */
  get size() {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    for (const [key, item] of this.cache) {
      totalSize += JSON.stringify(key).length;
      totalSize += JSON.stringify(item.data).length;
      totalSize += 100; // Overhead estimate
    }
    return `${(totalSize / 1024).toFixed(2)} KB`;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      totalRequests: 0
    };
  }

  /**
   * Delete specific key
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.accessTimes.delete(key);
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return false;
    }
    
    return true;
  }
}