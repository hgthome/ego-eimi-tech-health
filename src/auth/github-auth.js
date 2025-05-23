const { Octokit } = require('@octokit/rest');

class GitHubAuth {
  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET;
    this.callbackUrl = process.env.GITHUB_CALLBACK_URL;
    this.scope = 'read:user,repo'; // Permissions needed for code analysis
  }

  /**
   * Generate GitHub OAuth authorization URL
   */
  getAuthorizationUrl(state = null) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: this.scope,
      response_type: 'code'
    });

    if (state) {
      params.append('state', state);
    }

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.callbackUrl
        })
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      if (!tokenData.access_token) {
        throw new Error('No access token received from GitHub');
      }

      // Get user information using the access token
      const octokit = new Octokit({
        auth: tokenData.access_token
      });

      const { data: user } = await octokit.rest.users.getAuthenticated();

      return {
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || 'bearer',
        scope: tokenData.scope,
        user: {
          id: user.id,
          login: user.login,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          public_repos: user.public_repos,
          followers: user.followers,
          following: user.following,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error(`Failed to authenticate with GitHub: ${error.message}`);
    }
  }

  /**
   * Validate access token by making a test API call
   */
  async validateToken(accessToken) {
    try {
      const octokit = new Octokit({
        auth: accessToken
      });

      const { data: user } = await octokit.rest.users.getAuthenticated();
      return { isValid: true, user };
    } catch (error) {
      console.error('Token validation error:', error);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Get user's repositories using access token
   */
  async getUserRepositories(accessToken, options = {}) {
    try {
      const octokit = new Octokit({
        auth: accessToken
      });

      const {
        type = 'owner',
        sort = 'updated',
        direction = 'desc',
        per_page = 30,
        page = 1
      } = options;

      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        type,
        sort,
        direction,
        per_page,
        page
      });

      return repos.map(repo => ({
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
        topics: repo.topics
      }));
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken) {
    try {
      const response = await fetch(`https://api.github.com/applications/${this.clientId}/token`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        body: JSON.stringify({
          access_token: accessToken
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to revoke token: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Token revocation error:', error);
      throw new Error(`Failed to revoke token: ${error.message}`);
    }
  }
}

module.exports = new GitHubAuth(); 