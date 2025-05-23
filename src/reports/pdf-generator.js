const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class PDFGenerator {
  constructor() {
    this.browser = null;
    this.defaultOptions = {
      format: 'A4',
      margin: {
        top: 56,    // ~20mm in pixels (1mm ≈ 2.8px at 72dpi)
        right: 42,  // ~15mm in pixels
        bottom: 56, // ~20mm in pixels
        left: 42    // ~15mm in pixels
      },
      printBackground: true,
      preferCSSPageSize: true
    };
  }

  /**
   * Initializes browser instance
   */
  async initializeBrowser() {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: 'new',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        });
        console.log('PDF browser initialized successfully');
      } catch (error) {
        console.error('Failed to initialize PDF browser:', error);
        throw error;
      }
    }
    return this.browser;
  }

  /**
   * Generates PDF from HTML content
   */
  async generatePDF(htmlContent, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log('Starting PDF generation...');
      
      // Initialize browser
      const browser = await this.initializeBrowser();
      const page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      });

      // Enhanced HTML with additional styling for PDF
      const enhancedHTML = this.enhanceHTMLForPDF(htmlContent);

      // Set content and wait for loading
      await page.setContent(enhancedHTML, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });

      // Wait for charts to render
      await this.waitForChartsToLoad(page);

      // Generate PDF
      const pdfOptions = {
        format: options.format || this.defaultOptions.format,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: this.getHeaderTemplate(options.repository),
        footerTemplate: this.getFooterTemplate(),
        margin: {
          top: (options.margin && typeof options.margin.top === 'number') ? options.margin.top : this.defaultOptions.margin.top,
          right: (options.margin && typeof options.margin.right === 'number') ? options.margin.right : this.defaultOptions.margin.right,
          bottom: (options.margin && typeof options.margin.bottom === 'number') ? options.margin.bottom : this.defaultOptions.margin.bottom,
          left: (options.margin && typeof options.margin.left === 'number') ? options.margin.left : this.defaultOptions.margin.left
        }
      };

      console.log('Generating PDF with options:', JSON.stringify(pdfOptions, null, 2));
      
      const pdfBuffer = await page.pdf(pdfOptions);

      await page.close();

      console.log(`PDF generated successfully in ${Date.now() - startTime}ms`);
      return pdfBuffer;

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Enhances HTML with PDF-specific styling
   */
  enhanceHTMLForPDF(htmlContent) {
    const pdfSpecificCSS = `
      <style>
        /* PDF-specific styles */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .page {
            page-break-after: always !important;
            page-break-inside: avoid !important;
            min-height: auto !important;
          }
          
          .page:last-child {
            page-break-after: auto !important;
          }
          
          /* Ensure charts render properly */
          .chart-image {
            max-width: 100% !important;
            height: auto !important;
            page-break-inside: avoid !important;
          }
          
          /* Improve table rendering */
          table {
            page-break-inside: avoid !important;
          }
          
          /* Better card layouts for print */
          .summary-card, .metric-card, .chart-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Ensure text remains readable */
          body {
            font-size: 12pt !important;
            line-height: 1.4 !important;
          }
          
          h1 { font-size: 20pt !important; }
          h2 { font-size: 16pt !important; }
          h3 { font-size: 14pt !important; }
          h4 { font-size: 12pt !important; }
          
          /* Cover page adjustments */
          .cover-page {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            height: 100vh !important;
            page-break-after: always !important;
          }
          
          /* Grid layouts for print */
          .summary-grid,
          .metrics-overview,
          .metrics-grid,
          .chart-row {
            display: grid !important;
            page-break-inside: avoid !important;
          }
          
          /* Recommendation cards */
          .recommendation-card {
            page-break-inside: avoid !important;
            margin-bottom: 1em !important;
          }
        }
        
        /* Force color printing */
        * {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* Ensure proper spacing for print */
        .page {
          padding: 40px !important;
        }
        
        /* Chart containers */
        .chart-section, .chart-half {
          text-align: center;
          margin-bottom: 2em;
        }
        
        /* Improve readability */
        p, li {
          orphans: 3;
          widows: 3;
        }
        
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          orphans: 3;
          widows: 3;
        }
      </style>
    `;

    // Insert PDF-specific CSS before closing head tag
    return htmlContent.replace('</head>', `${pdfSpecificCSS}</head>`);
  }

  /**
   * Waits for charts to load completely
   */
  async waitForChartsToLoad(page) {
    try {
      // Wait for chart images to load
      await page.evaluate(() => {
        return new Promise((resolve) => {
          const images = document.querySelectorAll('.chart-image');
          if (images.length === 0) {
            resolve();
            return;
          }

          let loadedCount = 0;
          const totalImages = images.length;

          images.forEach((img) => {
            if (img.complete) {
              loadedCount++;
            } else {
              img.addEventListener('load', () => {
                loadedCount++;
                if (loadedCount === totalImages) {
                  resolve();
                }
              });
              img.addEventListener('error', () => {
                loadedCount++;
                if (loadedCount === totalImages) {
                  resolve();
                }
              });
            }
          });

          if (loadedCount === totalImages) {
            resolve();
          }
        });
      });

      // Additional wait for rendering
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Charts loaded and ready for PDF generation');
    } catch (error) {
      console.warn('Warning: Could not wait for charts to load:', error.message);
      // Continue with PDF generation even if chart loading fails
    }
  }

  /**
   * Generates header template for PDF
   */
  getHeaderTemplate(repository) {
    const repoName = repository?.fullName || repository?.name || 'Repository';
    
    return `
      <div style="font-size: 10px; padding: 5px 20px; width: 100%; 
                  display: flex; justify-content: space-between; align-items: center;
                  border-bottom: 1px solid #ddd; color: #666;">
        <div style="flex: 1;">
          <strong>Tech Health Appendix</strong> - ${repoName}
        </div>
        <div style="flex: 1; text-align: right;">
          Generated on <span class="date"></span>
        </div>
      </div>
    `;
  }

  /**
   * Generates footer template for PDF
   */
  getFooterTemplate() {
    return `
      <div style="font-size: 10px; padding: 5px 20px; width: 100%; 
                  display: flex; justify-content: space-between; align-items: center;
                  border-top: 1px solid #ddd; color: #666;">
        <div style="flex: 1;">
          Tech Health Analysis Report
        </div>
        <div style="flex: 1; text-align: center;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
        <div style="flex: 1; text-align: right;">
          Confidential
        </div>
      </div>
    `;
  }

  /**
   * Generates PDF with streaming progress updates
   */
  async generatePDFWithProgress(htmlContent, options = {}, progressCallback = null) {
    const stages = [
      'Initializing browser',
      'Loading content', 
      'Waiting for charts to render',
      'Generating PDF',
      'Finalizing document'
    ];

    let currentStage = 0;

    const updateProgress = (stage, percentage = null) => {
      if (progressCallback) {
        progressCallback({
          stage,
          percentage: percentage || ((currentStage / stages.length) * 100),
          message: `${stage}...`
        });
      }
      currentStage++;
    };

    try {
      updateProgress('Initializing browser');
      const browser = await this.initializeBrowser();
      const page = await browser.newPage();

      updateProgress('Loading content', 20);
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      });

      const enhancedHTML = this.enhanceHTMLForPDF(htmlContent);
      await page.setContent(enhancedHTML, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });

      updateProgress('Waiting for charts to render', 50);
      await this.waitForChartsToLoad(page);

      updateProgress('Generating PDF', 80);
      const pdfOptions = {
        ...this.defaultOptions,
        ...options,
        displayHeaderFooter: true,
        headerTemplate: this.getHeaderTemplate(options.repository),
        footerTemplate: this.getFooterTemplate()
      };

      const pdfBuffer = await page.pdf(pdfOptions);
      await page.close();

      updateProgress('Finalizing document', 100);
      
      return pdfBuffer;

    } catch (error) {
      if (progressCallback) {
        progressCallback({
          error: true,
          message: `PDF generation failed: ${error.message}`
        });
      }
      throw error;
    }
  }

  /**
   * Saves PDF to file
   */
  async savePDFToFile(pdfBuffer, filePath) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Write PDF to file
      await fs.writeFile(filePath, pdfBuffer);
      console.log(`PDF saved to: ${filePath}`);
      
      return filePath;
    } catch (error) {
      console.error('Error saving PDF to file:', error);
      throw error;
    }
  }

  /**
   * Generates multiple PDF formats (different page sizes, orientations)
   */
  async generateMultipleFormats(htmlContent, repository, outputDir) {
    const formats = [
      {
        name: 'standard',
        options: {
          format: 'A4',
          landscape: false
        }
      },
      {
        name: 'landscape',
        options: {
          format: 'A4',
          landscape: true,
          margin: {
            top: '15mm',
            right: '20mm', 
            bottom: '15mm',
            left: '20mm'
          }
        }
      },
      {
        name: 'letter',
        options: {
          format: 'Letter',
          landscape: false
        }
      }
    ];

    const results = {};

    for (const format of formats) {
      try {
        console.log(`Generating ${format.name} format PDF...`);
        
        const pdfBuffer = await this.generatePDF(htmlContent, {
          ...format.options,
          repository
        });

        const fileName = `tech-health-appendix-${repository?.repo || 'report'}-${format.name}.pdf`;
        const filePath = path.join(outputDir, fileName);
        
        await this.savePDFToFile(pdfBuffer, filePath);
        
        results[format.name] = {
          buffer: pdfBuffer,
          filePath,
          size: pdfBuffer.length
        };

        console.log(`${format.name} format generated successfully`);
      } catch (error) {
        console.error(`Error generating ${format.name} format:`, error);
        results[format.name] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Validates PDF content quality
   */
  async validatePDFQuality(pdfBuffer) {
    const validation = {
      isValid: true,
      size: pdfBuffer.length,
      warnings: [],
      errors: []
    };

    // Check file size
    if (pdfBuffer.length < 1000) {
      validation.errors.push('PDF file size is suspiciously small');
      validation.isValid = false;
    }

    // Check PDF header
    const pdfHeader = pdfBuffer.slice(0, 10).toString();
    if (!pdfHeader.startsWith('%PDF-')) {
      validation.errors.push('Invalid PDF header');
      validation.isValid = false;
    }

    // Size warnings
    if (pdfBuffer.length > 50 * 1024 * 1024) { // 50MB
      validation.warnings.push('PDF file size is very large (>50MB)');
    }

    return validation;
  }

  /**
   * Closes browser instance
   */
  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log('PDF browser closed successfully');
      } catch (error) {
        console.error('Error closing PDF browser:', error);
      }
    }
  }

  /**
   * Gets browser status
   */
  getBrowserStatus() {
    return {
      initialized: !!this.browser,
      connected: this.browser ? this.browser.isConnected() : false
    };
  }
}

module.exports = PDFGenerator; 