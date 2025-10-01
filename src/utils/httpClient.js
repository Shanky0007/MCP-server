import fetch from 'node-fetch';
import { config } from '../config/settings.js';

export class HttpClient {
  constructor(apiName) {
    this.apiName = apiName;
    this.config = config.apis[apiName];
    this.requestCount = 0;
    this.resetTime = Date.now() + this.config.rateLimit.window;
    
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
   * Make HTTP request with retries and error handling
   */
  async request(endpoint, options = {}) {
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
}