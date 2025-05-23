# Tech Health MVP - Dynamic Pitch Deck Appendix Generator

A powerful platform that audits your codebase to build investor confidence through comprehensive technical health analysis.

## 🎯 Project Overview

**One-Line Pitch:** Generate professional tech health appendices for your pitch deck by analyzing your GitHub repositories.

**Target:** Early-stage startups pursuing Series A funding who need to demonstrate technical robustness and manage tech risks in their investor presentations.

---

## 🚀 Phase 1 Implementation Status

✅ **Foundation Setup Complete**
- [x] Project structure initialized
- [x] Development environment configured
- [x] Basic authentication system implemented
- [x] GitHub API integration working

### Current Features
- **GitHub OAuth Authentication** - Secure login with GitHub
- **Repository Access** - Read-only access to user repositories
- **Basic Analytics** - Repository statistics and health scoring
- **RESTful API** - Clean API endpoints for all operations
- **Security Best Practices** - Rate limiting, input validation, session management

---

## 🚀 Phase 2 Features (Current)

### Core Analysis Engine
- **Comprehensive Code Quality Analysis**: Complexity metrics, dependency health, security scanning, and maintainability assessment
- **DORA Metrics Collection**: Deployment frequency, lead time for changes, change failure rate, and mean time to recovery
- **Industry Benchmarking**: Compare against industry standards, peer repositories, and project-type specific benchmarks
- **Executive Summary Generation**: Investor-ready summaries with actionable insights and recommendations

### Advanced Capabilities
- **Real-time Streaming Analysis**: Server-sent events for progress tracking during analysis
- **Multi-dimensional Benchmarking**: Industry, peer, project-type, and size-based comparisons
- **Security Vulnerability Detection**: Pattern-based security scanning and dependency vulnerability assessment
- **Intelligent Caching**: Performance optimization with configurable cache management
- **Batch Analysis**: Analyze multiple repositories simultaneously

## 📊 Analysis Components

### Code Quality Analyzer
- **Complexity Analysis**: Cyclomatic complexity measurement using `complexity-report`
- **Dependency Health**: Version analysis, vulnerability scanning, and outdated package detection
- **Code Linting**: Pattern-based analysis for common issues and security vulnerabilities
- **Maintainability Metrics**: Documentation scores, contributor analysis, and issue resolution tracking

### DORA Metrics Collector
- **Deployment Frequency**: Release and deployment event analysis
- **Lead Time for Changes**: Time from commit to production measurement
- **Change Failure Rate**: Post-deployment issue correlation and analysis
- **Mean Time to Recovery**: Incident resolution time calculation

### Benchmarking Engine
- **Industry Standards**: Compare against established software development benchmarks
- **Peer Comparison**: Performance ranking among similar repositories
- **Project Type Analysis**: Framework and language-specific benchmark comparison
- **Size Category Matching**: Scale-appropriate performance expectations

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
**Response:**
```json
{
  "repositories": [
    {
      "id": 12345,
      "name": "repo-name",
      "full_name": "username/repo-name",
      "private": false,
      "description": "Repository description",
      "language": "JavaScript",
      "stargazers_count": 10,
      "forks_count": 2,
      "size": 1024,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-12-01T00:00:00Z",
      "pushed_at": "2023-12-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 30,
    "total": 5
  }
}
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
**Response:**
```json
{
  "stats": {
    "repository": {
      "name": "username/repo-name",
      "description": "Repository description",
      "language": "JavaScript",
      "size": 1024
    },
    "activity": {
      "commits_last_30_days": 15,
      "contributors_count": 3,
      "open_issues_count": 2,
      "releases_count": 1
    },
    "code_quality": {
      "languages": [
        {"language": "JavaScript", "percentage": "75.50"},
        {"language": "CSS", "percentage": "24.50"}
      ],
      "primary_language": "JavaScript",
      "has_license": true,
      "has_wiki": false
    },
    "popularity": {
      "stars": 10,
      "forks": 2,
      "watchers": 8
    },
    "health_score": 75
  }
}
```

---

## 🔧 Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode

### Project Structure
```
tech-health-mvp/
├── src/
│   ├── index.js              # Main application entry point
│   ├── auth/                 # Authentication module
│   │   ├── routes.js         # Auth routes
│   │   ├── github-auth.js    # GitHub OAuth handler
│   │   └── validators.js     # Input validation
│   ├── github/               # GitHub integration
│   │   ├── routes.js         # GitHub API routes
│   │   └── github-service.js # GitHub API service
│   ├── analysis/             # Code analysis (Phase 2)
│   └── reports/              # Report generation (Phase 3)
├── tests/                    # Test files
├── docs/                     # Documentation
└── examples/                 # Sample outputs
```

### Security Features
- **Rate Limiting** - 100 requests per 15-minute window
- **Input Validation** - Joi schema validation for all inputs
- **Session Security** - Secure session management with HttpOnly cookies
- **CORS Protection** - Configured for development/production environments
- **Helmet Security** - Security headers for production

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Test Authentication Flow
1. Visit `http://localhost:3000/api/auth/github`
2. Follow the GitHub OAuth flow
3. Check authentication status: `http://localhost:3000/api/auth/status`

---

## 🔮 Next Phases

### Phase 2: Core Analysis Engine (Planned)
- Code quality metrics calculation
- Technical debt assessment
- Deployment metrics collection
- Benchmarking system

### Phase 3: Report Generation (Planned)
- PDF appendix generation
- Data visualization
- Executive summaries
- Recommendation engine

---

## 📝 Development Notes

### Technical Choices
- **Node.js + Express** - Chosen for rapid development and rich GitHub API ecosystem
- **@octokit/rest** - Official GitHub API client for reliable integration
- **Session-based auth** - Simple session management for MVP scope
- **Joi validation** - Robust input validation and sanitization
- **Rate limiting** - Built-in protection against API abuse

### Time Tracking
- **Phase 1 Duration:** ~45 minutes
- **Setup & Dependencies:** 10 minutes
- **Authentication System:** 15 minutes  
- **GitHub Integration:** 20 minutes

### Security Considerations
- Access tokens stored in session (encrypted in production)
- Read-only GitHub permissions
- Input validation on all endpoints
- Rate limiting to prevent abuse
- No sensitive data logging

---

## 🤝 Contributing

This is an MVP focused on demonstrating core functionality. Future phases will expand capabilities for production use.

## 📄 License

MIT License - see LICENSE file for details.
