const request = require('supertest');

// Mock all the problematic modules first - before requiring the app
jest.mock('../../src/analysis/analysis-orchestrator', () => ({
  getComprehensiveAnalysis: jest.fn().mockResolvedValue({
    overallScore: 85,
    codeQuality: { score: 80 },
    doraMetrics: { classification: 'High' }
  })
}));

jest.mock('../../src/reports/report-generator', () => {
  return jest.fn().mockImplementation(() => ({
    generateReport: jest.fn().mockResolvedValue({ reportId: 'test-report' })
  }));
});

jest.mock('../../src/reports/chart-generator', () => {
  return jest.fn().mockImplementation(() => ({
    generateChart: jest.fn().mockResolvedValue(Buffer.from('mock-chart'))
  }));
});

jest.mock('../../src/reports/template-engine', () => {
  return jest.fn().mockImplementation(() => ({
    render: jest.fn().mockResolvedValue('<html>mock template</html>')
  }));
});

jest.mock('../../src/reports/pdf-generator', () => {
  return jest.fn().mockImplementation(() => ({
    generatePDF: jest.fn().mockResolvedValue(Buffer.from('mock-pdf'))
  }));
});

jest.mock('../../src/reports/recommendation-engine', () => {
  return jest.fn().mockImplementation(() => ({
    generateRecommendations: jest.fn().mockResolvedValue([])
  }));
});

const app = require('../../src/index');

describe('API Integration Tests', () => {
  describe('Health and Root Endpoints', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    test('GET / should return application information', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Tech Health MVP - Dynamic Pitch Deck Appendix Generator',
        version: expect.any(String),
        features: expect.arrayContaining([
          'GitHub repository analysis',
          'DORA metrics assessment',
          'Professional PDF report generation'
        ]),
        endpoints: expect.objectContaining({
          auth: '/api/auth',
          github: '/api/github',
          analysis: '/api/analysis',
          reports: '/api/reports'
        })
      });
    });

    test('GET /api/status should return API status', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'operational',
        version: expect.any(String),
        apiVersion: '1.0',
        features: expect.objectContaining({
          authentication: true,
          githubIntegration: true,
          codeAnalysis: true,
          reportGeneration: true
        })
      });
    });

    test('GET /nonexistent should return 404', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Not Found',
        message: 'Route /nonexistent not found'
      });
    });
  });

  describe('Authentication Endpoints', () => {
    test('GET /api/auth/status should return authentication status', async () => {
      const response = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(response.body).toMatchObject({
        authenticated: false
      });
    });

    test('GET /api/auth/github should redirect to GitHub OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/github')
        .expect(302);

      expect(response.headers.location).toMatch(/github\.com\/login\/oauth\/authorize/);
    });

    test('POST /api/auth/logout should handle logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Logged out successfully'
      });
    });
  });

  describe('Protected Endpoints', () => {
    test('GET /api/github/repositories should require authentication', async () => {
      const response = await request(app)
        .get('/api/github/repositories')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Authentication required',
        message: 'Please authenticate with GitHub first'
      });
    });

    test('GET /api/analysis/status should require authentication', async () => {
      const response = await request(app)
        .get('/api/analysis/status')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Authentication required'
      });
    });

    test('GET /api/reports/status should require authentication', async () => {
      const response = await request(app)
        .get('/api/reports/status')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Authentication required'
      });
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Helmet should add these security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('should set API version headers', async () => {
      const response = await request(app)
        .get('/api/status')
        .set('API-Version', '1.0')
        .expect(200);

      expect(response.headers).toHaveProperty('api-version', '1.0');
      expect(response.headers).toHaveProperty('supported-versions', '1.0');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should sanitize error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const response = await request(app)
          .get('/api/some/invalid/endpoint')
          .expect(404);

        expect(response.body.error).toBe('Not Found');
        // Should not include stack traces in production
        expect(response.body).not.toHaveProperty('stack');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('API Versioning', () => {
    test('should handle API version headers', async () => {
      const response = await request(app)
        .get('/api/status')
        .set('API-Version', '1.0')
        .expect(200);

      expect(response.headers).toHaveProperty('api-version', '1.0');
      expect(response.headers).toHaveProperty('supported-versions', '1.0');
    });

    test('should warn about unsupported API versions', async () => {
      const response = await request(app)
        .get('/api/status')
        .set('API-Version', '2.0')
        .expect(200);

      expect(response.headers).toHaveProperty('warning');
      expect(response.headers.warning).toContain('API version not supported');
    });
  });
}); 