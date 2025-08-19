import { PerformanceMetric } from '@/types/performance';
import { promises as fs } from 'fs';
import path from 'path';

class PerformanceLogger {
  private logFile: string;
  private isServer = typeof window === 'undefined';
  private useFileLogging: boolean;

  constructor() {
    // Use /tmp directory for log files (writable in container environments)
    // Fall back to current directory in development
    const logDir = process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd();
    this.logFile = path.join(logDir, 'performance-metrics.log');
    
    // Allow disabling file logging via environment variable
    this.useFileLogging = process.env.DISABLE_PERFORMANCE_FILE_LOGGING !== 'true';
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

  // Write metrics to log file or console
  public async logMetrics(metrics: PerformanceMetric[]): Promise<void> {
    if (!this.isServer || metrics.length === 0) {
      return;
    }

    // If file logging is disabled, log to console instead
    if (!this.useFileLogging) {
      console.log('Performance Metrics:', {
        timestamp: new Date().toISOString(),
        metrics: metrics.map(m => ({
          metric: m.metric,
          category: m.category,
          measuredValue: m.measuredValue,
          targetValue: m.targetValue,
          observations: m.observations
        }))
      });
      return;
    }

    try {
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
        logEntries.push('');
        logEntries.push(this.getTableHeader());
      }

      // Format and add metrics
      metrics.forEach(metric => {
        logEntries.push(this.formatMetric(metric));
      });

      logEntries.push(''); // Add blank line for separation

      await fs.appendFile(this.logFile, logEntries.join('\n'));
    } catch (error) {
      console.error('Failed to write performance metrics to log file, falling back to console:', error);
      console.log('Performance Metrics (fallback):', {
        timestamp: new Date().toISOString(),
        logFile: this.logFile,
        metrics: metrics.map(m => ({
          metric: m.metric,
          category: m.category,
          measuredValue: m.measuredValue,
          targetValue: m.targetValue,
          observations: m.observations
        }))
      });
    }
  }

  // Log a single metric
  public async logMetric(metric: PerformanceMetric): Promise<void> {
    await this.logMetrics([metric]);
  }

  // Create summary report
  public async createSummaryReport(metrics: PerformanceMetric[]): Promise<void> {
    if (!this.isServer) return;

    const categories = ['memory', 'timing', 'core-vitals', 'network', 'database', 'component'] as const;
    const summary: string[] = [];
    
    summary.push('# Performance Summary Report');
    summary.push(`Generated: ${new Date().toISOString()}`);
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

    // Performance health score
    const healthScore = this.calculateHealthScore(metrics);
    summary.push(`## Overall Health Score: ${healthScore}/100`);
    summary.push('');

    // If file logging is disabled, log to console instead
    if (!this.useFileLogging) {
      console.log('Performance Summary Report:', {
        timestamp: new Date().toISOString(),
        healthScore,
        categorySummary: Object.fromEntries(
          categories.map(category => [
            category,
            metrics.filter(m => m.category === category).length
          ])
        )
      });
      return;
    }

    try {
      await fs.appendFile(this.logFile, summary.join('\n'));
    } catch (error) {
      console.error('Failed to write summary report to file, falling back to console:', error);
      console.log('Performance Summary Report (fallback):', {
        timestamp: new Date().toISOString(),
        logFile: this.logFile,
        healthScore,
        categorySummary: Object.fromEntries(
          categories.map(category => [
            category,
            metrics.filter(m => m.category === category).length
          ])
        )
      });
    }
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

  // Clear log file
  public async clearLog(): Promise<void> {
    if (!this.isServer || !this.useFileLogging) return;
    
    try {
      await fs.writeFile(this.logFile, '');
    } catch (error) {
      console.error('Failed to clear performance log:', error);
    }
  }

  // Read log file
  public async readLog(): Promise<string> {
    if (!this.isServer || !this.useFileLogging) return '';
    
    try {
      return await fs.readFile(this.logFile, 'utf-8');
    } catch (error) {
      console.warn('Failed to read performance log:', error);
      return '';
    }
  }

  // Get current log configuration
  public getLogConfig(): { logFile: string; useFileLogging: boolean; isServer: boolean } {
    return {
      logFile: this.logFile,
      useFileLogging: this.useFileLogging,
      isServer: this.isServer
    };
  }
}

export const performanceLogger = new PerformanceLogger();