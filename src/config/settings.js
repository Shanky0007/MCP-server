import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load API configurations
const apiConfigPath = join(__dirname, 'apis.json');
const apiConfigs = JSON.parse(readFileSync(apiConfigPath, 'utf-8'));

export const config = {
  // API configurations
  apis: apiConfigs,
  
  // Environment variables
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    WEATHER_API_KEY: process.env.WEATHER_API_KEY,
    NEWS_API_KEY: process.env.NEWS_API_KEY,
  },
  
  // Server configuration
  server: {
    name: 'Universal MCP Gateway',
    version: '1.0.0',
    port: process.env.PORT || 3000,
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  
  // Cache configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 300000, // 5 minutes default
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 100,
  }
};

// Validation function
export function validateConfig() {
  const warnings = [];
  
  // Check for GitHub token (not required but recommended)
  if (!config.env.GITHUB_TOKEN) {
    warnings.push('GITHUB_TOKEN environment variable not set - using public API access only (rate limited)');
  }
  
  // Weather and News APIs are optional for now
  if (!config.env.WEATHER_API_KEY) {
    warnings.push('WEATHER_API_KEY not set - weather features will be unavailable');
  }
  
  if (!config.env.NEWS_API_KEY) {
    warnings.push('NEWS_API_KEY not set - news features will be unavailable');
  }
  
  if (warnings.length > 0) {
    console.warn('Configuration warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  return true; // Always return true since GitHub token is optional
}

export default config;