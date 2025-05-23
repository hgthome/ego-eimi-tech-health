const express = require('express');
const ReportGenerator = require('./report-generator');
const analysisOrchestrator = require('../analysis/analysis-orchestrator');
const githubService = require('../github/github-service');
const { requireAuth } = require('../auth/validators');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
const reportGenerator = new ReportGenerator();

/**
 * GET /api/reports/generate/:owner/:repo
 * Generates a complete Tech Health Appendix report
 */
router.get('/generate/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const accessToken = req.session.user.accessToken;
    
    const options = {
      format: req.query.format || 'html', // html, pdf, both
      forceRefresh: req.query.refresh === 'true',
      includeCharts: req.query.charts !== 'false',
      timeRange: parseInt(req.query.timeRange) || 90
    };

    console.log(`Generating Tech Health Appendix for ${owner}/${repo}`);
    
    // Set authenticated client for analysis
    githubService.setAuthenticatedClient(accessToken);
    
    // Step 1: Get comprehensive analysis
    const analysisResults = await analysisOrchestrator.performComprehensiveAnalysis(
      accessToken, 
      owner, 
      repo, 
      { 
        forceRefresh: options.forceRefresh,
        timeRange: options.timeRange 
      }
    );

    // Step 2: Generate report
    const report = await reportGenerator.generateTechHealthAppendix(analysisResults, options);

    // Step 3: Return appropriate format
    if (options.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="tech-health-appendix-${repo}.pdf"`);
      res.send(report.pdfBuffer);
    } else if (options.format === 'both') {
      res.json({
        success: true,
        data: {
          reportId: report.reportId,
          htmlContent: report.htmlContent,
          pdfBase64: report.pdfBuffer.toString('base64'),
          metadata: report.metadata,
          charts: Object.keys(report.charts),
          recommendations: report.recommendations.length
        }
      });
    } else {
      // Default: HTML
      res.json({
        success: true,
        data: {
          reportId: report.reportId,
          htmlContent: report.htmlContent,
          metadata: report.metadata,
          executiveSummary: report.executiveSummary,
          charts: Object.keys(report.charts),
          recommendations: report.recommendations.length
        }
      });
    }

  } catch (error) {
    console.error('Error generating Tech Health Appendix:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    githubService.clearAuthenticatedClient();
  }
});

/**
 * GET /api/reports/streaming/:owner/:repo
 * Generates report with real-time progress updates via Server-Sent Events
 */
router.get('/streaming/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const accessToken = req.session.user.accessToken;
    
    // Setup Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const options = {
      timeRange: parseInt(req.query.timeRange) || 90,
      format: req.query.format || 'html'
    };

    console.log(`Starting streaming report generation for ${owner}/${repo}`);
    
    // Set authenticated client
    githubService.setAuthenticatedClient(accessToken);

    let analysisResults = null;

    // Progress callback for analysis
    const analysisProgressCallback = (progress) => {
      res.write(`data: ${JSON.stringify({
        stage: 'analysis',
        ...progress
      })}\n\n`);
    };

    // Progress callback for report generation
    const reportProgressCallback = (progress) => {
      res.write(`data: ${JSON.stringify({
        stage: 'report',
        ...progress
      })}\n\n`);
    };

    try {
      // Step 1: Streaming analysis
      res.write(`data: ${JSON.stringify({
        stage: 'analysis',
        step: 0,
        totalSteps: 6,
        percentage: 0,
        description: 'Starting comprehensive analysis...'
      })}\n\n`);

      analysisResults = await analysisOrchestrator.performStreamingAnalysis(
        accessToken,
        owner,
        repo,
        analysisProgressCallback,
        options
      );

      // Step 2: Report generation
      res.write(`data: ${JSON.stringify({
        stage: 'report',
        step: 0,
        totalSteps: 5,
        percentage: 0,
        description: 'Starting report generation...'
      })}\n\n`);

      // Generate report (this could be enhanced to support streaming too)
      const report = await reportGenerator.generateTechHealthAppendix(analysisResults, {
        ...options,
        progressCallback: reportProgressCallback
      });

      // Send final results
      res.write(`data: ${JSON.stringify({ 
        stage: 'complete',
        complete: true,
        reportId: report.reportId,
        metadata: report.metadata,
        downloadUrl: `/api/reports/${report.reportId}/download`,
        previewUrl: `/api/reports/${report.reportId}/preview`
      })}\n\n`);
      
    } catch (streamingError) {
      res.write(`data: ${JSON.stringify({ 
        stage: 'error',
        error: true, 
        message: streamingError.message 
      })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Error in streaming report generation:', error);
    res.write(`data: ${JSON.stringify({ 
      stage: 'error',
      error: true, 
      message: error.message 
    })}\n\n`);
    res.end();
  } finally {
    githubService.clearAuthenticatedClient();
  }
});

/**
 * GET /api/reports/:reportId/preview
 * Returns HTML preview of a generated report
 */
router.get('/:reportId/preview', requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const cachedReport = reportGenerator.getCachedReport(reportId);
    if (!cachedReport) {
      return res.status(404).json({
        success: false,
        error: 'Report not found or expired'
      });
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(cachedReport.htmlContent);

  } catch (error) {
    console.error('Error serving report preview:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/:reportId/download
 * Downloads PDF version of a generated report
 */
router.get('/:reportId/download', requireAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const format = req.query.format || 'pdf';
    
    const cachedReport = reportGenerator.getCachedReport(reportId);
    if (!cachedReport) {
      return res.status(404).json({
        success: false,
        error: 'Report not found or expired'
      });
    }

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="tech-health-appendix-${reportId}.html"`);
      res.send(cachedReport.htmlContent);
    } else {
      // Regenerate PDF if not cached (since we don't cache large binary data)
      const pdfBuffer = await reportGenerator.pdfGenerator.generatePDF(
        cachedReport.htmlContent,
        {
          repository: cachedReport.repository
        }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="tech-health-appendix-${cachedReport.repository.repo || reportId}.pdf"`);
      res.send(pdfBuffer);
    }

  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/batch
 * Generates reports for multiple repositories
 */
router.post('/batch', requireAuth, async (req, res) => {
  try {
    const { repositories, options = {} } = req.body;
    const accessToken = req.session.user.accessToken;

    if (!Array.isArray(repositories) || repositories.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'repositories array is required'
      });
    }

    if (repositories.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 repositories allowed per batch'
      });
    }

    console.log(`Starting batch report generation for ${repositories.length} repositories`);
    
    githubService.setAuthenticatedClient(accessToken);

    const batchResults = [];
    const batchId = Date.now().toString(36);

    for (let i = 0; i < repositories.length; i++) {
      const repo = repositories[i];
      const { owner, repo: repoName } = repo;

      try {
        console.log(`Processing ${i + 1}/${repositories.length}: ${owner}/${repoName}`);

        // Get analysis
        const analysisResults = await analysisOrchestrator.performComprehensiveAnalysis(
          accessToken, 
          owner, 
          repoName, 
          options
        );

        // Generate report
        const report = await reportGenerator.generateTechHealthAppendix(analysisResults, {
          ...options,
          format: 'html' // Generate HTML for batch to save memory
        });

        batchResults.push({
          repository: `${owner}/${repoName}`,
          success: true,
          reportId: report.reportId,
          techHealthScore: report.metadata?.techHealthScore || analysisResults.techHealthScore,
          generatedAt: report.metadata.generatedAt,
          previewUrl: `/api/reports/${report.reportId}/preview`,
          downloadUrl: `/api/reports/${report.reportId}/download`
        });

      } catch (repoError) {
        console.error(`Error processing ${owner}/${repoName}:`, repoError);
        batchResults.push({
          repository: `${owner}/${repoName}`,
          success: false,
          error: repoError.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        batchId,
        totalRepositories: repositories.length,
        successCount: batchResults.filter(r => r.success).length,
        errorCount: batchResults.filter(r => !r.success).length,
        results: batchResults
      }
    });

  } catch (error) {
    console.error('Error in batch report generation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    githubService.clearAuthenticatedClient();
  }
});

/**
 * GET /api/reports/templates
 * Returns available report templates and formats
 */
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const templates = {
      default: {
        name: 'Standard Tech Health Appendix',
        description: 'Comprehensive technical assessment for investor due diligence',
        sections: [
          'Executive Summary',
          'Technical Metrics Dashboard', 
          'Risk Assessment',
          'Optimization Roadmap',
          'Appendices'
        ],
        formats: ['html', 'pdf'],
        estimatedPages: '8-12'
      }
    };

    const formats = {
      html: {
        name: 'HTML Report',
        description: 'Interactive web-based report with embedded charts',
        mimeType: 'text/html',
        features: ['Interactive charts', 'Responsive design', 'Fast loading']
      },
      pdf: {
        name: 'PDF Document',
        description: 'Professional PDF suitable for printing and sharing',
        mimeType: 'application/pdf',
        features: ['Print-ready', 'Consistent formatting', 'Portable']
      }
    };

    res.json({
      success: true,
      data: {
        templates,
        formats,
        chartTypes: [
          'Tech Health Score Gauge',
          'Code Quality Radar',
          'DORA Metrics Performance',
          'Security Analysis',
          'Industry Benchmarking',
          'Language Distribution'
        ]
      }
    });

  } catch (error) {
    console.error('Error getting report templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/status
 * Returns report generation service status
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const cacheStats = reportGenerator.reportCache.size;
    const browserStatus = reportGenerator.pdfGenerator.getBrowserStatus();
    
    res.json({
      success: true,
      data: {
        service: 'operational',
        components: {
          reportGenerator: 'operational',
          chartGenerator: 'operational',
          pdfGenerator: browserStatus.initialized ? 'operational' : 'initializing',
          templateEngine: 'operational',
          recommendationEngine: 'operational'
        },
        statistics: {
          cachedReports: cacheStats,
          browserInitialized: browserStatus.initialized,
          browserConnected: browserStatus.connected
        },
        capabilities: {
          formats: ['html', 'pdf'],
          charts: true,
          streaming: true,
          batch: true,
          maxBatchSize: 10
        }
      }
    });

  } catch (error) {
    console.error('Error getting service status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/reports/cache
 * Clears the report cache
 */
router.delete('/cache', requireAuth, async (req, res) => {
  try {
    const reportsBefore = reportGenerator.reportCache.size;
    reportGenerator.clearCache();
    
    res.json({
      success: true,
      data: {
        message: 'Report cache cleared successfully',
        reportsCleared: reportsBefore
      }
    });

  } catch (error) {
    console.error('Error clearing report cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('Report router error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error in report generation',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router; 