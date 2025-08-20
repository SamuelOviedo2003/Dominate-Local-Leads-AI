import { PerformanceMetric } from '@/types/performance';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Performance Logger with containerized deployment support
 * 
 * Logging Strategy:
 * - Development: File logging to project directory
 * - Production (non-container): File logging to /tmp
 * - Production (container): Structured JSON logging to stdout
 * - Always falls back gracefully if file operations fail
 */
class PerformanceLogger {
  private logFile: string = '';
  private isServer = typeof window === 'undefined';
  private useFileLogging: boolean = false;
  private isContainerized: boolean = false;
  private logToStdout: boolean = false;

  constructor() {
    // Detect if running in a containerized environment
    this.isContainerized = this.detectContainerEnvironment();
    
    // Determine logging strategy based on environment
    this.logToStdout = this.shouldUseStdoutLogging();
    
    // Set up file logging configuration
    this.setupFileLogging();
  }

  /**
   * Detect if running in a containerized environment
   */
  private detectContainerEnvironment(): boolean {
    // Check for common container indicators
    return !!(
      process.env.KUBERNETES_SERVICE_HOST || // Kubernetes
      process.env.DOCKER_CONTAINER === 'true' || // Explicit Docker flag
      process.env.HOSTNAME?.startsWith('container-') || // Container naming pattern
      process.env.CONTAINER_NAME || // Generic container environment
      process.env.DOCKER_IMAGE || // Docker environment
      (process.env.NODE_ENV === 'production' && process.env.PORT === '3000') || // Typical container setup
      this.checkDockerEnvFile() // Docker environment file check
    );
  }

  /**
   * Synchronously check for Docker environment file
   */
  private checkDockerEnvFile(): boolean {
    try {
      // Use synchronous fs to check for Docker environment file
      require('fs').accessSync('/.dockerenv');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Determine if should use stdout logging instead of file logging
   */
  private shouldUseStdoutLogging(): boolean {
    // Force stdout logging via environment variable
    if (process.env.PERFORMANCE_LOG_STDOUT === 'true') {
      return true;
    }
    
    // Force file logging via environment variable
    if (process.env.PERFORMANCE_LOG_STDOUT === 'false') {
      return false;
    }
    
    // Default: use stdout in containerized production environments
    return this.isContainerized && process.env.NODE_ENV === 'production';
  }

  /**
   * Set up file logging configuration
   */
  private setupFileLogging(): void {
    // Disable file logging if using stdout or explicitly disabled
    if (this.logToStdout || process.env.DISABLE_PERFORMANCE_FILE_LOGGING === 'true') {
      this.useFileLogging = false;
      this.logFile = '';
      return;
    }

    // Determine log directory based on environment
    let logDir: string;
    
    if (process.env.PERFORMANCE_LOG_DIR) {
      // Use explicitly set log directory
      logDir = process.env.PERFORMANCE_LOG_DIR;
    } else if (process.env.NODE_ENV === 'production') {
      // Production: use /tmp for file system compatibility
      logDir = '/tmp';
    } else {
      // Development: use project directory
      logDir = process.cwd();
    }
    
    this.logFile = path.join(logDir, 'performance-metrics.log');
    this.useFileLogging = true;
  }

  // Format metric for table display
  private formatMetric(metric: PerformanceMetric): string {
    const timestamp = metric.timestamp.toISOString().split('T')[0] + ' ' + 
                     metric.timestamp.toISOString().split('T')[1]?.split('.')[0];
    
    const measuredValue = typeof metric.measuredValue === 'number' 
      ? `${metric.measuredValue}${metric.unit || ''}` 
      : metric.measuredValue;
      
    const targetValue = typeof metric.targetValue === 'number'
      ? `${metric.targetValue}${metric.unit || ''}`
      : metric.targetValue;

    return `| ${timestamp} | ${metric.metric.padEnd(30)} | ${String(measuredValue).padEnd(15)} | ${String(targetValue).padEnd(12)} | ${metric.observations} |`;
  }

  // Create table header
  private getTableHeader(): string {
    return [
      '| Timestamp           | Metric                         | Measured Value  | Target Value | Observations                          |',
      '|---------------------|--------------------------------|-----------------|--------------|---------------------------------------|'
    ].join('\n');
  }

  /**
   * Log structured metrics to stdout (for containers) or console
   */
  private logToStdoutStructured(metrics: PerformanceMetric[]): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'performance-monitor',
      environment: process.env.NODE_ENV || 'development',
      containerized: this.isContainerized,
      metrics: metrics.map(m => ({
        metric: m.metric,
        category: m.category,
        measuredValue: m.measuredValue,
        targetValue: m.targetValue,
        unit: m.unit,
        observations: m.observations,
        timestamp: m.timestamp.toISOString()
      })),
      summary: {
        total_metrics: metrics.length,
        categories: [...new Set(metrics.map(m => m.category))],
        health_score: this.calculateHealthScore(metrics)
      }
    };

    // Use structured JSON logging for production containers
    if (this.logToStdout) {
      console.log(JSON.stringify(logEntry));
    } else {
      // Use pretty printing for development
      console.log('Performance Metrics:', logEntry);
    }
  }

  /**
   * Write metrics to log file, stdout, or console based on configuration
   */
  public async logMetrics(metrics: PerformanceMetric[]): Promise<void> {
    if (!this.isServer || metrics.length === 0) {
      return;
    }

    // Use stdout logging for containers or when explicitly configured
    if (this.logToStdout || !this.useFileLogging) {
      this.logToStdoutStructured(metrics);
      return;
    }

    // Attempt file logging with graceful fallback
    try {
      await this.writeMetricsToFile(metrics);
    } catch (error) {
      console.error('Failed to write performance metrics to log file, falling back to structured logging:', error);
      this.logToStdoutStructured(metrics);
    }
  }

  /**
   * Write metrics to file system
   */
  private async writeMetricsToFile(metrics: PerformanceMetric[]): Promise<void> {
    // Check if file exists to determine if we need header
    let needsHeader = false;
    try {
      await fs.access(this.logFile);
      const stats = await fs.stat(this.logFile);
      needsHeader = stats.size === 0;
    } catch {
      needsHeader = true;
    }

    const logEntries: string[] = [];
    
    if (needsHeader) {
      logEntries.push('# Performance Metrics Log');
      logEntries.push(`Generated on: ${new Date().toISOString()}`);
      logEntries.push(`Log file: ${this.logFile}`);
      logEntries.push(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logEntries.push(`Containerized: ${this.isContainerized}`);
      logEntries.push('');
      logEntries.push(this.getTableHeader());
    }

    // Format and add metrics
    metrics.forEach(metric => {
      logEntries.push(this.formatMetric(metric));
    });

    logEntries.push(''); // Add blank line for separation

    await fs.appendFile(this.logFile, logEntries.join('\n'));
  }

  // Log a single metric
  public async logMetric(metric: PerformanceMetric): Promise<void> {
    await this.logMetrics([metric]);
  }

  /**
   * Create and log summary report
   */
  public async createSummaryReport(metrics: PerformanceMetric[]): Promise<void> {
    if (!this.isServer) return;

    const categories = ['memory', 'timing', 'core-vitals', 'network', 'database', 'component'] as const;
    const healthScore = this.calculateHealthScore(metrics);
    
    // Create structured summary for stdout/container logging
    const structuredSummary = {
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'performance-monitor',
      type: 'summary_report',
      environment: process.env.NODE_ENV || 'development',
      containerized: this.isContainerized,
      health_score: healthScore,
      total_metrics: metrics.length,
      category_breakdown: Object.fromEntries(
        categories.map(category => [
          category,
          {
            count: metrics.filter(m => m.category === category).length,
            metrics: metrics.filter(m => m.category === category).map(m => ({
              metric: m.metric,
              measuredValue: m.measuredValue,
              targetValue: m.targetValue,
              observations: m.observations
            }))
          }
        ])
      )
    };

    // Use stdout logging for containers or when file logging is disabled
    if (this.logToStdout || !this.useFileLogging) {
      if (this.logToStdout) {
        console.log(JSON.stringify(structuredSummary));
      } else {
        console.log('Performance Summary Report:', structuredSummary);
      }
      return;
    }

    // Attempt file logging with graceful fallback
    try {
      await this.writeSummaryToFile(metrics, categories, healthScore);
    } catch (error) {
      console.error('Failed to write summary report to file, falling back to structured logging:', error);
      if (this.logToStdout) {
        console.log(JSON.stringify(structuredSummary));
      } else {
        console.log('Performance Summary Report (fallback):', structuredSummary);
      }
    }
  }

  /**
   * Write summary report to file
   */
  private async writeSummaryToFile(
    metrics: PerformanceMetric[], 
    categories: readonly string[], 
    healthScore: number
  ): Promise<void> {
    const summary: string[] = [];
    
    summary.push('# Performance Summary Report');
    summary.push(`Generated: ${new Date().toISOString()}`);
    summary.push(`Environment: ${process.env.NODE_ENV || 'development'}`);
    summary.push(`Containerized: ${this.isContainerized}`);
    summary.push('');

    categories.forEach(category => {
      const categoryMetrics = metrics.filter(m => m.category === category);
      if (categoryMetrics.length === 0) return;

      summary.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)} Metrics`);
      summary.push('');
      summary.push(this.getTableHeader());
      
      categoryMetrics.forEach(metric => {
        summary.push(this.formatMetric(metric));
      });
      
      summary.push('');
    });

    summary.push(`## Overall Health Score: ${healthScore}/100`);
    summary.push('');

    await fs.appendFile(this.logFile, summary.join('\n'));
  }

  // Calculate overall performance health score
  private calculateHealthScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;

    let score = 0;
    let totalMetrics = 0;

    metrics.forEach(metric => {
      let metricScore = 0;
      
      // Score based on observations
      if (metric.observations.toLowerCase().includes('good')) {
        metricScore = 100;
      } else if (metric.observations.toLowerCase().includes('acceptable')) {
        metricScore = 75;
      } else if (metric.observations.toLowerCase().includes('needs improvement')) {
        metricScore = 50;
      } else if (metric.observations.toLowerCase().includes('slow') || 
                 metric.observations.toLowerCase().includes('poor')) {
        metricScore = 25;
      } else {
        metricScore = 50; // Default middle score
      }

      score += metricScore;
      totalMetrics++;
    });

    return Math.round(score / totalMetrics);
  }

  /**
   * Clear log file (only works with file logging)
   */
  public async clearLog(): Promise<void> {
    if (!this.isServer || !this.useFileLogging || this.logToStdout) {
      console.log('Clear log operation not supported for stdout logging');
      return;
    }
    
    try {
      await fs.writeFile(this.logFile, '');
      console.log(`Performance log cleared: ${this.logFile}`);
    } catch (error) {
      console.error('Failed to clear performance log:', error);
    }
  }

  /**
   * Read log file (only works with file logging)
   */
  public async readLog(): Promise<string> {
    if (!this.isServer) return '';
    
    if (!this.useFileLogging || this.logToStdout) {
      return 'Log reading not available. Performance metrics are logged to stdout. Check container logs or console output.';
    }
    
    try {
      return await fs.readFile(this.logFile, 'utf-8');
    } catch (error) {
      console.warn('Failed to read performance log:', error);
      return `Error reading log file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Get current log configuration with enhanced details
   */
  public getLogConfig(): { 
    logFile: string; 
    useFileLogging: boolean; 
    isServer: boolean;
    logToStdout: boolean;
    isContainerized: boolean;
    environment: string;
  } {
    return {
      logFile: this.logFile,
      useFileLogging: this.useFileLogging,
      isServer: this.isServer,
      logToStdout: this.logToStdout,
      isContainerized: this.isContainerized,
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

export const performanceLogger = new PerformanceLogger();