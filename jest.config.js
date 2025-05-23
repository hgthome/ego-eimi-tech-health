module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js', // Exclude main entry point
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Module paths
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Timeout for tests
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Transform files
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Global teardown
  globalTeardown: undefined,
  
  // Handle ES modules if needed
  extensionsToTreatAsEsm: [],
  
  // Test results processor
  testResultsProcessor: undefined,
  
  // Error handling
  errorOnDeprecated: false,
  
  // Notify on test results (for development)
  notify: false,
  
  // Bail on first test failure (for CI)
  bail: process.env.CI ? 1 : 0
}; 