const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const Chart = require('chart.js');

class ChartGenerator {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: this.width,
      height: this.height,
      backgroundColour: 'white'
    });

    // Chart configuration defaults
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          font: {
            size: 16,
            weight: 'bold'
          }
        }
      }
    };
  }

  /**
   * Generates Tech Health Score Chart (Gauge style)
   */
  async generateTechHealthScoreChart(techHealthScore) {
    const score = techHealthScore.overall || 0;
    const breakdown = techHealthScore.breakdown || {};
    
    const configuration = {
      type: 'doughnut',
      data: {
        labels: ['Score', 'Remaining'],
        datasets: [{
          data: [score, 100 - score],
          backgroundColor: [
            this.getScoreColor(score),
            '#e0e0e0'
          ],
          borderWidth: 0,
          cutout: '70%'
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: `Tech Health Score: ${score}/100 (${techHealthScore.grade || 'N/A'})`
          },
          legend: {
            display: false
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'techHealthScore',
      title: 'Tech Health Score',
      image: imageBuffer.toString('base64'),
      data: { score, breakdown }
    };
  }

  /**
   * Generates Enhanced Code Quality Overview Chart
   */
  async generateCodeQualityChart(codeQuality) {
    // Enhanced metrics with proper scoring
    const metrics = {
      'Complexity': codeQuality.complexity?.score || 0,
      'Security': codeQuality.security?.score || 0,
      'Maintainability': codeQuality.maintainability?.score || 0,
      'Dependencies': codeQuality.dependencies?.score || 0,
      'Testing': codeQuality.testing?.score || 0,
      'Code Style': codeQuality.codeStyle?.score || 0
    };

    // Generate comprehensive radar chart with multiple datasets
    const configuration = {
      type: 'radar',
      data: {
        labels: Object.keys(metrics),
        datasets: [
          {
            label: 'Current Score',
            data: Object.values(metrics),
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 3,
            pointBackgroundColor: 'rgba(34, 197, 94, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(34, 197, 94, 1)',
            pointHoverRadius: 8
          },
          {
            label: 'Industry Standard (75)',
            data: Array(Object.keys(metrics).length).fill(75),
            backgroundColor: 'rgba(107, 114, 128, 0.1)',
            borderColor: 'rgba(107, 114, 128, 0.6)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointBackgroundColor: 'rgba(107, 114, 128, 0.6)',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: `Code Quality Overview - Overall Score: ${codeQuality.overall?.score || 0}/100 (${codeQuality.overall?.grade || 'N/A'})`,
            font: {
              size: 18,
              weight: 'bold'
            }
          },
          legend: {
            position: 'bottom',
            labels: {
              font: {
                size: 12
              },
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.r || 0;
                const metricName = context.label || '';
                
                if (label === 'Current Score') {
                  const grade = value >= 90 ? 'A' : value >= 80 ? 'B' : value >= 70 ? 'C' : value >= 60 ? 'D' : 'F';
                  return `${metricName}: ${value}/100 (${grade})`;
                }
                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            min: 0,
            max: 100,
            stepSize: 20,
            angleLines: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            pointLabels: {
              font: {
                size: 12,
                weight: 'bold'
              },
              color: '#374151'
            },
            ticks: {
              display: true,
              font: {
                size: 10
              },
              color: '#6B7280',
              backdropColor: 'rgba(255, 255, 255, 0.8)'
            }
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'codeQualityOverview',
      title: 'Enhanced Code Quality Overview',
      image: imageBuffer.toString('base64'),
      data: {
        metrics,
        overallScore: codeQuality.overall?.score || 0,
        grade: codeQuality.overall?.grade || 'N/A',
        breakdown: codeQuality.overall?.breakdown || {},
        insights: this.generateCodeQualityInsights(codeQuality)
      }
    };
  }

  /**
   * Generates detailed code quality breakdown chart
   */
  async generateCodeQualityBreakdownChart(codeQuality) {
    const breakdown = codeQuality.overall?.breakdown || {};
    const weights = {
      'Complexity (20%)': 0.20,
      'Security (25%)': 0.25,
      'Maintainability (15%)': 0.15,
      'Dependencies (15%)': 0.15,
      'Testing (15%)': 0.15,
      'Code Style (10%)': 0.10
    };

    const scores = [
      breakdown.complexity || 0,
      breakdown.security || 0,
      breakdown.maintainability || 0,
      breakdown.dependencies || 0,
      breakdown.testing || 0,
      breakdown.codeStyle || 0
    ];

    const colors = scores.map(score => {
      if (score >= 90) return '#10B981'; // Green
      if (score >= 80) return '#3B82F6'; // Blue
      if (score >= 70) return '#F59E0B'; // Yellow
      if (score >= 60) return '#EF4444'; // Red
      return '#6B7280'; // Gray
    });

    const configuration = {
      type: 'bar',
      data: {
        labels: Object.keys(weights),
        datasets: [{
          label: 'Component Scores',
          data: scores,
          backgroundColor: colors,
          borderColor: colors.map(color => color + '80'),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        ...this.defaultOptions,
        indexAxis: 'y',
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: 'Code Quality Component Breakdown'
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          },
          y: {
            grid: {
              display: false
            }
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'codeQualityBreakdown',
      title: 'Code Quality Component Breakdown',
      image: imageBuffer.toString('base64'),
      data: { breakdown, weights }
    };
  }

  /**
   * Generates code quality insights
   */
  generateCodeQualityInsights(codeQuality) {
    const insights = [];
    const metrics = codeQuality.overall?.breakdown || {};

    // Testing insights
    if (metrics.testing >= 90) {
      insights.push('Excellent testing practices with comprehensive coverage');
    } else if (metrics.testing < 50) {
      insights.push('Testing infrastructure needs significant improvement');
    }

    // Security insights
    if (metrics.security >= 95) {
      insights.push('Outstanding security posture with no critical vulnerabilities');
    } else if (metrics.security < 70) {
      insights.push('Security vulnerabilities require immediate attention');
    }

    // Complexity insights
    if (metrics.complexity >= 85) {
      insights.push('Well-structured code with low complexity');
    } else if (metrics.complexity < 60) {
      insights.push('High code complexity may impact maintainability');
    }

    // Dependencies insights
    if (metrics.dependencies >= 80) {
      insights.push('Modern dependency management with up-to-date packages');
    } else if (metrics.dependencies < 60) {
      insights.push('Dependency health needs attention - outdated or vulnerable packages');
    }

    return insights.slice(0, 4); // Top 4 insights
  }

  /**
   * Generates Code Complexity Distribution Chart
   */
  async generateComplexityChart(complexityData) {
    if (!complexityData) {
      return this.generatePlaceholderChart('Code Complexity Distribution', 'No complexity data available');
    }

    const complexityRanges = {
      'Low (1-5)': 0,
      'Medium (6-10)': 0,
      'High (11-20)': 0,
      'Very High (21+)': 0
    };

    // Handle different data structures for functions
    let functions = [];
    if (complexityData.functions && Array.isArray(complexityData.functions)) {
      functions = complexityData.functions;
    } else if (complexityData.functionMetrics && Array.isArray(complexityData.functionMetrics)) {
      functions = complexityData.functionMetrics;
    } else if (complexityData.complexFiles && Array.isArray(complexityData.complexFiles)) {
      // Fallback: extract functions from complex files
      functions = complexityData.complexFiles.reduce((acc, file) => {
        if (file.functions && Array.isArray(file.functions)) {
          acc.push(...file.functions);
        }
        return acc;
      }, []);
    }

    // Categorize complexity values
    if (functions.length > 0) {
      functions.forEach(func => {
        const complexity = func.complexity || 0;
        if (complexity <= 5) complexityRanges['Low (1-5)']++;
        else if (complexity <= 10) complexityRanges['Medium (6-10)']++;
        else if (complexity <= 20) complexityRanges['High (11-20)']++;
        else complexityRanges['Very High (21+)']++;
      });
    } else if (complexityData.averageComplexity) {
      // Fallback: create distribution based on average complexity
      const avg = complexityData.averageComplexity;
      const totalFiles = complexityData.totalFiles || 10;
      
      if (avg <= 5) {
        complexityRanges['Low (1-5)'] = Math.round(totalFiles * 0.8);
        complexityRanges['Medium (6-10)'] = Math.round(totalFiles * 0.2);
      } else if (avg <= 10) {
        complexityRanges['Low (1-5)'] = Math.round(totalFiles * 0.4);
        complexityRanges['Medium (6-10)'] = Math.round(totalFiles * 0.5);
        complexityRanges['High (11-20)'] = Math.round(totalFiles * 0.1);
      } else if (avg <= 15) {
        complexityRanges['Low (1-5)'] = Math.round(totalFiles * 0.2);
        complexityRanges['Medium (6-10)'] = Math.round(totalFiles * 0.4);
        complexityRanges['High (11-20)'] = Math.round(totalFiles * 0.3);
        complexityRanges['Very High (21+)'] = Math.round(totalFiles * 0.1);
      } else {
        complexityRanges['Medium (6-10)'] = Math.round(totalFiles * 0.2);
        complexityRanges['High (11-20)'] = Math.round(totalFiles * 0.5);
        complexityRanges['Very High (21+)'] = Math.round(totalFiles * 0.3);
      }
    } else {
      // Final fallback: return placeholder
      return this.generatePlaceholderChart('Code Complexity Distribution', 'Insufficient complexity data');
    }

    // Check if we have any data to show
    const totalFunctions = Object.values(complexityRanges).reduce((sum, count) => sum + count, 0);
    if (totalFunctions === 0) {
      return this.generatePlaceholderChart('Code Complexity Distribution', 'No functions analyzed');
    }

    const configuration = {
      type: 'bar',
      data: {
        labels: Object.keys(complexityRanges),
        datasets: [{
          label: 'Number of Functions',
          data: Object.values(complexityRanges),
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(255, 99, 132, 0.8)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 99, 132, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: `Code Complexity Distribution (${totalFunctions} Functions Analyzed)`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Functions'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Complexity Range'
            }
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'complexity',
      title: 'Code Complexity Distribution',
      image: imageBuffer.toString('base64'),
      data: complexityRanges
    };
  }

  /**
   * Generates Security Issues Chart
   */
  async generateSecurityChart(securityData) {
    if (!securityData || !securityData.vulnerabilities) {
      return this.generatePlaceholderChart('Security Analysis', 'No security data available');
    }

    const severityCounts = {
      'Critical': 0,
      'High': 0,
      'Medium': 0,
      'Low': 0
    };

    securityData.vulnerabilities.forEach(vuln => {
      const severity = vuln.severity || 'Low';
      if (severityCounts[severity] !== undefined) {
        severityCounts[severity]++;
      }
    });

    const configuration = {
      type: 'doughnut',
      data: {
        labels: Object.keys(severityCounts),
        datasets: [{
          data: Object.values(severityCounts),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: `Security Issues by Severity (${securityData.vulnerabilities.length} total)`
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'security',
      title: 'Security Issues',
      image: imageBuffer.toString('base64'),
      data: severityCounts
    };
  }

  /**
   * Generates DORA Metrics Chart
   */
  async generateDORAMetricsChart(doraMetrics) {
    const metrics = {
      'Deployment Frequency': this.normalizeDoraScore(doraMetrics.deploymentFrequency?.score),
      'Lead Time': this.normalizeDoraScore(doraMetrics.leadTimeForChanges?.score),
      'Change Failure Rate': this.normalizeDoraScore(doraMetrics.changeFailureRate?.score),
      'Recovery Time': this.normalizeDoraScore(doraMetrics.meanTimeToRecovery?.score)
    };

    const configuration = {
      type: 'radar',
      data: {
        labels: Object.keys(metrics),
        datasets: [{
          label: 'DORA Metrics Performance',
          data: Object.values(metrics),
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(153, 102, 255, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(153, 102, 255, 1)'
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: 'DORA Metrics Performance'
          }
        },
        scales: {
          r: {
            angleLines: {
              display: true
            },
            suggestedMin: 0,
            suggestedMax: 100
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'doraMetrics',
      title: 'DORA Metrics',
      image: imageBuffer.toString('base64'),
      data: metrics
    };
  }

  /**
   * Generates Deployment Frequency Chart
   */
  async generateDeploymentFrequencyChart(deploymentData) {
    if (!deploymentData || !deploymentData.history) {
      return this.generatePlaceholderChart('Deployment Frequency', 'No deployment data available');
    }

    const last30Days = deploymentData.history.slice(-30);
    const labels = last30Days.map((_, index) => `Day ${index + 1}`);
    const data = last30Days.map(day => day.deployments || 0);

    const configuration = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Deployments per Day',
          data,
          backgroundColor: 'rgba(255, 206, 86, 0.2)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: 'Deployment Frequency (Last 30 Days)'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Deployments'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Days'
            }
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'deploymentFrequency',
      title: 'Deployment Frequency',
      image: imageBuffer.toString('base64'),
      data: { frequency: deploymentData.frequency, classification: deploymentData.classification }
    };
  }

  /**
   * Generates Lead Time Chart
   */
  async generateLeadTimeChart(leadTimeData) {
    if (!leadTimeData || !leadTimeData.measurements) {
      return this.generatePlaceholderChart('Lead Time for Changes', 'No lead time data available');
    }

    const measurements = leadTimeData.measurements.slice(-20); // Last 20 measurements
    const labels = measurements.map((_, index) => `Change ${index + 1}`);
    const data = measurements.map(m => m.leadTimeHours || 0);

    const configuration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Lead Time (Hours)',
          data,
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: `Lead Time for Changes (Avg: ${Math.round(leadTimeData.averageLeadTime || 0)}h)`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Recent Changes'
            }
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'leadTime',
      title: 'Lead Time for Changes',
      image: imageBuffer.toString('base64'),
      data: { average: leadTimeData.averageLeadTime, classification: leadTimeData.classification }
    };
  }

  /**
   * Generates Benchmarking Comparison Chart
   */
  async generateBenchmarkingChart(benchmarkingData) {
    const categories = ['Code Quality', 'DORA Metrics', 'Security', 'Performance', 'Scalability'];
    const yourScores = categories.map(cat => 
      benchmarkingData.detailed?.[cat.toLowerCase().replace(' ', '')]?.score || 0
    );
    const industryAverage = categories.map(() => 70); // Industry average baseline
    const industryTop10 = categories.map(() => 85); // Top 10% baseline

    const configuration = {
      type: 'radar',
      data: {
        labels: categories,
        datasets: [
          {
            label: 'Your Repository',
            data: yourScores,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)'
          },
          {
            label: 'Industry Average',
            data: industryAverage,
            backgroundColor: 'rgba(255, 206, 86, 0.1)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1,
            pointBackgroundColor: 'rgba(255, 206, 86, 1)'
          },
          {
            label: 'Industry Top 10%',
            data: industryTop10,
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            pointBackgroundColor: 'rgba(75, 192, 192, 1)'
          }
        ]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: 'Industry Benchmarking Comparison'
          }
        },
        scales: {
          r: {
            angleLines: {
              display: true
            },
            suggestedMin: 0,
            suggestedMax: 100
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'benchmarking',
      title: 'Industry Benchmarking',
      image: imageBuffer.toString('base64'),
      data: { yourScores, industryAverage, industryTop10 }
    };
  }

  /**
   * Generates Peer Comparison Chart
   */
  async generatePeerComparisonChart(peerData) {
    if (!peerData || !peerData.distribution) {
      return this.generatePlaceholderChart('Peer Comparison', 'No peer data available');
    }

    const percentiles = [10, 25, 50, 75, 90];
    const values = percentiles.map(p => peerData.distribution[`p${p}`] || 0);
    const yourScore = peerData.yourScore || 0;

    const configuration = {
      type: 'bar',
      data: {
        labels: percentiles.map(p => `${p}th Percentile`),
        datasets: [
          {
            label: 'Peer Distribution',
            data: values,
            backgroundColor: 'rgba(201, 203, 207, 0.8)',
            borderColor: 'rgba(201, 203, 207, 1)',
            borderWidth: 1
          },
          {
            label: 'Your Score',
            data: percentiles.map(() => yourScore),
            type: 'line',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 3,
            pointBackgroundColor: 'rgba(255, 99, 132, 1)'
          }
        ]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: `Peer Comparison (You rank at ${peerData.percentile || 0}th percentile)`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Score'
            }
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'peerComparison',
      title: 'Peer Comparison',
      image: imageBuffer.toString('base64'),
      data: peerData
    };
  }

  /**
   * Generates Repository Health Chart
   */
  async generateRepositoryHealthChart(repositoryData) {
    const healthMetrics = {
      'Activity': this.calculateActivityScore(repositoryData),
      'Community': this.calculateCommunityScore(repositoryData),
      'Documentation': this.calculateDocumentationScore(repositoryData),
      'Maintenance': this.calculateMaintenanceScore(repositoryData)
    };

    const configuration = {
      type: 'polarArea',
      data: {
        labels: Object.keys(healthMetrics),
        datasets: [{
          data: Object.values(healthMetrics),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: 'Repository Health Overview'
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'repositoryHealth',
      title: 'Repository Health',
      image: imageBuffer.toString('base64'),
      data: healthMetrics
    };
  }

  /**
   * Generates Language Distribution Chart
   */
  async generateLanguageChart(languageData) {
    if (!languageData || Object.keys(languageData).length === 0) {
      return this.generatePlaceholderChart('Language Distribution', 'No language data available');
    }

    const languages = Object.keys(languageData).slice(0, 8); // Top 8 languages
    const percentages = languages.map(lang => languageData[lang] || 0);

    const configuration = {
      type: 'pie',
      data: {
        labels: languages,
        datasets: [{
          data: percentages,
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)',
            'rgba(83, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: 'Programming Language Distribution'
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'languages',
      title: 'Language Distribution',
      image: imageBuffer.toString('base64'),
      data: languageData
    };
  }

  /**
   * Generates a placeholder chart for missing data
   */
  async generatePlaceholderChart(title, message) {
    const configuration = {
      type: 'bar',
      data: {
        labels: ['No Data'],
        datasets: [{
          label: message,
          data: [0],
          backgroundColor: 'rgba(201, 203, 207, 0.8)',
          borderColor: 'rgba(201, 203, 207, 1)',
          borderWidth: 1
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: title
          }
        }
      }
    };

    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return {
      type: 'placeholder',
      title,
      image: imageBuffer.toString('base64'),
      data: { message }
    };
  }

  // Helper methods
  getScoreColor(score) {
    if (score >= 90) return '#4CAF50'; // Green
    if (score >= 80) return '#8BC34A'; // Light Green
    if (score >= 70) return '#FFC107'; // Yellow
    if (score >= 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  }

  normalizeDoraScore(score) {
    // Normalize DORA scores to 0-100 scale
    return Math.min(100, Math.max(0, score || 0));
  }

  calculateActivityScore(repo) {
    const now = new Date();
    const lastUpdate = new Date(repo.updated_at || repo.pushed_at || now);
    const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
    
    // Score based on recent activity
    if (daysSinceUpdate <= 7) return 100;
    if (daysSinceUpdate <= 30) return 80;
    if (daysSinceUpdate <= 90) return 60;
    if (daysSinceUpdate <= 180) return 40;
    return 20;
  }

  calculateCommunityScore(repo) {
    const stars = repo.stargazers_count || 0;
    const forks = repo.forks_count || 0;
    const watchers = repo.watchers_count || 0;
    
    // Logarithmic scale for community engagement
    const communityScore = Math.min(100, 
      (Math.log(stars + 1) * 10) + 
      (Math.log(forks + 1) * 15) + 
      (Math.log(watchers + 1) * 5)
    );
    
    return Math.round(communityScore);
  }

  calculateDocumentationScore(repo) {
    let score = 0;
    
    if (repo.description) score += 25;
    if (repo.homepage) score += 25;
    if (repo.has_wiki) score += 25;
    if (repo.license) score += 25;
    
    return score;
  }

  calculateMaintenanceScore(repo) {
    let score = 0;
    
    if (!repo.archived) score += 25;
    if (repo.license) score += 25;
    if (repo.has_issues && !repo.disabled) score += 25;
    if (repo.allow_merge_commit || repo.allow_squash_merge) score += 25;
    
    return score;
  }
}

module.exports = ChartGenerator; 