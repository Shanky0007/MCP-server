import { ValidationError } from './errorHandler.js';

export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
}

export function validateString(value, fieldName, minLength = 1, maxLength = 1000) {
  validateRequired(value, fieldName);
  
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }
  
  if (value.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters long`, fieldName);
  }
  
  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} must be no more than ${maxLength} characters long`, fieldName);
  }
}

export function validateNumber(value, fieldName, min = 0, max = Infinity) {
  if (value !== undefined && value !== null) {
    const num = Number(value);
    if (isNaN(num)) {
      throw new ValidationError(`${fieldName} must be a valid number`, fieldName);
    }
    
    if (num < min || num > max) {
      throw new ValidationError(`${fieldName} must be between ${min} and ${max}`, fieldName);
    }
  }
}

export function validateGitHubUsername(username) {
  validateString(username, 'username', 1, 39);
  
  // GitHub username validation rules
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) {
    throw new ValidationError(
      'Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen',
      'username'
    );
  }
}

export function validateGitHubRepo(repo) {
  validateString(repo, 'repository', 1, 100);
  
  // Basic repository name validation
  if (!/^[a-zA-Z0-9._-]+$/.test(repo)) {
    throw new ValidationError(
      'Repository name may only contain alphanumeric characters, periods, hyphens, and underscores',
      'repository'
    );
  }
}

export function validateGitHubOwnerRepo(ownerRepo) {
  validateString(ownerRepo, 'owner/repo');
  
  if (!ownerRepo.includes('/')) {
    throw new ValidationError('Format must be "owner/repository"', 'owner/repo');
  }
  
  const [owner, repo] = ownerRepo.split('/');
  validateGitHubUsername(owner);
  validateGitHubRepo(repo);
}