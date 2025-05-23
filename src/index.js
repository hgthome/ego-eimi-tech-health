require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const https = require('https');
const http = require('http');
const fs = require('fs');

// Import security middleware
const {
  enhancedHelmet,
  createRateLimiters,
  createRateLimitMiddleware,
  sanitizeInputs,
  securityLogger,
  enhanceSessionSecurity,
  apiVersioning
} = require('./security/security-middleware');

// Import route modules
const authRoutes = require('./auth/routes');
const githubRoutes = require('./github/routes');
const analysisRoutes = require('./analysis/routes');
const reportRoutes = require('./reports/routes');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const USE_HTTPS = process.env.USE_HTTPS === 'true' || process.env.NODE_ENV === 'production';

// Create rate limiters
const { generalLimiter, strictLimiter, authLimiter } = createRateLimiters();

// Enhanced security middleware
app.use(enhancedHelmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://localhost:3443', 'https://127.0.0.1:3443'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'API-Version']
}));

// Security logging and monitoring
app.use(securityLogger);

// API versioning
app.use('/api/*', apiVersioning);

// General rate limiting for all requests
app.use(createRateLimitMiddleware(generalLimiter, 'general'));

// Input sanitization
app.use(sanitizeInputs);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100
}));

// Session configuration with enhanced security
app.use(session({
  secret: process.env.SESSION_SECRET || 'tech-health-mvp-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'tech-health-session',
  cookie: {
    secure: process.env.NODE_ENV === 'production' || process.env.USE_HTTPS === 'true',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  rolling: true // Reset expiration on activity
}));

// Enhanced session security
app.use(enhanceSessionSecurity);

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true
}));

// API Routes with specific rate limiting
app.use('/api/auth', createRateLimitMiddleware(authLimiter, 'auth'), authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/reports', createRateLimitMiddleware(strictLimiter, 'reports'), reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    version: require('../package.json').version,
    apiVersion: '1.0',
    features: {
      authentication: true,
      githubIntegration: true,
      codeAnalysis: true,
      reportGeneration: true,
      realTimeAnalysis: true
    },
    endpoints: {
      auth: '/api/auth',
      github: '/api/github',
      analysis: '/api/analysis',
      reports: '/api/reports'
    },
    security: {
      rateLimiting: true,
      inputSanitization: true,
      securityHeaders: true,
      sessionSecurity: true
    }
  });
});

// Root endpoint - serve frontend or API info
app.get('/', (req, res) => {
  // If request accepts HTML, serve the frontend
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    // Otherwise return API information
    res.json({
      message: 'Tech Health MVP - Dynamic Pitch Deck Appendix Generator',
      version: require('../package.json').version,
      description: 'Generate comprehensive tech health appendices for investor pitch decks',
      features: [
        'GitHub repository analysis',
        'DORA metrics assessment', 
        'Code quality evaluation',
        'Security vulnerability scanning',
        'Industry benchmarking',
        'Professional PDF report generation'
      ],
      endpoints: {
        health: '/health',
        api: '/api/status',
        auth: '/api/auth',
        github: '/api/github',
        analysis: '/api/analysis',
        reports: '/api/reports'
      },
      documentation: {
        phase1: 'GitHub OAuth & Basic Analysis',
        phase2: 'Advanced Analysis Engine',
        phase3: 'Report Generation System',
        phase4: 'Security & Polish with Frontend'
      }
    });
  }
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  console.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'The request data is invalid',
      details: err.details?.map(detail => detail.message) || err.message
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'JSON Parse Error',
      message: 'Invalid JSON in request body'
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request payload exceeds size limit'
    });
  }

  // Security-related errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: err.retryAfter || 60
    });
  }

  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  const errorResponse = {
    error: statusCode >= 500 ? 'Internal Server Error' : err.message || 'An error occurred',
    timestamp: new Date().toISOString()
  };

  // Include additional details in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.details = {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    };
  }
  
  res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      '/',
      '/health',
      '/api/status',
      '/api/auth',
      '/api/github',
      '/api/analysis',
      '/api/reports'
    ]
  });
});

// Start server with enhanced error handling
let server;

if (USE_HTTPS) {
  try {
    // Try to load SSL certificates
    const sslOptions = {
      key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.pem'))
    };
    
    server = https.createServer(sslOptions, app);
    
    server.listen(HTTPS_PORT, () => {
      console.log('🚀 Tech Health MVP server starting...');
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Server URL: https://localhost:${HTTPS_PORT}`);
      console.log(`🔒 Security: HTTPS enabled with SSL certificates`);
      console.log(`🎨 Frontend: Available at https://localhost:${HTTPS_PORT}`);
      console.log(`📡 API Base: https://localhost:${HTTPS_PORT}/api`);
      console.log('✅ Server ready for secure connections');
    });
  } catch (error) {
    console.warn('⚠️  SSL certificates not found, falling back to HTTP');
    console.warn('   Run: npm run generate-cert to create certificates');
    
    server = http.createServer(app);
    server.listen(PORT, () => {
      console.log('🚀 Tech Health MVP server starting...');
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Server URL: http://localhost:${PORT}`);
      console.log(`🔒 Security: Enhanced middleware enabled (HTTP)`);
      console.log(`🎨 Frontend: Available at http://localhost:${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log('✅ Server ready for connections');
    });
  }
} else {
  server = http.createServer(app);
  server.listen(PORT, () => {
    console.log('🚀 Tech Health MVP server starting...');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Server URL: http://localhost:${PORT}`);
    console.log(`🔒 Security: Enhanced middleware enabled`);
    console.log(`🎨 Frontend: Available at http://localhost:${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
    console.log('✅ Server ready for connections');
  });
}

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close other connections (database, etc.) here if needed
    
    console.log('Graceful shutdown complete');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app; 