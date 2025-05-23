const CodeQualityAnalyzer = require('./code-quality-analyzer');
const DORAMetricsCollector = require('./dora-metrics-collector');
const BenchmarkingEngine = require('./benchmarking-engine');
const githubService = require('../github/github-service');
const { v4: uuidv4 } = require('uuid');

class AnalysisOrchestrator {
  constructor() {
    this.codeQualityAnalyzer = new CodeQualityAnalyzer(githubService);
    this.doraMetricsCollector = new DORAMetricsCollector(githubService);
    this.benchmarkingEngine = new BenchmarkingEngine();
    this.analysisCache = new Map();
    this.analysisQueue = [];
    this.isProcessing = false;
  }

  /**
   * Performs comprehensive repository analysis
   * @param {string} accessToken - GitHub access token
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} options - Analysis options
   * @returns {Object} Comprehensive analysis results
   */
  async performComprehensiveAnalysis(accessToken, owner, repo, options = {}) {
    const analysisId = uuidv4();
    const startTime = Date.now();

    try {
      console.log(`Starting comprehensive analysis for ${owner}/${repo} (ID: ${analysisId})`);

      // Check cache first
      const cacheKey = `${owner}/${repo}`;
      if (this.analysisCache.has(cacheKey) && !options.forceRefresh) {
        const cached = this.analysisCache.get(cacheKey);
        if (Date.now() - cached.timestamp < (options.cacheTime || 3600000)) { // 1 hour default
          console.log(`Returning cached analysis for ${owner}/${repo}`);
          return { ...cached.data, fromCache: true };
        }
      }

      // Get repository context
      const repositoryContext = await this.gatherRepositoryContext(accessToken, owner, repo);

      // Perform parallel analysis
      const [
        repositoryBasics,
        codeQualityResults,
        doraMetricsResults,
        repositoryStats
      ] = await Promise.all([
        this.analyzeRepositoryBasics(accessToken, owner, repo),
        this.performCodeQualityAnalysis(owner, repo, options),
        this.performDORAAnalysis(owner, repo, options),
        githubService.getRepositoryStats(accessToken, owner, repo).catch(err => {
          console.warn('Failed to get repository stats:', err.message);
          return null;
        })
      ]);

      // Combine all metrics for benchmarking
      const combinedMetrics = {
        repository: repositoryStats,
        codeQuality: codeQualityResults,
        dora: doraMetricsResults
      };

      // Perform benchmarking analysis
      const benchmarkingResults = await this.performBenchmarkingAnalysis(
        combinedMetrics,
        repositoryContext,
        options
      );

      // Generate executive summary
      const executiveSummary = this.generateExecutiveSummary({
        repository: repositoryBasics,
        codeQuality: codeQualityResults,
        dora: doraMetricsResults,
        benchmarking: benchmarkingResults,
        context: repositoryContext
      });

      // Generate comprehensive recommendations
      const recommendations = this.generateComprehensiveRecommendations({
        codeQuality: codeQualityResults,
        dora: doraMetricsResults,
        benchmarking: benchmarkingResults
      });

      // Calculate overall tech health score
      const techHealthScore = this.calculateTechHealthScore({
        codeQuality: codeQualityResults,
        dora: doraMetricsResults,
        benchmarking: benchmarkingResults,
        repository: repositoryStats
      });

      const analysisResults = {
        analysisId,
        repository: {
          owner,
          repo,
          fullName: `${owner}/${repo}`,
          ...repositoryBasics
        },
        techHealthScore,
        executiveSummary,
        analysis: {
          codeQuality: codeQualityResults,
          dora: doraMetricsResults,
          benchmarking: benchmarkingResults,
          repository: repositoryStats
        },
        recommendations,
        insights: this.generateKeyInsights({
          codeQuality: codeQualityResults,
          dora: doraMetricsResults,
          benchmarking: benchmarkingResults
        }),
        metadata: {
          analysisVersion: '2.0',
          analysisTime: Date.now() - startTime,
          analyzedAt: new Date().toISOString(),
          options: options,
          context: repositoryContext
        }
      };

      // Cache results
      this.analysisCache.set(cacheKey, {
        data: analysisResults,
        timestamp: Date.now()
      });

      console.log(`Comprehensive analysis completed for ${owner}/${repo} in ${Date.now() - startTime}ms`);
      return analysisResults;

    } catch (error) {
      console.error(`Error in comprehensive analysis for ${owner}/${repo}:`, error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Performs streaming analysis with progress updates
   */
  async performStreamingAnalysis(accessToken, owner, repo, progressCallback, options = {}) {
    const analysisId = uuidv4();
    const totalSteps = 6;
    let currentStep = 0;

    const updateProgress = (step, description, data = null) => {
      currentStep++;
      if (progressCallback) {
        progressCallback({
          analysisId,
          step: currentStep,
          totalSteps,
          percentage: Math.round((currentStep / totalSteps) * 100),
          description,
          data
        });
      }
    };

    try {
      updateProgress(1, 'Gathering repository context...');
      const repositoryContext = await this.gatherRepositoryContext(accessToken, owner, repo);

      updateProgress(2, 'Analyzing repository basics...');
      const repositoryBasics = await this.analyzeRepositoryBasics(accessToken, owner, repo);

      updateProgress(3, 'Performing code quality analysis...');
      const codeQualityResults = await this.performCodeQualityAnalysis(owner, repo, options);

      updateProgress(4, 'Collecting DORA metrics...');
      const doraMetricsResults = await this.performDORAAnalysis(owner, repo, options);

      updateProgress(5, 'Running benchmarking analysis...');
      const combinedMetrics = {
        repository: repositoryBasics,
        codeQuality: codeQualityResults,
        dora: doraMetricsResults
      };
      const benchmarkingResults = await this.performBenchmarkingAnalysis(combinedMetrics, repositoryContext, options);

      updateProgress(6, 'Generating final report...');
      const finalResults = await this.performComprehensiveAnalysis(accessToken, owner, repo, { ...options, useCache: true });

      updateProgress(6, 'Analysis complete!', finalResults);
      return finalResults;

    } catch (error) {
      if (progressCallback) {
        progressCallback({
          analysisId,
          error: true,
          message: error.message
        });
      }
      throw error;
    }
  }

  /**
   * Gathers repository context for analysis
   */
  async gatherRepositoryContext(accessToken, owner, repo) {
    try {
      const [repository, languages] = await Promise.all([
        githubService.getRepository(accessToken, owner, repo),
        githubService.getRepositoryLanguages(accessToken, owner, repo).catch(() => [])
      ]);

      return {
        size: repository.size,
        language: repository.language,
        languages: languages.map(l => l.language),
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        contributors: 0, // Will be filled by other analysis
        topics: repository.topics || [],
        license: repository.license?.name,
        createdAt: repository.created_at,
        updatedAt: repository.updated_at,
        isPrivate: repository.private,
        hasWiki: repository.has_wiki,
        hasPages: repository.has_pages,
        keywords: [
          ...repository.topics || [],
          repository.language,
          ...languages.map(l => l.language)
        ].filter(Boolean)
      };
    } catch (error) {
      console.warn('Error gathering repository context:', error.message);
      return {};
    }
  }

  /**
   * Analyzes basic repository information
   */
  async analyzeRepositoryBasics(accessToken, owner, repo) {
    try {
      const repository = await githubService.getRepository(accessToken, owner, repo);
      
      return {
        id: repository.id,
        name: repository.name,
        description: repository.description,
        language: repository.language,
        size: repository.size,
        stargazers: repository.stargazers_count,
        watchers: repository.watchers_count,
        forks: repository.forks_count,
        openIssues: repository.open_issues_count,
        license: repository.license,
        topics: repository.topics,
        createdAt: repository.created_at,
        updatedAt: repository.updated_at,
        pushedAt: repository.pushed_at,
        defaultBranch: repository.default_branch,
        isPrivate: repository.private,
        isArchived: repository.archived,
        isDisabled: repository.disabled,
        hasIssues: repository.has_issues,
        hasWiki: repository.has_wiki,
        hasPages: repository.has_pages
      };
    } catch (error) {
      console.error('Error analyzing repository basics:', error);
      throw error;
    }
  }

  /**
   * Performs code quality analysis
   */
  async performCodeQualityAnalysis(owner, repo, options = {}) {
    try {
      return await this.codeQualityAnalyzer.analyzeCodeQuality(owner, repo);
    } catch (error) {
      console.error('Error in code quality analysis:', error);
      // Return default results to prevent complete failure
      return {
        qualityScore: { overall: 50, grade: 'C' },
        complexity: { averageComplexity: 0, score: 50 },
        dependencies: { totalDependencies: 0, healthScore: 50 },
        linting: { totalIssues: 0, score: 50 },
        security: { vulnerabilities: [], securityScore: 50 },
        maintainability: { maintenanceScore: 50 },
        recommendations: [],
        error: error.message
      };
    }
  }

  /**
   * Performs DORA metrics analysis
   */
  async performDORAAnalysis(owner, repo, options = {}) {
    try {
      return await this.doraMetricsCollector.collectDORAMetrics(owner, repo, options);
    } catch (error) {
      console.error('Error in DORA metrics analysis:', error);
      // Return default results to prevent complete failure
      return {
        metrics: {
          deploymentFrequency: { deploymentsPerDay: 0, frequency: 'low' },
          leadTimeForChanges: { averageLeadTimeDays: 0, classification: 'unknown' },
          changeFailureRate: { changeFailureRate: 0, classification: 'unknown' },
          meanTimeToRestore: { meanTimeToRestoreHours: 0, classification: 'unknown' }
        },
        performanceLevel: { level: 'Low', score: 1 },
        recommendations: [],
        error: error.message
      };
    }
  }

  /**
   * Performs benchmarking analysis
   */
  async performBenchmarkingAnalysis(metrics, context, options = {}) {
    try {
      return await this.benchmarkingEngine.performBenchmarking(metrics, context);
    } catch (error) {
      console.error('Error in benchmarking analysis:', error);
      // Return default results to prevent complete failure
      return {
        overallPerformance: { score: 50, grade: 'C', performance: 'Average' },
        benchmarks: {},
        insights: [],
        recommendations: [],
        error: error.message
      };
    }
  }

  /**
   * Generates executive summary
   */
  generateExecutiveSummary(analysisData) {
    const { repository, codeQuality, dora, benchmarking } = analysisData;

    const highlights = [];
    const concerns = [];
    const opportunities = [];

    // Code Quality highlights
    if (codeQuality?.qualityScore?.overall > 80) {
      highlights.push(`Excellent code quality with a score of ${codeQuality.qualityScore.overall}/100`);
    } else if (codeQuality?.qualityScore?.overall < 60) {
      concerns.push(`Code quality score of ${codeQuality.qualityScore.overall}/100 needs improvement`);
    }

    // DORA metrics highlights
    if (dora?.performanceLevel?.level === 'Elite') {
      highlights.push('Elite-level software delivery performance according to DORA metrics');
    } else if (dora?.performanceLevel?.level === 'Low') {
      concerns.push('Software delivery performance is below industry standards');
    }

    // Security concerns
    if (codeQuality?.security?.criticalCount > 0) {
      concerns.push(`${codeQuality.security.criticalCount} critical security vulnerabilities detected`);
    }

    // Benchmarking insights
    if (benchmarking?.overallPerformance?.score > 85) {
      highlights.push('Performs significantly above industry benchmarks');
    } else if (benchmarking?.overallPerformance?.score < 40) {
      concerns.push('Performance is below industry benchmarks');
    }

    // Opportunities
    if (dora?.metrics?.deploymentFrequency?.deploymentsPerDay < 0.14) {
      opportunities.push('Increase deployment frequency through automation');
    }
    if (codeQuality?.dependencies?.outdatedPackages?.length > 5) {
      opportunities.push('Update dependencies to reduce technical debt');
    }

    return {
      overallAssessment: this.generateOverallAssessment(analysisData),
      keyHighlights: highlights.slice(0, 5),
      primaryConcerns: concerns.slice(0, 5),
      strategicOpportunities: opportunities.slice(0, 5),
      investorReadiness: this.assessInvestorReadiness(analysisData),
      nextSteps: this.generateNextSteps(analysisData)
    };
  }

  /**
   * Generates overall assessment
   */
  generateOverallAssessment(analysisData) {
    const { codeQuality, dora, benchmarking } = analysisData;
    
    const scores = [];
    if (codeQuality?.qualityScore?.overall) scores.push(codeQuality.qualityScore.overall);
    if (dora?.performanceLevel?.score) scores.push(dora.performanceLevel.score * 25); // Convert to 100 scale
    if (benchmarking?.overallPerformance?.score) scores.push(benchmarking.overallPerformance.score);
    
    const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 50;
    
    if (avgScore >= 85) {
      return 'Exceptional technical foundation with strong engineering practices and delivery capabilities.';
    } else if (avgScore >= 70) {
      return 'Solid technical foundation with good engineering practices and room for optimization.';
    } else if (avgScore >= 55) {
      return 'Adequate technical foundation with several areas needing improvement.';
    } else {
      return 'Technical foundation requires significant attention across multiple areas.';
    }
  }

  /**
   * Assesses investor readiness
   */
  assessInvestorReadiness(analysisData) {
    const { codeQuality, dora, benchmarking } = analysisData;
    
    let readinessScore = 0;
    const factors = [];

    // Code quality factors
    if (codeQuality?.qualityScore?.overall > 75) {
      readinessScore += 25;
      factors.push('Strong code quality standards');
    } else if (codeQuality?.qualityScore?.overall < 60) {
      factors.push('Code quality needs improvement');
    }

    // Security factors
    if (codeQuality?.security?.criticalCount === 0) {
      readinessScore += 20;
      factors.push('No critical security vulnerabilities');
    } else {
      factors.push('Security vulnerabilities need addressing');
    }

    // DORA metrics factors
    if (dora?.performanceLevel?.level === 'Elite' || dora?.performanceLevel?.level === 'High') {
      readinessScore += 25;
      factors.push('Excellent software delivery capabilities');
    }

    // Scalability factors
    if (benchmarking?.overallPerformance?.score > 70) {
      readinessScore += 20;
      factors.push('Above-average technical performance');
    }

    // Maintenance factors
    if (codeQuality?.maintainability?.maintenanceScore > 75) {
      readinessScore += 10;
      factors.push('Well-maintained codebase');
    }

    let readinessLevel;
    if (readinessScore >= 80) readinessLevel = 'High';
    else if (readinessScore >= 60) readinessLevel = 'Medium';
    else if (readinessScore >= 40) readinessLevel = 'Low';
    else readinessLevel = 'Very Low';

    return {
      level: readinessLevel,
      score: readinessScore,
      factors: factors.slice(0, 6)
    };
  }

  /**
   * Generates next steps
   */
  generateNextSteps(analysisData) {
    const steps = [];
    const { codeQuality, dora, benchmarking } = analysisData;

    // Critical security issues first
    if (codeQuality?.security?.criticalCount > 0) {
      steps.push({
        priority: 1,
        action: 'Address Critical Security Issues',
        description: `Fix ${codeQuality.security.criticalCount} critical security vulnerabilities immediately`,
        timeframe: 'Within 1 week'
      });
    }

    // Code quality improvements
    if (codeQuality?.qualityScore?.overall < 70) {
      steps.push({
        priority: 2,
        action: 'Improve Code Quality',
        description: 'Implement code review processes and automated quality checks',
        timeframe: '2-4 weeks'
      });
    }

    // DORA improvements
    if (dora?.performanceLevel?.level === 'Low') {
      steps.push({
        priority: 3,
        action: 'Enhance Deployment Pipeline',
        description: 'Implement CI/CD automation to improve deployment frequency',
        timeframe: '4-8 weeks'
      });
    }

    // Dependencies
    if (codeQuality?.dependencies?.outdatedPackages?.length > 10) {
      steps.push({
        priority: 4,
        action: 'Update Dependencies',
        description: 'Create a plan to update outdated dependencies systematically',
        timeframe: '2-6 weeks'
      });
    }

    return steps.slice(0, 6);
  }

  /**
   * Generates comprehensive recommendations
   */
  generateComprehensiveRecommendations(analysisData) {
    const recommendations = [];
    
    // Collect recommendations from all analysis components
    if (analysisData.codeQuality?.recommendations) {
      recommendations.push(...analysisData.codeQuality.recommendations);
    }
    if (analysisData.dora?.recommendations) {
      recommendations.push(...analysisData.dora.recommendations);
    }
    if (analysisData.benchmarking?.recommendations) {
      recommendations.push(...analysisData.benchmarking.recommendations);
    }

    // Sort by priority and deduplicate
    const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
    const sortedRecommendations = recommendations
      .sort((a, b) => (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0))
      .slice(0, 12); // Top 12 recommendations

    return {
      total: sortedRecommendations.length,
      critical: sortedRecommendations.filter(r => r.priority === 'critical').length,
      high: sortedRecommendations.filter(r => r.priority === 'high').length,
      medium: sortedRecommendations.filter(r => r.priority === 'medium').length,
      low: sortedRecommendations.filter(r => r.priority === 'low').length,
      items: sortedRecommendations
    };
  }

  /**
   * Generates key insights
   */
  generateKeyInsights(analysisData) {
    const insights = [];

    // Collect insights from benchmarking
    if (analysisData.benchmarking?.insights) {
      insights.push(...analysisData.benchmarking.insights);
    }

    // Add custom insights based on analysis
    const { codeQuality, dora } = analysisData;

    if (codeQuality?.complexity?.averageComplexity > 15) {
      insights.push({
        type: 'concern',
        category: 'complexity',
        title: 'High Code Complexity',
        description: 'Average complexity is above recommended thresholds, which may impact maintainability.',
        impact: 'medium'
      });
    }

    if (dora?.metrics?.deploymentFrequency?.deploymentsPerDay > 1) {
      insights.push({
        type: 'positive',
        category: 'delivery',
        title: 'Frequent Deployments',
        description: 'High deployment frequency indicates mature DevOps practices.',
        impact: 'high'
      });
    }

    return insights.slice(0, 8); // Top 8 insights
  }

  /**
   * Calculates overall tech health score
   */
  calculateTechHealthScore(analysisData) {
    const weights = {
      codeQuality: 0.35,
      dora: 0.25,
      benchmarking: 0.25,
      repository: 0.15
    };

    const scores = {};
    let totalWeight = 0;

    if (analysisData.codeQuality?.qualityScore?.overall) {
      scores.codeQuality = analysisData.codeQuality.qualityScore.overall;
      totalWeight += weights.codeQuality;
    }

    if (analysisData.dora?.performanceLevel?.score) {
      scores.dora = analysisData.dora.performanceLevel.score * 25; // Convert to 100 scale
      totalWeight += weights.dora;
    }

    if (analysisData.benchmarking?.overallPerformance?.score) {
      scores.benchmarking = analysisData.benchmarking.overallPerformance.score;
      totalWeight += weights.benchmarking;
    }

    if (analysisData.repository?.health_score) {
      scores.repository = analysisData.repository.health_score;
      totalWeight += weights.repository;
    }

    const weightedScore = Object.entries(scores).reduce((total, [key, score]) => {
      return total + (score * weights[key]);
    }, 0);

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 50;

    return {
      overall: Math.round(finalScore * 100) / 100,
      grade: this.scoreToGrade(finalScore),
      breakdown: scores,
      weights: weights
    };
  }

  /**
   * Converts score to letter grade
   */
  scoreToGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D+';
    if (score >= 45) return 'D';
    return 'F';
  }

  /**
   * Clears analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    console.log('Analysis cache cleared');
  }

  /**
   * Gets cache statistics
   */
  getCacheStats() {
    return {
      size: this.analysisCache.size,
      keys: Array.from(this.analysisCache.keys())
    };
  }
}

module.exports = new AnalysisOrchestrator(); 