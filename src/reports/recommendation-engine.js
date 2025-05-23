class RecommendationEngine {
  constructor() {
    this.priorityWeights = {
      'Critical': 10,
      'High': 8,
      'Medium': 5,
      'Low': 2
    };

    this.effortScores = {
      'Low': 1,
      'Medium': 3,
      'High': 5
    };

    this.impactScores = {
      'Low': 1,
      'Medium': 3,
      'High': 5
    };
  }

  /**
   * Generates detailed recommendations based on analysis results
   */
  async generateDetailedRecommendations(analysisData) {
    const recommendations = [];

    try {
      // Security recommendations
      const securityRecs = this.generateSecurityRecommendations(analysisData.analysis.codeQuality?.security);
      recommendations.push(...securityRecs);

      // Code quality recommendations
      const qualityRecs = this.generateCodeQualityRecommendations(analysisData.analysis.codeQuality);
      recommendations.push(...qualityRecs);

      // DORA metrics recommendations
      const doraRecs = this.generateDORARecommendations(analysisData.analysis.dora);
      recommendations.push(...doraRecs);

      // Repository health recommendations
      const repoRecs = this.generateRepositoryRecommendations(analysisData.analysis.repository);
      recommendations.push(...repoRecs);

      // Architecture recommendations
      const archRecs = this.generateArchitectureRecommendations(analysisData);
      recommendations.push(...archRecs);

      // Process and prioritize recommendations
      const processedRecs = this.processRecommendations(recommendations);
      
      return this.prioritizeRecommendations(processedRecs);

    } catch (error) {
      console.error('Error generating recommendations:', error);
      return this.getDefaultRecommendations();
    }
  }

  /**
   * Generates security-focused recommendations
   */
  generateSecurityRecommendations(securityData) {
    const recommendations = [];

    if (!securityData) {
      recommendations.push({
        title: 'Implement Security Analysis',
        description: 'Set up automated security scanning to identify vulnerabilities in code and dependencies.',
        category: 'Security',
        priority: 'High',
        effort: 'Medium',
        impact: 'High',
        timeline: '1-2 weeks',
        resources: '1 developer, security tools',
        details: [
          'Install and configure security scanning tools (e.g., Snyk, SonarQube)',
          'Set up automated dependency vulnerability checking',
          'Implement pre-commit hooks for security checks',
          'Create security review process for code changes'
        ]
      });
      return recommendations;
    }

    const vulnerabilities = securityData.vulnerabilities || [];
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'Critical').length;
    const highVulns = vulnerabilities.filter(v => v.severity === 'High').length;

    if (criticalVulns > 0) {
      recommendations.push({
        title: 'Address Critical Security Vulnerabilities',
        description: `${criticalVulns} critical security vulnerabilities require immediate attention to prevent potential security breaches.`,
        category: 'Security',
        priority: 'Critical',
        effort: 'High',
        impact: 'High',
        timeline: 'Immediate (1-3 days)',
        resources: 'Senior developer, security expert',
        details: [
          'Review and patch all critical vulnerabilities immediately',
          'Update affected dependencies to secure versions',
          'Conduct security audit of related code',
          'Implement additional security controls if needed'
        ]
      });
    }

    if (highVulns > 0) {
      recommendations.push({
        title: 'Resolve High-Priority Security Issues',
        description: `${highVulns} high-priority security vulnerabilities should be addressed to strengthen security posture.`,
        category: 'Security',
        priority: 'High',
        effort: 'Medium',
        impact: 'High',
        timeline: '1-2 weeks',
        resources: '1-2 developers',
        details: [
          'Prioritize and fix high-severity vulnerabilities',
          'Update dependencies with known security issues',
          'Review code patterns that led to vulnerabilities',
          'Enhance security testing coverage'
        ]
      });
    }

    if (vulnerabilities.length > 10) {
      recommendations.push({
        title: 'Establish Security-First Development Practices',
        description: 'High number of security issues indicates need for improved security practices in development workflow.',
        category: 'Security',
        priority: 'High',
        effort: 'Medium',
        impact: 'High',
        timeline: '2-4 weeks',
        resources: 'Development team, security training',
        details: [
          'Implement security-focused code review process',
          'Provide security training for development team',
          'Integrate security scanning into CI/CD pipeline',
          'Establish security coding standards and guidelines'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generates code quality improvement recommendations
   */
  generateCodeQualityRecommendations(codeQualityData) {
    const recommendations = [];

    if (!codeQualityData) {
      recommendations.push({
        title: 'Implement Code Quality Monitoring',
        description: 'Set up comprehensive code quality analysis to track and improve code health metrics.',
        category: 'Quality',
        priority: 'Medium',
        effort: 'Low',
        impact: 'Medium',
        timeline: '1 week',
        resources: '1 developer',
        details: [
          'Configure static code analysis tools',
          'Set up code quality gates in CI/CD',
          'Establish code quality metrics dashboard',
          'Define code quality standards and thresholds'
        ]
      });
      return recommendations;
    }

    // Complexity recommendations
    if (codeQualityData.complexity) {
      const avgComplexity = codeQualityData.complexity.averageComplexity || 0;
      const highComplexityFiles = codeQualityData.complexity.highComplexityFiles || [];

      if (avgComplexity > 15 || highComplexityFiles.length > 10) {
        recommendations.push({
          title: 'Reduce Code Complexity',
          description: 'High code complexity makes maintenance difficult and increases bug risk. Refactor complex functions and modules.',
          category: 'Quality',
          priority: avgComplexity > 20 ? 'High' : 'Medium',
          effort: 'High',
          impact: 'High',
          timeline: '4-8 weeks',
          resources: '2-3 developers',
          details: [
            'Identify and refactor functions with cyclomatic complexity > 15',
            'Break down large classes and modules',
            'Implement design patterns to reduce complexity',
            'Add comprehensive unit tests before refactoring',
            'Set complexity thresholds in CI/CD pipeline'
          ]
        });
      }
    }

    // Test coverage recommendations
    if (codeQualityData.testing) {
      const coverage = codeQualityData.testing.coverage || 0;
      
      if (coverage < 70) {
        recommendations.push({
          title: 'Improve Test Coverage',
          description: `Current test coverage at ${coverage}% is below recommended 80% threshold. Comprehensive testing reduces bugs and improves confidence in changes.`,
          category: 'Quality',
          priority: coverage < 50 ? 'High' : 'Medium',
          effort: 'Medium',
          impact: 'High',
          timeline: '3-6 weeks',
          resources: '2-3 developers',
          details: [
            'Write unit tests for uncovered critical paths',
            'Implement integration tests for key workflows',
            'Set up test coverage reporting and gates',
            'Adopt test-driven development practices',
            'Focus on testing business-critical functionality first'
          ]
        });
      }
    }

    // Documentation recommendations
    if (codeQualityData.documentation) {
      const docScore = codeQualityData.documentation.score || 0;
      
      if (docScore < 60) {
        recommendations.push({
          title: 'Improve Code Documentation',
          description: 'Poor documentation makes onboarding difficult and slows development. Invest in comprehensive documentation.',
          category: 'Quality',
          priority: 'Medium',
          effort: 'Medium',
          impact: 'Medium',
          timeline: '2-4 weeks',
          resources: '1-2 developers, technical writer',
          details: [
            'Add comprehensive README with setup instructions',
            'Document API endpoints and data models',
            'Create architectural decision records (ADRs)',
            'Add inline code comments for complex logic',
            'Set up automated documentation generation'
          ]
        });
      }
    }

    return recommendations;
  }

  /**
   * Generates DORA metrics improvement recommendations
   */
  generateDORARecommendations(doraData) {
    const recommendations = [];

    if (!doraData) {
      recommendations.push({
        title: 'Implement DORA Metrics Tracking',
        description: 'Set up tracking for DevOps Research and Assessment (DORA) metrics to measure and improve development performance.',
        category: 'DevOps',
        priority: 'Medium',
        effort: 'Medium',
        impact: 'Medium',
        timeline: '2-3 weeks',
        resources: '1 DevOps engineer, 1 developer',
        details: [
          'Implement deployment frequency tracking',
          'Set up lead time measurement from commit to production',
          'Track change failure rate and recovery time',
          'Create DORA metrics dashboard',
          'Establish performance improvement goals'
        ]
      });
      return recommendations;
    }

    // Deployment frequency recommendations
    if (doraData.deploymentFrequency) {
      const classification = doraData.deploymentFrequency.classification;
      
      if (classification === 'Low' || classification === 'Medium') {
        recommendations.push({
          title: 'Increase Deployment Frequency',
          description: 'More frequent deployments reduce risk and enable faster feedback. Implement continuous deployment practices.',
          category: 'DevOps',
          priority: 'High',
          effort: 'High',
          impact: 'High',
          timeline: '4-8 weeks',
          resources: '2 DevOps engineers, development team',
          details: [
            'Implement automated testing pipeline',
            'Set up feature flags for safe deployments',
            'Break down large releases into smaller increments',
            'Automate deployment processes',
            'Implement blue-green or canary deployment strategies'
          ]
        });
      }
    }

    // Lead time recommendations
    if (doraData.leadTimeForChanges) {
      const classification = doraData.leadTimeForChanges.classification;
      
      if (classification === 'Low' || classification === 'Medium') {
        recommendations.push({
          title: 'Reduce Lead Time for Changes',
          description: 'Long lead times slow down feature delivery and increase risk. Streamline development and deployment processes.',
          category: 'DevOps',
          priority: 'High',
          effort: 'Medium',
          impact: 'High',
          timeline: '3-6 weeks',
          resources: '1-2 DevOps engineers, development team',
          details: [
            'Automate build and test processes',
            'Implement parallel testing strategies',
            'Reduce code review bottlenecks',
            'Streamline approval processes',
            'Optimize CI/CD pipeline performance'
          ]
        });
      }
    }

    // Change failure rate recommendations
    if (doraData.changeFailureRate) {
      const rate = doraData.changeFailureRate.rate || 0;
      
      if (rate > 15) {
        recommendations.push({
          title: 'Reduce Change Failure Rate',
          description: 'High change failure rate indicates quality issues. Improve testing and deployment practices.',
          category: 'DevOps',
          priority: 'High',
          effort: 'Medium',
          impact: 'High',
          timeline: '4-6 weeks',
          resources: '2-3 developers, 1 DevOps engineer',
          details: [
            'Enhance automated testing coverage',
            'Implement staging environment that mirrors production',
            'Add monitoring and alerting for early issue detection',
            'Improve code review processes',
            'Implement gradual rollout strategies'
          ]
        });
      }
    }

    return recommendations;
  }

  /**
   * Generates repository health recommendations
   */
  generateRepositoryRecommendations(repositoryData) {
    const recommendations = [];

    if (!repositoryData) {
      return recommendations;
    }

    // License recommendations
    if (!repositoryData.license) {
      recommendations.push({
        title: 'Add Open Source License',
        description: 'Repository lacks a license, which creates legal uncertainty for users and contributors.',
        category: 'Legal',
        priority: 'Medium',
        effort: 'Low',
        impact: 'Medium',
        timeline: '1 day',
        resources: 'Legal team, 1 developer',
        details: [
          'Choose appropriate open source license (MIT, Apache 2.0, etc.)',
          'Add LICENSE file to repository root',
          'Update README with license information',
          'Review any third-party license compatibility'
        ]
      });
    }

    // README recommendations
    if (!repositoryData.description || repositoryData.description.length < 50) {
      recommendations.push({
        title: 'Improve Repository Documentation',
        description: 'Poor repository description and documentation hurt discoverability and onboarding.',
        category: 'Documentation',
        priority: 'Medium',
        effort: 'Low',
        impact: 'Medium',
        timeline: '1-2 days',
        resources: '1 developer, technical writer',
        details: [
          'Write comprehensive repository description',
          'Add detailed README with setup instructions',
          'Include usage examples and API documentation',
          'Add contribution guidelines',
          'Create getting started guide for new developers'
        ]
      });
    }

    // Activity recommendations
    const lastUpdate = new Date(repositoryData.updated_at || repositoryData.pushed_at);
    const daysSinceUpdate = (new Date() - lastUpdate) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > 90) {
      recommendations.push({
        title: 'Increase Development Activity',
        description: 'Repository has been inactive for an extended period, which may indicate maintenance issues.',
        category: 'Maintenance',
        priority: 'Medium',
        effort: 'Medium',
        impact: 'Medium',
        timeline: 'Ongoing',
        resources: 'Development team',
        details: [
          'Review and update outdated dependencies',
          'Address accumulated technical debt',
          'Update documentation and examples',
          'Review and close stale issues and pull requests',
          'Plan regular maintenance cycles'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generates architecture and scalability recommendations
   */
  generateArchitectureRecommendations(analysisData) {
    const recommendations = [];

    // Overall tech health score recommendations
    const techHealthScore = analysisData.techHealthScore?.overall || 0;
    
    if (techHealthScore < 70) {
      recommendations.push({
        title: 'Comprehensive Technical Health Improvement',
        description: 'Overall tech health score indicates significant areas for improvement across multiple dimensions.',
        category: 'Architecture',
        priority: 'High',
        effort: 'High',
        impact: 'High',
        timeline: '3-6 months',
        resources: 'Senior developers, DevOps team, architect',
        details: [
          'Conduct comprehensive technical audit',
          'Create technical improvement roadmap',
          'Prioritize high-impact, low-effort improvements',
          'Implement regular technical health monitoring',
          'Establish technical debt management process'
        ]
      });
    }

    // Dependency recommendations
    const codeQuality = analysisData.analysis?.codeQuality;
    if (codeQuality?.dependencies) {
      const outdatedDeps = codeQuality.dependencies.outdated || [];
      
      if (outdatedDeps.length > 10) {
        recommendations.push({
          title: 'Update Outdated Dependencies',
          description: `${outdatedDeps.length} outdated dependencies create security risks and compatibility issues.`,
          category: 'Maintenance',
          priority: 'Medium',
          effort: 'Medium',
          impact: 'Medium',
          timeline: '2-4 weeks',
          resources: '1-2 developers',
          details: [
            'Audit all project dependencies for updates',
            'Prioritize security-related dependency updates',
            'Test compatibility with updated dependencies',
            'Implement automated dependency update monitoring',
            'Set up regular dependency review schedule'
          ]
        });
      }
    }

    // Performance recommendations
    if (techHealthScore < 80) {
      recommendations.push({
        title: 'Implement Performance Monitoring',
        description: 'Set up comprehensive performance monitoring to identify and address bottlenecks proactively.',
        category: 'Performance',
        priority: 'Medium',
        effort: 'Medium',
        impact: 'Medium',
        timeline: '2-3 weeks',
        resources: '1 DevOps engineer, 1 developer',
        details: [
          'Implement application performance monitoring (APM)',
          'Set up database query performance tracking',
          'Add response time and throughput metrics',
          'Create performance alerting and dashboards',
          'Establish performance benchmarks and SLAs'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Processes and enriches recommendations
   */
  processRecommendations(recommendations) {
    return recommendations.map(rec => ({
      ...rec,
      id: this.generateRecommendationId(rec),
      priorityScore: this.calculatePriorityScore(rec),
      roi: this.calculateROI(rec),
      urgency: this.calculateUrgency(rec)
    }));
  }

  /**
   * Prioritizes recommendations based on multiple factors
   */
  prioritizeRecommendations(recommendations) {
    return recommendations.sort((a, b) => {
      // Primary sort: priority score (higher is better)
      if (a.priorityScore !== b.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      
      // Secondary sort: ROI (higher is better)
      if (a.roi !== b.roi) {
        return b.roi - a.roi;
      }
      
      // Tertiary sort: effort (lower is better for equal priority/ROI)
      const effortA = this.effortScores[a.effort] || 3;
      const effortB = this.effortScores[b.effort] || 3;
      return effortA - effortB;
    });
  }

  /**
   * Calculates priority score for a recommendation
   */
  calculatePriorityScore(recommendation) {
    const priorityWeight = this.priorityWeights[recommendation.priority] || 5;
    const impactScore = this.impactScores[recommendation.impact] || 3;
    const effortScore = this.effortScores[recommendation.effort] || 3;
    
    // Higher impact and lower effort increase priority score
    return priorityWeight * impactScore / effortScore;
  }

  /**
   * Calculates ROI estimate for a recommendation
   */
  calculateROI(recommendation) {
    const impactScore = this.impactScores[recommendation.impact] || 3;
    const effortScore = this.effortScores[recommendation.effort] || 3;
    
    // Simple ROI calculation: impact / effort
    return impactScore / effortScore;
  }

  /**
   * Calculates urgency based on priority and category
   */
  calculateUrgency(recommendation) {
    const criticalCategories = ['Security', 'Performance'];
    const urgentPriorities = ['Critical', 'High'];
    
    let urgency = 1;
    
    if (urgentPriorities.includes(recommendation.priority)) {
      urgency += 2;
    }
    
    if (criticalCategories.includes(recommendation.category)) {
      urgency += 1;
    }
    
    return Math.min(urgency, 5); // Cap at 5
  }

  /**
   * Generates unique ID for recommendation
   */
  generateRecommendationId(recommendation) {
    const categoryCode = recommendation.category.substring(0, 3).toUpperCase();
    const titleCode = recommendation.title.replace(/\s+/g, '').substring(0, 8).toUpperCase();
    const timestamp = Date.now().toString(36);
    
    return `${categoryCode}-${titleCode}-${timestamp}`;
  }

  /**
   * Returns default recommendations when analysis fails
   */
  getDefaultRecommendations() {
    return [
      {
        title: 'Implement Comprehensive Testing',
        description: 'Set up automated testing pipeline with unit, integration, and end-to-end tests.',
        category: 'Quality',
        priority: 'High',
        effort: 'Medium',
        impact: 'High',
        timeline: '3-4 weeks',
        resources: '2-3 developers'
      },
      {
        title: 'Set Up Continuous Integration',
        description: 'Implement CI/CD pipeline for automated builds, tests, and deployments.',
        category: 'DevOps',
        priority: 'High',
        effort: 'Medium',
        impact: 'High',
        timeline: '2-3 weeks',
        resources: '1 DevOps engineer, 1 developer'
      },
      {
        title: 'Improve Documentation',
        description: 'Create comprehensive documentation including README, API docs, and architectural guides.',
        category: 'Documentation',
        priority: 'Medium',
        effort: 'Low',
        impact: 'Medium',
        timeline: '1-2 weeks',
        resources: '1 developer, technical writer'
      },
      {
        title: 'Implement Security Scanning',
        description: 'Set up automated security scanning for vulnerabilities and dependency issues.',
        category: 'Security',
        priority: 'High',
        effort: 'Low',
        impact: 'High',
        timeline: '1 week',
        resources: '1 developer'
      },
      {
        title: 'Add Performance Monitoring',
        description: 'Implement application performance monitoring and alerting.',
        category: 'Performance',
        priority: 'Medium',
        effort: 'Medium',
        impact: 'Medium',
        timeline: '2-3 weeks',
        resources: '1 DevOps engineer'
      }
    ].map(rec => this.processRecommendations([rec])[0]);
  }
}

module.exports = RecommendationEngine; 