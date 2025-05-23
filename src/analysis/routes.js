const express = require('express');
const analysisOrchestrator = require('./analysis-orchestrator');
const githubService = require('../github/github-service');
const { requireAuth } = require('../auth/validators');

const router = express.Router();

/**
 * GET /api/analysis/comprehensive/:owner/:repo
 * Performs comprehensive repository analysis
 */
router.get('/comprehensive/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const accessToken = req.session.accessToken;
    
    const options = {
      forceRefresh: req.query.refresh === 'true',
      cacheTime: parseInt(req.query.cacheTime) || 3600000,
      timeRange: parseInt(req.query.timeRange) || 90
    };

    console.log(`Starting comprehensive analysis for ${owner}/${repo}`);
    
    // Set authenticated client for analysis
    githubService.setAuthenticatedClient(accessToken);
    
    const analysisResults = await analysisOrchestrator.performComprehensiveAnalysis(
      accessToken, 
      owner, 
      repo, 
      options
    );

    res.json({
      success: true,
      data: analysisResults
    });

  } catch (error) {
    console.error('Error in comprehensive analysis:', error);
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
 * GET /api/analysis/streaming/:owner/:repo
 * Performs streaming analysis with progress updates via Server-Sent Events
 */
router.get('/streaming/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const accessToken = req.session.accessToken;
    
    // Setup Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const options = {
      timeRange: parseInt(req.query.timeRange) || 90
    };

    console.log(`Starting streaming analysis for ${owner}/${repo}`);
    
    // Set authenticated client
    githubService.setAuthenticatedClient(accessToken);

    const progressCallback = (progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    };

    try {
      const results = await analysisOrchestrator.performStreamingAnalysis(
        accessToken,
        owner,
        repo,
        progressCallback,
        options
      );

      // Send final results
      res.write(`data: ${JSON.stringify({ 
        complete: true, 
        results 
      })}\n\n`);
      
    } catch (analysisError) {
      res.write(`data: ${JSON.stringify({ 
        error: true, 
        message: analysisError.message 
      })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Error in streaming analysis:', error);
    res.write(`data: ${JSON.stringify({ 
      error: true, 
      message: error.message 
    })}\n\n`);
    res.end();
  } finally {
    githubService.clearAuthenticatedClient();
  }
});

/**
 * GET /api/analysis/code-quality/:owner/:repo
 * Performs code quality analysis only
 */
router.get('/code-quality/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const accessToken = req.session.accessToken;

    console.log(`Starting code quality analysis for ${owner}/${repo}`);
    
    githubService.setAuthenticatedClient(accessToken);
    
    const codeQualityResults = await analysisOrchestrator.performCodeQualityAnalysis(
      owner, 
      repo, 
      {}
    );

    res.json({
      success: true,
      data: codeQualityResults,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in code quality analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    githubService.clearAuthenticatedClient();
  }
});

/**
 * GET /api/analysis/dora-metrics/:owner/:repo
 * Performs DORA metrics analysis only
 */
router.get('/dora-metrics/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const accessToken = req.session.accessToken;

    const options = {
      timeRange: parseInt(req.query.timeRange) || 90
    };

    console.log(`Starting DORA metrics analysis for ${owner}/${repo}`);
    
    githubService.setAuthenticatedClient(accessToken);
    
    const doraResults = await analysisOrchestrator.performDORAAnalysis(
      owner, 
      repo, 
      options
    );

    res.json({
      success: true,
      data: doraResults,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in DORA metrics analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    githubService.clearAuthenticatedClient();
  }
});

/**
 * GET /api/analysis/benchmarking/:owner/:repo
 * Performs benchmarking analysis with repository context
 */
router.get('/benchmarking/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const accessToken = req.session.accessToken;

    console.log(`Starting benchmarking analysis for ${owner}/${repo}`);
    
    githubService.setAuthenticatedClient(accessToken);
    
    // Get repository context for benchmarking
    const repositoryContext = await analysisOrchestrator.gatherRepositoryContext(
      accessToken, 
      owner, 
      repo
    );

    // For benchmarking-only analysis, we need some basic metrics
    const [repositoryStats, codeQualityResults, doraResults] = await Promise.all([
      githubService.getRepositoryStats(accessToken, owner, repo).catch(() => null),
      analysisOrchestrator.performCodeQualityAnalysis(owner, repo, {}).catch(() => null),
      analysisOrchestrator.performDORAAnalysis(owner, repo, {}).catch(() => null)
    ]);

    const combinedMetrics = {
      repository: repositoryStats,
      codeQuality: codeQualityResults,
      dora: doraResults
    };

    const benchmarkingResults = await analysisOrchestrator.performBenchmarkingAnalysis(
      combinedMetrics,
      repositoryContext,
      {}
    );

    res.json({
      success: true,
      data: benchmarkingResults,
      context: repositoryContext,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in benchmarking analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    githubService.clearAuthenticatedClient();
  }
});

/**
 * GET /api/analysis/summary/:owner/:repo
 * Gets a quick summary analysis suitable for dashboards
 */
router.get('/summary/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const accessToken = req.session.accessToken;

    console.log(`Getting analysis summary for ${owner}/${repo}`);
    
    githubService.setAuthenticatedClient(accessToken);
    
    // Check cache first for comprehensive analysis
    const cacheKey = `${owner}/${repo}`;
    const cached = analysisOrchestrator.analysisCache?.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 1800000) { // 30 minutes
      // Return summary from cached comprehensive analysis
      const summary = {
        repository: {
          name: cached.data.repository.fullName,
          language: cached.data.repository.language,
          stargazers: cached.data.repository.stargazers
        },
        techHealthScore: cached.data.techHealthScore,
        executiveSummary: {
          overallAssessment: cached.data.executiveSummary.overallAssessment,
          keyHighlights: cached.data.executiveSummary.keyHighlights?.slice(0, 3),
          primaryConcerns: cached.data.executiveSummary.primaryConcerns?.slice(0, 3)
        },
        topRecommendations: cached.data.recommendations.items?.slice(0, 5),
        lastAnalyzed: cached.data.metadata.analyzedAt
      };

      return res.json({
        success: true,
        data: summary,
        fromCache: true
      });
    }

    // Perform lightweight analysis for summary
    const [repositoryBasics, repositoryStats] = await Promise.all([
      analysisOrchestrator.analyzeRepositoryBasics(accessToken, owner, repo),
      githubService.getRepositoryStats(accessToken, owner, repo).catch(() => null)
    ]);

    const summary = {
      repository: {
        name: `${owner}/${repo}`,
        language: repositoryBasics.language,
        stargazers: repositoryBasics.stargazers,
        size: repositoryBasics.size,
        lastUpdate: repositoryBasics.updatedAt
      },
      basicHealthScore: repositoryStats?.health_score || 50,
      quickInsights: [
        repositoryStats?.activity?.commits_last_30_days > 10 
          ? 'Active development' 
          : 'Low activity',
        repositoryStats?.activity?.contributors_count > 5 
          ? 'Collaborative project' 
          : 'Limited contributors',
        repositoryBasics.license 
          ? 'Has license' 
          : 'No license detected'
      ],
      nextSteps: [
        'Run comprehensive analysis for detailed insights',
        'Review code quality metrics',
        'Analyze deployment practices'
      ],
      analyzedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error getting analysis summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    githubService.clearAuthenticatedClient();
  }
});

/**
 * GET /api/analysis/status
 * Gets analysis service status and cache information
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const cacheStats = analysisOrchestrator.getCacheStats();
    
    res.json({
      success: true,
      data: {
        service: 'Analysis Engine',
        version: '2.0',
        status: 'operational',
        capabilities: [
          'Comprehensive Repository Analysis',
          'Code Quality Assessment',
          'DORA Metrics Collection',
          'Industry Benchmarking',
          'Security Vulnerability Scanning',
          'Executive Summary Generation'
        ],
        cache: cacheStats,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error getting analysis status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/analysis/cache
 * Clears the analysis cache
 */
router.delete('/cache', requireAuth, async (req, res) => {
  try {
    analysisOrchestrator.clearCache();
    
    res.json({
      success: true,
      message: 'Analysis cache cleared successfully'
    });
    
  } catch (error) {
    console.error('Error clearing analysis cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analysis/batch
 * Performs batch analysis on multiple repositories
 */
router.post('/batch', requireAuth, async (req, res) => {
  try {
    const { repositories } = req.body;
    const accessToken = req.session.accessToken;

    if (!repositories || !Array.isArray(repositories)) {
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

    console.log(`Starting batch analysis for ${repositories.length} repositories`);
    
    githubService.setAuthenticatedClient(accessToken);
    
    const results = [];
    const errors = [];

    for (const repo of repositories) {
      const { owner, name } = repo;
      
      try {
        const analysisResult = await analysisOrchestrator.performComprehensiveAnalysis(
          accessToken,
          owner,
          name,
          { forceRefresh: false }
        );
        
        results.push({
          repository: `${owner}/${name}`,
          success: true,
          data: {
            techHealthScore: analysisResult.techHealthScore,
            executiveSummary: analysisResult.executiveSummary,
            analysisId: analysisResult.analysisId
          }
        });
        
      } catch (error) {
        errors.push({
          repository: `${owner}/${name}`,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          total: repositories.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('Error in batch analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    githubService.clearAuthenticatedClient();
  }
});

module.exports = router; 