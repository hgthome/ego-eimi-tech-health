const fetch = require('node-fetch');

class BenchmarkingEngine {
  constructor() {
    this.industryBenchmarks = this.loadIndustryBenchmarks();
    this.projectTypeBenchmarks = this.loadProjectTypeBenchmarks();
    this.sizeBenchmarks = this.loadSizeBenchmarks();
  }

  /**
   * Performs comprehensive benchmarking analysis
   * @param {Object} metrics - Repository metrics to benchmark
   * @param {Object} context - Context about the repository (size, type, etc.)
   * @returns {Object} Benchmarking analysis results
   */
  async performBenchmarking(metrics, context = {}) {
    try {
      console.log('Performing comprehensive benchmarking analysis');

      const [
        industryComparison,
        peerComparison,
        projectTypeComparison,
        sizeComparison,
        historicalTrends
      ] = await Promise.all([
        this.compareToIndustryStandards(metrics),
        this.compareToPeers(metrics, context),
        this.compareToProjectType(metrics, context),
        this.compareToSimilarSize(metrics, context),
        this.analyzeHistoricalTrends(metrics, context)
      ]);

      const overallPerformance = this.calculateOverallPerformance({
        industryComparison,
        peerComparison,
        projectTypeComparison,
        sizeComparison
      });

      return {
        overallPerformance,
        benchmarks: {
          industry: industryComparison,
          peers: peerComparison,
          projectType: projectTypeComparison,
          size: sizeComparison
        },
        trends: historicalTrends,
        insights: this.generateBenchmarkingInsights({
          industryComparison,
          peerComparison,
          projectTypeComparison,
          sizeComparison,
          overallPerformance
        }),
        recommendations: this.generateBenchmarkingRecommendations({
          industryComparison,
          peerComparison,
          projectTypeComparison,
          sizeComparison
        }),
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error performing benchmarking:', error);
      throw error;
    }
  }

  /**
   * Compares metrics to industry standards
   */
  async compareToIndustryStandards(metrics) {
    try {
      const comparisons = {};

      // Code Quality Benchmarks
      if (metrics.codeQuality) {
        comparisons.codeQuality = {
          overall: this.benchmarkScore(metrics.codeQuality.qualityScore.overall, this.industryBenchmarks.codeQuality.overall),
          complexity: this.benchmarkScore(metrics.codeQuality.complexity.score, this.industryBenchmarks.codeQuality.complexity),
          security: this.benchmarkScore(metrics.codeQuality.security.securityScore, this.industryBenchmarks.codeQuality.security),
          maintainability: this.benchmarkScore(metrics.codeQuality.maintainability.maintenanceScore, this.industryBenchmarks.codeQuality.maintainability)
        };
      }

      // DORA Metrics Benchmarks
      if (metrics.dora) {
        comparisons.dora = {
          deploymentFrequency: this.benchmarkDORAMetric(
            metrics.dora.metrics.deploymentFrequency.deploymentsPerDay,
            'deploymentFrequency',
            this.industryBenchmarks.dora.deploymentFrequency
          ),
          leadTime: this.benchmarkDORAMetric(
            metrics.dora.metrics.leadTimeForChanges.averageLeadTimeDays,
            'leadTime',
            this.industryBenchmarks.dora.leadTime
          ),
          changeFailureRate: this.benchmarkDORAMetric(
            metrics.dora.metrics.changeFailureRate.changeFailureRate,
            'changeFailureRate',
            this.industryBenchmarks.dora.changeFailureRate
          ),
          mttr: this.benchmarkDORAMetric(
            metrics.dora.metrics.meanTimeToRestore.meanTimeToRestoreHours,
            'mttr',
            this.industryBenchmarks.dora.mttr
          )
        };
      }

      // Basic Repository Health
      if (metrics.repository) {
        comparisons.repository = {
          activity: this.benchmarkScore(metrics.repository.activity?.commits_last_30_days || 0, this.industryBenchmarks.repository.activity),
          community: this.benchmarkScore(metrics.repository.popularity?.stars || 0, this.industryBenchmarks.repository.community),
          maintenance: this.benchmarkScore(metrics.repository.health_score || 0, this.industryBenchmarks.repository.maintenance)
        };
      }

      return {
        score: this.calculateAverageScore(comparisons),
        details: comparisons,
        summary: this.generateIndustrySummary(comparisons)
      };
    } catch (error) {
      console.error('Error comparing to industry standards:', error);
      return this.getDefaultComparison();
    }
  }

  /**
   * Compares to peer repositories
   */
  async compareToPeers(metrics, context) {
    try {
      // In a real implementation, this would query a database of similar repositories
      // For now, we'll simulate peer comparison based on the repository characteristics
      
      const peerMetrics = await this.fetchPeerMetrics(context);
      const comparisons = {};

      if (metrics.codeQuality && peerMetrics.codeQuality) {
        comparisons.codeQuality = {
          percentile: this.calculatePercentile(metrics.codeQuality.qualityScore.overall, peerMetrics.codeQuality),
          rank: this.calculateRank(metrics.codeQuality.qualityScore.overall, peerMetrics.codeQuality),
          comparison: this.compareToMedian(metrics.codeQuality.qualityScore.overall, peerMetrics.codeQuality.median)
        };
      }

      if (metrics.dora && peerMetrics.dora) {
        comparisons.dora = {
          deploymentFrequency: {
            percentile: this.calculatePercentile(metrics.dora.metrics.deploymentFrequency.deploymentsPerDay, peerMetrics.dora.deploymentFrequency),
            comparison: this.compareToMedian(metrics.dora.metrics.deploymentFrequency.deploymentsPerDay, peerMetrics.dora.deploymentFrequency.median)
          },
          leadTime: {
            percentile: this.calculatePercentile(metrics.dora.metrics.leadTimeForChanges.averageLeadTimeDays, peerMetrics.dora.leadTime, true), // Lower is better
            comparison: this.compareToMedian(metrics.dora.metrics.leadTimeForChanges.averageLeadTimeDays, peerMetrics.dora.leadTime.median, true)
          }
        };
      }

      return {
        score: this.calculateAverageScore(comparisons),
        details: comparisons,
        peerCount: peerMetrics.sampleSize || 100,
        summary: this.generatePeerSummary(comparisons)
      };
    } catch (error) {
      console.error('Error comparing to peers:', error);
      return this.getDefaultComparison();
    }
  }

  /**
   * Compares to similar project types
   */
  async compareToProjectType(metrics, context) {
    try {
      const projectType = this.identifyProjectType(context);
      const typeBenchmarks = this.projectTypeBenchmarks[projectType] || this.projectTypeBenchmarks.general;

      const comparisons = {};

      if (metrics.codeQuality) {
        comparisons.codeQuality = {
          complexity: this.benchmarkScore(metrics.codeQuality.complexity.averageComplexity, typeBenchmarks.complexity),
          testCoverage: this.benchmarkScore(metrics.codeQuality.testCoverage || 70, typeBenchmarks.testCoverage),
          documentation: this.benchmarkScore(metrics.codeQuality.maintainability.documentationScore, typeBenchmarks.documentation)
        };
      }

      if (metrics.dora) {
        comparisons.dora = {
          deploymentFrequency: this.benchmarkScore(metrics.dora.metrics.deploymentFrequency.deploymentsPerDay, typeBenchmarks.deploymentFrequency),
          reliability: this.benchmarkScore(100 - metrics.dora.metrics.changeFailureRate.changeFailureRate, typeBenchmarks.reliability)
        };
      }

      return {
        projectType,
        score: this.calculateAverageScore(comparisons),
        details: comparisons,
        summary: this.generateProjectTypeSummary(comparisons, projectType)
      };
    } catch (error) {
      console.error('Error comparing to project type:', error);
      return this.getDefaultComparison();
    }
  }

  /**
   * Compares to repositories of similar size
   */
  async compareToSimilarSize(metrics, context) {
    try {
      const sizeCategory = this.categorizeSizeCategory(context);
      const sizeBenchmarks = this.sizeBenchmarks[sizeCategory] || this.sizeBenchmarks.medium;

      const comparisons = {};

      if (metrics.repository) {
        comparisons.activity = {
          commits: this.benchmarkScore(metrics.repository.activity?.commits_last_30_days || 0, sizeBenchmarks.activity.commits),
          contributors: this.benchmarkScore(metrics.repository.activity?.contributors_count || 0, sizeBenchmarks.activity.contributors),
          issues: this.benchmarkScore(metrics.repository.activity?.open_issues_count || 0, sizeBenchmarks.activity.issues, true) // Lower is better
        };
      }

      if (metrics.codeQuality) {
        comparisons.quality = {
          overall: this.benchmarkScore(metrics.codeQuality.qualityScore.overall, sizeBenchmarks.quality.overall),
          dependencies: this.benchmarkScore(metrics.codeQuality.dependencies.healthScore, sizeBenchmarks.quality.dependencies)
        };
      }

      return {
        sizeCategory,
        score: this.calculateAverageScore(comparisons),
        details: comparisons,
        summary: this.generateSizeSummary(comparisons, sizeCategory)
      };
    } catch (error) {
      console.error('Error comparing to similar size:', error);
      return this.getDefaultComparison();
    }
  }

  /**
   * Analyzes historical trends
   */
  async analyzeHistoricalTrends(metrics, context) {
    try {
      // In a real implementation, this would track metrics over time
      // For now, we'll simulate trend analysis
      
      return {
        codeQuality: {
          trend: 'improving',
          changeRate: '+5.2%',
          period: '3 months'
        },
        dora: {
          deploymentFrequency: { trend: 'stable', changeRate: '+2.1%' },
          leadTime: { trend: 'improving', changeRate: '-12.3%' },
          changeFailureRate: { trend: 'improving', changeRate: '-3.1%' },
          mttr: { trend: 'stable', changeRate: '-1.2%' }
        },
        repository: {
          activity: { trend: 'increasing', changeRate: '+8.7%' },
          community: { trend: 'growing', changeRate: '+15.3%' }
        }
      };
    } catch (error) {
      console.error('Error analyzing historical trends:', error);
      return {};
    }
  }

  /**
   * Calculates overall performance across all benchmarks
   */
  calculateOverallPerformance(benchmarks) {
    const scores = [];
    
    if (benchmarks.industryComparison?.score) scores.push(benchmarks.industryComparison.score);
    if (benchmarks.peerComparison?.score) scores.push(benchmarks.peerComparison.score);
    if (benchmarks.projectTypeComparison?.score) scores.push(benchmarks.projectTypeComparison.score);
    if (benchmarks.sizeComparison?.score) scores.push(benchmarks.sizeComparison.score);

    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 50;
    
    return {
      score: Math.round(averageScore * 100) / 100,
      grade: this.scoreToGrade(averageScore),
      percentile: this.scoreToPercentile(averageScore),
      performance: this.scoreToPerformance(averageScore)
    };
  }

  /**
   * Generates benchmarking insights
   */
  generateBenchmarkingInsights(data) {
    const insights = [];

    // Industry performance insights
    if (data.industryComparison?.score > 80) {
      insights.push({
        type: 'positive',
        category: 'industry',
        title: 'Above Industry Standards',
        description: 'Your repository performs significantly better than industry averages across most metrics.',
        impact: 'high'
      });
    } else if (data.industryComparison?.score < 40) {
      insights.push({
        type: 'concern',
        category: 'industry',
        title: 'Below Industry Standards',
        description: 'Several metrics are below industry standards and need attention.',
        impact: 'high'
      });
    }

    // Peer performance insights
    if (data.peerComparison?.score > 75) {
      insights.push({
        type: 'positive',
        category: 'peers',
        title: 'Top Performer Among Peers',
        description: 'Your repository ranks in the top quartile compared to similar projects.',
        impact: 'medium'
      });
    }

    // Project type insights
    if (data.projectTypeComparison?.score > 70) {
      insights.push({
        type: 'positive',
        category: 'projectType',
        title: 'Excellent for Project Type',
        description: `Strong performance characteristics typical of high-quality ${data.projectTypeComparison.projectType} projects.`,
        impact: 'medium'
      });
    }

    // Size-specific insights
    if (data.sizeComparison?.score > 80) {
      insights.push({
        type: 'positive',
        category: 'size',
        title: 'Well-Managed Scale',
        description: `Excellent metrics for a ${data.sizeComparison.sizeCategory}-sized project.`,
        impact: 'medium'
      });
    }

    return insights.slice(0, 6); // Top 6 insights
  }

  /**
   * Generates benchmarking recommendations
   */
  generateBenchmarkingRecommendations(data) {
    const recommendations = [];

    // Industry-based recommendations
    if (data.industryComparison?.details?.codeQuality?.security < 60) {
      recommendations.push({
        priority: 'high',
        category: 'security',
        title: 'Improve Security Posture',
        description: 'Security metrics are below industry standards. Focus on vulnerability remediation and secure coding practices.',
        benchmark: 'Industry average: 75+',
        current: data.industryComparison.details.codeQuality.security
      });
    }

    // DORA-based recommendations
    if (data.industryComparison?.details?.dora?.deploymentFrequency < 60) {
      recommendations.push({
        priority: 'medium',
        category: 'deployment',
        title: 'Increase Deployment Frequency',
        description: 'Deployment frequency is below industry standards. Consider implementing CI/CD automation.',
        benchmark: 'Industry target: Daily deployments',
        current: 'Current frequency below target'
      });
    }

    // Peer-based recommendations
    if (data.peerComparison?.details?.codeQuality?.percentile < 50) {
      recommendations.push({
        priority: 'medium',
        category: 'quality',
        title: 'Improve Code Quality',
        description: 'Code quality metrics are below the median of peer projects.',
        benchmark: 'Peer median: 70+',
        current: data.peerComparison.details.codeQuality.percentile
      });
    }

    return recommendations.slice(0, 8); // Top 8 recommendations
  }

  // Helper methods for benchmarking calculations
  benchmarkScore(value, benchmark, lowerIsBetter = false) {
    if (typeof value !== 'number' || typeof benchmark !== 'object') return 50;

    const { min, max, target, excellent } = benchmark;
    
    if (lowerIsBetter) {
      if (value <= excellent) return 95;
      if (value <= target) return 80;
      if (value <= max) return 60;
      return 30;
    } else {
      if (value >= excellent) return 95;
      if (value >= target) return 80;
      if (value >= min) return 60;
      return 30;
    }
  }

  benchmarkDORAMetric(value, metricType, benchmark) {
    const classifications = ['elite', 'high', 'medium', 'low'];
    let score = 25; // Default low score

    switch (metricType) {
      case 'deploymentFrequency':
        if (value >= 1) score = 95; // Multiple per day
        else if (value >= 0.14) score = 80; // Weekly
        else if (value >= 0.033) score = 60; // Monthly
        break;
      case 'leadTime':
        if (value <= 1) score = 95; // < 1 day
        else if (value <= 7) score = 80; // < 1 week
        else if (value <= 30) score = 60; // < 1 month
        break;
      case 'changeFailureRate':
        if (value <= 5) score = 95;
        else if (value <= 10) score = 80;
        else if (value <= 15) score = 60;
        break;
      case 'mttr':
        if (value <= 1) score = 95; // < 1 hour
        else if (value <= 24) score = 80; // < 1 day
        else if (value <= 168) score = 60; // < 1 week
        break;
    }

    return score;
  }

  calculatePercentile(value, distribution, lowerIsBetter = false) {
    if (!distribution || !Array.isArray(distribution.values)) return 50;

    const sortedValues = [...distribution.values].sort((a, b) => lowerIsBetter ? a - b : b - a);
    const rank = sortedValues.findIndex(v => lowerIsBetter ? value <= v : value >= v);
    
    return rank >= 0 ? Math.round((rank / sortedValues.length) * 100) : 50;
  }

  calculateRank(value, distribution) {
    if (!distribution || !Array.isArray(distribution.values)) return '50th';

    const sortedValues = [...distribution.values].sort((a, b) => b - a);
    const rank = sortedValues.findIndex(v => value >= v) + 1;
    
    const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
    return `${rank}${suffix}`;
  }

  compareToMedian(value, median, lowerIsBetter = false) {
    if (typeof value !== 'number' || typeof median !== 'number') return 'unknown';

    const difference = lowerIsBetter ? median - value : value - median;
    const percentDiff = Math.abs((difference / median) * 100);

    if (difference > 0) {
      if (percentDiff > 20) return 'significantly better';
      if (percentDiff > 10) return 'better';
      return 'slightly better';
    } else if (difference < 0) {
      if (percentDiff > 20) return 'significantly worse';
      if (percentDiff > 10) return 'worse';
      return 'slightly worse';
    }
    return 'similar';
  }

  calculateAverageScore(comparisons) {
    const scores = [];
    
    const extractScores = (obj) => {
      Object.values(obj).forEach(value => {
        if (typeof value === 'number') {
          scores.push(value);
        } else if (typeof value === 'object' && value !== null) {
          extractScores(value);
        }
      });
    };

    extractScores(comparisons);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 50;
  }

  // Project analysis helpers
  identifyProjectType(context) {
    const { language, keywords, framework } = context;
    
    if (language?.toLowerCase().includes('javascript') || language?.toLowerCase().includes('typescript')) {
      if (keywords?.some(k => /react|vue|angular/.test(k))) return 'frontend';
      if (keywords?.some(k => /node|express|api/.test(k))) return 'backend';
      return 'javascript';
    }
    
    if (language?.toLowerCase().includes('python')) {
      if (keywords?.some(k => /django|flask|fastapi/.test(k))) return 'web';
      if (keywords?.some(k => /ml|ai|data|science/.test(k))) return 'datascience';
      return 'python';
    }
    
    if (language?.toLowerCase().includes('java')) return 'enterprise';
    if (language?.toLowerCase().includes('go')) return 'microservices';
    
    return 'general';
  }

  categorizeSizeCategory(context) {
    const { size, contributors, stars } = context;
    
    if (size > 100000 || contributors > 20 || stars > 1000) return 'large';
    if (size > 10000 || contributors > 5 || stars > 100) return 'medium';
    return 'small';
  }

  scoreToGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    return 'D';
  }

  scoreToPercentile(score) {
    return Math.min(99, Math.round(score));
  }

  scoreToPerformance(score) {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Average';
    if (score >= 40) return 'Below Average';
    return 'Poor';
  }

  // Load benchmark data
  loadIndustryBenchmarks() {
    return {
      codeQuality: {
        overall: { min: 60, target: 75, excellent: 85, max: 100 },
        complexity: { min: 50, target: 70, excellent: 85, max: 100 },
        security: { min: 70, target: 85, excellent: 95, max: 100 },
        maintainability: { min: 60, target: 75, excellent: 90, max: 100 }
      },
      dora: {
        deploymentFrequency: { elite: 1, high: 0.14, medium: 0.033, low: 0.008 },
        leadTime: { elite: 1, high: 7, medium: 30, low: 180 },
        changeFailureRate: { elite: 5, high: 10, medium: 15, low: 30 },
        mttr: { elite: 1, high: 24, medium: 168, low: 720 }
      },
      repository: {
        activity: { min: 5, target: 15, excellent: 30, max: 100 },
        community: { min: 10, target: 50, excellent: 200, max: 10000 },
        maintenance: { min: 50, target: 70, excellent: 85, max: 100 }
      }
    };
  }

  loadProjectTypeBenchmarks() {
    return {
      frontend: {
        complexity: { min: 3, target: 6, excellent: 10, max: 15 },
        testCoverage: { min: 60, target: 75, excellent: 85, max: 100 },
        documentation: { min: 50, target: 70, excellent: 85, max: 100 },
        deploymentFrequency: { min: 0.033, target: 0.14, excellent: 1, max: 5 },
        reliability: { min: 85, target: 92, excellent: 97, max: 100 }
      },
      backend: {
        complexity: { min: 5, target: 8, excellent: 12, max: 20 },
        testCoverage: { min: 70, target: 85, excellent: 95, max: 100 },
        documentation: { min: 60, target: 80, excellent: 90, max: 100 },
        deploymentFrequency: { min: 0.14, target: 0.5, excellent: 2, max: 10 },
        reliability: { min: 90, target: 95, excellent: 99, max: 100 }
      },
      general: {
        complexity: { min: 4, target: 7, excellent: 11, max: 18 },
        testCoverage: { min: 65, target: 80, excellent: 90, max: 100 },
        documentation: { min: 55, target: 75, excellent: 88, max: 100 },
        deploymentFrequency: { min: 0.033, target: 0.2, excellent: 1, max: 3 },
        reliability: { min: 87, target: 93, excellent: 98, max: 100 }
      }
    };
  }

  loadSizeBenchmarks() {
    return {
      small: {
        activity: {
          commits: { min: 5, target: 15, excellent: 25, max: 50 },
          contributors: { min: 1, target: 3, excellent: 5, max: 10 },
          issues: { min: 0, target: 3, excellent: 8, max: 20 }
        },
        quality: {
          overall: { min: 60, target: 75, excellent: 85, max: 100 },
          dependencies: { min: 70, target: 85, excellent: 95, max: 100 }
        }
      },
      medium: {
        activity: {
          commits: { min: 15, target: 30, excellent: 50, max: 100 },
          contributors: { min: 3, target: 8, excellent: 15, max: 30 },
          issues: { min: 5, target: 15, excellent: 25, max: 50 }
        },
        quality: {
          overall: { min: 65, target: 78, excellent: 88, max: 100 },
          dependencies: { min: 75, target: 88, excellent: 96, max: 100 }
        }
      },
      large: {
        activity: {
          commits: { min: 30, target: 60, excellent: 100, max: 200 },
          contributors: { min: 10, target: 25, excellent: 50, max: 100 },
          issues: { min: 20, target: 40, excellent: 70, max: 150 }
        },
        quality: {
          overall: { min: 70, target: 82, excellent: 90, max: 100 },
          dependencies: { min: 80, target: 90, excellent: 97, max: 100 }
        }
      }
    };
  }

  // Simulation methods for peer data (in production, these would query real databases)
  async fetchPeerMetrics(context) {
    // Simulate peer metrics based on project characteristics
    return {
      sampleSize: 127,
      codeQuality: {
        values: this.generateSimulatedDistribution(72, 15, 100),
        median: 72,
        mean: 74
      },
      dora: {
        deploymentFrequency: {
          values: this.generateSimulatedDistribution(0.3, 0.2, 50),
          median: 0.25
        },
        leadTime: {
          values: this.generateSimulatedDistribution(12, 8, 50),
          median: 10
        }
      }
    };
  }

  generateSimulatedDistribution(mean, stdDev, count) {
    const values = [];
    for (let i = 0; i < count; i++) {
      // Simple normal distribution simulation
      const value = mean + (Math.random() - 0.5) * stdDev * 2;
      values.push(Math.max(0, value));
    }
    return values;
  }

  // Summary generation methods
  generateIndustrySummary(comparisons) {
    return `Performance compared to industry standards varies across metrics, with notable strengths in areas scoring above 75.`;
  }

  generatePeerSummary(comparisons) {
    return `Compared to ${comparisons.peerCount || 100} similar repositories, performance is competitive in most areas.`;
  }

  generateProjectTypeSummary(comparisons, projectType) {
    return `For a ${projectType} project, the metrics align well with typical patterns and expectations.`;
  }

  generateSizeSummary(comparisons, sizeCategory) {
    return `As a ${sizeCategory}-sized project, the repository demonstrates appropriate scale characteristics.`;
  }

  // Default values
  getDefaultComparison() {
    return {
      score: 50,
      details: {},
      summary: 'Insufficient data for comparison'
    };
  }
}

module.exports = BenchmarkingEngine; 