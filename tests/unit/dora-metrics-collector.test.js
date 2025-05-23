const DORAMetricsCollector = require('../../src/analysis/dora-metrics-collector');

describe('DORAMetricsCollector', () => {
  let collector;
  let mockGithubService;

  beforeEach(() => {
    mockGithubService = {
      getCommitHistory: jest.fn(),
      getIssues: jest.fn(),
      getReleases: jest.fn(),
      getRepository: jest.fn()
    };
    collector = new DORAMetricsCollector(mockGithubService);
  });

  describe('DORA Metrics Collection', () => {
    test('should collect comprehensive DORA metrics', async () => {
      mockGithubService.getReleases.mockResolvedValue([
        { tag_name: 'v1.0.0', published_at: '2024-01-15T10:00:00Z' },
        { tag_name: 'v0.9.0', published_at: '2024-01-10T10:00:00Z' }
      ]);

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
          id: 1,
          created_at: '2024-01-01T00:00:00Z',
          closed_at: '2024-01-01T02:00:00Z',
          state: 'closed',
          labels: [{ name: 'bug' }]
        }
      ]);

      const result = await collector.collectDORAMetrics('owner', 'repo');

      expect(result).toEqual(
        expect.objectContaining({
          metrics: expect.objectContaining({
            deploymentFrequency: expect.any(Object),
            leadTimeForChanges: expect.any(Object),
            changeFailureRate: expect.any(Object),
            meanTimeToRestore: expect.any(Object)
          }),
          performanceLevel: expect.any(Object),
          benchmarks: expect.any(Object),
          recommendations: expect.any(Array),
          collectedAt: expect.any(String),
          timeRange: expect.any(String),
          trends: expect.any(Object)
        })
      );
    });

    test('should handle empty repository', async () => {
      mockGithubService.getReleases.mockResolvedValue([]);
      mockGithubService.getCommitHistory.mockResolvedValue([]);
      mockGithubService.getIssues.mockResolvedValue([]);

      const result = await collector.collectDORAMetrics('owner', 'repo');

      expect(result).toBeDefined();
      expect(result.performanceLevel).toBeDefined();
    });
  });

  describe('Deployment Frequency', () => {
    test('should calculate deployment frequency from releases', async () => {
      const mockReleases = [
        { tag_name: 'v1.0.0', published_at: '2024-01-15T10:00:00Z' },
        { tag_name: 'v0.9.0', published_at: '2024-01-10T10:00:00Z' },
        { tag_name: 'v0.8.0', published_at: '2024-01-05T10:00:00Z' }
      ];

      mockGithubService.getReleases.mockResolvedValue(mockReleases);

      // Mock identifyDeploymentEvents
      jest.spyOn(collector, 'identifyDeploymentEvents').mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await collector.calculateDeploymentFrequency('owner', 'repo', startDate, endDate);

      expect(result).toEqual(
        expect.objectContaining({
          totalDeployments: expect.any(Number),
          deploymentsPerDay: expect.any(Number),
          deploymentsPerWeek: expect.any(Number),
          frequency: expect.any(String),
          recentDeployments: expect.any(Array),
          trend: expect.any(String)
        })
      );
      expect(result.totalDeployments).toBeGreaterThan(0);
    });

    test('should classify deployment frequency correctly', async () => {
      expect(collector.classifyDeploymentFrequency(1.5)).toBe('elite');
      expect(collector.classifyDeploymentFrequency(0.5)).toBe('high');
      expect(collector.classifyDeploymentFrequency(0.1)).toBe('medium');
      expect(collector.classifyDeploymentFrequency(0.01)).toBe('low');
    });

    test('should handle repository with no deployments', async () => {
      mockGithubService.getReleases.mockResolvedValue([]);
      jest.spyOn(collector, 'identifyDeploymentEvents').mockResolvedValue([]);

      const result = await collector.calculateDeploymentFrequency('owner', 'repo', new Date(), new Date());

      expect(result.totalDeployments).toBe(0);
      expect(result.frequency).toBe('low');
    });
  });

  describe('Lead Time for Changes', () => {
    test('should calculate lead time from commits and releases', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            message: 'Add feature',
            committer: { date: '2024-01-01T10:00:00Z' }
          }
        },
        {
          sha: 'def456',
          commit: {
            message: 'Fix bug',
            committer: { date: '2024-01-02T10:00:00Z' }
          }
        }
      ];

      const mockReleases = [
        { tag_name: 'v1.0.0', published_at: '2024-01-05T10:00:00Z' }
      ];

      mockGithubService.getCommitHistory.mockResolvedValue(mockCommits);
      mockGithubService.getReleases.mockResolvedValue(mockReleases);

      const result = await collector.calculateLeadTimeForChanges('owner', 'repo', new Date('2024-01-01'), new Date('2024-01-31'));

      expect(result).toEqual(
        expect.objectContaining({
          averageLeadTimeHours: expect.any(Number),
          averageLeadTimeDays: expect.any(Number),
          classification: expect.any(String),
          leadTimeDetails: expect.any(Array),
          distribution: expect.any(Object),
          trend: expect.any(String)
        })
      );
    });

    test('should classify lead time correctly', async () => {
      expect(collector.classifyLeadTime(2)).toBe('elite');  // 2 hours
      expect(collector.classifyLeadTime(24)).toBe('elite');  // 1 day (still elite: <= 24)
      expect(collector.classifyLeadTime(48)).toBe('high');  // 2 days
      expect(collector.classifyLeadTime(168)).toBe('high'); // 1 week
      expect(collector.classifyLeadTime(720)).toBe('medium'); // 1 month
    });
  });

  describe('Change Failure Rate', () => {
    test('should calculate change failure rate', async () => {
      const mockReleases = [
        { tag_name: 'v1.0.0', published_at: '2024-01-01T10:00:00Z' },
        { tag_name: 'v0.9.0', published_at: '2024-01-05T10:00:00Z' }
      ];

      const mockIssues = [
        {
          id: 1,
          created_at: '2024-01-01T12:00:00Z', // 2 hours after release
          labels: [{ name: 'bug' }],
          title: 'Critical bug after deployment'
        }
      ];

      mockGithubService.getReleases.mockResolvedValue(mockReleases);
      mockGithubService.getIssues.mockResolvedValue(mockIssues);

      const result = await collector.calculateChangeFailureRate('owner', 'repo', new Date('2024-01-01'), new Date('2024-01-31'));

      expect(result).toEqual(
        expect.objectContaining({
          changeFailureRate: expect.any(Number),
          totalDeployments: expect.any(Number),
          failedDeployments: expect.any(Number),
          classification: expect.any(String),
          trend: expect.any(String)
        })
      );
    });

    test('should identify deployment failure issues correctly', async () => {
      const bugIssue = {
        labels: [{ name: 'bug' }],
        title: 'Critical production issue'
      };

      const featureIssue = {
        labels: [{ name: 'enhancement' }],
        title: 'Add new feature'
      };

      expect(collector.isDeploymentFailureIssue(bugIssue)).toBe(true);
      expect(collector.isDeploymentFailureIssue(featureIssue)).toBe(false);
    });

    test('should classify change failure rate correctly', async () => {
      expect(collector.classifyChangeFailureRate(5)).toBe('elite');  // 5%
      expect(collector.classifyChangeFailureRate(10)).toBe('high');  // 10%
      expect(collector.classifyChangeFailureRate(15)).toBe('medium'); // 15%
      expect(collector.classifyChangeFailureRate(20)).toBe('low');   // 20%
    });
  });

  describe('Mean Time to Restore', () => {
    test('should calculate mean time to restore from incidents', async () => {
      const mockIssues = [
        {
          id: 1,
          created_at: '2024-01-01T10:00:00Z',
          closed_at: '2024-01-01T12:00:00Z',
          state: 'closed',
          labels: [{ name: 'incident' }],
          title: 'Production outage'
        },
        {
          id: 2,
          created_at: '2024-01-02T10:00:00Z',
          closed_at: '2024-01-02T14:00:00Z',
          state: 'closed',
          labels: [{ name: 'critical' }],
          title: 'Database failure'
        }
      ];

      mockGithubService.getIssues.mockResolvedValue(mockIssues);

      const result = await collector.calculateMeanTimeToRestore('owner', 'repo', new Date('2024-01-01'), new Date('2024-01-31'));

      expect(result).toEqual(
        expect.objectContaining({
          meanTimeToRestoreHours: expect.any(Number),
          meanTimeToRestoreDays: expect.any(Number),
          incidentsAnalyzed: expect.any(Number),
          classification: expect.any(String),
          severityBreakdown: expect.any(Object),
          trend: expect.any(String)
        })
      );
      expect(result.incidentsAnalyzed).toBeGreaterThan(0);
    });

    test('should identify production incidents correctly', async () => {
      const incidentIssue = {
        labels: [{ name: 'incident' }],
        title: 'Service outage',
        body: 'Production is down'
      };

      const bugIssue = {
        labels: [{ name: 'bug' }],
        title: 'Minor UI bug',
        body: 'Button color is wrong'
      };

      expect(collector.isProductionIncident(incidentIssue)).toBe(true);
      expect(collector.isProductionIncident(bugIssue)).toBe(false);
    });

    test('should classify MTTR correctly', async () => {
      expect(collector.classifyMTTR(1)).toBe('elite');   // 1 hour
      expect(collector.classifyMTTR(6)).toBe('high');    // 6 hours
      expect(collector.classifyMTTR(24)).toBe('high');   // 1 day (still high: <= 24)
      expect(collector.classifyMTTR(48)).toBe('medium'); // 2 days
    });
  });

  describe('Performance Level Determination', () => {
    test('should determine Elite performance level', async () => {
      const metrics = {
        deploymentFrequency: { deploymentsPerDay: 2.0 },
        leadTimeForChanges: { averageLeadTimeDays: 0.5 }, // 0.5 days = 12 hours
        changeFailureRate: { changeFailureRate: 3 }, // 3%
        meanTimeToRestore: { meanTimeToRestoreHours: 0.5 } // 30 minutes
      };

      const result = collector.determinePerformanceLevel(metrics);
      expect(result.level).toBe('Elite');
    });

    test('should determine Low performance level', async () => {
      const metrics = {
        deploymentFrequency: { deploymentsPerDay: 0.01 },
        leadTimeForChanges: { averageLeadTimeHours: 720 },
        changeFailureRate: { failureRate: 0.5 },
        meanTimeToRestore: { averageMTTRHours: 168 }
      };

      const result = collector.determinePerformanceLevel(metrics);
      expect(result.level).toBe('Low');
    });
  });

  describe('Trends Calculation', () => {
    test('should calculate trends over time periods', async () => {
      // Mock calculatePeriodMetrics method
      jest.spyOn(collector, 'calculatePeriodMetrics').mockResolvedValue({
        deploymentFrequency: { deploymentsPerDay: 1.0 },
        leadTimeForChanges: { averageLeadTimeHours: 12 },
        changeFailureRate: { failureRate: 0.1 },
        meanTimeToRestore: { averageMTTRHours: 4 }
      });

      const result = await collector.calculateTrends('owner', 'repo', 90);

      expect(result).toEqual(
        expect.objectContaining({
          deploymentFrequency: expect.any(String),
          leadTime: expect.any(String),
          changeFailureRate: expect.any(String),
          mttr: expect.any(String),
          overall: expect.any(String),
          dataPoints: expect.any(Object)
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle GitHub API errors gracefully', async () => {
      mockGithubService.getReleases.mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await collector.collectDORAMetrics('owner', 'repo');

      expect(result).toBeDefined();
      expect(result.performanceLevel).toBeDefined();
    });

    test('should provide default values when data is unavailable', async () => {
      const defaultDeploymentFreq = collector.getDefaultDeploymentFrequency();
      const defaultLeadTime = collector.getDefaultLeadTime();
      const defaultChangeFailureRate = collector.getDefaultChangeFailureRate();
      const defaultMTTR = collector.getDefaultMTTR();

      expect(defaultDeploymentFreq).toBeDefined();
      expect(defaultLeadTime).toBeDefined();
      expect(defaultChangeFailureRate).toBeDefined();
      expect(defaultMTTR).toBeDefined();
    });
  });

  describe('Utility Methods', () => {
    test('should format deployment history correctly', async () => {
      const releases = [
        { tag_name: 'v1.0.0', published_at: '2024-01-01T10:00:00Z' }
      ];
      const events = [];

      const result = collector.formatDeploymentHistory(releases, events);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should assess issue severity correctly', async () => {
      const criticalIssue = {
        labels: [{ name: 'critical' }],
        title: 'URGENT: Production down'
      };

      const minorIssue = {
        labels: [{ name: 'minor' }],
        title: 'Small UI improvement'
      };

      const criticalSeverity = collector.assessIssueSeverity(criticalIssue);
      const minorSeverity = collector.assessIssueSeverity(minorIssue);

      // The method returns a string, so we compare the strings
      expect(criticalSeverity).toBe('critical');
      expect(minorSeverity).toBe('low');
    });
  });

  describe('Benchmarks and Recommendations', () => {
    test('should provide DORA benchmarks', async () => {
      const benchmarks = collector.getBenchmarks();

      expect(benchmarks).toEqual(
        expect.objectContaining({
          deploymentFrequency: expect.any(Object),
          leadTimeForChanges: expect.any(Object),
          changeFailureRate: expect.any(Object),
          meanTimeToRestore: expect.any(Object)
        })
      );
    });

    test('should generate appropriate recommendations', async () => {
      const metrics = {
        deploymentFrequency: { deploymentsPerDay: 0.1, frequency: 'monthly' },
        leadTimeForChanges: { averageLeadTimeHours: 168, classification: 'low' },
        changeFailureRate: { failureRate: 0.3, classification: 'low' },
        meanTimeToRestore: { averageMTTRHours: 48, classification: 'low' },
        performanceLevel: 'Low'
      };

      const recommendations = collector.generateDORARecommendations(metrics);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => 
        rec.title && rec.title.toLowerCase().includes('deployment')
      )).toBe(true);
    });
  });
}); 