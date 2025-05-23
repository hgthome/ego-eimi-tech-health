const CodeQualityAnalyzer = require('../../src/analysis/code-quality-analyzer');

describe('CodeQualityAnalyzer', () => {
  let analyzer;
  let mockGithubService;

  beforeEach(() => {
    mockGithubService = {
      getRepositoryFiles: jest.fn(),
      getFileContent: jest.fn(),
      getCommitHistory: jest.fn(),
      getIssues: jest.fn(),
      getReleases: jest.fn()
    };
    analyzer = new CodeQualityAnalyzer(mockGithubService);
  });

  describe('Code Quality Analysis', () => {
    test('should perform comprehensive code quality analysis', async () => {
      mockGithubService.getRepositoryFiles.mockResolvedValue([
        { name: 'app.js', path: 'src/app.js', type: 'file' },
        { name: 'utils.js', path: 'src/utils.js', type: 'file' }
      ]);

      mockGithubService.getFileContent.mockResolvedValue(`
        function simpleFunction(x) {
          if (x > 0) {
            return x * 2;
          }
          return 0;
        }
      `);

      mockGithubService.getCommitHistory.mockResolvedValue([]);
      mockGithubService.getIssues.mockResolvedValue([]);
      mockGithubService.getReleases.mockResolvedValue([]);

      const result = await analyzer.analyzeCodeQuality('owner', 'repo');

      expect(result).toEqual(
        expect.objectContaining({
          qualityScore: expect.objectContaining({
            overall: expect.any(Number),
            grade: expect.any(String),
            breakdown: expect.any(Object)
          }),
          complexity: expect.any(Object),
          dependencies: expect.any(Object),
          linting: expect.any(Object),
          security: expect.any(Object),
          maintainability: expect.any(Object),
          recommendations: expect.any(Array),
          analyzedAt: expect.any(String)
        })
      );
      expect(result.qualityScore.overall).toBeGreaterThan(0);
      expect(result.qualityScore.overall).toBeLessThanOrEqual(100);
    });

    test('should handle empty repository', async () => {
      mockGithubService.getRepositoryFiles.mockResolvedValue([]);
      mockGithubService.getCommitHistory.mockResolvedValue([]);
      mockGithubService.getIssues.mockResolvedValue([]);
      mockGithubService.getReleases.mockResolvedValue([]);

      const result = await analyzer.analyzeCodeQuality('owner', 'repo');

      expect(result).toBeDefined();
      expect(result.qualityScore.overall).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Complexity Analysis', () => {
    test('should analyze file complexity correctly', async () => {
      mockGithubService.getRepositoryFiles.mockResolvedValue([
        { name: 'complex.js', path: 'src/complex.js', type: 'file' }
      ]);

      const complexCode = `
        function complexFunction(a, b, c) {
          if (a > 0) {
            if (b > 0) {
              if (c > 0) {
                return a + b + c;
              } else {
                return a + b - c;
              }
            } else {
              return a - b;
            }
          } else {
            return 0;
          }
        }
      `;

      mockGithubService.getFileContent.mockResolvedValue(complexCode);

      const result = await analyzer.analyzeComplexity('owner', 'repo');

      expect(result).toEqual(
        expect.objectContaining({
          averageComplexity: expect.any(Number),
          totalFiles: expect.any(Number),
          complexFiles: expect.any(Array),
          functionMetrics: expect.any(Array),
          score: expect.any(Number)
        })
      );
      expect(result.averageComplexity).toBeGreaterThan(0);
    });

    test('should handle syntax errors gracefully', async () => {
      mockGithubService.getRepositoryFiles.mockResolvedValue([
        { name: 'broken.js', path: 'src/broken.js', type: 'file' }
      ]);

      mockGithubService.getFileContent.mockResolvedValue('function broken( { return }');

      const result = await analyzer.analyzeComplexity('owner', 'repo');

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Dependency Analysis', () => {
    test('should analyze dependencies correctly', async () => {
      const packageJson = JSON.stringify({
        dependencies: {
          'express': '^4.18.0',
          'lodash': '^4.17.21'
        },
        devDependencies: {
          'jest': '^29.0.0',
          'nodemon': '^2.0.0'
        }
      });

      // Mock getPackageFiles method used internally
      jest.spyOn(analyzer, 'getPackageFiles').mockResolvedValue([
        { path: 'package.json', name: 'package.json' }
      ]);

      jest.spyOn(analyzer, 'extractDependencies').mockResolvedValue({
        production: [
          { name: 'express', version: '^4.18.0' },
          { name: 'lodash', version: '^4.17.21' }
        ],
        development: [
          { name: 'jest', version: '^29.0.0' },
          { name: 'nodemon', version: '^2.0.0' }
        ]
      });

      const result = await analyzer.analyzeDependencies('owner', 'repo');

      expect(result).toEqual(
        expect.objectContaining({
          totalDependencies: expect.any(Number),
          healthScore: expect.any(Number),
          vulnerabilities: expect.any(Array),
          outdatedPackages: expect.any(Array),
          riskDistribution: expect.any(Object)
        })
      );
    });

    test('should extract dependencies from package.json correctly', async () => {
      const packageJson = JSON.stringify({
        dependencies: {
          'express': '^4.18.0',
          'lodash': '^4.17.21'
        },
        devDependencies: {
          'jest': '^29.0.0'
        }
      });

      mockGithubService.getFileContent.mockResolvedValue(packageJson);

      const result = await analyzer.extractDependencies('owner', 'repo', {
        path: 'package.json',
        name: 'package.json'
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('Security Analysis', () => {
    test('should analyze security vulnerabilities', async () => {
      mockGithubService.getRepositoryFiles.mockResolvedValue([
        { name: 'package.json', path: 'package.json', type: 'file' }
      ]);

      jest.spyOn(analyzer, 'scanDependencyVulnerabilities').mockResolvedValue([]);
      jest.spyOn(analyzer, 'scanCodeSecurityIssues').mockResolvedValue([]);

      const result = await analyzer.analyzeSecurityVulnerabilities('owner', 'repo');

      expect(result).toEqual(
        expect.objectContaining({
          vulnerabilities: expect.any(Array),
          securityScore: expect.any(Number),
          severityBreakdown: expect.any(Object),
          riskAreas: expect.any(Array)
        })
      );
    });
  });

  describe('Maintainability Metrics', () => {
    test('should calculate maintainability metrics', async () => {
      mockGithubService.getCommitHistory.mockResolvedValue([
        {
          sha: 'abc123',
          commit: {
            message: 'Initial commit',
            committer: { date: '2024-01-01T00:00:00Z' }
          }
        }
      ]);

      mockGithubService.getIssues.mockResolvedValue([
        {
          created_at: '2024-01-01T00:00:00Z',
          closed_at: '2024-01-02T00:00:00Z',
          state: 'closed'
        }
      ]);

      const result = await analyzer.calculateMaintainabilityMetrics('owner', 'repo');

      expect(result).toEqual(
        expect.objectContaining({
          codeChurn: expect.any(Number),
          issueResolutionTime: expect.any(Number),
          documentationScore: expect.any(Number),
          maintenanceScore: expect.any(Number),
          contributorCount: expect.any(Number)
        })
      );
    });
  });

  describe('Quality Score Calculation', () => {
    test('should calculate overall quality score', async () => {
      const analyses = {
        complexity: { score: 80 },
        dependencies: { healthScore: 75 },
        linting: { score: 85 },
        security: { vulnerabilities: [], securityScore: 90 },
        maintainability: { maintenanceScore: 70 }
      };

      const result = analyzer.calculateOverallQualityScore(analyses);

      expect(result).toEqual(
        expect.objectContaining({
          overall: expect.any(Number),
          grade: expect.any(String),
          breakdown: expect.any(Object)
        })
      );
      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    });
  });

  describe('Error Handling', () => {
    test('should handle GitHub API errors gracefully', async () => {
      mockGithubService.getRepositoryFiles.mockRejectedValue(new Error('API Error'));

      const result = await analyzer.analyzeCodeQuality('owner', 'repo');

      expect(result).toBeDefined();
      expect(result.qualityScore.overall).toBeGreaterThanOrEqual(0);
    });

    test('should provide default values when analysis fails', async () => {
      const defaultComplexity = analyzer.getDefaultComplexityAnalysis();
      const defaultDependency = analyzer.getDefaultDependencyAnalysis();
      const defaultLinting = analyzer.getDefaultLintingResults();
      const defaultMaintainability = analyzer.getDefaultMaintainabilityMetrics();

      expect(defaultComplexity).toBeDefined();
      expect(defaultDependency).toBeDefined();
      expect(defaultLinting).toBeDefined();
      expect(defaultMaintainability).toBeDefined();
    });
  });

  describe('Utility Methods', () => {
    test('should correctly identify analyzable files', () => {
      expect(analyzer.isAnalyzableFile('app.js')).toBe(true);
      expect(analyzer.isAnalyzableFile('utils.ts')).toBe(true);
      expect(analyzer.isAnalyzableFile('component.jsx')).toBe(true);
      expect(analyzer.isAnalyzableFile('readme.md')).toBe(false);
      expect(analyzer.isAnalyzableFile('image.png')).toBe(false);
    });

    test('should convert score to grade correctly', () => {
      expect(analyzer.scoreToGrade(95)).toBe('A');
      expect(analyzer.scoreToGrade(85)).toBe('B');
      expect(analyzer.scoreToGrade(75)).toBe('C');
      expect(analyzer.scoreToGrade(65)).toBe('D');
      expect(analyzer.scoreToGrade(55)).toBe('F');
    });
  });

  describe('Advanced Code Analysis', () => {
    test('should scan code for security issues', async () => {
      const vulnerableCode = `
        // SQL Injection vulnerability
        const query = "SELECT * FROM users WHERE id = " + userId;
        
        // XSS vulnerability
        document.innerHTML = userInput;
        
        // Hardcoded secrets
        const apiKey = "sk-12345abcdef";
        const password = "admin123";
        
        // Insecure randomness
        const token = Math.random().toString(36);
      `;

      mockGithubService.getRepositoryFiles.mockResolvedValue([
        { name: 'vulnerable.js', path: 'src/vulnerable.js', type: 'file' }
      ]);
      mockGithubService.getFileContent.mockResolvedValue(vulnerableCode);

      const result = await analyzer.scanCodeSecurityIssues('owner', 'repo');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            severity: expect.any(String),
            file: expect.any(String),
            line: expect.any(Number),
            message: expect.any(String)
          })
        ])
      );
    });

    test('should detect security patterns correctly', () => {
      const vulnerableCode = `
        const apiKey = "sk-12345abcdef";
        const password = "admin123";
        const token = Math.random().toString(36);
      `;

      const result = analyzer.detectSecurityPatterns(vulnerableCode, 'test.js');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            severity: expect.any(String),
            line: expect.any(Number),
            message: expect.any(String)
          })
        ])
      );
    });

    test('should analyze file complexity with actual method', () => {
      const complexCode = `
        function complexFunction(a, b, c) {
          if (a > 0) {
            if (b > 0) {
              if (c > 0) {
                return a + b + c;
              } else {
                return a + b - c;
              }
            } else {
              return a - b;
            }
          } else {
            return 0;
          }
        }
      `;

      const result = analyzer.analyzeFileComplexity(complexCode, 'complex.js');

      expect(result).toEqual(
        expect.objectContaining({
          complexity: expect.any(Number),
          functions: expect.any(Array)
        })
      );
      expect(result.complexity).toBeGreaterThan(1);
    });
  });

  describe('Dependency Analysis Edge Cases', () => {
    test('should handle malformed package.json gracefully', async () => {
      const malformedPackageJson = '{ "dependencies": { "invalid": }';

      jest.spyOn(analyzer, 'getPackageFiles').mockResolvedValue([
        { path: 'package.json', name: 'package.json' }
      ]);

      mockGithubService.getFileContent.mockResolvedValue(malformedPackageJson);

      const result = await analyzer.analyzeDependencies('owner', 'repo');

      expect(result).toEqual(
        expect.objectContaining({
          totalDependencies: 0,
          healthScore: expect.any(Number),
          vulnerabilities: expect.any(Array)
        })
      );
    });

    test('should extract dependencies from package.json correctly', async () => {
      const packageJson = JSON.stringify({
        dependencies: {
          'express': '^4.18.0',
          'lodash': '^4.17.21'
        },
        devDependencies: {
          'jest': '^29.0.0'
        }
      });

      mockGithubService.getFileContent.mockResolvedValue(packageJson);

      const result = await analyzer.extractDependencies('owner', 'repo', {
        path: 'package.json',
        name: 'package.json'
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('Vulnerability Analysis', () => {
    test('should query vulnerability database', async () => {
      const result = await analyzer.queryVulnerabilityDatabase('lodash', '4.17.0');

      expect(Array.isArray(result)).toBe(true);
    });

    test('should check vulnerabilities for specific package', async () => {
      const result = await analyzer.checkVulnerabilities('lodash', '4.17.0');

      expect(result).toEqual(expect.any(Array));
    });

    test('should categorize vulnerabilities by severity', () => {
      const vulnerabilities = [
        { severity: 'high' },
        { severity: 'medium' },
        { severity: 'low' },
        { severity: 'critical' }
      ];

      const result = analyzer.categorizeBySeverity(vulnerabilities);

      expect(result).toEqual(
        expect.objectContaining({
          critical: expect.any(Number),
          high: expect.any(Number),
          medium: expect.any(Number),
          low: expect.any(Number)
        })
      );
    });

    test('should calculate security score from vulnerabilities', () => {
      const vulnerabilities = [
        { severity: 'high' },
        { severity: 'medium' },
        { severity: 'low' }
      ];

      const result = analyzer.calculateSecurityScore(vulnerabilities);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('Code Metrics and Statistics', () => {
    test('should calculate complexity distribution', () => {
      const functions = [
        { complexity: 2 },
        { complexity: 8 },
        { complexity: 15 },
        { complexity: 25 }
      ];

      const result = analyzer.calculateComplexityDistribution(functions);

      expect(result).toEqual(
        expect.objectContaining({
          low: expect.any(Number),
          medium: expect.any(Number),
          high: expect.any(Number),
          critical: expect.any(Number)
        })
      );
    });

    test('should calculate dependency health score', () => {
      const vulnerabilities = [{ severity: 'medium' }];
      const outdated = [{ name: 'old-package' }];
      const allDeps = [{ name: 'package1' }, { name: 'package2' }];

      const result = analyzer.calculateDependencyHealthScore(vulnerabilities, outdated, allDeps);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    test('should calculate risk distribution', () => {
      const vulnerabilities = [
        { severity: 'critical' },
        { severity: 'high' },
        { severity: 'medium' },
        { severity: 'low' }
      ];

      const result = analyzer.calculateRiskDistribution(vulnerabilities);

      expect(result).toEqual(
        expect.objectContaining({
          critical: expect.any(Number),
          high: expect.any(Number),
          medium: expect.any(Number),
          low: expect.any(Number)
        })
      );
    });
  });

  describe('Utility and Helper Methods', () => {
    test('should get complexity score from average complexity', () => {
      expect(analyzer.getComplexityScore(2)).toBeGreaterThan(90);
      expect(analyzer.getComplexityScore(5)).toBeGreaterThan(70);
      expect(analyzer.getComplexityScore(10)).toBeGreaterThan(50);
      expect(analyzer.getComplexityScore(20)).toBeLessThan(50);
    });

    test('should get linting score from issues', () => {
      const result = analyzer.getLintingScore(10, 5);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    test('should calculate maintenance score from metrics', () => {
      const metrics = {
        codeChurn: 0.5,
        issueResolutionTime: 3,
        documentationScore: 80,
        contributorCount: 5
      };

      const result = analyzer.calculateMaintenanceScore(metrics);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    test('should identify package ecosystem correctly', () => {
      expect(analyzer.getPackageEcosystem('lodash')).toBe('npm');
      expect(analyzer.getPackageEcosystem('unknown-package')).toBe('npm');
      expect(analyzer.getPackageEcosystem('rails')).toBe('rubygems');
    });

    test('should clean version strings', () => {
      expect(analyzer.cleanVersionString('^4.17.21')).toBe('4.17.21');
      expect(analyzer.cleanVersionString('~2.0.0')).toBe('2.0.0');
      expect(analyzer.cleanVersionString('>=1.0.0')).toBe('1.0.0');
    });

    test('should check if version is vulnerable', () => {
      const vulnerableRanges = ['>=4.0.0 <4.17.21'];
      
      expect(analyzer.isVersionVulnerable('4.17.0', vulnerableRanges)).toBe(true);
      expect(analyzer.isVersionVulnerable('4.17.21', vulnerableRanges)).toBe(false);
      expect(analyzer.isVersionVulnerable('3.0.0', vulnerableRanges)).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network timeouts gracefully', async () => {
      mockGithubService.getRepositoryFiles.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      const result = await analyzer.analyzeCodeQuality('owner', 'repo');

      expect(result).toBeDefined();
      expect(result.qualityScore.overall).toBeGreaterThanOrEqual(0);
    });

    test('should provide meaningful error messages for analysis failures', async () => {
      mockGithubService.getRepositoryFiles.mockRejectedValue(new Error('Repository not found'));

      try {
        await analyzer.analyzeCodeQuality('owner', 'repo');
      } catch (error) {
        expect(error.message).toContain('Repository not found');
      }
    });

    test('should handle missing or invalid data gracefully', () => {
      const invalidFunctions = null;
      
      const result = analyzer.calculateComplexityDistribution([]);

      expect(result).toEqual(
        expect.objectContaining({
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        })
      );
    });
  });

  describe('Latest Version Checking', () => {
    test('should get NPM latest version', async () => {
      const result = await analyzer.getNpmLatestVersion('lodash');
      expect(typeof result).toBe('string');
    });

    test('should get PyPI latest version', async () => {
      const result = await analyzer.getPyPILatestVersion('requests');
      expect(typeof result).toBe('string');
    });

    test('should get Maven latest version', async () => {
      const result = await analyzer.getMavenLatestVersion('junit:junit');
      expect(typeof result).toBe('string');
    });

    test('should get latest version for different ecosystems', async () => {
      const npmVersion = await analyzer.getLatestVersion('lodash');
      const pypiVersion = await analyzer.getLatestVersion('requests');
      
      expect(typeof npmVersion).toBe('string');
      expect(typeof pypiVersion).toBe('string');
    });
  });
}); 