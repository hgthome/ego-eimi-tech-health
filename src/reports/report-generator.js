const ChartGenerator = require('./chart-generator');
const PDFGenerator = require('./pdf-generator');
const TemplateEngine = require('./template-engine');
const RecommendationEngine = require('./recommendation-engine');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class ReportGenerator {
  constructor() {
    this.chartGenerator = new ChartGenerator();
    this.pdfGenerator = new PDFGenerator();
    this.templateEngine = new TemplateEngine();
    this.recommendationEngine = new RecommendationEngine();
    this.reportCache = new Map();
  }

  /**
   * Generates a comprehensive Tech Health Appendix report
   * @param {Object} analysisData - Complete analysis results from orchestrator
   * @param {Object} options - Report generation options
   * @returns {Object} Generated report with metadata
   */
  async generateTechHealthAppendix(analysisData, options = {}) {
    const reportId = uuidv4();
    const startTime = Date.now();

    try {
      console.log(`Generating Tech Health Appendix (ID: ${reportId})`);

      // Step 1: Generate all visualizations
      console.log('Generating data visualizations...');
      const charts = await this.generateAllCharts(analysisData);

      // Step 2: Process data for template rendering
      console.log('Processing data for template...');
      const templateData = await this.prepareTemplateData(analysisData, charts);

      // Step 3: Generate executive summary
      console.log('Generating executive summary...');
      const executiveSummary = this.generateExecutiveSummary(analysisData);

      // Step 4: Generate detailed recommendations
      console.log('Generating recommendations...');
      const recommendations = await this.recommendationEngine.generateDetailedRecommendations(analysisData);

      // Step 5: Render HTML report
      console.log('Rendering HTML report...');
      const htmlReport = await this.templateEngine.renderFullReport({
        ...templateData,
        executiveSummary,
        recommendations,
        metadata: {
          reportId,
          generatedAt: new Date().toISOString(),
          repository: analysisData.repository,
          options
        }
      });

      // Step 6: Generate PDF
      console.log('Generating PDF...');
      
      // Filter options to only include PDF-specific ones
      const pdfOptions = {
        reportId,
        repository: analysisData.repository
      };
      
      // Add any valid PDF options from the options parameter
      if (options.margin) pdfOptions.margin = options.margin;
      if (options.format && ['A4', 'Letter', 'Legal'].includes(options.format)) {
        pdfOptions.format = options.format;
      }
      if (options.landscape !== undefined) pdfOptions.landscape = options.landscape;
      
      const pdfBuffer = await this.pdfGenerator.generatePDF(htmlReport, pdfOptions);

      const report = {
        reportId,
        repository: analysisData.repository,
        htmlContent: htmlReport,
        pdfBuffer,
        charts,
        executiveSummary,
        recommendations,
        metadata: {
          generatedAt: new Date().toISOString(),
          generationTime: Date.now() - startTime,
          version: '1.0',
          options
        }
      };

      // Cache the report (without PDF buffer to save memory)
      this.cacheReport(reportId, {
        ...report,
        pdfBuffer: null // Don't cache large binary data
      });

      console.log(`Tech Health Appendix generated successfully in ${Date.now() - startTime}ms`);
      return report;

    } catch (error) {
      console.error(`Error generating Tech Health Appendix:`, error);
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Generates all required charts for the report
   */
  async generateAllCharts(analysisData) {
    const charts = {};

    try {
      // Tech Health Score Chart (Gauge/Radar)
      charts.techHealthScore = await this.chartGenerator.generateTechHealthScoreChart(
        analysisData.techHealthScore
      );

      // Code Quality Metrics
      if (analysisData.analysis.codeQuality) {
        charts.codeQualityOverview = await this.chartGenerator.generateCodeQualityChart(
          this.summarizeCodeQuality(analysisData.analysis.codeQuality)
        );
        
        // Add detailed breakdown chart
        charts.codeQualityBreakdown = await this.chartGenerator.generateCodeQualityBreakdownChart(
          this.summarizeCodeQuality(analysisData.analysis.codeQuality)
        );
        
        charts.complexityDistribution = await this.chartGenerator.generateComplexityChart(
          analysisData.analysis.codeQuality.complexity
        );

        charts.securityIssues = await this.chartGenerator.generateSecurityChart(
          analysisData.analysis.codeQuality.security
        );
      }

      // DORA Metrics
      if (analysisData.analysis.dora) {
        charts.doraMetrics = await this.chartGenerator.generateDORAMetricsChart(
          analysisData.analysis.dora
        );

        charts.deploymentFrequency = await this.chartGenerator.generateDeploymentFrequencyChart(
          analysisData.analysis.dora.deploymentFrequency
        );

        charts.leadTime = await this.chartGenerator.generateLeadTimeChart(
          analysisData.analysis.dora.leadTimeForChanges
        );
      }

      // Benchmarking Results
      if (analysisData.analysis.benchmarking) {
        charts.industryComparison = await this.chartGenerator.generateBenchmarkingChart(
          analysisData.analysis.benchmarking
        );

        charts.peerComparison = await this.chartGenerator.generatePeerComparisonChart(
          analysisData.analysis.benchmarking.peerComparison
        );
      }

      // Repository Health Overview
      if (analysisData.analysis.repository) {
        charts.repositoryHealth = await this.chartGenerator.generateRepositoryHealthChart(
          analysisData.analysis.repository
        );

        // Transform language data from array to object format for chart generator
        const languageData = {};
        if (analysisData.analysis.repository.languages && Array.isArray(analysisData.analysis.repository.languages)) {
          analysisData.analysis.repository.languages.forEach(lang => {
            languageData[lang.language] = parseFloat(lang.percentage) || 0;
          });
        } else if (analysisData.analysis.repository.code_quality?.languages && Array.isArray(analysisData.analysis.repository.code_quality.languages)) {
          // Alternative path for languages in code_quality section
          analysisData.analysis.repository.code_quality.languages.forEach(lang => {
            languageData[lang.language] = parseFloat(lang.percentage) || 0;
          });
        }

        charts.languageDistribution = await this.chartGenerator.generateLanguageChart(languageData);
      }

      console.log(`Generated ${Object.keys(charts).length} charts successfully`);
      return charts;

    } catch (error) {
      console.error('Error generating charts:', error);
      // Return partial charts on error
      return charts;
    }
  }

  /**
   * Prepares data for template rendering
   */
  async prepareTemplateData(analysisData, charts) {
    return {
      // Repository Information
      repository: {
        name: analysisData.repository.fullName,
        owner: analysisData.repository.owner,
        repo: analysisData.repository.repo,
        description: analysisData.repository.description || 'No description available',
        url: `https://github.com/${analysisData.repository.fullName}`,
        stars: analysisData.analysis.repository?.stargazers_count || 0,
        forks: analysisData.analysis.repository?.forks_count || 0,
        language: analysisData.analysis.repository?.language || 'Not specified'
      },

      // Tech Health Score
      techHealthScore: {
        overall: analysisData.techHealthScore.overall,
        grade: analysisData.techHealthScore.grade,
        breakdown: analysisData.techHealthScore.breakdown,
        interpretation: this.interpretTechHealthScore(analysisData.techHealthScore)
      },

      // Code Quality Summary
      codeQuality: this.summarizeCodeQuality(analysisData.analysis.codeQuality),

      // DORA Metrics Summary
      doraMetrics: this.summarizeDORAMetrics(analysisData.analysis.dora),

      // Benchmarking Summary
      benchmarking: this.summarizeBenchmarking(analysisData.analysis.benchmarking),

      // Key Insights
      insights: analysisData.insights || [],

      // Charts (base64 encoded images)
      charts,

      // Analysis Metadata
      analysisMetadata: analysisData.metadata
    };
  }

  /**
   * Generates executive summary content
   */
  generateExecutiveSummary(analysisData) {
    const techHealthScore = analysisData.techHealthScore;
    const insights = analysisData.insights || [];
    
    // Generate enhanced insights
    const enhancedInsights = this.generateEnhancedInsights(analysisData);

    return {
      overallAssessment: this.generateOverallAssessment(analysisData),
      keyStrengths: this.identifyKeyStrengths(analysisData),
      criticalRisks: this.identifyCriticalRisks(analysisData),
      investmentReadiness: this.assessInvestmentReadiness(analysisData),
      quickWins: this.identifyQuickWins(analysisData),
      summary: this.generateDetailedSummary(analysisData),
      technicalMetrics: this.extractTechnicalMetrics(analysisData),
      languageProfile: this.generateLanguageProfile(analysisData),
      enhancedInsights: enhancedInsights
    };
  }

  /**
   * Interprets tech health score for human reading
   */
  interpretTechHealthScore(techHealthScore) {
    const score = techHealthScore.overall;
    const grade = techHealthScore.grade;

    if (score >= 90) {
      return {
        level: 'Exceptional',
        description: 'Outstanding technical foundation with industry-leading practices',
        investorConfidence: 'Very High'
      };
    } else if (score >= 80) {
      return {
        level: 'Excellent',
        description: 'Strong technical practices with minor optimization opportunities',
        investorConfidence: 'High'
      };
    } else if (score >= 70) {
      return {
        level: 'Good',
        description: 'Solid foundation with clear improvement opportunities',
        investorConfidence: 'Moderate to High'
      };
    } else if (score >= 60) {
      return {
        level: 'Fair',
        description: 'Adequate foundation requiring focused improvements',
        investorConfidence: 'Moderate'
      };
    } else {
      return {
        level: 'Needs Improvement',
        description: 'Significant technical attention required before scaling',
        investorConfidence: 'Low to Moderate'
      };
    }
  }

  /**
   * Summarizes code quality metrics with enhanced calculation
   */
  summarizeCodeQuality(codeQuality) {
    if (!codeQuality) return null;

    // Enhanced code quality calculation with more comprehensive metrics
    const enhancedQuality = this.calculateEnhancedCodeQuality(codeQuality);

    return {
      overall: {
        score: enhancedQuality.overallScore,
        grade: enhancedQuality.grade,
        breakdown: enhancedQuality.breakdown
      },
      complexity: {
        average: codeQuality.complexity?.averageComplexity || 0,
        score: enhancedQuality.breakdown.complexity,
        highComplexityFiles: codeQuality.complexity?.highComplexityFiles?.length || 0,
        distribution: this.getComplexityDistribution(codeQuality.complexity)
      },
      security: {
        score: enhancedQuality.breakdown.security,
        issuesFound: codeQuality.security?.vulnerabilities?.length || 0,
        riskLevel: codeQuality.security?.riskLevel || 'Unknown',
        severityBreakdown: codeQuality.security?.severityBreakdown || {}
      },
      maintainability: {
        score: enhancedQuality.breakdown.maintainability,
        index: codeQuality.maintainability?.maintainabilityIndex || 0,
        documentationScore: codeQuality.maintainability?.documentationScore || 0,
        codeChurn: codeQuality.maintainability?.codeChurn || 0
      },
      dependencies: {
        score: enhancedQuality.breakdown.dependencies,
        healthScore: codeQuality.dependencies?.healthScore || 0,
        outdatedCount: codeQuality.dependencies?.outdatedPackages?.length || 0,
        vulnerabilityCount: codeQuality.dependencies?.vulnerabilities?.length || 0,
        totalCount: Object.keys(codeQuality.dependencies?.allDependencies || {}).length
      },
      testing: {
        score: enhancedQuality.breakdown.testing,
        coverage: codeQuality.testCoverage || 0,
        hasFramework: this.hasTestingInfrastructure({ analysis: { codeQuality } }),
        testFiles: this.countTestFiles(codeQuality)
      },
      codeStyle: {
        score: enhancedQuality.breakdown.codeStyle,
        lintingIssues: codeQuality.linting?.totalIssues || 0,
        styleConsistency: this.calculateStyleConsistency(codeQuality)
      }
    };
  }

  /**
   * Enhanced code quality calculation with comprehensive scoring
   */
  calculateEnhancedCodeQuality(codeQuality) {
    const weights = {
      complexity: 0.20,      // Code complexity and structure
      security: 0.25,        // Security vulnerabilities and practices
      maintainability: 0.15, // Documentation and maintenance metrics
      dependencies: 0.15,    // Dependency health and management
      testing: 0.15,         // Test coverage and infrastructure
      codeStyle: 0.10        // Linting and code style consistency
    };

    const breakdown = {
      complexity: this.calculateComplexityScore(codeQuality.complexity),
      security: this.calculateSecurityScore(codeQuality.security),
      maintainability: this.calculateMaintainabilityScore(codeQuality.maintainability),
      dependencies: this.calculateDependencyScore(codeQuality.dependencies),
      testing: this.calculateTestingScore(codeQuality),
      codeStyle: this.calculateCodeStyleScore(codeQuality.linting)
    };

    const overallScore = Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (breakdown[key] * weight);
    }, 0);

    return {
      overallScore: Math.round(overallScore),
      grade: this.scoreToGrade(overallScore),
      breakdown,
      weights
    };
  }

  /**
   * Calculate complexity score
   */
  calculateComplexityScore(complexity) {
    if (!complexity) return 50;

    const avgComplexity = complexity.averageComplexity || 0;
    const highComplexityFiles = complexity.highComplexityFiles?.length || 0;
    const totalFiles = complexity.totalFiles || 1;

    let score = 100;

    // Penalize high average complexity
    if (avgComplexity > 20) score -= 40;
    else if (avgComplexity > 15) score -= 30;
    else if (avgComplexity > 10) score -= 20;
    else if (avgComplexity > 8) score -= 10;

    // Penalize high percentage of complex files
    const complexityRatio = highComplexityFiles / totalFiles;
    if (complexityRatio > 0.3) score -= 20;
    else if (complexityRatio > 0.2) score -= 15;
    else if (complexityRatio > 0.1) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Calculate security score (enhanced)
   */
  calculateSecurityScore(security) {
    if (!security) return 70;

    const vulnerabilities = security.vulnerabilities || [];
    const severityBreakdown = security.severityBreakdown || {};

    let score = 100;

    // Penalize vulnerabilities by severity
    score -= (severityBreakdown.critical || 0) * 20;
    score -= (severityBreakdown.high || 0) * 15;
    score -= (severityBreakdown.medium || 0) * 8;
    score -= (severityBreakdown.low || 0) * 3;

    // Bonus for having security practices
    if (vulnerabilities.length === 0) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate maintainability score (enhanced)
   */
  calculateMaintainabilityScore(maintainability) {
    if (!maintainability) return 50;

    let score = 50; // Base score

    // Documentation score
    const docScore = maintainability.documentationScore || 0;
    score += (docScore / 100) * 25;

    // Recent activity bonus
    const recentActivity = maintainability.recentActivity || 0;
    if (recentActivity > 20) score += 15;
    else if (recentActivity > 10) score += 10;
    else if (recentActivity > 5) score += 5;

    // Code churn penalty
    const codeChurn = maintainability.codeChurn || 0;
    if (codeChurn > 0.5) score -= 10;
    else if (codeChurn > 0.3) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate dependency score (enhanced)
   */
  calculateDependencyScore(dependencies) {
    if (!dependencies) return 50;

    const outdatedCount = dependencies.outdatedPackages?.length || 0;
    const vulnerabilityCount = dependencies.vulnerabilities?.length || 0;
    const totalCount = Object.keys(dependencies.allDependencies || {}).length;

    let score = 100;

    // Penalize outdated dependencies
    if (totalCount > 0) {
      const outdatedRatio = outdatedCount / totalCount;
      if (outdatedRatio > 0.5) score -= 30;
      else if (outdatedRatio > 0.3) score -= 20;
      else if (outdatedRatio > 0.2) score -= 15;
      else if (outdatedRatio > 0.1) score -= 10;
    }

    // Penalize dependency vulnerabilities
    score -= vulnerabilityCount * 8;

    // Penalize too many dependencies
    if (totalCount > 100) score -= 10;
    else if (totalCount > 50) score -= 5;

    return Math.max(0, score);
  }

  /**
   * Calculate testing score (new)
   */
  calculateTestingScore(codeQuality) {
    let score = 0;

    // Test coverage
    const coverage = codeQuality.testCoverage || 0;
    score += coverage * 0.6; // Up to 60 points for coverage

    // Testing infrastructure
    if (this.hasTestingInfrastructure({ analysis: { codeQuality } })) {
      score += 25;
    }

    // Test file count
    const testFileCount = this.countTestFiles(codeQuality);
    if (testFileCount > 10) score += 15;
    else if (testFileCount > 5) score += 10;
    else if (testFileCount > 0) score += 5;

    return Math.min(100, score);
  }

  /**
   * Calculate code style score (new)
   */
  calculateCodeStyleScore(linting) {
    if (!linting) return 70;

    let score = 100;

    const totalIssues = linting.totalIssues || 0;
    const errorCount = linting.errorCount || 0;
    const warningCount = linting.warningCount || 0;

    // Penalize linting issues
    score -= errorCount * 3;
    score -= warningCount * 1;

    // Bonus for zero issues
    if (totalIssues === 0) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Helper methods for enhanced calculations
   */
  getComplexityDistribution(complexity) {
    if (!complexity || !complexity.functionMetrics) return {};

    const distribution = { low: 0, medium: 0, high: 0, veryHigh: 0 };
    complexity.functionMetrics.forEach(func => {
      const comp = func.complexity || 0;
      if (comp <= 5) distribution.low++;
      else if (comp <= 10) distribution.medium++;
      else if (comp <= 20) distribution.high++;
      else distribution.veryHigh++;
    });

    return distribution;
  }

  countTestFiles(codeQuality) {
    if (!codeQuality.fileStructure) return 0;
    return codeQuality.fileStructure.filter(file => 
      file.includes('test') || file.includes('spec') || file.includes('__tests__')
    ).length;
  }

  calculateStyleConsistency(codeQuality) {
    const linting = codeQuality.linting;
    if (!linting || !linting.totalIssues) return 100;

    const totalFiles = linting.filesWithIssues || 1;
    const issuesPerFile = linting.totalIssues / totalFiles;

    if (issuesPerFile <= 1) return 95;
    if (issuesPerFile <= 3) return 80;
    if (issuesPerFile <= 5) return 60;
    if (issuesPerFile <= 10) return 40;
    return 20;
  }

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
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Summarizes DORA metrics
   */
  summarizeDORAMetrics(doraMetrics) {
    if (!doraMetrics) return null;

    return {
      overall: doraMetrics.overall || {},
      deploymentFrequency: {
        value: doraMetrics.deploymentFrequency?.frequency || 0,
        classification: doraMetrics.deploymentFrequency?.classification || 'Unknown'
      },
      leadTime: {
        average: doraMetrics.leadTimeForChanges?.averageLeadTime || 0,
        classification: doraMetrics.leadTimeForChanges?.classification || 'Unknown'
      },
      changeFailureRate: {
        rate: doraMetrics.changeFailureRate?.rate || 0,
        classification: doraMetrics.changeFailureRate?.classification || 'Unknown'
      },
      recoveryTime: {
        average: doraMetrics.meanTimeToRecovery?.averageRecoveryTime || 0,
        classification: doraMetrics.meanTimeToRecovery?.classification || 'Unknown'
      }
    };
  }

  /**
   * Summarizes benchmarking results
   */
  summarizeBenchmarking(benchmarking) {
    if (!benchmarking) return null;

    return {
      overall: benchmarking.overall || {},
      industryPosition: benchmarking.industryComparison?.position || 'Unknown',
      peerRanking: benchmarking.peerComparison?.percentile || 0,
      strengths: benchmarking.strengths || [],
      improvements: benchmarking.improvements || []
    };
  }

  /**
   * Identifies key strengths from analysis
   */
  identifyKeyStrengths(analysisData) {
    const strengths = [];

    // High tech health score
    if (analysisData.techHealthScore.overall >= 80) {
      strengths.push('Strong overall technical foundation with excellent tech health score');
    }

    // Good code quality
    if (analysisData.analysis.codeQuality?.overall?.score >= 80) {
      strengths.push('High code quality standards with comprehensive static analysis');
    }

    // Effective DORA metrics
    if (analysisData.analysis.dora?.overall?.score >= 80) {
      strengths.push('Efficient development and deployment practices following DORA metrics');
    }

    // Above-average benchmarking
    if (analysisData.analysis.benchmarking?.peerComparison?.percentile >= 75) {
      strengths.push('Above-average performance compared to industry peers');
    }

    // Unit Testing Excellence
    const codeQuality = analysisData.analysis.codeQuality;
    if (codeQuality?.testCoverage >= 70 || this.hasTestingInfrastructure(analysisData)) {
      strengths.push('Comprehensive unit testing infrastructure with good test coverage');
    }

    // Security Best Practices
    const securityVulns = codeQuality?.security?.vulnerabilities?.length || 0;
    if (securityVulns === 0) {
      strengths.push('Excellent security posture with no identified vulnerabilities');
    } else if (securityVulns <= 2) {
      strengths.push('Strong security practices with minimal security risks');
    }

    // Clean Architecture & Low Complexity
    const avgComplexity = codeQuality?.complexity?.averageComplexity || 0;
    if (avgComplexity > 0 && avgComplexity <= 8) {
      strengths.push('Well-structured codebase with low complexity and high maintainability');
    }

    // Modern Dependency Management
    const outdatedDeps = codeQuality?.dependencies?.outdatedPackages?.length || 0;
    if (outdatedDeps <= 3) {
      strengths.push('Modern dependency management with up-to-date packages');
    }

    // Active Development & Documentation
    const repoStats = analysisData.analysis.repository;
    if (repoStats?.activity?.commits_last_30_days > 10) {
      strengths.push('Active development with consistent commit activity');
    }

    // Documentation Quality
    const docScore = codeQuality?.maintainability?.documentationScore || 0;
    if (docScore >= 70) {
      strengths.push('Comprehensive documentation supporting maintainability');
    }

    // DevOps Maturity
    const dora = analysisData.analysis.dora;
    if (dora?.metrics?.deploymentFrequency?.deploymentsPerDay > 0.14) {
      strengths.push('Mature DevOps practices with frequent, reliable deployments');
    }

    // Scalability Readiness
    if (this.assessScalabilityReadiness(analysisData)) {
      strengths.push('Architecture designed for scalability and growth');
    }

    // Performance Optimization
    if (codeQuality?.complexity?.performanceScore >= 75) {
      strengths.push('Optimized codebase with focus on performance');
    }

    // Return top 8 strengths to provide comprehensive view
    return strengths.slice(0, 8);
  }

  /**
   * Helper method to detect testing infrastructure
   */
  hasTestingInfrastructure(analysisData) {
    // Check for common testing files and dependencies
    const dependencies = analysisData.analysis.codeQuality?.dependencies?.allDependencies || {};
    const devDependencies = analysisData.analysis.codeQuality?.dependencies?.devDependencies || {};
    
    // Look for testing frameworks
    const testingFrameworks = ['jest', 'mocha', 'chai', 'jasmine', 'vitest', 'cypress', 'playwright', 'testing-library'];
    const hasTestFramework = testingFrameworks.some(framework => 
      dependencies[framework] || devDependencies[framework] || 
      Object.keys({...dependencies, ...devDependencies}).some(dep => dep.includes(framework))
    );

    // Check for test files in file structure (if available)
    const hasTestFiles = analysisData.analysis.codeQuality?.fileStructure?.some(file => 
      file.includes('test') || file.includes('spec') || file.includes('__tests__')
    ) || false;

    return hasTestFramework || hasTestFiles;
  }

  /**
   * Helper method to assess scalability readiness
   */
  assessScalabilityReadiness(analysisData) {
    const dora = analysisData.analysis.dora;
    const codeQuality = analysisData.analysis.codeQuality;
    
    let scalabilityScore = 0;
    
    // Good DORA metrics indicate scalable practices
    if (dora?.metrics?.deploymentFrequency?.deploymentsPerDay > 0.1) scalabilityScore += 25;
    if (dora?.metrics?.leadTime?.leadTimeInHours < 24) scalabilityScore += 25;
    if (dora?.metrics?.changeFailureRate?.changeFailureRate < 15) scalabilityScore += 25;
    
    // Low complexity supports scalability
    if (codeQuality?.complexity?.averageComplexity < 10) scalabilityScore += 25;
    
    return scalabilityScore >= 50;
  }

  /**
   * Identifies critical risks from analysis
   */
  identifyCriticalRisks(analysisData) {
    const risks = [];

    // Low tech health score
    if (analysisData.techHealthScore.overall < 60) {
      risks.push('Below-average technical foundation requires attention');
    }

    // Security vulnerabilities
    const securityIssues = analysisData.analysis.codeQuality?.security?.vulnerabilities?.length || 0;
    if (securityIssues > 5) {
      risks.push(`${securityIssues} security vulnerabilities identified`);
    }

    // High complexity
    const highComplexityFiles = analysisData.analysis.codeQuality?.complexity?.highComplexityFiles?.length || 0;
    if (highComplexityFiles > 10) {
      risks.push('High code complexity may impact maintainability');
    }

    // Poor DORA metrics
    if (analysisData.analysis.dora?.overall?.score < 50) {
      risks.push('Development velocity and practices need improvement');
    }

    return risks.slice(0, 5); // Top 5 risks
  }

  /**
   * Assesses investment readiness
   */
  assessInvestmentReadiness(analysisData) {
    const score = analysisData.techHealthScore.overall;
    
    if (score >= 85) {
      return {
        level: 'High',
        description: 'Technical foundation is investor-ready with minimal risk',
        recommendation: 'Proceed with confidence'
      };
    } else if (score >= 70) {
      return {
        level: 'Moderate to High',
        description: 'Solid foundation with manageable improvement areas',
        recommendation: 'Address identified issues during due diligence'
      };
    } else if (score >= 60) {
      return {
        level: 'Moderate',
        description: 'Foundation adequate but requires focused improvements',
        recommendation: 'Develop improvement plan before proceeding'
      };
    } else {
      return {
        level: 'Low to Moderate',
        description: 'Significant technical improvements needed',
        recommendation: 'Address critical issues before seeking investment'
      };
    }
  }

  /**
   * Identifies quick wins for improvement
   */
  identifyQuickWins(analysisData) {
    const quickWins = [];

    // Based on analysis recommendations - fix: access recommendations.items array
    if (analysisData.recommendations && analysisData.recommendations.items && Array.isArray(analysisData.recommendations.items)) {
      quickWins.push(...analysisData.recommendations.items
        .filter(rec => (rec.priority === 'High' || rec.priority === 'high') && (rec.effort === 'Low' || rec.effort === 'low'))
        .slice(0, 3)
        .map(rec => rec.title)
      );
    }

    // Default quick wins if none found
    if (quickWins.length === 0) {
      quickWins.push(
        'Update outdated dependencies',
        'Add comprehensive documentation',
        'Implement basic security scanning'
      );
    }

    return quickWins;
  }

  /**
   * Generates overall assessment summary
   */
  generateOverallAssessment(analysisData) {
    const score = analysisData.techHealthScore.overall;
    const grade = analysisData.techHealthScore.grade;
    
    // Build context about key strengths for the assessment
    let strengthsContext = '';
    const codeQuality = analysisData.analysis.codeQuality;
    const dora = analysisData.analysis.dora;
    
    // Specific mentions of key factors that improve the score
    const keyFactors = [];
    
    // Unit testing assessment
    if (codeQuality?.testCoverage >= 70 || this.hasTestingInfrastructure(analysisData)) {
      keyFactors.push('comprehensive unit testing infrastructure');
    }
    
    // Security posture
    const securityVulns = codeQuality?.security?.vulnerabilities?.length || 0;
    if (securityVulns <= 2) {
      keyFactors.push('strong security practices');
    }
    
    // Code quality factors
    const avgComplexity = codeQuality?.complexity?.averageComplexity || 0;
    if (avgComplexity > 0 && avgComplexity <= 10) {
      keyFactors.push('well-structured, maintainable code');
    }
    
    // DevOps maturity
    if (dora?.metrics?.deploymentFrequency?.deploymentsPerDay > 0.14) {
      keyFactors.push('mature DevOps practices');
    }
    
    // Documentation and maintenance
    const docScore = codeQuality?.maintainability?.documentationScore || 0;
    if (docScore >= 70) {
      keyFactors.push('comprehensive documentation');
    }
    
    // Modern dependency management
    const outdatedDeps = codeQuality?.dependencies?.outdatedPackages?.length || 0;
    if (outdatedDeps <= 3) {
      keyFactors.push('modern dependency management');
    }
    
    // Build strengths context string
    if (keyFactors.length > 0) {
      if (keyFactors.length === 1) {
        strengthsContext = ` Key strengths include ${keyFactors[0]}.`;
      } else if (keyFactors.length === 2) {
        strengthsContext = ` Key strengths include ${keyFactors[0]} and ${keyFactors[1]}.`;
      } else {
        const lastFactor = keyFactors.pop();
        strengthsContext = ` Key strengths include ${keyFactors.join(', ')}, and ${lastFactor}.`;
      }
    }
    
    return `This repository demonstrates a ${grade} level technical foundation with an overall tech health score of ${score}/100. ${this.interpretTechHealthScore(analysisData.techHealthScore).description}${strengthsContext}`;
  }

  /**
   * Generates enhanced insights about the repository
   */
  generateEnhancedInsights(analysisData) {
    const insights = [];
    
    // Repository size and complexity insights
    const repoStats = analysisData.analysis.repository;
    if (repoStats) {
      insights.push({
        category: 'Repository Scale',
        insight: `Repository contains ${repoStats.size || 0} KB of code with ${repoStats.activity?.contributors_count || 0} contributors`,
        type: 'info'
      });
      
      if (repoStats.activity?.commits_last_30_days) {
        const commits = repoStats.activity.commits_last_30_days;
        insights.push({
          category: 'Development Activity',
          insight: `${commits} commits in the last 30 days indicating ${commits > 50 ? 'high' : commits > 20 ? 'moderate' : 'low'} development activity`,
          type: commits > 50 ? 'positive' : commits < 5 ? 'concern' : 'info'
        });
      }
    }
    
    // Language diversity insights
    const languages = this.getLanguageData(analysisData);
    if (languages && Object.keys(languages).length > 0) {
      const languageCount = Object.keys(languages).length;
      const primaryLanguage = Object.entries(languages).sort(([,a], [,b]) => b - a)[0]?.[0];
      
      insights.push({
        category: 'Technology Stack',
        insight: `Uses ${languageCount} programming languages with ${primaryLanguage} as the primary language (${languages[primaryLanguage]?.toFixed(1)}%)`,
        type: 'info'
      });
    }
    
    // Code quality insights
    const codeQuality = analysisData.analysis.codeQuality;
    if (codeQuality) {
      if (codeQuality.complexity?.averageComplexity) {
        const complexity = codeQuality.complexity.averageComplexity;
        insights.push({
          category: 'Code Quality',
          insight: `Average code complexity is ${complexity.toFixed(1)} ${complexity > 15 ? '(high - needs attention)' : complexity > 10 ? '(moderate)' : '(low - good)'}`,
          type: complexity > 15 ? 'concern' : complexity > 10 ? 'warning' : 'positive'
        });
      }
      
      if (codeQuality.complexity?.functionMetrics?.length) {
        const functionCount = codeQuality.complexity.functionMetrics.length;
        insights.push({
          category: 'Code Structure',
          insight: `Analyzed ${functionCount} functions across the codebase`,
          type: 'info'
        });
      }
      
      if (codeQuality.security?.vulnerabilities?.length !== undefined) {
        const vulnCount = codeQuality.security.vulnerabilities.length;
        insights.push({
          category: 'Security',
          insight: vulnCount === 0 ? 'No security vulnerabilities detected' : `${vulnCount} security vulnerabilities identified`,
          type: vulnCount === 0 ? 'positive' : vulnCount > 5 ? 'concern' : 'warning'
        });
      }
    }
    
    // DORA metrics insights
    const dora = analysisData.analysis.dora;
    if (dora?.metrics) {
      if (dora.metrics.deploymentFrequency?.deploymentsPerDay !== undefined) {
        const deployFreq = dora.metrics.deploymentFrequency.deploymentsPerDay;
        insights.push({
          category: 'DevOps Maturity',
          insight: `Deployment frequency: ${deployFreq.toFixed(2)} deployments per day ${deployFreq > 1 ? '(excellent)' : deployFreq > 0.1 ? '(good)' : '(needs improvement)'}`,
          type: deployFreq > 1 ? 'positive' : deployFreq > 0.1 ? 'info' : 'warning'
        });
      }
    }
    
    return insights.slice(0, 8); // Top 8 insights
  }

  /**
   * Generates detailed summary
   */
  generateDetailedSummary(analysisData) {
    const repoName = analysisData.repository.fullName;
    const score = analysisData.techHealthScore.overall;
    const grade = analysisData.techHealthScore.grade;
    
    const languages = this.getLanguageData(analysisData);
    const primaryLanguage = languages ? Object.entries(languages).sort(([,a], [,b]) => b - a)[0]?.[0] : 'Unknown';
    
    const activityLevel = this.getActivityLevel(analysisData);
    const complexityLevel = this.getComplexityLevel(analysisData);
    
    return `${repoName} is a ${primaryLanguage}-based repository with ${activityLevel} development activity and ${complexityLevel} code complexity. The repository achieves a tech health score of ${score}/100 (Grade ${grade}), indicating ${this.interpretTechHealthScore(analysisData.techHealthScore).description.toLowerCase()}.`;
  }

  /**
   * Extracts technical metrics summary
   */
  extractTechnicalMetrics(analysisData) {
    const metrics = {
      codebase: {},
      quality: {},
      activity: {},
      security: {}
    };
    
    // Codebase metrics
    const repoStats = analysisData.analysis.repository;
    if (repoStats) {
      metrics.codebase = {
        size: repoStats.size || 0,
        languages: this.getLanguageData(analysisData),
        primaryLanguage: repoStats.code_quality?.primary_language || repoStats.language || 'Unknown'
      };
    }
    
    // Quality metrics
    const codeQuality = analysisData.analysis.codeQuality;
    if (codeQuality) {
      metrics.quality = {
        overallScore: codeQuality.qualityScore?.overall || 0,
        complexity: codeQuality.complexity?.averageComplexity || 0,
        functionsAnalyzed: codeQuality.complexity?.functionMetrics?.length || 0,
        maintainabilityScore: codeQuality.maintainability?.maintenanceScore || 0
      };
    }
    
    // Activity metrics
    if (repoStats?.activity) {
      metrics.activity = {
        commitsLast30Days: repoStats.activity.commits_last_30_days || 0,
        contributors: repoStats.activity.contributors_count || 0,
        openIssues: repoStats.activity.open_issues_count || 0,
        releases: repoStats.activity.releases_count || 0
      };
    }
    
    // Security metrics
    if (codeQuality?.security) {
      metrics.security = {
        vulnerabilities: codeQuality.security.vulnerabilities?.length || 0,
        securityScore: codeQuality.security.securityScore || 0,
        riskLevel: codeQuality.security.riskLevel || 'Unknown'
      };
    }
    
    return metrics;
  }

  /**
   * Generates language profile
   */
  generateLanguageProfile(analysisData) {
    const languages = this.getLanguageData(analysisData);
    if (!languages || Object.keys(languages).length === 0) {
      return {
        diversity: 'Unknown',
        primary: 'Unknown',
        distribution: {},
        insights: ['No language data available']
      };
    }
    
    const sortedLanguages = Object.entries(languages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5); // Top 5 languages
    
    const primary = sortedLanguages[0];
    const languageCount = Object.keys(languages).length;
    
    const insights = [];
    
    if (languageCount === 1) {
      insights.push('Single-language codebase');
    } else if (languageCount <= 3) {
      insights.push('Focused technology stack');
    } else if (languageCount <= 6) {
      insights.push('Moderate language diversity');
    } else {
      insights.push('High language diversity');
    }
    
    if (primary && primary[1] > 80) {
      insights.push(`Heavily ${primary[0]}-focused (${primary[1].toFixed(1)}%)`);
    } else if (primary && primary[1] > 60) {
      insights.push(`Primarily ${primary[0]} with supporting technologies`);
    } else {
      insights.push('Balanced multi-language approach');
    }
    
    return {
      diversity: languageCount > 5 ? 'High' : languageCount > 2 ? 'Moderate' : 'Low',
      primary: primary ? primary[0] : 'Unknown',
      distribution: Object.fromEntries(sortedLanguages),
      insights
    };
  }

  /**
   * Helper method to get language data from various sources
   */
  getLanguageData(analysisData) {
    // Try different sources for language data
    if (analysisData.analysis.repository?.languages && Array.isArray(analysisData.analysis.repository.languages)) {
      const languageData = {};
      analysisData.analysis.repository.languages.forEach(lang => {
        languageData[lang.language] = parseFloat(lang.percentage) || 0;
      });
      return languageData;
    }
    
    if (analysisData.analysis.repository?.code_quality?.languages && Array.isArray(analysisData.analysis.repository.code_quality.languages)) {
      const languageData = {};
      analysisData.analysis.repository.code_quality.languages.forEach(lang => {
        languageData[lang.language] = parseFloat(lang.percentage) || 0;
      });
      return languageData;
    }
    
    return null;
  }

  /**
   * Helper method to determine activity level
   */
  getActivityLevel(analysisData) {
    const commits = analysisData.analysis.repository?.activity?.commits_last_30_days || 0;
    if (commits > 50) return 'high';
    if (commits > 20) return 'moderate';
    if (commits > 5) return 'low';
    return 'minimal';
  }

  /**
   * Helper method to determine complexity level
   */
  getComplexityLevel(analysisData) {
    const complexity = analysisData.analysis.codeQuality?.complexity?.averageComplexity || 0;
    if (complexity > 20) return 'very high';
    if (complexity > 15) return 'high';
    if (complexity > 10) return 'moderate';
    if (complexity > 5) return 'low';
    return 'very low';
  }

  /**
   * Caches generated report
   */
  cacheReport(reportId, report) {
    this.reportCache.set(reportId, {
      ...report,
      cachedAt: Date.now()
    });

    // Clean old cache entries (keep last 10)
    if (this.reportCache.size > 10) {
      const oldestKey = this.reportCache.keys().next().value;
      this.reportCache.delete(oldestKey);
    }
  }

  /**
   * Retrieves cached report
   */
  getCachedReport(reportId) {
    return this.reportCache.get(reportId);
  }

  /**
   * Clears report cache
   */
  clearCache() {
    this.reportCache.clear();
  }
}

module.exports = ReportGenerator; 