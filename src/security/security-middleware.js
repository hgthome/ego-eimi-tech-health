const helmet = require('helmet');
const rateLimit = require('rate-limiter-flexible');
const Joi = require('joi');

/**
 * Enhanced Security Middleware for Tech Health MVP
 * Implements comprehensive security best practices for production readiness
 */

/**
 * Input sanitization middleware
 */
function sanitizeInputs(req, res, next) {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potential XSS characters
      return value
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        sanitized[key] = value.map(sanitizeValue);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = sanitizeValue(value);
      }
    }
    return sanitized;
  };

  // Sanitize request body, query, and params
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  
  next();
}

/**
 * Enhanced helmet configuration
 */
function enhancedHelmet() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.github.com"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
}

/**
 * Enhanced rate limiting with different tiers
 */
const createRateLimiters = () => {
  // General API rate limiter
  const generalLimiter = new rateLimit.RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 100, // requests
    duration: 900, // per 15 minutes
  });

  // Strict rate limiter for sensitive operations
  const strictLimiter = new rateLimit.RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 10, // requests
    duration: 300, // per 5 minutes
  });

  // Auth-specific rate limiter
  const authLimiter = new rateLimit.RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 5, // requests
    duration: 900, // per 15 minutes
  });

  return { generalLimiter, strictLimiter, authLimiter };
};

/**
 * Rate limiting middleware factory
 */
function createRateLimitMiddleware(limiter, limitType = 'general') {
  return async (req, res, next) => {
    try {
      await limiter.consume(req.ip);
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      res.status(429).json({
        error: 'Rate limit exceeded',
        type: limitType,
        retryAfter: secs,
        message: `Too many requests. Please try again in ${secs} seconds.`
      });
    }
  };
}

/**
 * Request logging middleware for security monitoring
 */
function securityLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log security-relevant information
  const logData = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    sessionId: req.sessionID
  };

  // Monitor for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
  ];

  const suspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.originalUrl) || 
    pattern.test(JSON.stringify(req.body)) ||
    pattern.test(JSON.stringify(req.query))
  );

  if (suspicious) {
    console.warn('🚨 Suspicious request detected:', logData);
  }

  // Log response time on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (process.env.NODE_ENV !== 'production' || suspicious) {
      console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
}

/**
 * Advanced input validation schemas
 */
const validationSchemas = {
  repositoryParams: Joi.object({
    owner: Joi.string()
      .alphanum()
      .min(1)
      .max(39)
      .required()
      .messages({
        'string.alphanum': 'Repository owner must contain only alphanumeric characters',
        'string.max': 'Repository owner name too long'
      }),
    repo: Joi.string()
      .pattern(/^[a-zA-Z0-9._-]+$/)
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.pattern.base': 'Repository name contains invalid characters'
      })
  }),

  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).max(100).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(30),
    sort: Joi.string().valid('created', 'updated', 'pushed', 'full_name').default('updated'),
    direction: Joi.string().valid('asc', 'desc').default('desc')
  }),

  reportOptions: Joi.object({
    format: Joi.string().valid('html', 'pdf').default('html'),
    includeCharts: Joi.boolean().default(true),
    includeRecommendations: Joi.boolean().default(true),
    theme: Joi.string().valid('light', 'dark', 'auto').default('light')
  })
};

/**
 * Validation middleware factory
 */
function validateInput(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'params' ? req.params : 
                 source === 'query' ? req.query : req.body;
    
    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }

    // Replace original data with validated data
    if (source === 'params') req.params = value;
    else if (source === 'query') req.query = value;
    else req.body = value;

    next();
  };
}

/**
 * Session security enhancements
 */
function enhanceSessionSecurity(req, res, next) {
  // Regenerate session ID periodically for security
  if (req.session.user && !req.session.lastRegenerated) {
    req.session.lastRegenerated = Date.now();
  } else if (req.session.user && req.session.lastRegenerated) {
    const timeSinceRegen = Date.now() - req.session.lastRegenerated;
    const regenInterval = 30 * 60 * 1000; // 30 minutes
    
    if (timeSinceRegen > regenInterval) {
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return next(err);
        }
        req.session.lastRegenerated = Date.now();
        next();
      });
      return;
    }
  }
  
  next();
}

/**
 * API version and deprecation middleware
 */
function apiVersioning(req, res, next) {
  const apiVersion = req.headers['api-version'] || '1.0';
  req.apiVersion = apiVersion;
  
  // Set API version in response headers
  res.set('API-Version', '1.0');
  res.set('Supported-Versions', '1.0');
  
  // Future: Handle deprecated versions
  if (apiVersion !== '1.0') {
    res.set('Warning', '299 - "API version not supported"');
  }
  
  next();
}

module.exports = {
  sanitizeInputs,
  enhancedHelmet,
  createRateLimiters,
  createRateLimitMiddleware,
  securityLogger,
  validationSchemas,
  validateInput,
  enhanceSessionSecurity,
  apiVersioning
}; 