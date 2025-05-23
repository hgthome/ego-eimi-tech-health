const { Octokit } = require('@octokit/rest');

class GitHubService {
  /**
   * Create authenticated Octokit instance
   */
  createOctokit(accessToken) {
    return new Octokit({
      auth: accessToken,
      userAgent: 'tech-health-mvp/1.0.0'
    });
  }

  /**
   * Get user's repositories
   */
  async getUserRepositories(accessToken, options = {}) {
    const octokit = this.createOctokit(accessToken);
    
    const {
      type = 'owner',
      sort = 'updated',
      direction = 'desc',
      per_page = 30,
      page = 1
    } = options;

    try {
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        type,
        sort,
        direction,
        per_page,
        page
      });

      return data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        size: repo.size,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
        default_branch: repo.default_branch,
        topics: repo.topics,
        has_issues: repo.has_issues,
        has_projects: repo.has_projects,
        has_wiki: repo.has_wiki,
        archived: repo.archived,
        disabled: repo.disabled
      }));
    } catch (error) {
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  /**
   * Get specific repository details
   */
  async getRepository(accessToken, owner, repo) {
    const octokit = this.createOctokit(accessToken);

    try {
      const { data } = await octokit.rest.repos.get({
        owner,
        repo
      });

      return {
        id: data.id,
        name: data.name,
        full_name: data.full_name,
        private: data.private,
        description: data.description,
        language: data.language,
        size: data.size,
        stargazers_count: data.stargazers_count,
        watchers_count: data.watchers_count,
        forks_count: data.forks_count,
        open_issues_count: data.open_issues_count,
        network_count: data.network_count,
        subscribers_count: data.subscribers_count,
        created_at: data.created_at,
        updated_at: data.updated_at,
        pushed_at: data.pushed_at,
        default_branch: data.default_branch,
        topics: data.topics,
        has_issues: data.has_issues,
        has_projects: data.has_projects,
        has_wiki: data.has_wiki,
        has_pages: data.has_pages,
        archived: data.archived,
        disabled: data.disabled,
        license: data.license,
        clone_url: data.clone_url,
        ssh_url: data.ssh_url
      };
    } catch (error) {
      throw new Error(`Failed to fetch repository: ${error.message}`);
    }
  }

  /**
   * Get repository languages
   */
  async getRepositoryLanguages(accessToken, owner, repo) {
    const octokit = this.createOctokit(accessToken);

    try {
      const { data } = await octokit.rest.repos.listLanguages({
        owner,
        repo
      });

      // Calculate total bytes and percentages
      const totalBytes = Object.values(data).reduce((sum, bytes) => sum + bytes, 0);
      
      return Object.entries(data).map(([language, bytes]) => ({
        language,
        bytes,
        percentage: totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(2) : 0
      })).sort((a, b) => b.bytes - a.bytes);
    } catch (error) {
      throw new Error(`Failed to fetch repository languages: ${error.message}`);
    }
  }

  /**
   * Get repository commits
   */
  async getRepositoryCommits(accessToken, owner, repo, options = {}) {
    const octokit = this.createOctokit(accessToken);

    const { since, until, per_page = 30, page = 1 } = options;

    try {
      const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo,
        since,
        until,
        per_page,
        page
      });

      return data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.committer.email,
          date: commit.commit.committer.date
        },
        url: commit.html_url,
        stats: commit.stats,
        files: commit.files?.map(file => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes
        }))
      }));
    } catch (error) {
      throw new Error(`Failed to fetch repository commits: ${error.message}`);
    }
  }

  /**
   * Get repository contributors
   */
  async getRepositoryContributors(accessToken, owner, repo, options = {}) {
    const octokit = this.createOctokit(accessToken);

    const { per_page = 30 } = options;

    try {
      const { data } = await octokit.rest.repos.listContributors({
        owner,
        repo,
        per_page
      });

      return data.map(contributor => ({
        id: contributor.id,
        login: contributor.login,
        avatar_url: contributor.avatar_url,
        contributions: contributor.contributions,
        type: contributor.type,
        site_admin: contributor.site_admin
      }));
    } catch (error) {
      throw new Error(`Failed to fetch repository contributors: ${error.message}`);
    }
  }

  /**
   * Get repository issues (includes pull requests)
   */
  async getRepositoryIssues(accessToken, owner, repo, options = {}) {
    const octokit = this.createOctokit(accessToken);

    const { state = 'all', per_page = 30, page = 1 } = options;

    try {
      const { data } = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state,
        per_page,
        page
      });

      return data.map(issue => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        locked: issue.locked,
        assignees: issue.assignees?.map(assignee => assignee.login),
        labels: issue.labels?.map(label => ({
          name: label.name,
          color: label.color,
          description: label.description
        })),
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        closed_at: issue.closed_at,
        author: issue.user?.login,
        is_pull_request: !!issue.pull_request,
        html_url: issue.html_url
      }));
    } catch (error) {
      throw new Error(`Failed to fetch repository issues: ${error.message}`);
    }
  }

  /**
   * Get repository releases
   */
  async getRepositoryReleases(accessToken, owner, repo, options = {}) {
    const octokit = this.createOctokit(accessToken);

    const { per_page = 10 } = options;

    try {
      const { data } = await octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page
      });

      return data.map(release => ({
        id: release.id,
        tag_name: release.tag_name,
        name: release.name,
        body: release.body,
        draft: release.draft,
        prerelease: release.prerelease,
        created_at: release.created_at,
        published_at: release.published_at,
        author: release.author?.login,
        assets: release.assets?.map(asset => ({
          name: asset.name,
          size: asset.size,
          download_count: asset.download_count,
          content_type: asset.content_type
        })),
        html_url: release.html_url
      }));
    } catch (error) {
      throw new Error(`Failed to fetch repository releases: ${error.message}`);
    }
  }

  /**
   * Get repository file tree
   */
  async getRepositoryTree(accessToken, owner, repo, options = {}) {
    const octokit = this.createOctokit(accessToken);

    const { ref = 'main', path = '' } = options;

    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      // Handle both file and directory responses
      if (Array.isArray(data)) {
        return data.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
          sha: item.sha,
          url: item.url,
          html_url: item.html_url,
          download_url: item.download_url
        }));
      } else {
        return [{
          name: data.name,
          path: data.path,
          type: data.type,
          size: data.size,
          sha: data.sha,
          url: data.url,
          html_url: data.html_url,
          download_url: data.download_url
        }];
      }
    } catch (error) {
      throw new Error(`Failed to fetch repository tree: ${error.message}`);
    }
  }

  /**
   * Get comprehensive repository statistics for tech health analysis
   */
  async getRepositoryStats(accessToken, owner, repo) {
    const octokit = this.createOctokit(accessToken);

    try {
      // Get basic repository data
      const repository = await this.getRepository(accessToken, owner, repo);
      
      // Get languages
      const languages = await this.getRepositoryLanguages(accessToken, owner, repo);
      
      // Get recent commits (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentCommits = await this.getRepositoryCommits(accessToken, owner, repo, {
        since: thirtyDaysAgo.toISOString(),
        per_page: 100
      });

      // Get contributors
      const contributors = await this.getRepositoryContributors(accessToken, owner, repo);

      // Get open issues
      const openIssues = await this.getRepositoryIssues(accessToken, owner, repo, {
        state: 'open',
        per_page: 100
      });

      // Get recent releases
      const releases = await this.getRepositoryReleases(accessToken, owner, repo, {
        per_page: 5
      });

      // Calculate basic health metrics
      const stats = {
        repository: {
          name: repository.full_name,
          description: repository.description,
          language: repository.language,
          size: repository.size,
          created_at: repository.created_at,
          updated_at: repository.updated_at,
          pushed_at: repository.pushed_at
        },
        activity: {
          commits_last_30_days: recentCommits.length,
          contributors_count: contributors.length,
          open_issues_count: openIssues.length,
          releases_count: releases.length,
          last_commit_date: recentCommits.length > 0 ? recentCommits[0].author.date : null,
          last_release_date: releases.length > 0 ? releases[0].published_at : null
        },
        code_quality: {
          languages: languages,
          primary_language: languages.length > 0 ? languages[0].language : repository.language,
          language_diversity: languages.length,
          has_readme: false, // Will be determined in Phase 2
          has_license: !!repository.license,
          has_wiki: repository.has_wiki,
          has_issues_enabled: repository.has_issues
        },
        popularity: {
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          watchers: repository.watchers_count,
          network_count: repository.network_count
        },
        health_score: this.calculateBasicHealthScore({
          commits_last_30_days: recentCommits.length,
          contributors_count: contributors.length,
          open_issues_count: openIssues.length,
          has_recent_release: releases.length > 0,
          has_license: !!repository.license,
          language_diversity: languages.length
        })
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to fetch repository statistics: ${error.message}`);
    }
  }

  /**
   * Calculates a basic health score for the repository
   */
  calculateBasicHealthScore(metrics) {
    let score = 0;
    const maxScore = 100;

    // Activity Score (40 points)
    const activityScore = Math.min(40, 
      (metrics.commits_last_30_days * 2) + 
      (metrics.contributors_count * 5) + 
      (metrics.daysSinceLastCommit > 0 ? Math.max(0, 20 - metrics.daysSinceLastCommit) : 20)
    );

    // Quality Score (30 points) 
    const qualityScore = 
      (metrics.has_license ? 10 : 0) +
      (metrics.has_recent_release ? 10 : 0) +
      (metrics.language_diversity > 1 ? 10 : 0);

    // Popularity/Community Score (30 points)
    const popularityScore = Math.min(30,
      Math.log10(metrics.stars + 1) * 5 +
      Math.log10(metrics.forks_count + 1) * 3 +
      Math.log10(metrics.watchers_count + 1) * 2
    );

    score = activityScore + qualityScore + popularityScore;
    return Math.min(maxScore, Math.round(score));
  }

  /**
   * Gets repository files with optional filtering
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name  
   * @param {string} extensions - Comma-separated file extensions (e.g., '.js,.ts')
   * @returns {Array} Array of file objects
   */
  async getRepositoryFiles(owner, repo, extensions = '') {
    try {
      const tree = await this.getRepositoryTree(owner, repo);
      let files = tree.tree.filter(item => item.type === 'blob');
      
      if (extensions) {
        const extArray = extensions.split(',').map(ext => ext.trim().toLowerCase());
        files = files.filter(file => {
          const fileExt = '.' + file.path.split('.').pop().toLowerCase();
          return extArray.includes(fileExt);
        });
      }
      
      return files;
    } catch (error) {
      console.error(`Error getting repository files for ${owner}/${repo}:`, error.message);
      return [];
    }
  }

  /**
   * Gets the repository tree structure
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Object} Repository tree
   */
  async getRepositoryTree(owner, repo) {
    try {
      const response = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: 'HEAD',
        recursive: true
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error getting repository tree for ${owner}/${repo}:`, error.message);
      throw error;
    }
  }

  /**
   * Gets the content of a specific file
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @returns {string} File content
   */
  async getFileContent(owner, repo, path) {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path
      });
      
      if (response.data.type === 'file') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      } else {
        throw new Error('Path is not a file');
      }
    } catch (error) {
      console.error(`Error getting file content for ${owner}/${repo}/${path}:`, error.message);
      throw error;
    }
  }

  /**
   * Gets commit history for DORA metrics
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Array} Commit history
   */
  async getCommitHistory(owner, repo) {
    try {
      // Use the authenticated client if available, otherwise create a temporary one
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Use getRepositoryCommits with access token instead.');
      }

      const response = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 100
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error getting commit history for ${owner}/${repo}:`, error.message);
      return [];
    }
  }

  /**
   * Gets contributors for DORA metrics
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Array} Contributors
   */
  async getContributors(owner, repo) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Use getRepositoryContributors with access token instead.');
      }

      const response = await this.octokit.rest.repos.listContributors({
        owner,
        repo,
        per_page: 100
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error getting contributors for ${owner}/${repo}:`, error.message);
      return [];
    }
  }

  /**
   * Gets issues for DORA metrics
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Array} Issues
   */
  async getIssues(owner, repo) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Use getRepositoryIssues with access token instead.');
      }

      const response = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        per_page: 100
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error getting issues for ${owner}/${repo}:`, error.message);
      return [];
    }
  }

  /**
   * Gets releases for DORA metrics
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Array} Releases
   */
  async getReleases(owner, repo) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Use getRepositoryReleases with access token instead.');
      }

      const response = await this.octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page: 100
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error getting releases for ${owner}/${repo}:`, error.message);
      return [];
    }
  }

  /**
   * Gets repository details for analysis
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Object} Repository details
   */
  async getRepositoryDetails(owner, repo) {
    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized. Use getRepository with access token instead.');
      }

      const response = await this.octokit.rest.repos.get({
        owner,
        repo
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error getting repository details for ${owner}/${repo}:`, error.message);
      throw error;
    }
  }

  /**
   * Sets the authenticated octokit instance for use with analysis methods
   * @param {string} accessToken - GitHub access token
   */
  setAuthenticatedClient(accessToken) {
    this.octokit = this.createOctokit(accessToken);
  }

  /**
   * Clears the authenticated client
   */
  clearAuthenticatedClient() {
    this.octokit = null;
  }
}

module.exports = new GitHubService(); 