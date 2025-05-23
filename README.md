# Tech Health MVP - Dynamic Pitch Deck Appendix Generator

A powerful platform that audits your codebase to build investor confidence through comprehensive technical health analysis.

## 🎯 Project Overview

**One-Line Pitch:** Generate professional tech health appendices for your pitch deck by analyzing your GitHub repositories.

**Target:** Early-stage startups pursuing Series A funding who need to demonstrate technical robustness and manage tech risks in their investor presentations.

---

## 🚀 Implementation Status

✅ **Phase 1: Foundation Setup Complete**
- [x] Project structure initialized
- [x] Development environment configured
- [x] Basic authentication system implemented
- [x] GitHub API integration working

✅ **Phase 2: Core Analysis Engine Complete**
- [x] Comprehensive code quality analysis with security scanning
- [x] DORA metrics collection and assessment
- [x] Advanced benchmarking engine with industry comparisons
- [x] Real-time streaming analysis with progress tracking
- [x] Multi-dimensional performance analysis

✅ **Phase 3: Report Generation System Complete**
- [x] Professional PDF report generation
- [x] Dynamic chart generation with Chart.js
- [x] Handlebars template engine for flexible reports
- [x] Executive summary generation with recommendations
- [x] Intelligent caching for performance optimization

✅ **Phase 4: Security & Polish Complete**
- [x] Enhanced security middleware and headers
- [x] Rate limiting and input sanitization
- [x] Frontend web interface implementation
- [x] Comprehensive test suite (116 tests)
- [x] Production-ready error handling

### Current Features
- **GitHub OAuth Authentication** - Secure login with GitHub
- **Repository Access** - Full read access to user repositories
- **Advanced Code Analysis** - Complexity, quality, security, and maintainability metrics
- **DORA Metrics Assessment** - Complete DevOps Research and Assessment metrics
- **Industry Benchmarking** - Multi-dimensional performance comparisons
- **Professional Reports** - PDF generation with charts and executive summaries
- **Real-time Analysis** - Streaming progress updates during repository analysis
- **Security-First Design** - Rate limiting, input validation, security headers
- **Frontend Interface** - Complete web-based user interface
- **Comprehensive Testing** - 116 unit tests with 65.85% coverage

---

## 📊 Analysis Components

### Code Quality Analyzer (`src/analysis/code-quality-analyzer.js`)
- **Complexity Analysis**: Cyclomatic complexity measurement using AST parsing
- **Dependency Health**: Version analysis, vulnerability scanning, and outdated package detection
- **Security Scanning**: Pattern-based security vulnerability detection
- **Maintainability Metrics**: Documentation scores, contributor analysis, and technical debt assessment
- **Language Support**: JavaScript, TypeScript, Python, Java, and more
- **Vulnerability Database**: Real-time security vulnerability checking against public databases

### DORA Metrics Collector (`src/analysis/dora-metrics-collector.js`)
- **Deployment Frequency**: Release and deployment event analysis with trend tracking
- **Lead Time for Changes**: Time from commit to production measurement
- **Change Failure Rate**: Post-deployment issue correlation and failure analysis
- **Mean Time to Recovery**: Incident resolution time calculation
- **Performance Classification**: Elite, High, Medium, Low performance categorization
- **Trend Analysis**: Historical performance tracking and improvement recommendations

### Benchmarking Engine (`src/analysis/benchmarking-engine.js`)
- **Industry Standards**: Compare against established software development benchmarks
- **Peer Comparison**: Performance ranking among similar repositories
- **Project Type Analysis**: Framework and language-specific benchmark comparison
- **Size Category Matching**: Scale-appropriate performance expectations
- **Multi-dimensional Scoring**: Comprehensive assessment across multiple metrics

### Analysis Orchestrator (`src/analysis/analysis-orchestrator.js`)
- **Real-time Streaming**: Server-sent events for progress tracking
- **Batch Processing**: Analyze multiple repositories simultaneously
- **Intelligent Caching**: Performance optimization with configurable cache management
- **Error Recovery**: Graceful handling of API failures and timeouts
- **Resource Management**: Memory and CPU optimization for large repositories

---

## 📊 Report Generation System

### Report Generator (`src/reports/report-generator.js`)
- **Executive Summary Generation**: Investor-ready summaries with key insights
- **Risk Assessment**: Identification and categorization of technical risks
- **Recommendation Engine**: Actionable improvement suggestions
- **Performance Scoring**: Comprehensive tech health scoring algorithm
- **Template Integration**: Dynamic content generation using Handlebars

### Chart Generator (`src/reports/chart-generator.js`)
- **Dynamic Visualizations**: Performance metrics, trends, and comparisons
- **Multiple Chart Types**: Bar charts, line graphs, radar charts, and pie charts
- **Professional Styling**: Investor-presentation ready chart formatting
- **Data Aggregation**: Intelligent data summarization for visual clarity

### PDF Generator (`src/reports/pdf-generator.js`)
- **Professional Layout**: Clean, modern design suitable for investor presentations
- **Dynamic Content**: Flexible template-based PDF generation
- **Chart Integration**: Embedded visualizations and graphics
- **Appendix Format**: Structured for pitch deck integration

### Template Engine (`src/reports/template-engine.js`)
- **Handlebars Integration**: Flexible template system for custom reports
- **Dynamic Sections**: Conditional content based on analysis results
- **Reusable Components**: Modular template architecture
- **Multi-format Support**: HTML, PDF, and plain text output

---

## 🔐 Security & Infrastructure

### Security Middleware (`src/security/security-middleware.js`)
- **Enhanced Helmet Configuration**: Comprehensive security headers
- **Rate Limiting**: Multiple tiers (general, auth, strict) with Redis support
- **Input Sanitization**: XSS and injection attack prevention
- **Session Security**: Enhanced session management with rotation
- **Security Logging**: Comprehensive audit trail and monitoring
- **API Versioning**: Future-proof API design

### Features
- **OWASP Security Headers**: Complete security header implementation
- **Request Validation**: Joi schema validation for all inputs
- **Attack Detection**: Pattern-based detection of malicious requests
- **Graceful Degradation**: Fallback mechanisms for service failures

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 16.0.0 or higher
- npm or yarn package manager
- GitHub account for OAuth setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd tech-health-mvp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp env.example .env
```

Edit `.env` file with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# GitHub OAuth (Required)
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Session Security
SESSION_SECRET=your_super_secret_session_key_here
```

### 4. GitHub OAuth Setup

1. Go to GitHub Settings > Developer Settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name:** Tech Health MVP
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/github/callback`
4. Copy the Client ID and Client Secret to your `.env` file

### 5. Start Development Server
```bash
npm run dev
```

The server will start at `http://localhost:3000`

### 6. HTTPS Development Setup (Optional)

For testing OAuth applications and secure development, you can run the server with HTTPS:

#### Quick Start with HTTPS
```bash
# Generate self-signed SSL certificates (first time only)
npm run generate-cert

# Start development server with HTTPS
npm run dev:https
```

The HTTPS server will start at `https://localhost:3443`

#### Manual Certificate Generation
If you prefer to generate certificates manually:
```bash
mkdir ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
  -subj "/C=US/ST=CA/L=San Francisco/O=Tech Health MVP/OU=Development/CN=localhost"
```

#### Environment Variables for HTTPS
Add these to your `.env` file:
```env
USE_HTTPS=true
HTTPS_PORT=3443
```

#### GitHub OAuth with HTTPS
When using HTTPS for development, update your GitHub OAuth app settings:
- **Homepage URL:** `https://localhost:3443`
- **Authorization callback URL:** `https://localhost:3443/api/auth/github/callback`

And update your `.env` file:
```env
GITHUB_CALLBACK_URL=https://localhost:3443/api/auth/github/callback
```

> **Note:** You'll need to accept the self-signed certificate warning in your browser when first accessing the HTTPS server.

---

## 📊 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Initiate GitHub OAuth
```http
GET /auth/github
```
**Response:**
```json
{
  "authUrl": "https://github.com/login/oauth/authorize?...",
  "message": "Redirect user to this URL for GitHub authentication"
}
```

#### OAuth Callback (handled automatically)
```http
GET /auth/github/callback?code=...
```

#### Get Current User
```http
GET /auth/user
```
**Response:**
```json
{
  "user": {
    "id": 12345,
    "login": "username",
    "name": "User Name",
    "email": "user@example.com",
    "avatar_url": "https://avatars.githubusercontent.com/..."
  }
}
```

#### Logout
```http
POST /auth/logout
```

### GitHub API Endpoints

#### Get User Repositories
```http
GET /github/repositories?page=1&per_page=30&type=owner&sort=updated
```

#### Get Repository Details
```http
GET /github/repository/{owner}/{repo}
```

#### Get Repository Languages
```http
GET /github/repository/{owner}/{repo}/languages
```

#### Get Repository Statistics (Tech Health)
```http
GET /github/repository/{owner}/{repo}/stats
```

### Analysis Endpoints

#### Start Repository Analysis
```http
POST /analysis/repository/{owner}/{repo}
```
**Features:**
- Real-time streaming analysis progress
- Comprehensive code quality assessment
- DORA metrics collection
- Security vulnerability scanning
- Industry benchmarking

#### Get Analysis Status
```http
GET /analysis/repository/{owner}/{repo}/status
```

#### Stream Analysis Progress
```http
GET /analysis/repository/{owner}/{repo}/stream
```
**Returns:** Server-sent events with real-time progress updates

### Report Generation Endpoints

#### Generate Tech Health Report
```http
POST /reports/repository/{owner}/{repo}/tech-health
```
**Features:**
- Executive summary generation
- Professional PDF output
- Dynamic chart generation
- Investor-ready formatting

#### Get Report Status
```http
GET /reports/repository/{owner}/{repo}/status
```

#### Download Generated Report
```http
GET /reports/repository/{owner}/{repo}/download
```

---

## 🧪 Testing

### Test Suite Status
- **Total Tests:** 116 tests across 5 test suites
- **Coverage:** 65.85% statement coverage
- **Test Files:** 5 comprehensive test suites
- **Test Duration:** ~10 seconds

### Test Categories

#### Unit Tests (`tests/unit/`)
- **Code Quality Analyzer Tests** (`code-quality-analyzer.test.js`) - 37 tests
- **DORA Metrics Collector Tests** (`dora-metrics-collector.test.js`) - 23 tests  
- **GitHub Service Tests** (`github-service.test.js`) - 22 tests
- **Report Generator Tests** (`report-generator.test.js`) - 21 tests
- **Security Tests** (`security.test.js`) - 13 tests

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Health Check
```bash
curl http://localhost:3000/health
```

### Test Authentication Flow
1. Visit `http://localhost:3000/api/auth/github`
2. Follow the GitHub OAuth flow
3. Check authentication status: `http://localhost:3000/api/auth/user`

---

## 🏗️ Project Structure
```
tech-health-mvp/
├── src/
│   ├── index.js                          # Main application entry point with security
│   ├── auth/                             # Authentication module
│   │   ├── routes.js                     # Auth API routes
│   │   ├── github-auth.js                # GitHub OAuth implementation
│   │   └── validators.js                 # Input validation schemas
│   ├── github/                           # GitHub integration
│   │   ├── routes.js                     # GitHub API routes
│   │   └── github-service.js             # GitHub API service layer
│   ├── analysis/                         # Core Analysis Engine
│   │   ├── routes.js                     # Analysis API routes
│   │   ├── code-quality-analyzer.js      # Code quality and security analysis
│   │   ├── dora-metrics-collector.js     # DORA metrics implementation
│   │   ├── benchmarking-engine.js        # Industry benchmarking system
│   │   └── analysis-orchestrator.js      # Analysis coordination and streaming
│   ├── reports/                          # Report Generation System
│   │   ├── routes.js                     # Report API routes
│   │   ├── report-generator.js           # Main report generation logic
│   │   ├── chart-generator.js            # Dynamic chart creation
│   │   ├── pdf-generator.js              # PDF generation with PDFKit
│   │   ├── template-engine.js            # Handlebars template system
│   │   ├── recommendation-engine.js      # AI-powered recommendations
│   │   └── templates/                    # Report templates
│   └── security/                         # Security Infrastructure
│       └── security-middleware.js        # Comprehensive security layer
├── tests/                                # Test Suite
│   ├── unit/                             # Unit tests
│   │   ├── code-quality-analyzer.test.js # Code analysis tests
│   │   ├── dora-metrics-collector.test.js# DORA metrics tests
│   │   ├── github-service.test.js        # GitHub service tests
│   │   ├── report-generator.test.js      # Report generation tests
│   │   └── security.test.js              # Security middleware tests
│   ├── helpers/                          # Test utilities
│   ├── __mocks__/                        # Mock implementations
│   ├── setup.js                          # Test environment setup
│   └── README.md                         # Test documentation
├── docs/                                 # Documentation
│   ├── DEVELOPMENT_LOG.md                # Development progress log
│   ├── SECURITY.md                       # Security documentation
│   └── IMPLEMENTATION_GUIDE.md           # Implementation guide
├── public/                               # Frontend Interface
│   └── index.html                        # Complete web application UI
├── coverage/                             # Test coverage reports
├── ssl/                                  # HTTPS certificates
├── deploy/                               # Deployment configurations
├── examples/                             # Sample reports and outputs
├── jest.config.js                        # Jest test configuration
└── package.json                          # Dependencies and scripts
```

### Key Dependencies
- **Express.js** - Web application framework
- **@octokit/rest** - GitHub API client
- **Handlebars** - Template engine for reports
- **PDFKit** - PDF generation
- **Chart.js + chartjs-node-canvas** - Chart generation
- **Joi** - Input validation
- **Helmet** - Security headers
- **Rate-limiter-flexible** - Rate limiting
- **Jest + Supertest** - Testing framework

---

## 🚀 Available Scripts
- `npm start` - Start production server
- `npm run start:https` - Start production server with HTTPS
- `npm run dev` - Start development server with auto-reload
- `npm run dev:https` - Start development server with HTTPS
- `npm run generate-cert` - Generate self-signed SSL certificates
- `npm test` - Run comprehensive test suite
- `npm run test:watch` - Run tests in watch mode

---

## 🔮 Current Capabilities

### ✅ Fully Implemented Features
1. **Complete GitHub Integration** - OAuth, repository access, comprehensive data collection
2. **Advanced Code Analysis** - Quality, complexity, security, maintainability assessment
3. **DORA Metrics Collection** - Full DevOps Research and Assessment metrics
4. **Industry Benchmarking** - Multi-dimensional performance comparison
5. **Professional Report Generation** - PDF reports with executive summaries
6. **Real-time Analysis Streaming** - Progress tracking with server-sent events
7. **Security-First Architecture** - Rate limiting, input validation, security headers
8. **Frontend Web Interface** - Complete user interface for all features
9. **Comprehensive Testing** - 116 unit tests with detailed coverage
10. **Production-Ready Infrastructure** - Error handling, logging, monitoring

### 🎯 Ready for Production
- Full-featured tech health assessment platform
- Investor-ready pitch deck appendix generation
- Enterprise-grade security and performance
- Comprehensive test coverage and documentation
- Scalable architecture for growth

---

## 📊 Performance & Metrics

### Analysis Capabilities
- **Code Quality Assessment**: Complexity, maintainability, security scanning
- **DORA Metrics**: Deployment frequency, lead time, failure rate, recovery time
- **Benchmarking**: Industry standards, peer comparison, project-type analysis
- **Security Scanning**: Vulnerability detection, dependency analysis
- **Real-time Processing**: Streaming analysis with progress tracking

### Report Features
- **Executive Summaries**: Investor-focused technical health insights
- **Visual Analytics**: Professional charts and performance visualizations
- **Risk Assessment**: Technical debt and vulnerability identification
- **Recommendations**: Actionable improvement suggestions
- **PDF Generation**: Pitch deck-ready appendix formatting

---

## 🔧 Development

### Security Features
- **Enhanced Security Headers** - Comprehensive OWASP protection
- **Multi-tier Rate Limiting** - General, auth, and strict rate limits
- **Input Sanitization** - XSS and injection attack prevention
- **Session Security** - Secure session management with rotation
- **API Versioning** - Future-proof API design
- **Security Logging** - Comprehensive audit trail

### Performance Optimizations
- **Intelligent Caching** - Analysis result caching for improved performance
- **Streaming Analysis** - Real-time progress updates via server-sent events
- **Batch Processing** - Simultaneous analysis of multiple repositories
- **Resource Management** - Memory and CPU optimization
- **Error Recovery** - Graceful handling of API failures

---

## 📄 License

MIT License - see LICENSE file for details.
