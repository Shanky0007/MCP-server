import fetch from 'node-fetch';
import { config } from '../config/settings.js';
import { AdvancedCache } from '../middleware/cache.js';

// Global cache instance
const globalCache = new AdvancedCache({
  maxSize: config.cache.maxSize,
  defaultTTL: config.cache.ttl
});

export class HttpClient {
  constructor(apiName) {
    this.apiName = apiName;
    this.config = config.apis[apiName];
    this.requestCount = 0;
    this.resetTime = Date.now() + this.config.rateLimit.window;
    this.cache = globalCache;
    
    if (!this.config) {
      throw new Error(`API configuration not found for: ${apiName}`);
    }
  }

  /**
   * Check if we're within rate limits
   */
  checkRateLimit() {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + this.config.rateLimit.window;
    }
    
    if (this.requestCount >= this.config.rateLimit.requests) {
      const waitTime = this.resetTime - now;
      throw new Error(`Rate limit exceeded for ${this.apiName}. Try again in ${Math.ceil(waitTime / 1000)} seconds`);
    }
  }

  /**
   * Get authentication headers based on API type
   */
  getAuthHeaders() {
    const headers = {};
    
    switch (this.config.authType) {
      case 'token':
        if (this.apiName === 'github' && config.env.GITHUB_TOKEN) {
          headers['Authorization'] = `Bearer ${config.env.GITHUB_TOKEN}`;
        }
        break;
      case 'apiKey':
        if (this.apiName === 'weather' && config.env.WEATHER_API_KEY) {
          headers['X-API-Key'] = config.env.WEATHER_API_KEY;
        } else if (this.apiName === 'news' && config.env.NEWS_API_KEY) {
          headers['X-API-Key'] = config.env.NEWS_API_KEY;
        }
        break;
      case 'none':
        // No authentication required
        break;
    }
    
    return headers;
  }

  /**
   * Make HTTP request with retries, error handling, and caching
   */
  async request(endpoint, options = {}) {
    // Generate cache key
    const cacheKey = this.cache.generateKey(
      this.apiName, 
      endpoint, 
      { method: options.method || 'GET', ...options.params }
    );
    
    // Check cache for GET requests
    if (!options.method || options.method === 'GET') {
      const cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse) {
        console.error(`[${this.apiName}] Cache HIT for ${endpoint}`);
        return cachedResponse;
      }
      console.error(`[${this.apiName}] Cache MISS for ${endpoint}`);
    }

    this.checkRateLimit();
    
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'User-Agent': 'Universal-API-Gateway-MCP/1.0.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options.headers
    };

    const requestOptions = {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      timeout: this.config.timeout,
      ...options
    };

    let lastError;
    
    // Retry logic
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        this.requestCount++;
        
        console.error(`[${this.apiName}] ${requestOptions.method} ${url} (attempt ${attempt + 1})`);
        
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        // Cache successful GET requests
        if ((!options.method || options.method === 'GET')) {
          this.cache.set(cacheKey, data, this.getCacheTTL(endpoint));
          console.error(`[${this.apiName}] Cached response for ${endpoint}`);
        }
        
        console.error(`[${this.apiName}] Request successful`);
        return data;
        
      } catch (error) {
        lastError = error;
        console.error(`[${this.apiName}] Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < this.config.retries - 1) {
          // Exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          console.error(`[${this.apiName}] Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Get appropriate cache TTL based on endpoint
   */
  getCacheTTL(endpoint) {
    // Different endpoints have different cache strategies
    if (endpoint.includes('/users/') && !endpoint.includes('/repos')) {
      return 600000; // User profiles: 10 minutes
    }
    if (endpoint.includes('/repos/') && !endpoint.includes('/issues')) {
      return 300000; // Repository info: 5 minutes
    }
    if (endpoint.includes('/search/')) {
      return 180000; // Search results: 3 minutes
    }
    if (endpoint.includes('/issues')) {
      return 60000; // Issues: 1 minute (more dynamic)
    }
    return this.cache.defaultTTL; // Default: 5 minutes
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(fullEndpoint);
  }

  /**
   * POST request
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache() {
    return this.cache.clear();
  }

  /**
   * Get the cache instance
   * @returns {AdvancedCache} The cache instance
   */
  getCache() {
    return this.cache;
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    return this.cache.cleanup();
  }

  /**
   * Get global cache instance (static method)
   */
  static getGlobalCache() {
    return globalCache;
  }
}