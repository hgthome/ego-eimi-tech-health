const Joi = require('joi');

/**
 * Validate GitHub OAuth configuration
 */
function validateGitHubConfig() {
  const errors = [];
  
  if (!process.env.GITHUB_CLIENT_ID) {
    errors.push('GITHUB_CLIENT_ID environment variable is required');
  }
  
  if (!process.env.GITHUB_CLIENT_SECRET) {
    errors.push('GITHUB_CLIENT_SECRET environment variable is required');
  }
  
  if (!process.env.GITHUB_CALLBACK_URL) {
    errors.push('GITHUB_CALLBACK_URL environment variable is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate GitHub callback parameters
 */
const githubCallbackSchema = Joi.object({
  code: Joi.string().required(),
  state: Joi.string().optional()
});

function validateGitHubCallback(data) {
  return githubCallbackSchema.validate(data);
}

/**
 * Validate user session data
 */
const userSessionSchema = Joi.object({
  id: Joi.number().required(),
  login: Joi.string().required(),
  name: Joi.string().allow(null),
  email: Joi.string().email().allow(null),
  avatar_url: Joi.string().uri().allow(null),
  accessToken: Joi.string().required()
});

function validateUserSession(data) {
  return userSessionSchema.validate(data);
}

/**
 * Validate repository name format
 */
const repositoryNameSchema = Joi.string()
  .pattern(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/)
  .required()
  .messages({
    'string.pattern.base': 'Repository name must be in format "owner/repo"'
  });

function validateRepositoryName(repoName) {
  return repositoryNameSchema.validate(repoName);
}

/**
 * Check if user is authenticated middleware
 * Enhanced to also validate access token exists
 */
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate with GitHub first'
    });
  }
  
  // Also check if access token exists
  if (!req.session.user.accessToken) {
    return res.status(401).json({
      error: 'Access token missing',
      message: 'Please reauthenticate with GitHub - your session may have expired'
    });
  }
  
  next();
}

/**
 * Validate API rate limiting parameters
 */
function validateRateLimitConfig() {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS);
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS);
  
  const errors = [];
  
  if (isNaN(windowMs) || windowMs <= 0) {
    errors.push('RATE_LIMIT_WINDOW_MS must be a positive number');
  }
  
  if (isNaN(maxRequests) || maxRequests <= 0) {
    errors.push('RATE_LIMIT_MAX_REQUESTS must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    config: {
      windowMs: windowMs || 900000, // 15 minutes default
      maxRequests: maxRequests || 100
    }
  };
}

module.exports = {
  validateGitHubConfig,
  validateGitHubCallback,
  validateUserSession,
  validateRepositoryName,
  validateRateLimitConfig,
  requireAuth
}; 