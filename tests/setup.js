const { execSync } = require('child_process');

/**
 * Jest Test Setup for Tech Health MVP
 * Configures testing environment with proper mocking and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.GITHUB_CALLBACK_URL = 'http://localhost:3001/api/auth/github/callback';

// Mock external APIs
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      rest: {
        users: {
          getAuthenticated: jest.fn(),
          getByUsername: jest.fn()
        },
        repos: {
          listForAuthenticatedUser: jest.fn(),
          get: jest.fn(),
          getContent: jest.fn(),
          listCommits: jest.fn(),
          listContributors: jest.fn(),
          listLanguages: jest.fn(),
          listReleases: jest.fn()
        },
        issues: {
          listForRepo: jest.fn()
        },
        pulls: {
          list: jest.fn()
        }
      }
    }))
  };
});

// Mock Puppeteer for PDF generation
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      close: jest.fn()
    }),
    close: jest.fn()
  })
}));

// Mock Chart.js Node Canvas
jest.mock('chartjs-node-canvas', () => ({
  ChartJSNodeCanvas: jest.fn().mockImplementation(() => ({
    renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-chart-image'))
  }))
}));

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
});

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

module.exports = {
  // Test utilities will be exported here
}; 