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
          analysisData.analysis.codeQuality
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

        charts.languageDistribution = await this.chartGenerator.generateLanguageChart(
          analysisData.analysis.repository.languages
        );
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

    return {
      overallAssessment: this.generateOverallAssessment(analysisData),
      keyStrengths: this.identifyKeyStrengths(analysisData),
      criticalRisks: this.identifyCriticalRisks(analysisData),
      investmentReadiness: this.assessInvestmentReadiness(analysisData),
      quickWins: this.identifyQuickWins(analysisData),
      summary: analysisData.executiveSummary?.summary || 'Analysis completed successfully'
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
   * Summarizes code quality metrics
   */
  summarizeCodeQuality(codeQuality) {
    if (!codeQuality) return null;

    return {
      overall: codeQuality.overall || {},
      complexity: {
        average: codeQuality.complexity?.averageComplexity || 0,
        highComplexityFiles: codeQuality.complexity?.highComplexityFiles?.length || 0
      },
      security: {
        issuesFound: codeQuality.security?.vulnerabilities?.length || 0,
        riskLevel: codeQuality.security?.riskLevel || 'Unknown'
      },
      maintainability: {
        score: codeQuality.maintainability?.score || 0,
        index: codeQuality.maintainability?.maintainabilityIndex || 0
      }
    };
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
      strengths.push('Strong overall technical foundation');
    }

    // Good code quality
    if (analysisData.analysis.codeQuality?.overall?.score >= 80) {
      strengths.push('High code quality standards');
    }

    // Effective DORA metrics
    if (analysisData.analysis.dora?.overall?.score >= 80) {
      strengths.push('Efficient development and deployment practices');
    }

    // Above-average benchmarking
    if (analysisData.analysis.benchmarking?.peerComparison?.percentile >= 75) {
      strengths.push('Above-average performance compared to peers');
    }

    return strengths.slice(0, 5); // Top 5 strengths
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
    
    return `This repository demonstrates a ${grade} level technical foundation with an overall tech health score of ${score}/100. ${this.interpretTechHealthScore(analysisData.techHealthScore).description}`;
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