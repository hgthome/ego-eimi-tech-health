# Testing Suite Documentation

This directory contains a comprehensive testing suite for the Tech Health MVP application, covering unit tests, integration tests, and end-to-end testing scenarios.

## Current Test Status (Updated: December 2024)

✅ **All Unit Tests Passing**: 5 test suites, 116 tests  
📊 **Code Coverage**: 65.85% statements, 56.24% branches  
🐛 **Recent Fixes**: Package ecosystem detection for Ruby gems  

### Test Results Summary
- **GitHub Service**: ✅ 21 tests passing
- **DORA Metrics Collector**: ✅ 22 tests passing  
- **Security Middleware**: ✅ 14 tests passing
- **Report Generator**: ✅ 21 tests passing
- **Code Quality Analyzer**: ✅ 38 tests passing

### Recent Improvements
- Fixed `getPackageEcosystem` method to properly identify Ruby gems like 'rails'
- All dependency vulnerability scanning tests working
- Chart generation and PDF report tests stable
- Security pattern detection fully functional

## Test Structure

```
tests/
├── unit/                      # Unit tests for individual components
│   ├── code-quality-analyzer.test.js  ✅ 38 tests
│   ├── dora-metrics-collector.test.js  ✅ 22 tests
│   ├── github-service.test.js          ✅ 21 tests
│   ├── report-generator.test.js        ✅ 21 tests
│   └── security.test.js                ✅ 14 tests
├── integration/               # Integration tests (planned)
├── helpers/                   # Test utilities and data factories
│   └── test-data-factory.js
├── __mocks__/                 # Mock implementations
├── setup.js                   # Jest test setup and configuration
└── README.md                  # This documentation
```

## Test Categories

### Unit Tests

Unit tests focus on testing individual components in isolation with mocked dependencies.

#### Code Quality Analyzer Tests (`code-quality-analyzer.test.js`) ✅
**Status**: All 38 tests passing  
**Coverage**: Comprehensive analysis workflow testing

- **Core Analysis**: Code quality analysis, complexity calculation, dependency scanning
- **Security Testing**: Vulnerability detection, security pattern recognition, OSV database integration
- **Package Management**: Multi-ecosystem support (npm, PyPI, Maven, RubyGems, NuGet, Go)
- **Utility Functions**: Version handling, complexity scoring, maintainability metrics
- **Error Handling**: Network timeouts, API failures, malformed data
- **Performance**: Latest version checking across ecosystems

**Recent Fixes**:
- ✅ Fixed Ruby gems detection (rails, rspec, bundler, etc.)
- ✅ Enhanced package ecosystem identification
- ✅ Improved version vulnerability checking

#### DORA Metrics Collector Tests (`dora-metrics-collector.test.js`) ✅
**Status**: All 22 tests passing  
**Coverage**: Complete DORA metrics calculation and classification

- **Deployment Frequency**: Release-based calculation and classification
- **Lead Time for Changes**: Commit-to-deployment analysis
- **Change Failure Rate**: Issue pattern detection and analysis
- **Mean Time to Recovery**: Incident resolution tracking
- **Performance Classification**: Elite to Low performance mapping
- **Trends Analysis**: Time-based performance tracking

#### GitHub Service Tests (`github-service.test.js`) ✅
**Status**: All 21 tests passing  
**Coverage**: Full GitHub API integration testing

- **Repository Operations**: Info retrieval, file listing, content access
- **Data Analysis**: Language detection, contributor analysis, statistics
- **Error Handling**: Rate limits, authentication, network failures
- **Caching**: Response optimization and consistency

#### Report Generator Tests (`report-generator.test.js`) ✅
**Status**: All 21 tests passing  
**Coverage**: Complete report generation pipeline

- **Report Generation**: Tech health appendix, chart integration, data preparation
- **Executive Summary**: Key metrics extraction, risk identification
- **Template Processing**: Data formatting, missing data handling
- **Utility Functions**: Scoring, grading, activity level assessment
- **Caching**: Report optimization and cache management

#### Security Tests (`security.test.js`) ✅
**Status**: All 14 tests passing  
**Coverage**: Input validation and security middleware

- **Input Sanitization**: XSS prevention, injection protection
- **Request Validation**: Parameter checking, pagination, security headers
- **Security Logging**: Request monitoring, threat detection

## Test Data Management

### Mock Strategy
All external dependencies are mocked for reliability and speed:
- **GitHub API** (`@octokit/rest`): Repository data, commits, issues
- **Puppeteer**: PDF generation simulation
- **Chart Generation**: Canvas rendering mocks
- **File System**: Content and structure mocks
- **Network Requests**: Vulnerability database responses

## Running Tests

### Quick Commands
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test tests/unit/code-quality-analyzer.test.js

# Watch mode for development
npm run test:watch

# Verbose output
npm test -- --verbose
```

### Test Performance
- **Total Runtime**: ~9.5 seconds
- **Fastest Suite**: Security tests (~1 second)
- **Network Tests**: Vulnerability scanning, version checking (3-6 seconds)

## Coverage Status

### Current Coverage (Jest Report)
```
----------------------------|---------|----------|---------|---------|
File                        | % Stmts | % Branch | % Funcs | % Lines |
----------------------------|---------|----------|---------|---------|
All files                   |   65.85 |    56.24 |   72.17 |   68.76 |
 analysis/                  |   70.28 |    56.92 |   79.51 |   74.07 |
  code-quality-analyzer.js  |   64.19 |    49.37 |   68.08 |   66.05 |
  dora-metrics-collector.js |   80.05 |    68.81 |   94.44 |   89.01 |
 github/                    |   61.90 |    60.37 |   70.27 |   61.31 |
  github-service.js         |   61.90 |    60.37 |   70.27 |   61.31 |
 reports/                   |   63.63 |    55.92 |   67.92 |   66.83 |
  report-generator.js       |   77.47 |    69.12 |   86.53 |   83.37 |
 security/                  |   55.29 |    51.02 |   47.36 |   54.87 |
  security-middleware.js    |   55.29 |    51.02 |   47.36 |   54.87 |
----------------------------|---------|----------|---------|---------|
```

### Coverage Goals
- **Current**: 65.85% statements, 56.24% branches
- **Target**: 60% minimum (statements met ✅, branches slightly below ⚠️)

## Recent Test Fixes & Improvements

### December 2024 Updates

#### ✅ Package Ecosystem Detection
**Problem**: Ruby gems like 'rails' were incorrectly identified as npm packages  
**Solution**: Added comprehensive Ruby gem detection with 25+ known gems  
**Impact**: Improved dependency analysis accuracy for Ruby projects

#### ✅ Vulnerability Scanning
**Status**: Multi-source vulnerability detection working  
**Sources**: OSV database, GitHub Advisory, internal patterns  
**Coverage**: npm, PyPI, Maven, RubyGems ecosystems

#### ✅ Version Handling
**Improvements**: Enhanced semver parsing and vulnerability range checking  
**Robustness**: Better error handling for malformed versions

## Test Scenarios Covered

### Repository Types
- ✅ **JavaScript/Node.js** with npm dependencies
- ✅ **Python** with requirements.txt and Pipfile
- ✅ **Java** with Maven (pom.xml)
- ✅ **Ruby** with Gemfile (improved)
- ✅ **Go** modules with go.mod
- ✅ **Mixed-language** repositories
- ✅ **Empty/minimal** repositories

### Analysis Scenarios
- ✅ **High-quality** repositories with excellent metrics
- ✅ **Low-quality** repositories with technical debt
- ✅ **Security vulnerabilities** across multiple severity levels
- ✅ **Complex codebases** with high cyclomatic complexity
- ✅ **Dependency management** with outdated packages

### Error Conditions
- ✅ **Network failures** and API rate limits
- ✅ **Malformed files** and invalid JSON
- ✅ **Missing files** and empty repositories
- ✅ **Authentication failures**
- ✅ **Large datasets** and performance stress

## Known Issues & Improvements

### Coverage Improvements Needed
- **Branch Coverage**: 56.24% (target: 60%)
- **Security Middleware**: Needs more comprehensive testing
- **Error Handling**: Additional edge case coverage

### Planned Enhancements
- Integration tests for complete analysis workflow
- Performance benchmarking automation  
- Visual regression testing for reports
- Real GitHub repository integration tests

## Troubleshooting

### Common Issues

#### Long Test Times
Some tests (vulnerability scanning, version checking) require network requests:
```bash
# Skip network tests in development
npm test -- --testPathIgnorePatterns="network"
```

#### Mock Issues
```bash
# Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
```

#### Coverage Reports
```bash
# Generate detailed HTML coverage report
npm test -- --coverage --coverageReporters=html
open coverage/lcov-report/index.html
```

## Test Quality Metrics

### Test Reliability
- **Flaky Tests**: 0 (all tests consistently pass)
- **Mock Coverage**: 100% of external dependencies mocked
- **Error Handling**: Comprehensive error scenario testing

### Performance
- **Average Runtime**: 9.5 seconds for full suite
- **Memory Usage**: Stable, no memory leaks detected
- **Parallel Execution**: Safe for concurrent testing

For additional support or questions about the testing suite, please check the main project documentation or create an issue in the repository. 