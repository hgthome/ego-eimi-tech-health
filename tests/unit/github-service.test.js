const githubService = require('../../src/github/github-service');

// Mock Octokit
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn()
}));

describe('GitHubService', () => {
  let mockOctokit;
  const testToken = 'test-access-token';

  beforeEach(() => {
    mockOctokit = {
      rest: {
        repos: {
          get: jest.fn(),
          listForAuthenticatedUser: jest.fn(),
          getContent: jest.fn(),
          listCommits: jest.fn(),
          listContributors: jest.fn(),
          listLanguages: jest.fn(),
          listReleases: jest.fn()
        },
        issues: {
          listForRepo: jest.fn()
        },
        users: {
          getAuthenticated: jest.fn()
        }
      }
    };

    const { Octokit } = require('@octokit/rest');
    Octokit.mockImplementation(() => mockOctokit);
    
    // Clear any existing authenticated client
    githubService.clearAuthenticatedClient();
  });

  describe('Repository Operations', () => {
    test('should get repository information', async () => {
      const mockRepo = {
        data: {
          id: 123,
          name: 'test-repo',
          full_name: 'owner/test-repo',
          description: 'A test repository',
          stargazers_count: 42,
          forks_count: 7,
          language: 'JavaScript',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z'
        }
      };

      mockOctokit.rest.repos.get.mockResolvedValue(mockRepo);

      const result = await githubService.getRepository(testToken, 'owner', 'test-repo');
      
      expect(result).toEqual(
        expect.objectContaining({
          id: 123,
          name: 'test-repo',
          full_name: 'owner/test-repo',
          description: 'A test repository',
          stargazers_count: 42,
          forks_count: 7,
          language: 'JavaScript'
        })
      );
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'test-repo'
      });
    });

    test('should list user repositories', async () => {
      const mockRepos = {
        data: [
          {
            id: 123,
            name: 'repo1',
            full_name: 'user/repo1',
            private: false,
            language: 'JavaScript',
            stargazers_count: 10
          },
          {
            id: 124,
            name: 'repo2',
            full_name: 'user/repo2',
            private: true,
            language: 'Python',
            stargazers_count: 5
          }
        ]
      };

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue(mockRepos);

      const result = await githubService.getUserRepositories(testToken);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 123,
          name: 'repo1',
          full_name: 'user/repo1',
          private: false
        })
      );
      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        type: 'owner',
        sort: 'updated',
        direction: 'desc',
        per_page: 30,
        page: 1
      });
    });

    test('should handle repository not found error', async () => {
      const error = new Error('Not Found');
      error.status = 404;
      
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await expect(githubService.getRepository(testToken, 'owner', 'nonexistent'))
        .rejects.toThrow('Failed to fetch repository');
    });
  });

  describe('Repository Languages', () => {
    test('should get repository languages with percentages', async () => {
      const mockLanguages = {
        data: {
          JavaScript: 15000,
          TypeScript: 8000,
          CSS: 2000,
          HTML: 1000
        }
      };

      mockOctokit.rest.repos.listLanguages.mockResolvedValue(mockLanguages);

      const result = await githubService.getRepositoryLanguages(testToken, 'owner', 'repo');
      
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual(
        expect.objectContaining({
          language: 'JavaScript',
          bytes: 15000,
          percentage: expect.any(String)
        })
      );
      expect(parseFloat(result[0].percentage)).toBeCloseTo(57.69, 1); // 15000/26000 * 100
    });
  });

  describe('Commit Operations', () => {
    test('should get repository commits', async () => {
      const mockCommits = {
        data: [
          {
            sha: 'abc123',
            commit: {
              message: 'Initial commit',
              author: {
                name: 'John Doe',
                email: 'john@example.com',
                date: '2024-01-01T00:00:00Z'
              },
              committer: {
                name: 'John Doe',
                email: 'john@example.com',
                date: '2024-01-01T00:00:00Z'
              }
            },
            html_url: 'https://github.com/owner/repo/commit/abc123'
          }
        ]
      };

      mockOctokit.rest.repos.listCommits.mockResolvedValue(mockCommits);

      const result = await githubService.getRepositoryCommits(testToken, 'owner', 'repo');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          sha: 'abc123',
          message: 'Initial commit',
          author: expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            date: '2024-01-01T00:00:00Z'
          }),
          url: 'https://github.com/owner/repo/commit/abc123'
        })
      );
    });

    test('should get commit history for analysis', async () => {
      const mockCommits = {
        data: [
          {
            sha: 'abc123',
            commit: {
              message: 'Initial commit',
              author: { date: '2024-01-01T00:00:00Z' },
              committer: { date: '2024-01-01T00:00:00Z' }
            }
          }
        ]
      };

      mockOctokit.rest.repos.listCommits.mockResolvedValue(mockCommits);

      // Set authenticated client for analysis methods
      githubService.setAuthenticatedClient(testToken);

      const result = await githubService.getCommitHistory('owner', 'repo');
      
      expect(result).toHaveLength(1);
      expect(result[0].sha).toBe('abc123');
    });
  });

  describe('Contributors', () => {
    test('should get repository contributors', async () => {
      const mockContributors = {
        data: [
          {
            id: 1,
            login: 'developer1',
            avatar_url: 'https://github.com/developer1.png',
            contributions: 42
          },
          {
            id: 2,
            login: 'developer2',
            avatar_url: 'https://github.com/developer2.png',
            contributions: 28
          }
        ]
      };

      mockOctokit.rest.repos.listContributors.mockResolvedValue(mockContributors);

      const result = await githubService.getRepositoryContributors(testToken, 'owner', 'repo');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 1,
          login: 'developer1',
          contributions: 42
        })
      );
    });

    test('should get contributors for analysis', async () => {
      const mockContributors = {
        data: [
          {
            login: 'developer1',
            contributions: 42,
            avatar_url: 'https://github.com/developer1.png'
          }
        ]
      };

      mockOctokit.rest.repos.listContributors.mockResolvedValue(mockContributors);

      githubService.setAuthenticatedClient(testToken);

      const result = await githubService.getContributors('owner', 'repo');
      
      expect(result).toHaveLength(1);
      expect(result[0].login).toBe('developer1');
    });
  });

  describe('Issues Operations', () => {
    test('should get repository issues', async () => {
      const mockIssues = {
        data: [
          {
            id: 1,
            number: 123,
            title: 'Bug report',
            state: 'open',
            created_at: '2024-01-01T00:00:00Z',
            labels: [{ name: 'bug' }],
            user: { login: 'reporter1' }
          },
          {
            id: 2,
            number: 124,
            title: 'Feature request',
            state: 'closed',
            created_at: '2024-01-02T00:00:00Z',
            closed_at: '2024-01-03T00:00:00Z',
            labels: [{ name: 'enhancement' }],
            user: { login: 'reporter2' }
          }
        ]
      };

      mockOctokit.rest.issues.listForRepo.mockResolvedValue(mockIssues);

      const result = await githubService.getRepositoryIssues(testToken, 'owner', 'repo');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 1,
          number: 123,
          title: 'Bug report',
          state: 'open'
        })
      );
    });

    test('should get issues for analysis', async () => {
      const mockIssues = {
        data: [
          {
            id: 1,
            created_at: '2024-01-01T00:00:00Z',
            closed_at: '2024-01-02T00:00:00Z',
            state: 'closed',
            labels: [{ name: 'bug' }]
          }
        ]
      };

      mockOctokit.rest.issues.listForRepo.mockResolvedValue(mockIssues);

      githubService.setAuthenticatedClient(testToken);

      const result = await githubService.getIssues('owner', 'repo');
      
      expect(result).toHaveLength(1);
      expect(result[0].state).toBe('closed');
    });
  });

  describe('Releases', () => {
    test('should get repository releases', async () => {
      const mockReleases = {
        data: [
          {
            id: 1,
            tag_name: 'v1.0.0',
            name: 'Version 1.0.0',
            created_at: '2024-01-01T00:00:00Z',
            published_at: '2024-01-01T00:00:00Z',
            draft: false,
            prerelease: false
          }
        ]
      };

      mockOctokit.rest.repos.listReleases.mockResolvedValue(mockReleases);

      const result = await githubService.getRepositoryReleases(testToken, 'owner', 'repo');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 1,
          tag_name: 'v1.0.0',
          name: 'Version 1.0.0'
        })
      );
    });

    test('should get releases for analysis', async () => {
      const mockReleases = {
        data: [
          {
            tag_name: 'v1.0.0',
            published_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      mockOctokit.rest.repos.listReleases.mockResolvedValue(mockReleases);

      githubService.setAuthenticatedClient(testToken);

      const result = await githubService.getReleases('owner', 'repo');
      
      expect(result).toHaveLength(1);
      expect(result[0].tag_name).toBe('v1.0.0');
    });
  });

  describe('Repository Files', () => {
    test('should get file content', async () => {
      const mockFileContent = {
        data: {
          type: 'file',
          content: Buffer.from('console.log("Hello World");').toString('base64'),
          encoding: 'base64'
        }
      };

      mockOctokit.rest.repos.getContent.mockResolvedValue(mockFileContent);

      githubService.setAuthenticatedClient(testToken);

      const result = await githubService.getFileContent('owner', 'repo', 'app.js');
      
      expect(result).toBe('console.log("Hello World");');
    });
  });

  describe('Repository Statistics', () => {
    test('should calculate repository statistics', async () => {
      // Mock various API calls for stats
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          id: 123,
          name: 'test-repo',
          full_name: 'owner/test-repo',
          description: 'A test repository',
          stargazers_count: 100,
          forks_count: 20,
          watchers_count: 150,
          network_count: 25,
          open_issues_count: 5,
          size: 1024,
          language: 'JavaScript',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
          pushed_at: '2024-01-15T00:00:00Z',
          has_wiki: true,
          has_issues: true,
          license: { name: 'MIT License' }
        }
      });

      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: Array(50).fill({
          sha: 'abc123',
          commit: {
            message: 'Test commit',
            author: {
              name: 'Test Author',
              email: 'test@example.com',
              date: '2024-01-15T00:00:00Z'
            },
            committer: {
              name: 'Test Author',
              email: 'test@example.com',
              date: '2024-01-15T00:00:00Z'
            }
          },
          html_url: 'https://github.com/owner/repo/commit/abc123',
          author: {
            date: '2024-01-15T00:00:00Z'
          }
        })
      });

      mockOctokit.rest.repos.listContributors.mockResolvedValue({
        data: Array(10).fill({
          id: 1,
          login: 'dev',
          avatar_url: 'https://github.com/dev.png',
          contributions: 5
        })
      });

      // Mock the language API call that is missing
      mockOctokit.rest.repos.listLanguages.mockResolvedValue({
        data: {
          JavaScript: 15000,
          CSS: 5000
        }
      });

      // Mock issues API call
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: Array(5).fill({
          id: 1,
          number: 123,
          title: 'Test issue',
          state: 'open',
          created_at: '2024-01-01T00:00:00Z',
          labels: [],
          user: { login: 'test-user' }
        })
      });

      // Mock releases API call
      mockOctokit.rest.repos.listReleases.mockResolvedValue({
        data: [
          {
            id: 1,
            tag_name: 'v1.0.0',
            name: 'Version 1.0.0',
            published_at: '2024-01-01T00:00:00Z',
            draft: false,
            prerelease: false
          }
        ]
      });

      const result = await githubService.getRepositoryStats(testToken, 'owner', 'repo');
      
      expect(result).toEqual(
        expect.objectContaining({
          repository: expect.objectContaining({
            name: 'owner/test-repo',
            language: 'JavaScript'
          }),
          activity: expect.objectContaining({
            commits_last_30_days: 50,
            contributors_count: 10,
            open_issues_count: 5,
            releases_count: 1
          }),
          popularity: expect.objectContaining({
            stars: 100,
            forks: 20,
            watchers: 150
          }),
          health_score: expect.any(Number)
        })
      );
    });

    test('should calculate basic health score', async () => {
      const metrics = {
        commits_last_30_days: 25,
        contributors_count: 10,
        daysSinceLastCommit: 3,
        has_license: true,
        has_recent_release: true,
        language_diversity: 2,
        stars: 100,
        forks_count: 20,
        watchers_count: 50
      };

      const score = githubService.calculateBasicHealthScore(metrics);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Authentication', () => {
    test('should create authenticated client', async () => {
      githubService.setAuthenticatedClient(testToken);
      
      // Verify that the client is set by checking if it has required methods
      expect(githubService.octokit).toBeDefined();
    });

    test('should clear authenticated client', async () => {
      githubService.setAuthenticatedClient(testToken);
      githubService.clearAuthenticatedClient();
      
      expect(githubService.octokit).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle rate limit errors', async () => {
      const error = new Error('API rate limit exceeded');
      error.status = 403;
      
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await expect(githubService.getRepository(testToken, 'owner', 'repo'))
        .rejects.toThrow('Failed to fetch repository');
    });

    test('should handle authentication errors', async () => {
      const error = new Error('Bad credentials');
      error.status = 401;
      
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await expect(githubService.getRepository(testToken, 'owner', 'repo'))
        .rejects.toThrow('Failed to fetch repository');
    });

    test('should handle network errors', async () => {
      const error = new Error('Network error');
      error.code = 'ENOTFOUND';
      
      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await expect(githubService.getRepository(testToken, 'owner', 'repo'))
        .rejects.toThrow('Failed to fetch repository');
    });

    test('should handle missing authenticated client gracefully', async () => {
      githubService.clearAuthenticatedClient();

      // The method returns empty array instead of throwing when client is not initialized
      const result = await githubService.getCommitHistory('owner', 'repo');
      expect(result).toEqual([]);
    });
  });
}); 