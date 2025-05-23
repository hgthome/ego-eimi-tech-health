const express = require('express');
const { requireAuth, validateRepositoryName } = require('../auth/validators');
const githubService = require('./github-service');

const router = express.Router();

// Apply authentication middleware to all GitHub routes
router.use(requireAuth);

// Get user's repositories
router.get('/repositories', async (req, res) => {
  try {
    const { page = 1, per_page = 30, type = 'owner', sort = 'updated' } = req.query;
    
    const repositories = await githubService.getUserRepositories(
      req.session.user.accessToken,
      { page: parseInt(page), per_page: parseInt(per_page), type, sort }
    );

    res.json({
      repositories,
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page),
        total: repositories.length
      }
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({
      error: 'Failed to fetch repositories',
      message: error.message
    });
  }
});

// Get repository details
router.get('/repository/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const fullName = `${owner}/${repo}`;
    
    // Validate repository name format
    const validation = validateRepositoryName(fullName);
    if (validation.error) {
      return res.status(400).json({
        error: 'Invalid repository name',
        details: validation.error.details.map(detail => detail.message)
      });
    }

    const repository = await githubService.getRepository(
      req.session.user.accessToken,
      owner,
      repo
    );

    res.json({ repository });
  } catch (error) {
    console.error('Error fetching repository:', error);
    res.status(500).json({
      error: 'Failed to fetch repository details',
      message: error.message
    });
  }
});

// Get repository languages
router.get('/repository/:owner/:repo/languages', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    
    const languages = await githubService.getRepositoryLanguages(
      req.session.user.accessToken,
      owner,
      repo
    );

    res.json({ languages });
  } catch (error) {
    console.error('Error fetching repository languages:', error);
    res.status(500).json({
      error: 'Failed to fetch repository languages',
      message: error.message
    });
  }
});

// Get repository commits
router.get('/repository/:owner/:repo/commits', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { since, until, per_page = 30, page = 1 } = req.query;
    
    const commits = await githubService.getRepositoryCommits(
      req.session.user.accessToken,
      owner,
      repo,
      { since, until, per_page: parseInt(per_page), page: parseInt(page) }
    );

    res.json({
      commits,
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page)
      }
    });
  } catch (error) {
    console.error('Error fetching repository commits:', error);
    res.status(500).json({
      error: 'Failed to fetch repository commits',
      message: error.message
    });
  }
});

// Get repository contributors
router.get('/repository/:owner/:repo/contributors', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { per_page = 30 } = req.query;
    
    const contributors = await githubService.getRepositoryContributors(
      req.session.user.accessToken,
      owner,
      repo,
      { per_page: parseInt(per_page) }
    );

    res.json({ contributors });
  } catch (error) {
    console.error('Error fetching repository contributors:', error);
    res.status(500).json({
      error: 'Failed to fetch repository contributors',
      message: error.message
    });
  }
});

// Get repository issues and pull requests
router.get('/repository/:owner/:repo/issues', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { state = 'all', per_page = 30, page = 1 } = req.query;
    
    const issues = await githubService.getRepositoryIssues(
      req.session.user.accessToken,
      owner,
      repo,
      { state, per_page: parseInt(per_page), page: parseInt(page) }
    );

    res.json({
      issues,
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page)
      }
    });
  } catch (error) {
    console.error('Error fetching repository issues:', error);
    res.status(500).json({
      error: 'Failed to fetch repository issues',
      message: error.message
    });
  }
});

// Get repository releases
router.get('/repository/:owner/:repo/releases', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { per_page = 10 } = req.query;
    
    const releases = await githubService.getRepositoryReleases(
      req.session.user.accessToken,
      owner,
      repo,
      { per_page: parseInt(per_page) }
    );

    res.json({ releases });
  } catch (error) {
    console.error('Error fetching repository releases:', error);
    res.status(500).json({
      error: 'Failed to fetch repository releases',
      message: error.message
    });
  }
});

// Get repository file tree (for basic code analysis)
router.get('/repository/:owner/:repo/tree', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { ref = 'main', path = '' } = req.query;
    
    const tree = await githubService.getRepositoryTree(
      req.session.user.accessToken,
      owner,
      repo,
      { ref, path }
    );

    res.json({ tree });
  } catch (error) {
    console.error('Error fetching repository tree:', error);
    res.status(500).json({
      error: 'Failed to fetch repository tree',
      message: error.message
    });
  }
});

// Get basic repository statistics for tech health analysis
router.get('/repository/:owner/:repo/stats', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    
    const stats = await githubService.getRepositoryStats(
      req.session.user.accessToken,
      owner,
      repo
    );

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching repository stats:', error);
    res.status(500).json({
      error: 'Failed to fetch repository statistics',
      message: error.message
    });
  }
});

module.exports = router; 