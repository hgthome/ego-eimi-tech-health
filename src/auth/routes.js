const express = require('express');
const { validateGitHubConfig } = require('./validators');
const githubAuth = require('./github-auth');

const router = express.Router();

// GitHub OAuth routes
router.get('/github', (req, res) => {
  try {
    // Validate GitHub configuration
    const validation = validateGitHubConfig();
    if (!validation.isValid) {
      return res.status(500).json({
        error: 'GitHub OAuth not configured',
        details: validation.errors
      });
    }

    // Generate OAuth URL
    const authUrl = githubAuth.getAuthorizationUrl();
    res.json({
      authUrl,
      message: 'Redirect user to this URL for GitHub authentication'
    });
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.status(500).json({
      error: 'Failed to initiate GitHub authentication',
      message: error.message
    });
  }
});

// GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).json({
      error: 'GitHub OAuth error',
      details: error
    });
  }

  if (!code) {
    return res.status(400).json({
      error: 'Missing authorization code'
    });
  }

  try {
    // Exchange code for access token
    const authResult = await githubAuth.exchangeCodeForToken(code);
    
    // Store user session
    req.session.user = {
      id: authResult.user.id,
      login: authResult.user.login,
      name: authResult.user.name,
      email: authResult.user.email,
      avatar_url: authResult.user.avatar_url,
      accessToken: authResult.accessToken // Note: In production, encrypt this
    };

    res.json({
      message: 'Authentication successful',
      user: {
        id: authResult.user.id,
        login: authResult.user.login,
        name: authResult.user.name,
        email: authResult.user.email,
        avatar_url: authResult.user.avatar_url
      }
    });
  } catch (error) {
    console.error('GitHub callback error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// Get current user session
router.get('/user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      error: 'Not authenticated'
    });
  }

  res.json({
    user: {
      id: req.session.user.id,
      login: req.session.user.login,
      name: req.session.user.name,
      email: req.session.user.email,
      avatar_url: req.session.user.avatar_url
    }
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        error: 'Failed to logout'
      });
    }
    
    res.json({
      message: 'Logged out successfully'
    });
  });
});

// Authentication status check
router.get('/status', (req, res) => {
  res.json({
    authenticated: !!req.session.user,
    user: req.session.user ? {
      id: req.session.user.id,
      login: req.session.user.login,
      name: req.session.user.name
    } : null
  });
});

module.exports = router; 