const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');
const async = require('async');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class CodeQualityAnalyzer {
  constructor(githubService) {
    this.githubService = githubService;
    this.vulnerabilityCache = new Map();
    this.eslintConfig = {
      env: { node: true, es2021: true },
      extends: ['eslint:recommended'],
      parserOptions: { ecmaVersion: 12, sourceType: 'module' },
      rules: {
        'complexity': ['warn', 10],
        'max-depth': ['warn', 4],
        'max-lines': ['warn', 300],
        'max-params': ['warn', 4]
      }
    };
  }

  /**
   * HTTP request wrapper using Node.js built-in modules
   */
  async makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'TechHealthAnalyzer/1.0',
          ...options.headers
        }
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = {
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage,
              json: async () => JSON.parse(data),
              text: async () => data
            };
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * Performs comprehensive code quality analysis
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Object} Comprehensive quality analysis results
   */
  async analyzeCodeQuality(owner, repo) {
    try {
      console.log(`Starting code quality analysis for ${owner}/${repo}`);
      
      const [
        complexityAnalysis,
        dependencyAnalysis,
        lintingResults,
        securityAnalysis,
        maintainabilityMetrics
      ] = await Promise.all([
        this.analyzeComplexity(owner, repo),
        this.analyzeDependencies(owner, repo),
        this.performLinting(owner, repo),
        this.analyzeSecurityVulnerabilities(owner, repo),
        this.calculateMaintainabilityMetrics(owner, repo)
      ]);

      const qualityScore = this.calculateOverallQualityScore({
        complexity: complexityAnalysis,
        dependencies: dependencyAnalysis,
        linting: lintingResults,
        security: securityAnalysis,
        maintainability: maintainabilityMetrics
      });

      return {
        qualityScore,
        complexity: complexityAnalysis,
        dependencies: dependencyAnalysis,
        linting: lintingResults,
        security: securityAnalysis,
        maintainability: maintainabilityMetrics,
        recommendations: this.generateRecommendations({
          complexity: complexityAnalysis,
          dependencies: dependencyAnalysis,
          linting: lintingResults,
          security: securityAnalysis
        }),
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in code quality analysis:', error);
      throw error;
    }
  }

  /**
   * Analyzes code complexity using static analysis
   */
  async analyzeComplexity(owner, repo) {
    try {
      // Get JavaScript/TypeScript files from the repository
      const files = await this.githubService.getRepositoryFiles(owner, repo, '.js,.ts,.jsx,.tsx');
      
      let totalComplexity = 0;
      let totalFiles = 0;
      let complexFiles = [];
      let functionMetrics = [];

      for (const file of files) {
        if (this.isAnalyzableFile(file.name)) {
          try {
            const content = await this.githubService.getFileContent(owner, repo, file.path);
            const analysis = this.analyzeFileComplexity(content, file.path);
            
            totalComplexity += analysis.complexity;
            totalFiles++;
            
            if (analysis.complexity > 10) {
              complexFiles.push({
                path: file.path,
                complexity: analysis.complexity,
                functions: analysis.functions
              });
            }
            
            functionMetrics.push(...analysis.functions);
          } catch (error) {
            console.warn(`Failed to analyze ${file.path}:`, error.message);
          }
        }
      }

      const averageComplexity = totalFiles > 0 ? totalComplexity / totalFiles : 0;
      
      return {
        averageComplexity: Math.round(averageComplexity * 100) / 100,
        totalFiles,
        complexFiles: complexFiles.slice(0, 10), // Top 10 most complex files
        functionMetrics: functionMetrics
          .sort((a, b) => b.complexity - a.complexity)
          .slice(0, 20), // Top 20 most complex functions
        complexityDistribution: this.calculateComplexityDistribution(functionMetrics),
        score: this.getComplexityScore(averageComplexity)
      };
    } catch (error) {
      console.error('Error analyzing complexity:', error);
      return this.getDefaultComplexityAnalysis();
    }
  }

  /**
   * Analyzes file complexity using simple heuristics
   */
  analyzeFileComplexity(content, filePath) {
    try {
      const lines = content.split('\n');
      const codeLines = lines.filter(line => line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*'));
      
      // Simple complexity calculation based on code patterns
      let complexity = 1; // Base complexity
      let functionCount = 0;
      const functions = [];
      
      codeLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Count decision points (simplified cyclomatic complexity)
        if (trimmedLine.includes('if ') || trimmedLine.includes('else if ')) complexity++;
        if (trimmedLine.includes('while ') || trimmedLine.includes('for ') || trimmedLine.includes('forEach')) complexity++;
        if (trimmedLine.includes('switch ') || trimmedLine.includes('case ')) complexity++;
        if (trimmedLine.includes('catch ') || trimmedLine.includes('try ')) complexity++;
        if (trimmedLine.includes('&&') || trimmedLine.includes('||')) complexity++;
        if (trimmedLine.includes('?') && trimmedLine.includes(':')) complexity++; // Ternary operator
        
        // Detect functions (simplified)
        if (trimmedLine.includes('function ') || 
            trimmedLine.includes('const ') && trimmedLine.includes('=>') ||
            trimmedLine.includes('let ') && trimmedLine.includes('=>') ||
            trimmedLine.includes('var ') && trimmedLine.includes('=>')) {
          functionCount++;
          
          // Extract function name (simplified)
          let functionName = 'anonymous';
          if (trimmedLine.includes('function ')) {
            const match = trimmedLine.match(/function\s+(\w+)/);
            if (match) functionName = match[1];
          } else if (trimmedLine.includes('const ') || trimmedLine.includes('let ') || trimmedLine.includes('var ')) {
            const match = trimmedLine.match(/(const|let|var)\s+(\w+)/);
            if (match) functionName = match[2];
          }
          
          functions.push({
            name: functionName,
            complexity: Math.min(complexity / Math.max(functionCount, 1), 20), // Average complexity per function
            lines: index + 1,
            params: (trimmedLine.match(/\(/g) || []).length // Rough parameter count
          });
        }
      });

      // Calculate maintainability index (simplified)
      const maintainability = Math.max(0, Math.min(100, 
        100 - (complexity * 2) - (codeLines.length / 10)
      ));

      return {
        complexity: Math.min(complexity, 100),
        functions,
        maintainability: Math.round(maintainability)
      };
    } catch (error) {
      // If complexity analysis fails, return basic metrics
      const lines = content.split('\n').length;
      return {
        complexity: Math.min(Math.floor(lines / 20), 50), // Rough estimate
        functions: [],
        maintainability: 50
      };
    }
  }

  /**
   * Analyzes project dependencies for health and vulnerabilities
   */
  async analyzeDependencies(owner, repo) {
    try {
      const packageFiles = await this.getPackageFiles(owner, repo);
      let allDependencies = {};
      let vulnerabilities = [];
      let outdatedPackages = [];

      for (const file of packageFiles) {
        const deps = await this.extractDependencies(owner, repo, file);
        allDependencies = { ...allDependencies, ...deps };
      }

      // Analyze each dependency
      for (const [name, version] of Object.entries(allDependencies)) {
        try {
          const cleanCurrentVersion = this.cleanVersionString(version);
          const [vulnData, latestVersion] = await Promise.all([
            this.checkVulnerabilities(name, version), // Pass original version for vulnerability check
            this.getLatestVersion(name)
          ]);

          if (vulnData.length > 0) {
            vulnerabilities.push(...vulnData);
          }

          if (latestVersion) {
            const cleanLatestVersion = this.cleanVersionString(latestVersion);
            
            // Only compare if both versions are valid
            if (semver.valid(cleanCurrentVersion) && semver.valid(cleanLatestVersion)) {
              try {
                if (semver.gt(cleanLatestVersion, cleanCurrentVersion)) {
                  outdatedPackages.push({
                    name,
                    current: cleanCurrentVersion,
                    latest: cleanLatestVersion,
                    majorUpdate: semver.major(cleanLatestVersion) > semver.major(cleanCurrentVersion)
                  });
                }
              } catch (compareError) {
                console.warn(`Error comparing versions for ${name}: ${cleanCurrentVersion} vs ${cleanLatestVersion}`, compareError.message);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to analyze dependency ${name}:`, error.message);
        }
      }

      return {
        totalDependencies: Object.keys(allDependencies).length,
        vulnerabilities: vulnerabilities.slice(0, 20), // Top 20 vulnerabilities
        outdatedPackages: outdatedPackages.slice(0, 15), // Top 15 outdated
        healthScore: this.calculateDependencyHealthScore(vulnerabilities, outdatedPackages, allDependencies),
        riskDistribution: this.calculateRiskDistribution(vulnerabilities),
        recommendations: this.generateDependencyRecommendations(outdatedPackages, vulnerabilities)
      };
    } catch (error) {
      console.error('Error analyzing dependencies:', error);
      return this.getDefaultDependencyAnalysis();
    }
  }

  /**
   * Checks for security vulnerabilities using multiple sources
   */
  async checkVulnerabilities(packageName, version) {
    try {
      // Clean the version string to remove range specifiers
      const cleanVersion = this.cleanVersionString(version);
      const cacheKey = `${packageName}@${cleanVersion}`;
      
      if (this.vulnerabilityCache.has(cacheKey)) {
        return this.vulnerabilityCache.get(cacheKey);
      }

      // Simulate vulnerability check (in real implementation, integrate with Snyk/OSV API)
      const vulnerabilities = await this.queryVulnerabilityDatabase(packageName, cleanVersion);
      
      this.vulnerabilityCache.set(cacheKey, vulnerabilities);
      return vulnerabilities;
    } catch (error) {
      console.warn(`Failed to check vulnerabilities for ${packageName}:`, error.message);
      return [];
    }
  }

  /**
   * Performs linting analysis on repository files
   */
  async performLinting(owner, repo) {
    try {
      const files = await this.githubService.getRepositoryFiles(owner, repo, '.js,.ts,.jsx,.tsx');
      let totalIssues = 0;
      let errorCount = 0;
      let warningCount = 0;
      let fileResults = [];

      for (const file of files.slice(0, 20)) { // Analyze first 20 files
        if (this.isAnalyzableFile(file.name)) {
          try {
            const content = await this.githubService.getFileContent(owner, repo, file.path);
            const issues = this.lintCode(content, file.path);
            
            totalIssues += issues.length;
            errorCount += issues.filter(i => i.severity === 'error').length;
            warningCount += issues.filter(i => i.severity === 'warning').length;
            
            if (issues.length > 0) {
              fileResults.push({
                path: file.path,
                issues: issues.slice(0, 5) // Top 5 issues per file
              });
            }
          } catch (error) {
            console.warn(`Failed to lint ${file.path}:`, error.message);
          }
        }
      }

      return {
        totalIssues,
        errorCount,
        warningCount,
        filesWithIssues: fileResults.length,
        issuesByFile: fileResults.slice(0, 10), // Top 10 files with issues
        score: this.getLintingScore(totalIssues, files.length),
        topIssueTypes: this.getTopIssueTypes(fileResults)
      };
    } catch (error) {
      console.error('Error performing linting:', error);
      return this.getDefaultLintingResults();
    }
  }

  /**
   * Simple code linting using predefined rules
   */
  lintCode(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for common issues
      if (line.includes('console.log') && !line.includes('//')) {
        issues.push({
          line: index + 1,
          message: 'Console statement should be removed',
          severity: 'warning',
          rule: 'no-console'
        });
      }

      if (line.includes('eval(')) {
        issues.push({
          line: index + 1,
          message: 'Use of eval() is dangerous',
          severity: 'error',
          rule: 'no-eval'
        });
      }

      if (line.length > 120) {
        issues.push({
          line: index + 1,
          message: 'Line too long (>120 characters)',
          severity: 'warning',
          rule: 'max-len'
        });
      }

      // Check for potential security issues
      if (line.includes('innerHTML') && line.includes('=')) {
        issues.push({
          line: index + 1,
          message: 'Potential XSS vulnerability with innerHTML',
          severity: 'error',
          rule: 'security/detect-xss'
        });
      }
    });

    return issues;
  }

  /**
   * Calculates maintainability metrics
   */
  async calculateMaintainabilityMetrics(owner, repo) {
    try {
      const repoData = await this.githubService.getRepositoryDetails(owner, repo);
      const [commits, contributors, issues] = await Promise.all([
        this.githubService.getCommitHistory(owner, repo).catch(() => []),
        this.githubService.getContributors(owner, repo).catch(() => []),
        this.githubService.getIssues(owner, repo).catch(() => [])
      ]);

      const now = new Date();
      const recentCommits = commits.filter(commit => {
        const commitDate = new Date(commit.commit.committer.date);
        return (now - commitDate) <= (30 * 24 * 60 * 60 * 1000); // Last 30 days
      });

      const avgIssueResolutionTime = this.calculateAvgIssueResolutionTime(issues);
      const codeChurn = this.calculateCodeChurn(commits);
      const documentationScore = this.calculateDocumentationScore(repoData);

      return {
        recentActivity: recentCommits.length,
        contributorCount: contributors.length,
        issueResolutionTime: avgIssueResolutionTime,
        codeChurn,
        documentationScore,
        maintenanceScore: this.calculateMaintenanceScore({
          recentActivity: recentCommits.length,
          contributors: contributors.length,
          issueResolutionTime: avgIssueResolutionTime,
          hasReadme: !!repoData.description
        })
      };
    } catch (error) {
      console.error('Error calculating maintainability metrics:', error);
      return this.getDefaultMaintainabilityMetrics();
    }
  }

  /**
   * Calculates overall quality score
   */
  calculateOverallQualityScore(analyses) {
    const weights = {
      complexity: 0.25,
      dependencies: 0.25,
      linting: 0.20,
      security: 0.20,
      maintainability: 0.10
    };

    const scores = {
      complexity: analyses.complexity.score || 50,
      dependencies: analyses.dependencies.healthScore || 50,
      linting: analyses.linting.score || 50,
      security: Math.max(0, 100 - (analyses.security.vulnerabilities.length * 10)),
      maintainability: analyses.maintainability.maintenanceScore || 50
    };

    const weightedScore = Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (scores[key] * weight);
    }, 0);

    return {
      overall: Math.round(weightedScore),
      breakdown: scores,
      weights,
      grade: this.scoreToGrade(weightedScore)
    };
  }

  /**
   * Generates improvement recommendations
   */
  generateRecommendations(analyses) {
    const recommendations = [];

    // Complexity recommendations
    if (analyses.complexity.averageComplexity > 10) {
      recommendations.push({
        type: 'complexity',
        priority: 'high',
        title: 'Reduce Code Complexity',
        description: 'Several functions have high cyclomatic complexity. Consider breaking them into smaller functions.',
        impact: 'Improves maintainability and reduces bugs'
      });
    }

    // Security recommendations
    if (analyses.security.vulnerabilities.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        title: 'Fix Security Vulnerabilities',
        description: `Found ${analyses.security.vulnerabilities.length} security vulnerabilities in dependencies.`,
        impact: 'Reduces security risk and potential exploits'
      });
    }

    // Dependency recommendations
    if (analyses.dependencies.outdatedPackages.length > 5) {
      recommendations.push({
        type: 'dependencies',
        priority: 'medium',
        title: 'Update Dependencies',
        description: 'Multiple dependencies are outdated. Regular updates improve security and performance.',
        impact: 'Reduces technical debt and security risks'
      });
    }

    // Linting recommendations
    if (analyses.linting.errorCount > 0) {
      recommendations.push({
        type: 'linting',
        priority: 'medium',
        title: 'Fix Linting Errors',
        description: `Found ${analyses.linting.errorCount} linting errors that should be addressed.`,
        impact: 'Improves code quality and consistency'
      });
    }

    return recommendations.slice(0, 8); // Top 8 recommendations
  }

  // Helper methods
  isAnalyzableFile(filename) {
    return /\.(js|ts|jsx|tsx)$/i.test(filename) && 
           !filename.includes('.min.') &&
           !filename.includes('node_modules');
  }

  scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // Default/fallback methods
  getDefaultComplexityAnalysis() {
    return {
      averageComplexity: 0,
      totalFiles: 0,
      complexFiles: [],
      functionMetrics: [],
      complexityDistribution: {},
      score: 50
    };
  }

  getDefaultDependencyAnalysis() {
    return {
      totalDependencies: 0,
      vulnerabilities: [],
      outdatedPackages: [],
      healthScore: 50,
      riskDistribution: {},
      recommendations: []
    };
  }

  getDefaultLintingResults() {
    return {
      totalIssues: 0,
      errorCount: 0,
      warningCount: 0,
      filesWithIssues: 0,
      issuesByFile: [],
      score: 50,
      topIssueTypes: []
    };
  }

  getDefaultMaintainabilityMetrics() {
    return {
      recentActivity: 0,
      contributorCount: 0,
      issueResolutionTime: 0,
      codeChurn: 0,
      documentationScore: 50,
      maintenanceScore: 50
    };
  }

  // Additional helper methods for calculations
  calculateComplexityDistribution(functions) {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    functions.forEach(func => {
      if (func.complexity <= 5) distribution.low++;
      else if (func.complexity <= 10) distribution.medium++;
      else if (func.complexity <= 20) distribution.high++;
      else distribution.critical++;
    });
    return distribution;
  }

  calculateDependencyHealthScore(vulnerabilities, outdated, allDeps) {
    const vulnPenalty = vulnerabilities.length * 5;
    const outdatedPenalty = outdated.length * 2;
    const totalDeps = Object.keys(allDeps).length;
    
    return Math.max(0, 100 - vulnPenalty - outdatedPenalty - (totalDeps > 50 ? 10 : 0));
  }

  calculateRiskDistribution(vulnerabilities) {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    vulnerabilities.forEach(vuln => {
      distribution[vuln.severity] = (distribution[vuln.severity] || 0) + 1;
    });
    return distribution;
  }

  getComplexityScore(avgComplexity) {
    if (avgComplexity <= 5) return 95;
    if (avgComplexity <= 10) return 80;
    if (avgComplexity <= 15) return 60;
    if (avgComplexity <= 20) return 40;
    return 20;
  }

  getLintingScore(totalIssues, totalFiles) {
    if (totalFiles === 0) return 50;
    const issuesPerFile = totalIssues / totalFiles;
    if (issuesPerFile <= 1) return 95;
    if (issuesPerFile <= 3) return 80;
    if (issuesPerFile <= 5) return 60;
    if (issuesPerFile <= 10) return 40;
    return 20;
  }

  calculateMaintenanceScore(metrics) {
    let score = 50;
    if (metrics.recentActivity > 10) score += 20;
    else if (metrics.recentActivity > 5) score += 10;
    
    if (metrics.contributors > 5) score += 15;
    else if (metrics.contributors > 2) score += 10;
    
    if (metrics.issueResolutionTime < 7) score += 15;
    else if (metrics.issueResolutionTime < 14) score += 10;
    
    return Math.min(100, score);
  }

  // Placeholder methods (would integrate with real APIs in production)
  async getPackageFiles(owner, repo) {
    try {
      const tree = await this.githubService.getRepositoryTree(owner, repo);
      return tree.tree.filter(item => 
        item.path === 'package.json' || 
        item.path === 'requirements.txt' ||
        item.path === 'Pipfile' ||
        item.path === 'go.mod'
      );
    } catch (error) {
      console.warn('Could not get package files:', error.message);
      return [];
    }
  }

  async extractDependencies(owner, repo, file) {
    try {
      const content = await this.githubService.getFileContent(owner, repo, file.path);
      
      if (file.path === 'package.json') {
        const packageJson = JSON.parse(content);
        return {
          ...packageJson.dependencies || {},
          ...packageJson.devDependencies || {}
        };
      }
      
      // Add other package file parsers as needed
      return {};
    } catch (error) {
      console.warn(`Could not extract dependencies from ${file.path}:`, error.message);
      return {};
    }
  }

  async queryVulnerabilityDatabase(packageName, version) {
    try {
      const vulnerabilities = [];
      
      // Query OSV (Open Source Vulnerabilities) database
      try {
        const osvResponse = await this.makeHttpRequest('https://api.osv.dev/v1/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: version,
            package: {
              name: packageName,
              ecosystem: this.getPackageEcosystem(packageName)
            }
          })
        });

        if (osvResponse.ok) {
          const osvData = await osvResponse.json();
          if (osvData.vulns) {
            vulnerabilities.push(...osvData.vulns.map(vuln => ({
              id: vuln.id,
              summary: vuln.summary || 'Security vulnerability detected',
              severity: this.mapOSVSeverity(vuln.database_specific?.severity || vuln.severity),
              source: 'OSV',
              package: packageName,
              version: version,
              references: vuln.references || [],
              affected: vuln.affected || [],
              published: vuln.published,
              modified: vuln.modified
            })));
          }
        }
      } catch (osvError) {
        console.warn(`OSV query failed for ${packageName}:`, osvError.message);
      }

      // Query GitHub Advisory Database
      try {
        const ghAdvisoryResponse = await this.makeHttpRequest(
          `https://api.github.com/advisories?package=${encodeURIComponent(packageName)}&ecosystem=npm`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'TechHealthAnalyzer/1.0'
            }
          }
        );

        if (ghAdvisoryResponse.ok) {
          const advisories = await ghAdvisoryResponse.json();
          vulnerabilities.push(...advisories.map(advisory => ({
            id: advisory.ghsa_id,
            summary: advisory.summary,
            severity: advisory.severity.toLowerCase(),
            source: 'GitHub Advisory',
            package: packageName,
            version: version,
            references: [advisory.html_url],
            cve: advisory.cve_id,
            published: advisory.published_at,
            updated: advisory.updated_at
          })));
        }
      } catch (ghError) {
        console.warn(`GitHub Advisory query failed for ${packageName}:`, ghError.message);
      }

      // Simulate npm audit-like vulnerability check
      if (vulnerabilities.length === 0) {
        // Check against known vulnerable version patterns
        const knownVulnPatterns = this.getKnownVulnerabilityPatterns();
        const matchedVulns = knownVulnPatterns.filter(pattern => 
          pattern.package === packageName && this.isVersionVulnerable(version, pattern.versions)
        );

        vulnerabilities.push(...matchedVulns.map(pattern => ({
          id: `INTERNAL-${pattern.id}`,
          summary: pattern.summary,
          severity: pattern.severity,
          source: 'Internal Database',
          package: packageName,
          version: version,
          references: pattern.references || []
        })));
      }

      return vulnerabilities;
    } catch (error) {
      console.error(`Error querying vulnerability database for ${packageName}:`, error);
      return [];
    }
  }

  async getLatestVersion(packageName) {
    try {
      // Determine package ecosystem and query appropriate registry
      const ecosystem = this.getPackageEcosystem(packageName);
      
      switch (ecosystem) {
        case 'npm':
          return await this.getNpmLatestVersion(packageName);
        case 'PyPI':
          return await this.getPyPILatestVersion(packageName);
        case 'Maven':
          return await this.getMavenLatestVersion(packageName);
        case 'NuGet':
          return await this.getNuGetLatestVersion(packageName);
        case 'Go':
          return await this.getGoModuleLatestVersion(packageName);
        case 'RubyGems':
          return await this.getRubyGemsLatestVersion(packageName);
        default:
          console.warn(`Unsupported package ecosystem: ${ecosystem} for ${packageName}`);
          return null;
      }
    } catch (error) {
      console.error(`Error getting latest version for ${packageName}:`, error);
      return null;
    }
  }

  /**
   * Get latest version from npm registry
   */
  async getNpmLatestVersion(packageName) {
    try {
      const response = await this.makeHttpRequest(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.version;
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to get npm latest version for ${packageName}:`, error.message);
      return null;
    }
  }

  /**
   * Get latest version from PyPI
   */
  async getPyPILatestVersion(packageName) {
    try {
      const response = await this.makeHttpRequest(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.info.version;
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to get PyPI latest version for ${packageName}:`, error.message);
      return null;
    }
  }

  /**
   * Get latest version from Maven Central
   */
  async getMavenLatestVersion(packageName) {
    try {
      // Maven packages have group:artifact format
      const [groupId, artifactId] = packageName.includes(':') ? 
        packageName.split(':') : [packageName, packageName];
      
      const response = await this.makeHttpRequest(
        `https://search.maven.org/solrsearch/select?q=g:"${groupId}"+AND+a:"${artifactId}"&rows=1&wt=json`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.response.docs.length > 0) {
          return data.response.docs[0].latestVersion;
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to get Maven latest version for ${packageName}:`, error.message);
      return null;
    }
  }

  /**
   * Get latest version from NuGet
   */
  async getNuGetLatestVersion(packageName) {
    try {
      const response = await this.makeHttpRequest(
        `https://api.nuget.org/v3-flatcontainer/${packageName.toLowerCase()}/index.json`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.versions && data.versions.length > 0) {
          return data.versions[data.versions.length - 1]; // Last version in the array
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to get NuGet latest version for ${packageName}:`, error.message);
      return null;
    }
  }

  /**
   * Get latest version for Go modules
   */
  async getGoModuleLatestVersion(packageName) {
    try {
      // Use Go proxy API
      const response = await this.makeHttpRequest(`https://proxy.golang.org/${packageName}/@latest`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.Version;
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to get Go module latest version for ${packageName}:`, error.message);
      return null;
    }
  }

  /**
   * Get latest version from RubyGems
   */
  async getRubyGemsLatestVersion(packageName) {
    try {
      const response = await this.makeHttpRequest(`https://rubygems.org/api/v1/gems/${encodeURIComponent(packageName)}.json`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.version;
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to get RubyGems latest version for ${packageName}:`, error.message);
      return null;
    }
  }

  calculateAvgIssueResolutionTime(issues) {
    const closedIssues = issues.filter(issue => issue.state === 'closed' && issue.closed_at);
    if (closedIssues.length === 0) return 0;

    const totalTime = closedIssues.reduce((sum, issue) => {
      const created = new Date(issue.created_at);
      const closed = new Date(issue.closed_at);
      return sum + (closed - created);
    }, 0);

    return Math.round(totalTime / closedIssues.length / (24 * 60 * 60 * 1000)); // Days
  }

  calculateCodeChurn(commits) {
    if (commits.length < 2) return 0;
    
    // Simplified code churn calculation
    const recentCommits = commits.slice(0, 10);
    return recentCommits.length;
  }

  calculateDocumentationScore(repoData) {
    let score = 30; // Base score
    
    if (repoData.description) score += 20;
    if (repoData.homepage) score += 10;
    if (repoData.has_wiki) score += 15;
    if (repoData.has_pages) score += 15;
    
    return Math.min(100, score);
  }

  getTopIssueTypes(fileResults) {
    const issueTypes = {};
    
    fileResults.forEach(file => {
      file.issues.forEach(issue => {
        issueTypes[issue.rule] = (issueTypes[issue.rule] || 0) + 1;
      });
    });

    return Object.entries(issueTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([rule, count]) => ({ rule, count }));
  }

  generateDependencyRecommendations(outdated, vulnerabilities) {
    const recommendations = [];
    
    // Critical vulnerabilities first
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      recommendations.push(`Update ${criticalVulns.length} dependencies with critical vulnerabilities immediately`);
    }

    // Major version updates
    const majorUpdates = outdated.filter(p => p.majorUpdate);
    if (majorUpdates.length > 0) {
      recommendations.push(`Review ${majorUpdates.length} dependencies with major version updates`);
    }

    return recommendations;
  }

  /**
   * Analyzes security vulnerabilities in dependencies and code
   */
  async analyzeSecurityVulnerabilities(owner, repo) {
    try {
      console.log(`Analyzing security vulnerabilities for ${owner}/${repo}`);
      
      const [dependencyVulns, codeSecurityIssues] = await Promise.all([
        this.scanDependencyVulnerabilities(owner, repo),
        this.scanCodeSecurityIssues(owner, repo)
      ]);

      const allVulnerabilities = [...dependencyVulns, ...codeSecurityIssues];
      
      return {
        vulnerabilities: allVulnerabilities.slice(0, 25), // Top 25 vulnerabilities
        severityBreakdown: this.categorizeBySeverity(allVulnerabilities),
        securityScore: this.calculateSecurityScore(allVulnerabilities),
        riskAreas: this.identifyRiskAreas(allVulnerabilities),
        criticalCount: allVulnerabilities.filter(v => v.severity === 'critical').length,
        highCount: allVulnerabilities.filter(v => v.severity === 'high').length
      };
    } catch (error) {
      console.error('Error analyzing security vulnerabilities:', error);
      return {
        vulnerabilities: [],
        severityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 },
        securityScore: 70,
        riskAreas: [],
        criticalCount: 0,
        highCount: 0
      };
    }
  }

  /**
   * Scans for dependency vulnerabilities
   */
  async scanDependencyVulnerabilities(owner, repo) {
    try {
      const packageFiles = await this.getPackageFiles(owner, repo);
      const vulnerabilities = [];

      for (const file of packageFiles) {
        const deps = await this.extractDependencies(owner, repo, file);
        
        for (const [name, version] of Object.entries(deps)) {
          const vulns = await this.checkVulnerabilities(name, version);
          vulnerabilities.push(...vulns.map(v => ({
            ...v,
            type: 'dependency',
            package: name,
            version: version,
            source: file.path
          })));
        }
      }

      return vulnerabilities;
    } catch (error) {
      console.warn('Failed to scan dependency vulnerabilities:', error.message);
      return [];
    }
  }

  /**
   * Scans code for security issues
   */
  async scanCodeSecurityIssues(owner, repo) {
    try {
      const files = await this.githubService.getRepositoryFiles(owner, repo, '.js,.ts,.jsx,.tsx,.py,.java,.go');
      const securityIssues = [];

      for (const file of files.slice(0, 15)) { // Analyze first 15 files
        if (this.isAnalyzableFile(file.name)) {
          try {
            const content = await this.githubService.getFileContent(owner, repo, file.path);
            const issues = this.detectSecurityPatterns(content, file.path);
            securityIssues.push(...issues);
          } catch (error) {
            console.warn(`Failed to scan ${file.path}:`, error.message);
          }
        }
      }

      return securityIssues;
    } catch (error) {
      console.warn('Failed to scan code security issues:', error.message);
      return [];
    }
  }

  /**
   * Detects common security patterns in code
   */
  detectSecurityPatterns(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    const securityPatterns = [
      {
        pattern: /eval\s*\(/gi,
        message: 'Use of eval() can lead to code injection vulnerabilities',
        severity: 'high',
        cwe: 'CWE-95'
      },
      {
        pattern: /innerHTML\s*=.*\+/gi,
        message: 'Potential XSS vulnerability with innerHTML concatenation',
        severity: 'medium',
        cwe: 'CWE-79'
      },
      {
        pattern: /document\.write\s*\(/gi,
        message: 'Use of document.write can lead to XSS vulnerabilities',
        severity: 'medium',
        cwe: 'CWE-79'
      },
      {
        pattern: /password.*=.*['"]/gi,
        message: 'Potential hardcoded password detected',
        severity: 'critical',
        cwe: 'CWE-259'
      },
      {
        pattern: /api[_-]?key.*=.*['"]/gi,
        message: 'Potential hardcoded API key detected',
        severity: 'critical',
        cwe: 'CWE-798'
      },
      {
        pattern: /exec\s*\(.*\+/gi,
        message: 'Potential command injection vulnerability',
        severity: 'high',
        cwe: 'CWE-78'
      },
      {
        pattern: /Math\.random\(\)/gi,
        message: 'Math.random() is not cryptographically secure',
        severity: 'low',
        cwe: 'CWE-338'
      }
    ];

    lines.forEach((line, index) => {
      securityPatterns.forEach(pattern => {
        if (pattern.pattern.test(line)) {
          issues.push({
            type: 'code',
            line: index + 1,
            message: pattern.message,
            severity: pattern.severity,
            cwe: pattern.cwe,
            file: filePath,
            code: line.trim()
          });
        }
      });
    });

    return issues;
  }

  /**
   * Categorizes vulnerabilities by severity
   */
  categorizeBySeverity(vulnerabilities) {
    const breakdown = { critical: 0, high: 0, medium: 0, low: 0 };
    
    vulnerabilities.forEach(vuln => {
      if (breakdown.hasOwnProperty(vuln.severity)) {
        breakdown[vuln.severity]++;
      }
    });

    return breakdown;
  }

  /**
   * Calculates security score based on vulnerabilities
   */
  calculateSecurityScore(vulnerabilities) {
    let score = 100;
    
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * Identifies major risk areas
   */
  identifyRiskAreas(vulnerabilities) {
    const riskAreas = {};
    
    vulnerabilities.forEach(vuln => {
      if (vuln.type === 'dependency') {
        riskAreas['Dependencies'] = (riskAreas['Dependencies'] || 0) + 1;
      } else if (vuln.cwe && vuln.cwe.includes('79')) {
        riskAreas['XSS Vulnerabilities'] = (riskAreas['XSS Vulnerabilities'] || 0) + 1;
      } else if (vuln.cwe && vuln.cwe.includes('78')) {
        riskAreas['Command Injection'] = (riskAreas['Command Injection'] || 0) + 1;
      } else if (vuln.cwe && (vuln.cwe.includes('259') || vuln.cwe.includes('798'))) {
        riskAreas['Hardcoded Secrets'] = (riskAreas['Hardcoded Secrets'] || 0) + 1;
      } else {
        riskAreas['Other Security Issues'] = (riskAreas['Other Security Issues'] || 0) + 1;
      }
    });

    return Object.entries(riskAreas)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([area, count]) => ({ area, count }));
  }

  /**
   * Determines the package ecosystem based on package name and context
   */
  getPackageEcosystem(packageName) {
    // Default to npm for most packages, but detect others based on naming patterns
    if (packageName.includes(':')) {
      // Maven format (group:artifact)
      return 'Maven';
    }
    
    if (packageName.includes('/') && !packageName.startsWith('@')) {
      // Go module format
      return 'Go';
    }
    
    // Check for language-specific patterns
    if (packageName.match(/^[A-Z][a-zA-Z0-9]*(\.[A-Z][a-zA-Z0-9]*)*$/)) {
      // PascalCase with dots suggests NuGet
      return 'NuGet';
    }
    
    // Default to npm
    return 'npm';
  }

  /**
   * Maps OSV severity levels to standardized levels
   */
  mapOSVSeverity(severity) {
    if (!severity) return 'medium';
    
    const severityLower = severity.toLowerCase();
    
    if (severityLower.includes('critical') || severityLower.includes('high')) {
      return 'critical';
    }
    if (severityLower.includes('moderate') || severityLower.includes('medium')) {
      return 'medium';
    }
    if (severityLower.includes('low') || severityLower.includes('minor')) {
      return 'low';
    }
    
    return 'medium'; // Default
  }

  /**
   * Returns known vulnerability patterns for common packages
   */
  getKnownVulnerabilityPatterns() {
    return [
      {
        id: 'LODASH-PROTOTYPE-POLLUTION',
        package: 'lodash',
        versions: ['<4.17.12'],
        severity: 'high',
        summary: 'Prototype pollution vulnerability in lodash',
        references: ['https://github.com/advisories/GHSA-jf85-cpcp-j695']
      },
      {
        id: 'JQUERY-XSS',
        package: 'jquery',
        versions: ['<3.5.0'],
        severity: 'medium',
        summary: 'Cross-site scripting vulnerability in jQuery',
        references: ['https://github.com/advisories/GHSA-gxr4-xjj5-5px2']
      },
      {
        id: 'EXPRESS-DOS',
        package: 'express',
        versions: ['<4.17.1'],
        severity: 'medium',
        summary: 'Denial of service vulnerability in Express',
        references: ['https://github.com/advisories/GHSA-rv95-896h-c2vc']
      },
      {
        id: 'MOMENT-RCE',
        package: 'moment',
        versions: ['<2.29.2'],
        severity: 'high',
        summary: 'Regular expression denial of service in moment',
        references: ['https://github.com/advisories/GHSA-8hfj-j24r-96c4']
      },
      {
        id: 'AXIOS-SSRF',
        package: 'axios',
        versions: ['<0.21.1'],
        severity: 'medium',
        summary: 'Server-side request forgery in axios',
        references: ['https://github.com/advisories/GHSA-cph5-m8f7-6c5x']
      }
    ];
  }

  /**
   * Cleans version strings to remove semantic version range specifiers
   */
  cleanVersionString(version) {
    if (!version || typeof version !== 'string') {
      return '0.0.0';
    }

    // Remove common semver range specifiers
    let cleanVersion = version
      .replace(/^[\^~>=<]+/, '') // Remove prefixes like ^, ~, >=, <=, >, <
      .replace(/\s.*$/, '') // Remove everything after first space (removes stuff like "|| 1.2.3")
      .replace(/[^\d.-]/g, '') // Keep only digits, dots, and dashes
      .trim();

    // Handle special cases
    if (!cleanVersion || cleanVersion === '') {
      return '0.0.0';
    }

    // Ensure we have at least major.minor.patch format
    const parts = cleanVersion.split('.');
    while (parts.length < 3) {
      parts.push('0');
    }

    // Take only first 3 parts (major.minor.patch)
    cleanVersion = parts.slice(0, 3).join('.');

    // Validate that it's a proper semver
    try {
      if (semver.valid(cleanVersion)) {
        return cleanVersion;
      }
    } catch (error) {
      // If semver validation fails, try to coerce it
      try {
        const coerced = semver.coerce(cleanVersion);
        if (coerced) {
          return coerced.version;
        }
      } catch (coerceError) {
        console.warn(`Could not parse version ${version}, using 0.0.0`);
        return '0.0.0';
      }
    }

    return '0.0.0';
  }

  /**
   * Checks if a version is vulnerable based on version ranges
   */
  isVersionVulnerable(version, vulnerableRanges) {
    try {
      const cleanVersion = this.cleanVersionString(version);
      
      // Validate the cleaned version
      if (!semver.valid(cleanVersion)) {
        console.warn(`Invalid version after cleaning: ${cleanVersion} (from ${version})`);
        return false;
      }

      for (const range of vulnerableRanges) {
        try {
          // Clean the range as well if needed
          let cleanRange = range;
          if (typeof range === 'string') {
            // The range should be kept as-is since it might be a valid semver range like "<4.17.12"
            if (semver.satisfies(cleanVersion, cleanRange)) {
              return true;
            }
          }
        } catch (rangeError) {
          console.warn(`Error checking range ${range} against version ${cleanVersion}:`, rangeError.message);
          continue;
        }
      }
      return false;
    } catch (error) {
      console.warn(`Error checking version vulnerability for ${version}:`, error.message);
      return false;
    }
  }
}

module.exports = CodeQualityAnalyzer; 