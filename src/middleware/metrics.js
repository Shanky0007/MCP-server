/**
 * Performance metrics and monitoring system
 */
export class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byApi: {},
        byTool: {}
      },
      performance: {
        totalResponseTime: 0,
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        responseTimeHistory: []
      },
      errors: {
        total: 0,
        byType: {},
        byApi: {}
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      startTime: Date.now()
    };
  }

  /**
   * Record a request start
   */
  startRequest(apiName, toolName) {
    return {
      apiName,
      toolName,
      startTime: Date.now(),
      requestId: this.generateRequestId()
    };
  }

  /**
   * Record a successful request completion
   */
  recordSuccess(requestContext, responseSize = 0) {
    const duration = Date.now() - requestContext.startTime;
    
    this.metrics.requests.total++;
    this.metrics.requests.successful++;
    
    // Track by API
    if (!this.metrics.requests.byApi[requestContext.apiName]) {
      this.metrics.requests.byApi[requestContext.apiName] = { total: 0, successful: 0, failed: 0 };
    }
    this.metrics.requests.byApi[requestContext.apiName].total++;
    this.metrics.requests.byApi[requestContext.apiName].successful++;
    
    // Track by tool
    if (!this.metrics.requests.byTool[requestContext.toolName]) {
      this.metrics.requests.byTool[requestContext.toolName] = { total: 0, successful: 0, failed: 0 };
    }
    this.metrics.requests.byTool[requestContext.toolName].total++;
    this.metrics.requests.byTool[requestContext.toolName].successful++;
    
    // Performance metrics
    this.recordPerformance(duration);
    
    console.error(`[METRICS] ${requestContext.apiName}:${requestContext.toolName} completed in ${duration}ms`);
  }

  /**
   * Record a failed request
   */
  recordFailure(requestContext, error) {
    const duration = Date.now() - requestContext.startTime;
    
    this.metrics.requests.total++;
    this.metrics.requests.failed++;
    
    // Track by API
    if (!this.metrics.requests.byApi[requestContext.apiName]) {
      this.metrics.requests.byApi[requestContext.apiName] = { total: 0, successful: 0, failed: 0 };
    }
    this.metrics.requests.byApi[requestContext.apiName].total++;
    this.metrics.requests.byApi[requestContext.apiName].failed++;
    
    // Track by tool
    if (!this.metrics.requests.byTool[requestContext.toolName]) {
      this.metrics.requests.byTool[requestContext.toolName] = { total: 0, successful: 0, failed: 0 };
    }
    this.metrics.requests.byTool[requestContext.toolName].total++;
    this.metrics.requests.byTool[requestContext.toolName].failed++;
    
    // Error tracking
    this.recordError(error.name || 'UnknownError', requestContext.apiName);
    
    console.error(`[METRICS] ${requestContext.apiName}:${requestContext.toolName} failed in ${duration}ms - ${error.message}`);
  }

  /**
   * Record performance metrics
   */
  recordPerformance(duration) {
    this.metrics.performance.totalResponseTime += duration;
    this.metrics.performance.avgResponseTime = 
      this.metrics.performance.totalResponseTime / this.metrics.requests.total;
    
    if (duration < this.metrics.performance.minResponseTime) {
      this.metrics.performance.minResponseTime = duration;
    }
    
    if (duration > this.metrics.performance.maxResponseTime) {
      this.metrics.performance.maxResponseTime = duration;
    }
    
    // Keep last 100 response times for trend analysis
    this.metrics.performance.responseTimeHistory.push({
      duration,
      timestamp: Date.now()
    });
    
    if (this.metrics.performance.responseTimeHistory.length > 100) {
      this.metrics.performance.responseTimeHistory.shift();
    }
  }

  /**
   * Record error
   */
  recordError(errorType, apiName) {
    this.metrics.errors.total++;
    
    if (!this.metrics.errors.byType[errorType]) {
      this.metrics.errors.byType[errorType] = 0;
    }
    this.metrics.errors.byType[errorType]++;
    
    if (!this.metrics.errors.byApi[apiName]) {
      this.metrics.errors.byApi[apiName] = 0;
    }
    this.metrics.errors.byApi[apiName]++;
  }

  /**
   * Update cache metrics
   */
  updateCacheMetrics(cacheStats) {
    this.metrics.cache = {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hitRate
    };
  }

  /**
   * Get comprehensive metrics report
   */
  getReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
    
    return {
      summary: {
        uptime: `${uptimeHours} hours`,
        totalRequests: this.metrics.requests.total,
        successRate: this.metrics.requests.total > 0 
          ? `${((this.metrics.requests.successful / this.metrics.requests.total) * 100).toFixed(2)}%`
          : '0%',
        avgResponseTime: `${this.metrics.performance.avgResponseTime.toFixed(2)}ms`,
        cacheHitRate: this.metrics.cache.hitRate
      },
      requests: this.metrics.requests,
      performance: {
        ...this.metrics.performance,
        avgResponseTime: `${this.metrics.performance.avgResponseTime.toFixed(2)}ms`,
        minResponseTime: this.metrics.performance.minResponseTime === Infinity 
          ? 'N/A' 
          : `${this.metrics.performance.minResponseTime}ms`,
        maxResponseTime: `${this.metrics.performance.maxResponseTime}ms`
      },
      errors: this.metrics.errors,
      cache: this.metrics.cache
    };
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byApi: {},
        byTool: {}
      },
      performance: {
        totalResponseTime: 0,
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        responseTimeHistory: []
      },
      errors: {
        total: 0,
        byType: {},
        byApi: {}
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      startTime: Date.now()
    };
  }
}