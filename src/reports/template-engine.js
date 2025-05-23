const Handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class TemplateEngine {
  constructor() {
    this.templates = {};
    this.initialized = false;
    this.setupHelpers();
  }

  /**
   * Initializes templates and helpers
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Create templates directory if it doesn't exist
      const templatesDir = path.join(__dirname, 'templates');
      try {
        await fs.access(templatesDir);
      } catch {
        await fs.mkdir(templatesDir, { recursive: true });
      }

      // Initialize base templates
      await this.createBaseTemplates();
      this.initialized = true;
      console.log('Template engine initialized successfully');
    } catch (error) {
      console.error('Error initializing template engine:', error);
      this.initialized = true; // Continue with inline templates
    }
  }

  /**
   * Renders the complete Tech Health Appendix report
   */
  async renderFullReport(data) {
    await this.initialize();

    const mainTemplate = this.getMainTemplate();
    const compiledTemplate = Handlebars.compile(mainTemplate);
    
    return compiledTemplate({
      ...data,
      generatedDate: new Date().toLocaleDateString(),
      generatedTime: new Date().toLocaleTimeString()
    });
  }

  /**
   * Sets up Handlebars helpers
   */
  setupHelpers() {
    // Helper for number formatting
    Handlebars.registerHelper('formatNumber', function(value, decimals = 0) {
      if (typeof value !== 'number') return 'N/A';
      return value.toFixed(decimals);
    });

    // Helper for percentage formatting
    Handlebars.registerHelper('formatPercent', function(value) {
      if (typeof value !== 'number') return 'N/A';
      return (value * 100).toFixed(1) + '%';
    });

    // Helper for date formatting
    Handlebars.registerHelper('formatDate', function(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString();
    });

    // Helper for time formatting
    Handlebars.registerHelper('formatTime', function(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleTimeString();
    });

    // Helper for generated date
    Handlebars.registerHelper('generatedDate', function() {
      return new Date().toLocaleDateString();
    });

    // Helper for generated time
    Handlebars.registerHelper('generatedTime', function() {
      return new Date().toLocaleTimeString();
    });

    // Helper for grade colors
    Handlebars.registerHelper('gradeColor', function(grade) {
      const colors = {
        'A+': '#4CAF50', 'A': '#8BC34A', 'B+': '#CDDC39', 'B': '#FFEB3B',
        'C+': '#FFC107', 'C': '#FF9800', 'D': '#FF5722'
      };
      return colors[grade] || '#9E9E9E';
    });

    // Helper for score colors
    Handlebars.registerHelper('scoreColor', function(score) {
      if (score >= 90) return '#4CAF50';
      if (score >= 80) return '#8BC34A';
      if (score >= 70) return '#CDDC39';
      if (score >= 60) return '#FFC107';
      return '#FF5722';
    });

    // Helper for risk colors
    Handlebars.registerHelper('riskColor', function(level) {
      const colors = {
        'Low': '#4CAF50',
        'Medium': '#FF9800',
        'High': '#FF5722',
        'Critical': '#D32F2F'
      };
      return colors[level] || '#9E9E9E';
    });

    // Helper for conditional rendering - Fixed to handle missing options.inverse
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      if (arg1 == arg2) {
        return options.fn ? options.fn(this) : '';
      } else {
        return options.inverse ? options.inverse(this) : '';
      }
    });

    // Helper for array length check - Fixed to handle missing options.inverse
    Handlebars.registerHelper('ifLength', function(array, length, options) {
      if (Array.isArray(array) && array.length >= length) {
        return options.fn ? options.fn(this) : '';
      } else {
        return options.inverse ? options.inverse(this) : '';
      }
    });

    // Helper for greater than comparison
    Handlebars.registerHelper('ifGreater', function(arg1, arg2, options) {
      if (arg1 > arg2) {
        return options.fn ? options.fn(this) : '';
      } else {
        return options.inverse ? options.inverse(this) : '';
      }
    });

    // Helper for less than comparison
    Handlebars.registerHelper('ifLess', function(arg1, arg2, options) {
      if (arg1 < arg2) {
        return options.fn ? options.fn(this) : '';
      } else {
        return options.inverse ? options.inverse(this) : '';
      }
    });

    // Helper for rendering chart images
    Handlebars.registerHelper('chartImage', function(chartData) {
      if (chartData && chartData.image) {
        return new Handlebars.SafeString(
          `<img src="data:image/png;base64,${chartData.image}" 
           alt="${chartData.title}" 
           class="chart-image" 
           style="max-width: 100%; height: auto;" />`
        );
      }
      return '<div class="chart-placeholder">Chart not available</div>';
    });

    // Helper for status badges
    Handlebars.registerHelper('statusBadge', function(status, text) {
      const badgeClass = status === 'good' ? 'success' : 
                        status === 'warning' ? 'warning' : 'danger';
      return new Handlebars.SafeString(
        `<span class="badge badge-${badgeClass}">${text}</span>`
      );
    });

    // Helper for capitalizing text
    Handlebars.registerHelper('capitalize', function(str) {
      if (typeof str !== 'string') return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Helper for lowercase text
    Handlebars.registerHelper('lowercase', function(str) {
      if (typeof str !== 'string') return '';
      return str.toLowerCase();
    });

    // Helper for less than comparison with index
    Handlebars.registerHelper('ifLessThan', function(arg1, arg2, options) {
      if (arg1 < arg2) {
        return options.fn ? options.fn(this) : '';
      } else {
        return options.inverse ? options.inverse(this) : '';
      }
    });

    // Helper for array index comparison
    Handlebars.registerHelper('ifIndex', function(index, comparison, value, options) {
      let result = false;
      switch (comparison) {
        case '<':
          result = index < value;
          break;
        case '>':
          result = index > value;
          break;
        case '<=':
          result = index <= value;
          break;
        case '>=':
          result = index >= value;
          break;
        case '==':
          result = index == value;
          break;
        default:
          result = false;
      }
      
      if (result) {
        return options.fn ? options.fn(this) : '';
      } else {
        return options.inverse ? options.inverse(this) : '';
      }
    });

    // Helper for array existence check
    Handlebars.registerHelper('ifExists', function(value, options) {
      if (value !== undefined && value !== null) {
        return options.fn ? options.fn(this) : '';
      } else {
        return options.inverse ? options.inverse(this) : '';
      }
    });

    // Helper for badge styling
    Handlebars.registerHelper('badge', function(type, text) {
      const badgeClasses = {
        'critical': 'badge-danger',
        'high': 'badge-warning', 
        'medium': 'badge-warning',
        'low': 'badge-info',
        'success': 'badge-success',
        'warning': 'badge-warning',
        'danger': 'badge-danger',
        'info': 'badge-info'
      };
      
      const badgeClass = badgeClasses[type] || 'badge-secondary';
      return new Handlebars.SafeString(
        `<span class="badge ${badgeClass}">${text}</span>`
      );
    });
  }

  /**
   * Creates base template files
   */
  async createBaseTemplates() {
    const templatesDir = path.join(__dirname, 'templates');
    
    // Main template
    const mainTemplate = this.getMainTemplate();
    await fs.writeFile(path.join(templatesDir, 'main.hbs'), mainTemplate);
    
    console.log('Base templates created');
  }

  /**
   * Returns the main HTML template
   */
  getMainTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tech Health Appendix - {{repository.name}}</title>
    <style>
        ${this.getStyles()}
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Cover Page -->
        <div class="page cover-page">
            <div class="header">
                <h1>Tech Health Appendix</h1>
                <h2>{{repository.name}}</h2>
                <div class="score-circle">
                    <div class="score-value" style="color: {{scoreColor techHealthScore.overall}}">
                        {{techHealthScore.overall}}/100
                    </div>
                    <div class="score-grade" style="color: {{gradeColor techHealthScore.grade}}">
                        Grade {{techHealthScore.grade}}
                    </div>
                </div>
            </div>
            <div class="cover-info">
                <p><strong>Repository:</strong> {{repository.url}}</p>
                <p><strong>Analysis Date:</strong> {{generatedDate}} {{generatedTime}}</p>
                <p><strong>Report ID:</strong> {{metadata.reportId}}</p>
                <p><strong>Generated for:</strong> Investment Due Diligence</p>
            </div>
        </div>

        <!-- Executive Summary -->
        <div class="page">
            <h1>Executive Summary</h1>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Overall Assessment</h3>
                    <p>{{executiveSummary.overallAssessment}}</p>
                </div>
                
                <div class="summary-card">
                    <h3>Investment Readiness</h3>
                    <div class="readiness-level {{executiveSummary.investmentReadiness.level}}">
                        {{executiveSummary.investmentReadiness.level}}
                    </div>
                    <p>{{executiveSummary.investmentReadiness.description}}</p>
                    <p><strong>Recommendation:</strong> {{executiveSummary.investmentReadiness.recommendation}}</p>
                </div>
            </div>

            <div class="insights-section">
                <div class="strengths">
                    <h3>Key Strengths</h3>
                    <ul>
                        {{#each executiveSummary.keyStrengths}}
                        <li>{{this}}</li>
                        {{/each}}
                    </ul>
                </div>
                
                <div class="risks">
                    <h3>Critical Risks</h3>
                    {{#ifLength executiveSummary.criticalRisks 1}}
                    <ul>
                        {{#each executiveSummary.criticalRisks}}
                        <li class="risk-item">{{this}}</li>
                        {{/each}}
                    </ul>
                    {{else}}
                    <p class="no-risks">No critical risks identified</p>
                    {{/ifLength}}
                </div>
            </div>

            <div class="quick-wins">
                <h3>Quick Wins</h3>
                <ul>
                    {{#each executiveSummary.quickWins}}
                    <li>{{this}}</li>
                    {{/each}}
                </ul>
            </div>
        </div>

        <!-- Technical Metrics Dashboard -->
        <div class="page">
            <h1>Technical Metrics Dashboard</h1>
            
            <div class="metrics-overview">
                <div class="metric-card">
                    <h3>Tech Health Score</h3>
                    {{chartImage charts.techHealthScore}}
                    <p class="metric-description">{{techHealthScore.interpretation.description}}</p>
                </div>
                
                <div class="metric-card">
                    <h3>Code Quality Overview</h3>
                    {{chartImage charts.codeQualityOverview}}
                    {{#if codeQuality}}
                    <div class="quality-stats">
                        <p><strong>Overall Score:</strong> {{formatNumber codeQuality.overall.score}}/100</p>
                        <p><strong>Security Issues:</strong> {{codeQuality.security.issuesFound}}</p>
                        <p><strong>High Complexity Files:</strong> {{codeQuality.complexity.highComplexityFiles}}</p>
                    </div>
                    {{/if}}
                </div>
            </div>

            <div class="metrics-grid">
                <div class="chart-section">
                    <h3>DORA Metrics Performance</h3>
                    {{chartImage charts.doraMetrics}}
                    {{#if doraMetrics}}
                    <div class="dora-summary">
                        <div class="dora-metric">
                            <span>Deployment Frequency:</span>
                            <span class="metric-value">{{doraMetrics.deploymentFrequency.classification}}</span>
                        </div>
                        <div class="dora-metric">
                            <span>Lead Time:</span>
                            <span class="metric-value">{{doraMetrics.leadTime.classification}}</span>
                        </div>
                        <div class="dora-metric">
                            <span>Change Failure Rate:</span>
                            <span class="metric-value">{{doraMetrics.changeFailureRate.classification}}</span>
                        </div>
                        <div class="dora-metric">
                            <span>Recovery Time:</span>
                            <span class="metric-value">{{doraMetrics.recoveryTime.classification}}</span>
                        </div>
                    </div>
                    {{/if}}
                </div>

                <div class="chart-section">
                    <h3>Industry Benchmarking</h3>
                    {{chartImage charts.industryComparison}}
                    {{#if benchmarking}}
                    <p><strong>Industry Position:</strong> {{benchmarking.industryPosition}}</p>
                    <p><strong>Peer Ranking:</strong> {{formatPercent benchmarking.peerRanking}} percentile</p>
                    {{/if}}
                </div>
            </div>

            <div class="detailed-charts">
                <div class="chart-row">
                    <div class="chart-half">
                        <h4>Code Complexity Distribution</h4>
                        {{chartImage charts.complexityDistribution}}
                    </div>
                    <div class="chart-half">
                        <h4>Security Analysis</h4>
                        {{chartImage charts.securityIssues}}
                    </div>
                </div>
                
                <div class="chart-row">
                    <div class="chart-half">
                        <h4>Repository Health</h4>
                        {{chartImage charts.repositoryHealth}}
                    </div>
                    <div class="chart-half">
                        <h4>Language Distribution</h4>
                        {{chartImage charts.languageDistribution}}
                    </div>
                </div>
            </div>
        </div>

        <!-- Risk Assessment -->
        <div class="page">
            <h1>Risk Assessment</h1>
            
            <div class="risk-overview">
                <div class="risk-level-indicator">
                    <h3>Overall Risk Level</h3>
                    <div class="risk-gauge">
                        {{#ifGreater techHealthScore.overall 85}}
                        <div class="risk-level low">LOW RISK</div>
                        {{else}}
                        {{#ifGreater techHealthScore.overall 70}}
                        <div class="risk-level medium">MEDIUM RISK</div>
                        {{else}}
                        <div class="risk-level high">HIGH RISK</div>
                        {{/ifGreater}}
                        {{/ifGreater}}
                    </div>
                </div>
            </div>

            <div class="risk-categories">
                <div class="risk-category">
                    <h3>Security Vulnerabilities</h3>
                    {{#if codeQuality.security}}
                    <div class="risk-details">
                        <p><strong>Issues Found:</strong> {{codeQuality.security.issuesFound}}</p>
                        <p><strong>Risk Level:</strong> 
                            <span style="color: {{riskColor codeQuality.security.riskLevel}}">
                                {{codeQuality.security.riskLevel}}
                            </span>
                        </p>
                    </div>
                    {{else}}
                    <p>No security analysis data available</p>
                    {{/if}}
                </div>

                <div class="risk-category">
                    <h3>Technical Debt</h3>
                    {{#if codeQuality.complexity}}
                    <div class="risk-details">
                        <p><strong>Average Complexity:</strong> {{formatNumber codeQuality.complexity.average 1}}</p>
                        <p><strong>High Complexity Files:</strong> {{codeQuality.complexity.highComplexityFiles}}</p>
                        <p><strong>Maintainability Score:</strong> {{formatNumber codeQuality.maintainability.score}}/100</p>
                    </div>
                    {{else}}
                    <p>No complexity analysis data available</p>
                    {{/if}}
                </div>

                <div class="risk-category">
                    <h3>Scalability Concerns</h3>
                    <div class="risk-details">
                        {{#if doraMetrics}}
                        <p><strong>Deployment Readiness:</strong> {{doraMetrics.deploymentFrequency.classification}}</p>
                        <p><strong>Change Management:</strong> {{doraMetrics.leadTime.classification}}</p>
                        {{else}}
                        <p>Deployment metrics analysis recommended for scalability assessment</p>
                        {{/if}}
                    </div>
                </div>
            </div>

            <div class="mitigation-strategies">
                <h3>Risk Mitigation Strategies</h3>
                <div class="strategies-list">
                    {{#each recommendations}}
                    {{#ifEquals this.category "Security"}}
                    <div class="strategy-item">
                        <h4>{{this.title}}</h4>
                        <p>{{this.description}}</p>
                        <p><strong>Priority:</strong> {{this.priority}} | <strong>Effort:</strong> {{this.effort}}</p>
                    </div>
                    {{/ifEquals}}
                    {{/each}}
                </div>
            </div>
        </div>

        <!-- Optimization Roadmap -->
        <div class="page">
            <h1>Optimization Roadmap</h1>
            
            <div class="roadmap-overview">
                <h3>Prioritized Improvement Recommendations</h3>
                <p>The following recommendations are prioritized by impact and implementation effort:</p>
            </div>

            <div class="recommendations-timeline">
                <div class="timeline-section">
                    <h3>Immediate Actions (0-30 days)</h3>
                    <div class="recommendations-list">
                        {{#each recommendations}}
                        {{#ifEquals this.priority "High"}}
                        <div class="recommendation-card priority-high">
                            <h4>{{this.title}}</h4>
                            <p>{{this.description}}</p>
                            <div class="recommendation-meta">
                                <span class="category">{{this.category}}</span>
                                <span class="effort">{{this.effort}} effort</span>
                                <span class="impact">{{this.impact}} impact</span>
                            </div>
                            {{#if this.resources}}
                            <p><strong>Resources needed:</strong> {{this.resources}}</p>
                            {{/if}}
                        </div>
                        {{/ifEquals}}
                        {{/each}}
                    </div>
                </div>

                <div class="timeline-section">
                    <h3>Short Term (1-3 months)</h3>
                    <div class="recommendations-list">
                        {{#each recommendations}}
                        {{#ifEquals this.priority "Medium"}}
                        <div class="recommendation-card priority-medium">
                            <h4>{{this.title}}</h4>
                            <p>{{this.description}}</p>
                            <div class="recommendation-meta">
                                <span class="category">{{this.category}}</span>
                                <span class="effort">{{this.effort}} effort</span>
                                <span class="impact">{{this.impact}} impact</span>
                            </div>
                        </div>
                        {{/ifEquals}}
                        {{/each}}
                    </div>
                </div>

                <div class="timeline-section">
                    <h3>Long Term (3-6 months)</h3>
                    <div class="recommendations-list">
                        {{#each recommendations}}
                        {{#ifEquals this.priority "Low"}}
                        <div class="recommendation-card priority-low">
                            <h4>{{this.title}}</h4>
                            <p>{{this.description}}</p>
                            <div class="recommendation-meta">
                                <span class="category">{{this.category}}</span>
                                <span class="effort">{{this.effort}} effort</span>
                                <span class="impact">{{this.impact}} impact</span>
                            </div>
                        </div>
                        {{/ifEquals}}
                        {{/each}}
                    </div>
                </div>
            </div>

            <div class="roi-analysis">
                <h3>Expected Return on Investment</h3>
                <div class="roi-grid">
                    <div class="roi-card">
                        <h4>Development Velocity</h4>
                        <p>Implementing recommended practices can improve deployment frequency by 25-40%</p>
                    </div>
                    <div class="roi-card">
                        <h4>Security Posture</h4>
                        <p>Addressing security vulnerabilities reduces breach risk and compliance costs</p>
                    </div>
                    <div class="roi-card">
                        <h4>Maintenance Costs</h4>
                        <p>Reducing technical debt can decrease maintenance overhead by 15-30%</p>
                    </div>
                    <div class="roi-card">
                        <h4>Team Productivity</h4>
                        <p>Better code quality and practices improve developer satisfaction and retention</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Appendices -->
        <div class="page">
            <h1>Appendices</h1>
            
            <div class="appendix-section">
                <h2>A. Detailed Metrics Breakdown</h2>
                
                <h3>Tech Health Score Components</h3>
                <table class="metrics-table">
                    <thead>
                        <tr>
                            <th>Component</th>
                            <th>Weight</th>
                            <th>Score</th>
                            <th>Contribution</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#each techHealthScore.breakdown}}
                        <tr>
                            <td>{{@key}}</td>
                            <td>{{this.weight}}%</td>
                            <td>{{formatNumber this.score}}</td>
                            <td>{{formatNumber this.contribution 1}}</td>
                        </tr>
                        {{/each}}
                    </tbody>
                </table>

                <h3>Repository Information</h3>
                <table class="info-table">
                    <tr><td><strong>Full Name:</strong></td><td>{{repository.name}}</td></tr>
                    <tr><td><strong>Description:</strong></td><td>{{repository.description}}</td></tr>
                    <tr><td><strong>Primary Language:</strong></td><td>{{repository.language}}</td></tr>
                    <tr><td><strong>Stars:</strong></td><td>{{repository.stars}}</td></tr>
                    <tr><td><strong>Forks:</strong></td><td>{{repository.forks}}</td></tr>
                    <tr><td><strong>URL:</strong></td><td><a href="{{repository.url}}">{{repository.url}}</a></td></tr>
                </table>
            </div>

            <div class="appendix-section">
                <h2>B. Methodology</h2>
                <div class="methodology">
                    <h3>Analysis Framework</h3>
                    <p>This Tech Health assessment is based on industry-standard metrics and practices:</p>
                    <ul>
                        <li><strong>DORA Metrics:</strong> DevOps Research and Assessment program metrics for deployment practices</li>
                        <li><strong>Code Quality:</strong> Static analysis including complexity, security, and maintainability</li>
                        <li><strong>Industry Benchmarking:</strong> Comparison against similar repositories and industry standards</li>
                        <li><strong>Security Assessment:</strong> Pattern-based vulnerability detection and dependency analysis</li>
                    </ul>

                    <h3>Scoring Methodology</h3>
                    <p>The overall Tech Health Score is calculated using weighted components:</p>
                    <ul>
                        <li>Code Quality: 35%</li>
                        <li>DORA Metrics: 25%</li>
                        <li>Benchmarking: 25%</li>
                        <li>Repository Health: 15%</li>
                    </ul>
                </div>
            </div>

            <div class="appendix-section">
                <h2>C. Data Sources</h2>
                <div class="data-sources">
                    <h3>Primary Sources</h3>
                    <ul>
                        <li>GitHub Repository API</li>
                        <li>Git commit history analysis</li>
                        <li>Static code analysis</li>
                        <li>Dependency vulnerability databases</li>
                    </ul>

                    <h3>Analysis Metadata</h3>
                    <table class="info-table">
                        <tr><td><strong>Analysis Version:</strong></td><td>{{analysisMetadata.analysisVersion}}</td></tr>
                        <tr><td><strong>Analysis Time:</strong></td><td>{{analysisMetadata.analysisTime}}ms</td></tr>
                        <tr><td><strong>Analyzed At:</strong></td><td>{{analysisMetadata.analyzedAt}}</td></tr>
                        <tr><td><strong>Report Generated:</strong></td><td>{{generatedDate}} {{generatedTime}}</td></tr>
                    </table>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Returns the CSS styles for the report
   */
  getStyles() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }

        .report-container {
            max-width: 8.5in;
            margin: 0 auto;
            background: white;
        }

        .page {
            min-height: 11in;
            padding: 1in;
            page-break-after: always;
            background: white;
        }

        .page:last-child {
            page-break-after: auto;
        }

        /* Cover Page */
        .cover-page {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .cover-page h1 {
            font-size: 3em;
            margin-bottom: 0.5em;
            font-weight: 300;
        }

        .cover-page h2 {
            font-size: 2em;
            margin-bottom: 1em;
            opacity: 0.9;
        }

        .score-circle {
            width: 200px;
            height: 200px;
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            margin: 1em 0;
            background: rgba(255,255,255,0.1);
        }

        .score-value {
            font-size: 2.5em;
            font-weight: bold;
        }

        .score-grade {
            font-size: 1.2em;
            opacity: 0.9;
        }

        .cover-info {
            margin-top: 2em;
            text-align: left;
        }

        .cover-info p {
            margin: 0.5em 0;
            opacity: 0.9;
        }

        /* Headers */
        h1 {
            font-size: 2.5em;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 0.3em;
            margin-bottom: 1em;
        }

        h2 {
            font-size: 2em;
            color: #34495e;
            margin-bottom: 0.8em;
        }

        h3 {
            font-size: 1.5em;
            color: #2c3e50;
            margin-bottom: 0.6em;
        }

        h4 {
            font-size: 1.2em;
            color: #34495e;
            margin-bottom: 0.4em;
        }

        /* Layout Grids */
        .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2em;
            margin-bottom: 2em;
        }

        .summary-card {
            background: #f8f9fa;
            padding: 1.5em;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }

        .insights-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2em;
            margin-bottom: 2em;
        }

        .strengths {
            background: #d4edda;
            padding: 1.5em;
            border-radius: 8px;
            border-left: 4px solid #28a745;
        }

        .risks {
            background: #f8d7da;
            padding: 1.5em;
            border-radius: 8px;
            border-left: 4px solid #dc3545;
        }

        .quick-wins {
            background: #fff3cd;
            padding: 1.5em;
            border-radius: 8px;
            border-left: 4px solid #ffc107;
        }

        /* Metrics */
        .metrics-overview {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2em;
            margin-bottom: 2em;
        }

        .metric-card {
            background: #f8f9fa;
            padding: 1.5em;
            border-radius: 8px;
            text-align: center;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2em;
            margin-bottom: 2em;
        }

        .chart-section {
            background: #f8f9fa;
            padding: 1.5em;
            border-radius: 8px;
        }

        .detailed-charts {
            margin-top: 2em;
        }

        .chart-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2em;
            margin-bottom: 2em;
        }

        .chart-half {
            background: #f8f9fa;
            padding: 1em;
            border-radius: 8px;
            text-align: center;
        }

        .chart-image {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
        }

        .chart-placeholder {
            background: #e9ecef;
            padding: 2em;
            border-radius: 4px;
            color: #6c757d;
            text-align: center;
        }

        /* DORA Summary */
        .dora-summary {
            text-align: left;
            margin-top: 1em;
        }

        .dora-metric {
            display: flex;
            justify-content: space-between;
            margin: 0.5em 0;
            padding: 0.5em;
            background: rgba(255,255,255,0.7);
            border-radius: 4px;
        }

        .metric-value {
            font-weight: bold;
            color: #3498db;
        }

        /* Risk Assessment */
        .risk-overview {
            text-align: center;
            margin-bottom: 2em;
        }

        .risk-gauge {
            margin: 1em 0;
        }

        .risk-level {
            display: inline-block;
            padding: 1em 2em;
            border-radius: 8px;
            font-weight: bold;
            font-size: 1.2em;
        }

        .risk-level.low {
            background: #d4edda;
            color: #155724;
        }

        .risk-level.medium {
            background: #fff3cd;
            color: #856404;
        }

        .risk-level.high {
            background: #f8d7da;
            color: #721c24;
        }

        .risk-categories {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2em;
            margin-bottom: 2em;
        }

        .risk-category {
            background: #f8f9fa;
            padding: 1.5em;
            border-radius: 8px;
            border-left: 4px solid #6c757d;
        }

        .risk-details {
            margin-top: 1em;
        }

        .mitigation-strategies {
            margin-top: 2em;
        }

        .strategy-item {
            background: #f8f9fa;
            padding: 1em;
            margin: 1em 0;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }

        /* Recommendations */
        .recommendations-timeline {
            margin-bottom: 2em;
        }

        .timeline-section {
            margin-bottom: 2em;
        }

        .recommendations-list {
            margin-top: 1em;
        }

        .recommendation-card {
            background: #f8f9fa;
            padding: 1.5em;
            margin: 1em 0;
            border-radius: 8px;
            border-left: 4px solid #6c757d;
        }

        .recommendation-card.priority-high {
            border-left-color: #dc3545;
            background: #f8d7da;
        }

        .recommendation-card.priority-medium {
            border-left-color: #ffc107;
            background: #fff3cd;
        }

        .recommendation-card.priority-low {
            border-left-color: #28a745;
            background: #d4edda;
        }

        .recommendation-meta {
            margin-top: 1em;
            display: flex;
            gap: 1em;
        }

        .recommendation-meta span {
            background: rgba(255,255,255,0.7);
            padding: 0.25em 0.5em;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .roi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5em;
            margin-top: 1em;
        }

        .roi-card {
            background: #f8f9fa;
            padding: 1.5em;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }

        /* Tables */
        .metrics-table, .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
        }

        .metrics-table th, .metrics-table td,
        .info-table th, .info-table td {
            padding: 0.75em;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }

        .metrics-table th {
            background: #f8f9fa;
            font-weight: bold;
        }

        .info-table td:first-child {
            background: #f8f9fa;
            font-weight: bold;
            width: 30%;
        }

        /* Lists */
        ul {
            padding-left: 1.5em;
        }

        li {
            margin: 0.5em 0;
        }

        .risk-item {
            color: #721c24;
            font-weight: 500;
        }

        .no-risks {
            color: #155724;
            font-style: italic;
        }

        /* Investment Readiness */
        .readiness-level {
            display: inline-block;
            padding: 0.5em 1em;
            border-radius: 4px;
            font-weight: bold;
            margin: 0.5em 0;
        }

        .readiness-level.High {
            background: #d4edda;
            color: #155724;
        }

        .readiness-level.Moderate {
            background: #fff3cd;
            color: #856404;
        }

        .readiness-level.Low {
            background: #f8d7da;
            color: #721c24;
        }

        /* Badges */
        .badge {
            display: inline-block;
            padding: 0.25em 0.5em;
            border-radius: 4px;
            font-size: 0.9em;
            font-weight: 500;
        }

        .badge-success {
            background: #d4edda;
            color: #155724;
        }

        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }

        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }

        /* Print Styles */
        @media print {
            .page {
                page-break-after: always;
            }
            
            .page:last-child {
                page-break-after: auto;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }

        /* Enhanced Code Quality Styles */
        .code-quality-detailed {
            margin: 2em 0;
            padding: 1.5em;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }

        .full-width {
            grid-column: 1 / -1;
        }

        .breakdown-stats {
            margin-top: 1.5em;
        }

        .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1em;
            margin-top: 1em;
        }

        .stat-item {
            background: rgba(255, 255, 255, 0.8);
            padding: 1em;
            border-radius: 6px;
            text-align: center;
            border: 1px solid #e9ecef;
        }

        .stat-label {
            display: block;
            font-size: 0.9em;
            color: #6c757d;
            margin-bottom: 0.5em;
            font-weight: 500;
        }

        .stat-value {
            display: block;
            font-size: 1.3em;
            font-weight: bold;
        }

        .stat-value.good {
            color: #28a745;
        }

        .stat-value.warning {
            color: #ffc107;
        }

        .stat-value.poor {
            color: #dc3545;
        }

        .testing-details, .security-details {
            margin-top: 1.5em;
            padding: 1em;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 6px;
            border-left: 3px solid #17a2b8;
        }

        .testing-stats, .security-stats {
            margin-top: 0.5em;
        }

        .testing-stats p, .security-stats p {
            margin: 0.3em 0;
            font-size: 0.95em;
        }

        .severity-breakdown {
            display: flex;
            gap: 1em;
            flex-wrap: wrap;
            margin-top: 0.5em;
        }

        .severity {
            padding: 0.25em 0.5em;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 500;
        }

        .severity.critical {
            background: #f8d7da;
            color: #721c24;
        }

        .severity.high {
            background: #ffeaa7;
            color: #856404;
        }

        .severity.medium {
            background: #fff3cd;
            color: #856404;
        }

        .severity.low {
            background: #d1ecf1;
            color: #0c5460;
        }

        .quality-stats {
            margin-top: 1em;
        }

        .quality-stats p {
            margin: 0.4em 0;
            font-size: 0.95em;
        }

        .quality-stats strong {
            color: #2c3e50;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .summary-grid,
            .insights-section,
            .metrics-overview,
            .metrics-grid,
            .chart-row,
            .risk-categories,
            .roi-grid,
            .stat-grid {
                grid-template-columns: 1fr;
            }
            
            .page {
                padding: 0.5in;
            }
            
            .score-circle {
                width: 150px;
                height: 150px;
            }
            
            .score-value {
                font-size: 2em;
            }

            .severity-breakdown {
                flex-direction: column;
                gap: 0.5em;
            }

            .code-quality-detailed {
                padding: 1em;
            }
        }
    `;
  }
}

module.exports = TemplateEngine; 