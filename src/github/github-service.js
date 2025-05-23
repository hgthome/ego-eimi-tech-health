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
   * Calculate a basic health score (0-100) based on available metrics
   */
  calculateBasicHealthScore(metrics) {
    let score = 0;
    
    // Activity score (40 points max)
    if (metrics.commits_last_30_days > 10) score += 20;
    else if (metrics.commits_last_30_days > 5) score += 15;
    else if (metrics.commits_last_30_days > 0) score += 10;
    
    if (metrics.contributors_count > 5) score += 20;
    else if (metrics.contributors_count > 2) score += 15;
    else if (metrics.contributors_count > 1) score += 10;
    
    // Quality score (30 points max)
    if (metrics.has_license) score += 10;
    if (metrics.has_recent_release) score += 10;
    if (metrics.language_diversity > 2) score += 10;
    
    // Issue management score (30 points max)
    if (metrics.open_issues_count === 0) score += 30;
    else if (metrics.open_issues_count < 5) score += 20;
    else if (metrics.open_issues_count < 20) score += 10;
    
    return Math.min(score, 100);
  }
}

module.exports = new GitHubService(); 