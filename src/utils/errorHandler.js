export class ApiError extends Error {
  constructor(message, code, statusCode, apiName) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.apiName = apiName;
  }
}

export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class RateLimitError extends Error {
  constructor(message, retryAfter) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export function handleApiError(error, apiName) {
  console.error(`[${apiName}] Error:`, error);
  
  if (error.name === 'RateLimitError') {
    return {
      error: 'Rate limit exceeded',
      message: error.message,
      retryAfter: error.retryAfter,
      apiName
    };
  }
  
  if (error.name === 'ValidationError') {
    return {
      error: 'Validation failed',
      message: error.message,
      field: error.field,
      apiName
    };
  }
  
  if (error.message.includes('HTTP 401')) {
    return {
      error: 'Authentication failed',
      message: 'Invalid or missing API credentials',
      apiName
    };
  }
  
  if (error.message.includes('HTTP 403')) {
    return {
      error: 'Access forbidden',
      message: 'Insufficient permissions for this API endpoint',
      apiName
    };
  }
  
  if (error.message.includes('HTTP 404')) {
    return {
      error: 'Resource not found',
      message: 'The requested resource does not exist',
      apiName
    };
  }
  
  if (error.message.includes('timeout')) {
    return {
      error: 'Request timeout',
      message: 'The API request timed out',
      apiName
    };
  }
  
  // Generic error
  return {
    error: 'API request failed',
    message: error.message,
    apiName
  };
}