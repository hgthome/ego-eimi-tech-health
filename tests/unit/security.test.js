const {
  sanitizeInputs,
  validationSchemas,
  validateInput,
  securityLogger
} = require('../../src/security/security-middleware');

describe('Security Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      method: 'GET',
      originalUrl: '/test',
      get: jest.fn(),
      sessionID: 'test-session'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
      on: jest.fn()
    };
    next = jest.fn();
  });

  describe('Input Sanitization', () => {
    test('should remove XSS characters from strings', () => {
      req.body = {
        username: '<script>alert("xss")</script>user',
        email: 'test@example.com'
      };

      sanitizeInputs(req, res, next);

      expect(req.body.username).toBe('scriptalert("xss")/scriptuser');
      expect(req.body.email).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
    });

    test('should remove javascript: protocols', () => {
      req.query = {
        redirect: 'javascript:alert("xss")',
        normal: 'https://example.com'
      };

      sanitizeInputs(req, res, next);

      expect(req.query.redirect).toBe('alert("xss")');
      expect(req.query.normal).toBe('https://example.com');
    });

    test('should sanitize nested objects', () => {
      req.body = {
        user: {
          name: '<script>evil</script>',
          profile: {
            bio: 'onclick=malicious()'
          }
        }
      };

      sanitizeInputs(req, res, next);

      expect(req.body.user.name).toBe('scriptevil/script');
      expect(req.body.user.profile.bio).toBe('malicious()');
    });

    test('should sanitize arrays', () => {
      req.body = {
        tags: ['<script>tag1</script>', 'normal-tag', 'javascript:evil']
      };

      sanitizeInputs(req, res, next);

      expect(req.body.tags).toEqual(['scripttag1/script', 'normal-tag', 'evil']);
    });
  });

  describe('Input Validation', () => {
    test('should validate repository parameters correctly', () => {
      const middleware = validateInput(validationSchemas.repositoryParams, 'params');
      
      req.params = { owner: 'validowner', repo: 'valid-repo' };
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject invalid repository owner', () => {
      const middleware = validateInput(validationSchemas.repositoryParams, 'params');
      
      req.params = { owner: 'invalid-owner!', repo: 'valid-repo' };
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'owner',
              message: expect.stringContaining('alphanumeric')
            })
          ])
        })
      );
    });

    test('should validate pagination query parameters', () => {
      const middleware = validateInput(validationSchemas.paginationQuery, 'query');
      
      req.query = { page: '2', per_page: '50' };
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(2);
      expect(req.query.per_page).toBe(50);
    });

    test('should set default values for missing pagination params', () => {
      const middleware = validateInput(validationSchemas.paginationQuery, 'query');
      
      req.query = {};
      middleware(req, res, next);

      expect(req.query.page).toBe(1);
      expect(req.query.per_page).toBe(30);
      expect(req.query.sort).toBe('updated');
    });

    test('should reject out-of-range pagination values', () => {
      const middleware = validateInput(validationSchemas.paginationQuery, 'query');
      
      req.query = { page: '0', per_page: '200' };
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'page',
              message: expect.stringContaining('must be greater than or equal to 1')
            }),
            expect.objectContaining({
              field: 'per_page',
              message: expect.stringContaining('must be less than or equal to 100')
            })
          ])
        })
      );
    });

    test('should validate report options', () => {
      const middleware = validateInput(validationSchemas.reportOptions, 'body');
      
      req.body = { format: 'pdf', includeCharts: true };
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.format).toBe('pdf');
      expect(req.body.includeCharts).toBe(true);
      expect(req.body.theme).toBe('light'); // default value
    });
  });

  describe('Security Logger', () => {
    test('should log request information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      req.get.mockImplementation((header) => {
        if (header === 'User-Agent') return 'Test-Agent';
        if (header === 'Referer') return 'http://example.com';
        return undefined;
      });

      securityLogger(req, res, next);

      expect(next).toHaveBeenCalled();
      
      // Simulate response finish
      const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishCallback();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET /test - undefined')
      );

      consoleSpy.mockRestore();
    });

    test('should detect suspicious requests', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      req.originalUrl = '/api/test?file=../../../etc/passwd';
      req.get.mockReturnValue('Evil-Agent');

      securityLogger(req, res, next);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '🚨 Suspicious request detected:',
        expect.objectContaining({
          url: '/api/test?file=../../../etc/passwd',
          ip: '127.0.0.1'
        })
      );

      consoleWarnSpy.mockRestore();
    });

    test('should detect XSS attempts in body', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      req.body = { comment: '<script>alert("xss")</script>' };
      req.get.mockReturnValue('Test-Agent');

      securityLogger(req, res, next);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '🚨 Suspicious request detected:',
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });

    test('should detect SQL injection attempts', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      req.query = { search: "'; UNION SELECT * FROM users --" };
      req.get.mockReturnValue('Test-Agent');

      securityLogger(req, res, next);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '🚨 Suspicious request detected:',
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });
  });
}); 