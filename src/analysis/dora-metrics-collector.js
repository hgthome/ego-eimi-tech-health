const fetch = require('node-fetch');

class DORAMetricsCollector {
  constructor(githubService) {
    this.githubService = githubService;
    this.deploymentPatterns = [
      /deploy/i,
      /release/i,
      /production/i,
      /main/i,
      /master/i
    ];
  }

  /**
   * Collects comprehensive DORA metrics for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {Object} options - Configuration options
   * @returns {Object} DORA metrics analysis
   */
  async collectDORAMetrics(owner, repo, options = {}) {
    try {
      console.log(`Collecting DORA metrics for ${owner}/${repo}`);
      
      const timeRange = options.timeRange || 90; // Last 90 days by default
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (timeRange * 24 * 60 * 60 * 1000));

      const [
        deploymentFrequency,
        leadTimeForChanges, 
        changeFailureRate,
        meanTimeToRestore
      ] = await Promise.all([
        this.calculateDeploymentFrequency(owner, repo, startDate, endDate),
        this.calculateLeadTimeForChanges(owner, repo, startDate, endDate),
        this.calculateChangeFailureRate(owner, repo, startDate, endDate),
        this.calculateMeanTimeToRestore(owner, repo, startDate, endDate)
      ]);

      const performanceLevel = this.determinePerformanceLevel({
        deploymentFrequency,
        leadTimeForChanges,
        changeFailureRate,
        meanTimeToRestore
      });

      return {
        metrics: {
          deploymentFrequency,
          leadTimeForChanges,
          changeFailureRate,
          meanTimeToRestore
        },
        performanceLevel,
        benchmarks: this.getBenchmarks(),
        recommendations: this.generateDORARecommendations({
          deploymentFrequency,
          leadTimeForChanges,
          changeFailureRate,
          meanTimeToRestore,
          performanceLevel
        }),
        collectedAt: new Date().toISOString(),
        timeRange: `${timeRange} days`,
        trends: await this.calculateTrends(owner, repo, timeRange)
      };
    } catch (error) {
      console.error('Error collecting DORA metrics:', error);
      throw error;
    }
  }

  /**
   * Calculates deployment frequency
   */
  async calculateDeploymentFrequency(owner, repo, startDate, endDate) {
    try {
      // Get releases as primary deployment indicator
      const releases = await this.githubService.getReleases(owner, repo);
      const deploymentEvents = await this.identifyDeploymentEvents(owner, repo, startDate, endDate);
      
      const recentReleases = releases.filter(release => {
        const releaseDate = new Date(release.published_at);
        return releaseDate >= startDate && releaseDate <= endDate;
      });

      const totalDeployments = recentReleases.length + deploymentEvents.length;
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const deploymentsPerDay = totalDeployments / daysDiff;
      const deploymentsPerWeek = deploymentsPerDay * 7;

      return {
        totalDeployments,
        deploymentsPerDay: Math.round(deploymentsPerDay * 100) / 100,
        deploymentsPerWeek: Math.round(deploymentsPerWeek * 100) / 100,
        frequency: this.classifyDeploymentFrequency(deploymentsPerDay),
        recentDeployments: this.formatDeploymentHistory(recentReleases, deploymentEvents),
        trend: this.calculateFrequencyTrend(recentReleases, deploymentEvents, daysDiff)
      };
    } catch (error) {
      console.error('Error calculating deployment frequency:', error);
      return this.getDefaultDeploymentFrequency();
    }
  }

  /**
   * Calculates lead time for changes
   */
  async calculateLeadTimeForChanges(owner, repo, startDate, endDate) {
    try {
      const commits = await this.githubService.getCommitHistory(owner, repo);
      const releases = await this.githubService.getReleases(owner, repo);
      
      const leadTimes = [];
      const recentReleases = releases.filter(release => {
        const releaseDate = new Date(release.published_at);
        return releaseDate >= startDate && releaseDate <= endDate;
      });

      for (const release of recentReleases.slice(0, 10)) { // Analyze last 10 releases
        const releaseDate = new Date(release.published_at);
        
        // Find commits between this release and the previous one
        const releaseCommits = commits.filter(commit => {
          const commitDate = new Date(commit.commit.committer.date);
          return commitDate <= releaseDate;
        });

        if (releaseCommits.length > 0) {
          // Calculate lead time from first commit to release
          const firstCommitDate = new Date(releaseCommits[releaseCommits.length - 1].commit.committer.date);
          const leadTimeHours = (releaseDate - firstCommitDate) / (1000 * 60 * 60);
          const leadTimeDays = leadTimeHours / 24;
          
          leadTimes.push({
            release: release.tag_name,
            leadTimeHours: Math.round(leadTimeHours * 100) / 100,
            leadTimeDays: Math.round(leadTimeDays * 100) / 100,
            commitsIncluded: releaseCommits.length
          });
        }
      }

      const avgLeadTimeHours = leadTimes.length > 0 
        ? leadTimes.reduce((sum, lt) => sum + lt.leadTimeHours, 0) / leadTimes.length
        : 0;
      
      const avgLeadTimeDays = avgLeadTimeHours / 24;

      return {
        averageLeadTimeHours: Math.round(avgLeadTimeHours * 100) / 100,
        averageLeadTimeDays: Math.round(avgLeadTimeDays * 100) / 100,
        classification: this.classifyLeadTime(avgLeadTimeHours),
        leadTimeDetails: leadTimes.slice(0, 5), // Last 5 releases
        distribution: this.calculateLeadTimeDistribution(leadTimes),
        trend: this.calculateLeadTimeTrend(leadTimes)
      };
    } catch (error) {
      console.error('Error calculating lead time for changes:', error);
      return this.getDefaultLeadTime();
    }
  }

  /**
   * Calculates change failure rate
   */
  async calculateChangeFailureRate(owner, repo, startDate, endDate) {
    try {
      const releases = await this.githubService.getReleases(owner, repo);
      const issues = await this.githubService.getIssues(owner, repo);
      
      const recentReleases = releases.filter(release => {
        const releaseDate = new Date(release.published_at);
        return releaseDate >= startDate && releaseDate <= endDate;
      });

      // Identify failed deployments based on issues/hotfixes after releases
      const failedDeployments = [];
      
      for (const release of recentReleases) {
        const releaseDate = new Date(release.published_at);
        const postReleaseIssues = issues.filter(issue => {
          const issueDate = new Date(issue.created_at);
          const timeDiff = issueDate - releaseDate;
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          return hoursDiff > 0 && hoursDiff <= 72 && // Within 72 hours
                 this.isDeploymentFailureIssue(issue);
        });

        if (postReleaseIssues.length > 0) {
          failedDeployments.push({
            release: release.tag_name,
            releaseDate: release.published_at,
            failureIssues: postReleaseIssues.length,
            criticalIssues: postReleaseIssues.filter(issue => 
              issue.labels.some(label => 
                /critical|urgent|hotfix|bug/i.test(label.name)
              )
            ).length
          });
        }
      }

      const changeFailureRate = recentReleases.length > 0 
        ? (failedDeployments.length / recentReleases.length) * 100
        : 0;

      return {
        changeFailureRate: Math.round(changeFailureRate * 100) / 100,
        classification: this.classifyChangeFailureRate(changeFailureRate),
        totalDeployments: recentReleases.length,
        failedDeployments: failedDeployments.length,
        failureDetails: failedDeployments.slice(0, 5),
        trend: this.calculateFailureRateTrend(recentReleases, failedDeployments)
      };
    } catch (error) {
      console.error('Error calculating change failure rate:', error);
      return this.getDefaultChangeFailureRate();
    }
  }

  /**
   * Calculates mean time to restore
   */
  async calculateMeanTimeToRestore(owner, repo, startDate, endDate) {
    try {
      const issues = await this.githubService.getIssues(owner, repo);
      
      // Find production incidents/bugs
      const productionIssues = issues.filter(issue => {
        const issueDate = new Date(issue.created_at);
        return issueDate >= startDate && 
               issueDate <= endDate &&
               issue.state === 'closed' &&
               this.isProductionIncident(issue);
      });

      const resolutionTimes = [];
      
      for (const issue of productionIssues) {
        if (issue.closed_at) {
          const createdDate = new Date(issue.created_at);
          const closedDate = new Date(issue.closed_at);
          const resolutionHours = (closedDate - createdDate) / (1000 * 60 * 60);
          
          resolutionTimes.push({
            issue: issue.number,
            title: issue.title,
            resolutionHours: Math.round(resolutionHours * 100) / 100,
            resolutionDays: Math.round((resolutionHours / 24) * 100) / 100,
            severity: this.assessIssueSeverity(issue)
          });
        }
      }

      const avgResolutionHours = resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, rt) => sum + rt.resolutionHours, 0) / resolutionTimes.length
        : 0;

      return {
        meanTimeToRestoreHours: Math.round(avgResolutionHours * 100) / 100,
        meanTimeToRestoreDays: Math.round((avgResolutionHours / 24) * 100) / 100,
        classification: this.classifyMTTR(avgResolutionHours),
        incidentsAnalyzed: productionIssues.length,
        resolutionDetails: resolutionTimes.slice(0, 10),
        severityBreakdown: this.calculateSeverityBreakdown(resolutionTimes),
        trend: this.calculateMTTRTrend(resolutionTimes)
      };
    } catch (error) {
      console.error('Error calculating mean time to restore:', error);
      return this.getDefaultMTTR();
    }
  }

  /**
   * Determines overall performance level based on DORA metrics
   */
  determinePerformanceLevel(metrics) {
    const scores = {
      deploymentFrequency: this.scoreDeploymentFrequency(metrics.deploymentFrequency.deploymentsPerDay),
      leadTime: this.scoreLeadTime(metrics.leadTimeForChanges.averageLeadTimeDays),
      changeFailureRate: this.scoreChangeFailureRate(metrics.changeFailureRate.changeFailureRate),
      mttr: this.scoreMTTR(metrics.meanTimeToRestore.meanTimeToRestoreHours)
    };

    const avgScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4;

    let level;
    if (avgScore >= 3.5) level = 'Elite';
    else if (avgScore >= 2.5) level = 'High';
    else if (avgScore >= 1.5) level = 'Medium';
    else level = 'Low';

    return {
      level,
      score: Math.round(avgScore * 100) / 100,
      breakdown: scores
    };
  }

  /**
   * Gets DORA performance benchmarks
   */
  getBenchmarks() {
    return {
      deploymentFrequency: {
        elite: 'Multiple times per day',
        high: 'Once per day to once per week',
        medium: 'Once per week to once per month',
        low: 'Once per month to once every 6 months'
      },
      leadTimeForChanges: {
        elite: 'Less than 1 day',
        high: '1 day to 1 week',
        medium: '1 week to 1 month',
        low: '1 month to 6 months'
      },
      changeFailureRate: {
        elite: '0-5%',
        high: '5-10%',
        medium: '10-15%',
        low: '15%+'
      },
      meanTimeToRestore: {
        elite: 'Less than 1 hour',
        high: 'Less than 1 day',
        medium: '1 day to 1 week',
        low: '1 week to 1 month'
      }
    };
  }

  /**
   * Generates DORA improvement recommendations
   */
  generateDORARecommendations(metrics) {
    const recommendations = [];

    // Deployment frequency recommendations
    if (metrics.deploymentFrequency.deploymentsPerDay < 0.14) { // Less than once per week
      recommendations.push({
        metric: 'Deployment Frequency',
        priority: 'high',
        title: 'Increase Deployment Frequency',
        description: 'Consider implementing CI/CD pipelines and feature flags to enable more frequent deployments.',
        impact: 'Faster time to market and reduced deployment risk'
      });
    }

    // Lead time recommendations
    if (metrics.leadTimeForChanges.averageLeadTimeDays > 7) {
      recommendations.push({
        metric: 'Lead Time',
        priority: 'medium',
        title: 'Reduce Lead Time for Changes',
        description: 'Streamline development process, reduce batch sizes, and improve automation.',
        impact: 'Faster delivery of features and bug fixes'
      });
    }

    // Change failure rate recommendations
    if (metrics.changeFailureRate.changeFailureRate > 15) {
      recommendations.push({
        metric: 'Change Failure Rate',
        priority: 'high',
        title: 'Improve Change Success Rate',
        description: 'Enhance testing practices, implement automated quality gates, and improve code review processes.',
        impact: 'More stable releases and reduced rollbacks'
      });
    }

    // MTTR recommendations
    if (metrics.meanTimeToRestore.meanTimeToRestoreHours > 24) {
      recommendations.push({
        metric: 'Mean Time to Restore',
        priority: 'high',
        title: 'Reduce Recovery Time',
        description: 'Implement better monitoring, automated rollback capabilities, and incident response procedures.',
        impact: 'Faster recovery from failures and improved user experience'
      });
    }

    return recommendations;
  }

  // Helper methods for classification and scoring
  classifyDeploymentFrequency(deploymentsPerDay) {
    if (deploymentsPerDay >= 1) return 'elite';
    if (deploymentsPerDay >= 0.14) return 'high'; // Once per week
    if (deploymentsPerDay >= 0.033) return 'medium'; // Once per month
    return 'low';
  }

  classifyLeadTime(hours) {
    if (hours <= 24) return 'elite';
    if (hours <= 168) return 'high'; // 1 week
    if (hours <= 720) return 'medium'; // 1 month
    return 'low';
  }

  classifyChangeFailureRate(rate) {
    if (rate <= 5) return 'elite';
    if (rate <= 10) return 'high';
    if (rate <= 15) return 'medium';
    return 'low';
  }

  classifyMTTR(hours) {
    if (hours <= 1) return 'elite';
    if (hours <= 24) return 'high';
    if (hours <= 168) return 'medium'; // 1 week
    return 'low';
  }

  // Scoring methods (1-4 scale)
  scoreDeploymentFrequency(deploymentsPerDay) {
    if (deploymentsPerDay >= 1) return 4;
    if (deploymentsPerDay >= 0.14) return 3;
    if (deploymentsPerDay >= 0.033) return 2;
    return 1;
  }

  scoreLeadTime(days) {
    if (days <= 1) return 4;
    if (days <= 7) return 3;
    if (days <= 30) return 2;
    return 1;
  }

  scoreChangeFailureRate(rate) {
    if (rate <= 5) return 4;
    if (rate <= 10) return 3;
    if (rate <= 15) return 2;
    return 1;
  }

  scoreMTTR(hours) {
    if (hours <= 1) return 4;
    if (hours <= 24) return 3;
    if (hours <= 168) return 2;
    return 1;
  }

  // Helper methods for data processing
  async identifyDeploymentEvents(owner, repo, startDate, endDate) {
    try {
      // Look for deployment-related commits, branches, or workflow runs
      const commits = await this.githubService.getCommitHistory(owner, repo);
      
      const deploymentCommits = commits.filter(commit => {
        const commitDate = new Date(commit.commit.committer.date);
        const message = commit.commit.message.toLowerCase();
        
        return commitDate >= startDate && 
               commitDate <= endDate &&
               this.deploymentPatterns.some(pattern => pattern.test(message));
      });

      return deploymentCommits.map(commit => ({
        type: 'commit',
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.committer.date,
        author: commit.commit.committer.name
      }));
    } catch (error) {
      console.warn('Could not identify deployment events:', error.message);
      return [];
    }
  }

  isDeploymentFailureIssue(issue) {
    const title = issue.title.toLowerCase();
    const body = (issue.body || '').toLowerCase();
    const labels = issue.labels.map(label => label.name.toLowerCase());
    
    const failureKeywords = [
      'bug', 'error', 'failed', 'broken', 'issue', 'problem',
      'hotfix', 'urgent', 'critical', 'production', 'rollback'
    ];
    
    return failureKeywords.some(keyword => 
      title.includes(keyword) || 
      body.includes(keyword) || 
      labels.some(label => label.includes(keyword))
    );
  }

  isProductionIncident(issue) {
    const title = issue.title.toLowerCase();
    const labels = issue.labels.map(label => label.name.toLowerCase());
    
    const incidentKeywords = [
      'production', 'critical', 'urgent', 'hotfix', 'outage',
      'down', 'incident', 'emergency', 'p0', 'p1'
    ];
    
    return incidentKeywords.some(keyword =>
      title.includes(keyword) ||
      labels.some(label => label.includes(keyword))
    );
  }

  assessIssueSeverity(issue) {
    const labels = issue.labels.map(label => label.name.toLowerCase());
    
    if (labels.some(label => /critical|p0|urgent/.test(label))) return 'critical';
    if (labels.some(label => /high|p1/.test(label))) return 'high';
    if (labels.some(label => /medium|p2/.test(label))) return 'medium';
    return 'low';
  }

  /**
   * Calculates trends by comparing current metrics with historical periods
   */
  async calculateTrends(owner, repo, timeRange) {
    try {
      console.log(`Calculating DORA metrics trends for ${owner}/${repo}`);
      
      const endDate = new Date();
      const currentPeriodStart = new Date(endDate.getTime() - (timeRange * 24 * 60 * 60 * 1000));
      const previousPeriodStart = new Date(currentPeriodStart.getTime() - (timeRange * 24 * 60 * 60 * 1000));
      
      // Get metrics for current and previous periods
      const [currentMetrics, previousMetrics] = await Promise.all([
        this.calculatePeriodMetrics(owner, repo, currentPeriodStart, endDate),
        this.calculatePeriodMetrics(owner, repo, previousPeriodStart, currentPeriodStart)
      ]);

             return {
         deploymentFrequency: this.calculateDeploymentFrequencyChange(
           currentMetrics.deploymentFrequency,
           previousMetrics.deploymentFrequency
         ),
         leadTime: this.calculateLeadTimeChange(
           currentMetrics.leadTime,
           previousMetrics.leadTime
         ),
         changeFailureRate: this.calculateChangeFailureRateChange(
           currentMetrics.changeFailureRate,
           previousMetrics.changeFailureRate
         ),
         mttr: this.calculateMTTRChange(
           currentMetrics.mttr,
           previousMetrics.mttr
         ),
         overall: this.calculateOverallTrendChange(currentMetrics, previousMetrics),
        dataPoints: {
          currentPeriod: currentMetrics,
          previousPeriod: previousMetrics,
          timeRange: `${timeRange} days`
        }
      };
    } catch (error) {
      console.error('Error calculating trends:', error);
      return {
        deploymentFrequency: 'stable',
        leadTime: 'stable', 
        changeFailureRate: 'stable',
        mttr: 'stable',
        overall: 'stable',
        error: 'Unable to calculate trends due to insufficient data'
      };
    }
  }

  /**
   * Calculates metrics for a specific time period
   */
  async calculatePeriodMetrics(owner, repo, startDate, endDate) {
    try {
      const [
        deploymentFrequency,
        leadTime,
        changeFailureRate,
        mttr
      ] = await Promise.all([
        this.calculateDeploymentFrequency(owner, repo, startDate, endDate),
        this.calculateLeadTimeForChanges(owner, repo, startDate, endDate),
        this.calculateChangeFailureRate(owner, repo, startDate, endDate),
        this.calculateMeanTimeToRestore(owner, repo, startDate, endDate)
      ]);

      return {
        deploymentFrequency: deploymentFrequency.deploymentsPerDay || 0,
        leadTime: leadTime.averageLeadTimeHours || 0,
        changeFailureRate: changeFailureRate.changeFailureRate || 0,
        mttr: mttr.meanTimeToRestoreHours || 0,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        }
      };
    } catch (error) {
      console.warn(`Error calculating period metrics:`, error.message);
      return {
        deploymentFrequency: 0,
        leadTime: 0,
        changeFailureRate: 0,
        mttr: 0
      };
    }
  }

     /**
    * Calculates deployment frequency change
    */
   calculateDeploymentFrequencyChange(current, previous) {
    if (previous === 0) {
      return current > 0 ? 'improving' : 'stable';
    }

    const changePercent = ((current - previous) / previous) * 100;
    
    if (changePercent > 20) return 'improving';
    if (changePercent < -20) return 'declining';
    if (changePercent > 5) return 'slightly_improving';
    if (changePercent < -5) return 'slightly_declining';
    return 'stable';
  }

     /**
    * Calculates lead time change
    */
   calculateLeadTimeChange(current, previous) {
    if (previous === 0) {
      return current > 0 ? 'declining' : 'stable';
    }

    const changePercent = ((current - previous) / previous) * 100;
    
    // For lead time, lower is better
    if (changePercent < -20) return 'improving';
    if (changePercent > 20) return 'declining';
    if (changePercent < -5) return 'slightly_improving';
    if (changePercent > 5) return 'slightly_declining';
    return 'stable';
  }

     /**
    * Calculates change failure rate change
    */
   calculateChangeFailureRateChange(current, previous) {
    if (previous === 0) {
      return current > 0 ? 'declining' : 'stable';
    }

    const changePercent = ((current - previous) / previous) * 100;
    
    // For failure rate, lower is better
    if (changePercent < -20) return 'improving';
    if (changePercent > 20) return 'declining';
    if (changePercent < -5) return 'slightly_improving';
    if (changePercent > 5) return 'slightly_declining';
    return 'stable';
  }

     /**
    * Calculates MTTR change
    */
   calculateMTTRChange(current, previous) {
    if (previous === 0) {
      return current > 0 ? 'declining' : 'stable';
    }

    const changePercent = ((current - previous) / previous) * 100;
    
    // For MTTR, lower is better
    if (changePercent < -20) return 'improving';
    if (changePercent > 20) return 'declining';
    if (changePercent < -5) return 'slightly_improving';
    if (changePercent > 5) return 'slightly_declining';
    return 'stable';
  }

     /**
    * Calculates overall trend change across all DORA metrics
    */
   calculateOverallTrendChange(currentMetrics, previousMetrics) {
     const trends = [
       this.calculateDeploymentFrequencyChange(
         currentMetrics.deploymentFrequency,
         previousMetrics.deploymentFrequency
       ),
       this.calculateLeadTimeChange(
         currentMetrics.leadTime,
         previousMetrics.leadTime
       ),
       this.calculateChangeFailureRateChange(
         currentMetrics.changeFailureRate,
         previousMetrics.changeFailureRate
       ),
       this.calculateMTTRChange(
         currentMetrics.mttr,
         previousMetrics.mttr
       )
     ];

    // Score trends: improving = 2, slightly_improving = 1, stable = 0, slightly_declining = -1, declining = -2
    const trendScores = trends.map(trend => {
      switch (trend) {
        case 'improving': return 2;
        case 'slightly_improving': return 1;
        case 'stable': return 0;
        case 'slightly_declining': return -1;
        case 'declining': return -2;
        default: return 0;
      }
    });

    const averageScore = trendScores.reduce((sum, score) => sum + score, 0) / trendScores.length;

    if (averageScore > 1) return 'improving';
    if (averageScore < -1) return 'declining';
    if (averageScore > 0.25) return 'slightly_improving';
    if (averageScore < -0.25) return 'slightly_declining';
    return 'stable';
  }

  // Helper methods for data processing
  formatDeploymentHistory(releases, events) {
    return [...releases, ...events]
      .sort((a, b) => new Date(b.published_at || b.date) - new Date(a.published_at || a.date))
      .slice(0, 10);
  }

  calculateFrequencyTrend(releases, events, days) {
    // Simplified trend calculation
    const totalEvents = releases.length + events.length;
    if (totalEvents === 0) return 'stable';
    return totalEvents > (days / 7) ? 'increasing' : 'stable';
  }

  calculateLeadTimeDistribution(leadTimes) {
    const distribution = { fast: 0, medium: 0, slow: 0 };
    leadTimes.forEach(lt => {
      if (lt.leadTimeDays <= 1) distribution.fast++;
      else if (lt.leadTimeDays <= 7) distribution.medium++;
      else distribution.slow++;
    });
    return distribution;
  }

  calculateLeadTimeTrend(leadTimes) {
    if (leadTimes.length < 2) return 'stable';
    const recent = leadTimes.slice(0, Math.ceil(leadTimes.length / 2));
    const older = leadTimes.slice(Math.ceil(leadTimes.length / 2));
    
    const recentAvg = recent.reduce((sum, lt) => sum + lt.leadTimeDays, 0) / recent.length;
    const olderAvg = older.reduce((sum, lt) => sum + lt.leadTimeDays, 0) / older.length;
    
    if (recentAvg < olderAvg * 0.9) return 'improving';
    if (recentAvg > olderAvg * 1.1) return 'worsening';
    return 'stable';
  }

  calculateFailureRateTrend(releases, failures) {
    // Simplified calculation
    return failures.length > releases.length * 0.2 ? 'concerning' : 'stable';
  }

  calculateSeverityBreakdown(resolutionTimes) {
    const breakdown = { critical: 0, high: 0, medium: 0, low: 0 };
    resolutionTimes.forEach(rt => {
      breakdown[rt.severity]++;
    });
    return breakdown;
  }

  calculateMTTRTrend(resolutionTimes) {
    if (resolutionTimes.length < 2) return 'stable';
    const recent = resolutionTimes.slice(0, Math.ceil(resolutionTimes.length / 2));
    const older = resolutionTimes.slice(Math.ceil(resolutionTimes.length / 2));
    
    const recentAvg = recent.reduce((sum, rt) => sum + rt.resolutionHours, 0) / recent.length;
    const olderAvg = older.reduce((sum, rt) => sum + rt.resolutionHours, 0) / older.length;
    
    if (recentAvg < olderAvg * 0.9) return 'improving';
    if (recentAvg > olderAvg * 1.1) return 'worsening';
    return 'stable';
  }

  // Default values for error cases
  getDefaultDeploymentFrequency() {
    return {
      totalDeployments: 0,
      deploymentsPerDay: 0,
      deploymentsPerWeek: 0,
      frequency: 'low',
      recentDeployments: [],
      trend: 'unknown'
    };
  }

  getDefaultLeadTime() {
    return {
      averageLeadTimeHours: 0,
      averageLeadTimeDays: 0,
      classification: 'unknown',
      leadTimeDetails: [],
      distribution: {},
      trend: 'unknown'
    };
  }

  getDefaultChangeFailureRate() {
    return {
      changeFailureRate: 0,
      classification: 'unknown',
      totalDeployments: 0,
      failedDeployments: 0,
      failureDetails: [],
      trend: 'unknown'
    };
  }

  getDefaultMTTR() {
    return {
      meanTimeToRestoreHours: 0,
      meanTimeToRestoreDays: 0,
      classification: 'unknown',
      incidentsAnalyzed: 0,
      resolutionDetails: [],
      severityBreakdown: {},
      trend: 'unknown'
    };
  }
}

module.exports = DORAMetricsCollector; 