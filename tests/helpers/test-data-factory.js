/**
 * Test Data Factory
 * Provides consistent test data generation for all test suites
 */

const { faker } = require('@faker-js/faker');

class TestDataFactory {
  /**
   * Generate mock repository data
   */
  static createRepository(overrides = {}) {
    return {
      id: faker.number.int({ min: 1000, max: 9999 }),
      name: faker.lorem.slug(),
      full_name: `${faker.internet.userName()}/${faker.lorem.slug()}`,
      description: faker.lorem.sentence(),
      language: 'JavaScript',
      stargazers_count: faker.number.int({ min: 0, max: 1000 }),
      forks_count: faker.number.int({ min: 0, max: 100 }),
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      private: false,
      ...overrides
    };
  }

  /**
   * Generate mock commit data
   */
  static createCommits(count = 5) {
    return Array.from({ length: count }, (_, index) => ({
      sha: faker.git.commitSha(),
      commit: {
        message: faker.git.commitMessage(),
        author: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          date: faker.date.recent({ days: 30 - index }).toISOString()
        }
      }
    }));
  }

  /**
   * Generate mock pull request data
   */
  static createPullRequests(count = 3) {
    return Array.from({ length: count }, (_, index) => {
      const createdAt = faker.date.recent({ days: 20 - index });
      const mergedAt = faker.datatype.boolean() 
        ? faker.date.between({ from: createdAt, to: new Date() })
        : null;

      return {
        id: faker.number.int({ min: 1, max: 1000 }),
        number: faker.number.int({ min: 1, max: 200 }),
        title: faker.lorem.sentence(),
        state: mergedAt ? 'closed' : 'open',
        created_at: createdAt.toISOString(),
        merged_at: mergedAt ? mergedAt.toISOString() : null,
        merged: !!mergedAt,
        user: {
          login: faker.internet.userName()
        }
      };
    });
  }

  /**
   * Generate mock issue data
   */
  static createIssues(count = 4) {
    const labels = ['bug', 'enhancement', 'documentation', 'help wanted', 'good first issue'];
    
    return Array.from({ length: count }, (_, index) => {
      const createdAt = faker.date.recent({ days: 25 - index });
      const isClosed = faker.datatype.boolean();
      const closedAt = isClosed 
        ? faker.date.between({ from: createdAt, to: new Date() })
        : null;

      return {
        id: faker.number.int({ min: 1, max: 1000 }),
        number: faker.number.int({ min: 1, max: 300 }),
        title: faker.lorem.sentence(),
        state: isClosed ? 'closed' : 'open',
        created_at: createdAt.toISOString(),
        closed_at: closedAt ? closedAt.toISOString() : null,
        labels: [{ name: faker.helpers.arrayElement(labels) }]
      };
    });
  }

  /**
   * Generate mock release data
   */
  static createReleases(count = 3) {
    return Array.from({ length: count }, (_, index) => {
      const version = `v${count - index}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}`;
      const createdAt = faker.date.recent({ days: 60 - (index * 20) });

      return {
        id: faker.number.int({ min: 1, max: 1000 }),
        tag_name: version,
        name: `Version ${version}`,
        created_at: createdAt.toISOString(),
        published_at: createdAt.toISOString()
      };
    });
  }

  /**
   * Generate mock file structure
   */
  static createFileStructure(type = 'javascript') {
    const structures = {
      javascript: [
        { name: 'package.json', type: 'file', path: 'package.json' },
        { name: 'README.md', type: 'file', path: 'README.md' },
        { name: 'src', type: 'dir', path: 'src' },
        { name: 'test', type: 'dir', path: 'test' },
        { name: 'app.js', type: 'file', path: 'src/app.js' },
        { name: 'utils.js', type: 'file', path: 'src/utils.js' },
        { name: 'app.test.js', type: 'file', path: 'test/app.test.js' },
        { name: 'utils.test.js', type: 'file', path: 'test/utils.test.js' }
      ],
      python: [
        { name: 'requirements.txt', type: 'file', path: 'requirements.txt' },
        { name: 'setup.py', type: 'file', path: 'setup.py' },
        { name: 'README.md', type: 'file', path: 'README.md' },
        { name: 'src', type: 'dir', path: 'src' },
        { name: 'tests', type: 'dir', path: 'tests' },
        { name: 'main.py', type: 'file', path: 'src/main.py' },
        { name: 'test_main.py', type: 'file', path: 'tests/test_main.py' }
      ],
      java: [
        { name: 'pom.xml', type: 'file', path: 'pom.xml' },
        { name: 'README.md', type: 'file', path: 'README.md' },
        { name: 'src', type: 'dir', path: 'src' },
        { name: 'main', type: 'dir', path: 'src/main' },
        { name: 'test', type: 'dir', path: 'src/test' },
        { name: 'App.java', type: 'file', path: 'src/main/java/App.java' },
        { name: 'AppTest.java', type: 'file', path: 'src/test/java/AppTest.java' }
      ]
    };

    return structures[type] || structures.javascript;
  }

  /**
   * Generate mock package.json content
   */
  static createPackageJson(overrides = {}) {
    return JSON.stringify({
      name: faker.lorem.slug(),
      version: `${faker.number.int({ min: 1, max: 5 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}`,
      description: faker.lorem.sentence(),
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        test: 'jest',
        dev: 'nodemon src/index.js'
      },
      dependencies: {
        'express': '^4.18.0',
        'lodash': '^4.17.21',
        'axios': '^1.6.0'
      },
      devDependencies: {
        'jest': '^29.0.0',
        'nodemon': '^3.0.0',
        'eslint': '^8.0.0'
      },
      ...overrides
    }, null, 2);
  }

  /**
   * Generate mock README content
   */
  static createReadmeContent(projectName = 'Test Project') {
    return `# ${projectName}

## Description
${faker.lorem.paragraph()}

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm start
\`\`\`

## Testing
\`\`\`bash
npm test
\`\`\`

## Contributing
${faker.lorem.sentence()}

## License
MIT
`;
  }

  /**
   * Generate mock JavaScript code
   */
  static createJavaScriptCode(complexity = 'medium') {
    const templates = {
      simple: `
        function simpleFunction(x) {
          return x * 2;
        }
        
        module.exports = { simpleFunction };
      `,
      medium: `
        const express = require('express');
        
        function processData(data) {
          if (!data) {
            return null;
          }
          
          if (data.type === 'user') {
            return processUser(data);
          } else if (data.type === 'order') {
            return processOrder(data);
          }
          
          return data;
        }
        
        function processUser(userData) {
          return {
            id: userData.id,
            name: userData.name.trim(),
            email: userData.email.toLowerCase()
          };
        }
        
        module.exports = { processData };
      `,
      complex: `
        function veryComplexFunction(a, b, c, d, e) {
          if (a > 0) {
            if (b > 0) {
              if (c > 0) {
                if (d > 0) {
                  if (e > 0) {
                    return a + b + c + d + e;
                  } else {
                    return a + b + c + d - e;
                  }
                } else {
                  if (e > 0) {
                    return a + b + c - d + e;
                  } else {
                    return a + b + c - d - e;
                  }
                }
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
        
        module.exports = { veryComplexFunction };
      `
    };

    return templates[complexity] || templates.medium;
  }

  /**
   * Generate mock analysis data
   */
  static createAnalysisData(overrides = {}) {
    return {
      repository: this.createRepository(),
      codeQuality: {
        overallScore: faker.number.int({ min: 60, max: 95 }),
        grade: faker.helpers.arrayElement(['A', 'B', 'C']),
        metrics: {
          complexity: {
            averageComplexity: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
            maxComplexity: faker.number.int({ min: 5, max: 15 }),
            functionsAnalyzed: faker.number.int({ min: 10, max: 50 })
          },
          coverage: {
            estimatedCoverage: faker.number.int({ min: 50, max: 90 }),
            testFiles: faker.number.int({ min: 5, max: 20 }),
            sourceFiles: faker.number.int({ min: 10, max: 30 }),
            hasTestingFramework: true
          },
          documentation: {
            hasReadme: true,
            readmeQuality: faker.number.float({ min: 0.6, max: 1.0, fractionDigits: 1 }),
            sections: {
              description: true,
              installation: true,
              usage: true,
              contributing: faker.datatype.boolean(),
              license: true
            }
          },
          dependencies: {
            totalDependencies: faker.number.int({ min: 10, max: 50 }),
            productionDependencies: faker.number.int({ min: 5, max: 30 }),
            devDependencies: faker.number.int({ min: 5, max: 20 }),
            hasLockFile: true,
            riskScore: faker.number.float({ min: 0.1, max: 0.5, fractionDigits: 1 })
          }
        }
      },
      doraMetrics: {
        overallClassification: faker.helpers.arrayElement(['Elite', 'High', 'Medium']),
        metrics: {
          deploymentFrequency: {
            frequency: faker.number.float({ min: 0.5, max: 5.0, fractionDigits: 1 }),
            classification: faker.helpers.arrayElement(['Daily', 'Weekly', 'Monthly'])
          },
          leadTimeForChanges: {
            averageLeadTime: faker.number.int({ min: 2, max: 48 }),
            classification: faker.helpers.arrayElement(['Elite', 'High', 'Medium'])
          },
          meanTimeToRecovery: {
            averageMTTR: faker.number.int({ min: 1, max: 24 }),
            classification: faker.helpers.arrayElement(['Elite', 'High', 'Medium'])
          },
          changeFailureRate: {
            failureRate: faker.number.float({ min: 0.05, max: 0.3, fractionDigits: 2 }),
            classification: faker.helpers.arrayElement(['Elite', 'High', 'Medium'])
          }
        }
      },
      security: {
        riskScore: faker.number.float({ min: 0.1, max: 0.4, fractionDigits: 1 }),
        vulnerabilities: []
      },
      insights: {
        strengths: [
          faker.lorem.sentence(),
          faker.lorem.sentence()
        ],
        improvements: [
          faker.lorem.sentence(),
          faker.lorem.sentence()
        ],
        recommendations: [
          faker.lorem.sentence(),
          faker.lorem.sentence(),
          faker.lorem.sentence()
        ]
      },
      ...overrides
    };
  }

  /**
   * Generate mock vulnerability data
   */
  static createVulnerabilities(count = 2) {
    const severities = ['low', 'medium', 'high', 'critical'];
    const types = ['XSS', 'SQL Injection', 'CSRF', 'Path Traversal', 'Buffer Overflow'];

    return Array.from({ length: count }, () => ({
      id: faker.string.uuid(),
      severity: faker.helpers.arrayElement(severities),
      title: `${faker.helpers.arrayElement(types)} vulnerability`,
      description: faker.lorem.sentence(),
      package: faker.lorem.word(),
      version: `${faker.number.int({ min: 1, max: 5 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}`,
      fix: faker.lorem.sentence(),
      references: [
        faker.internet.url(),
        faker.internet.url()
      ]
    }));
  }

  /**
   * Generate mock contributor data
   */
  static createContributors(count = 5) {
    return Array.from({ length: count }, () => ({
      login: faker.internet.userName(),
      contributions: faker.number.int({ min: 1, max: 100 }),
      avatar_url: faker.image.avatar()
    }));
  }

  /**
   * Generate mock language distribution
   */
  static createLanguageDistribution(primaryLanguage = 'JavaScript') {
    const languages = {
      JavaScript: faker.number.int({ min: 8000, max: 15000 }),
      TypeScript: faker.number.int({ min: 2000, max: 5000 }),
      CSS: faker.number.int({ min: 1000, max: 3000 }),
      HTML: faker.number.int({ min: 500, max: 2000 })
    };

    // Ensure primary language has the highest count
    if (primaryLanguage && primaryLanguage !== 'JavaScript') {
      languages[primaryLanguage] = Math.max(...Object.values(languages)) + 1000;
    }

    return languages;
  }

  /**
   * Create a complete mock GitHub service response
   */
  static createGitHubServiceMock(repositoryType = 'javascript') {
    return {
      getRepository: jest.fn().mockResolvedValue(this.createRepository({ language: repositoryType })),
      listFiles: jest.fn().mockResolvedValue(this.createFileStructure(repositoryType)),
      getFileContent: jest.fn().mockImplementation((owner, repo, path) => {
        if (path === 'package.json') {
          return Promise.resolve(this.createPackageJson());
        }
        if (path === 'README.md') {
          return Promise.resolve(this.createReadmeContent());
        }
        if (path.endsWith('.js')) {
          return Promise.resolve(this.createJavaScriptCode());
        }
        return Promise.resolve('// Mock file content');
      }),
      getCommitHistory: jest.fn().mockResolvedValue(this.createCommits()),
      getPullRequests: jest.fn().mockResolvedValue(this.createPullRequests()),
      getIssues: jest.fn().mockResolvedValue(this.createIssues()),
      getReleases: jest.fn().mockResolvedValue(this.createReleases()),
      getLanguages: jest.fn().mockResolvedValue(this.createLanguageDistribution()),
      getContributors: jest.fn().mockResolvedValue(this.createContributors())
    };
  }
}

module.exports = TestDataFactory; 