import { PerformanceMetric } from '@/types/performance';
import { promises as fs } from 'fs';
import path from 'path';

class PerformanceLogger {
  private logFile: string;
  private isServer = typeof window === 'undefined';

  constructor() {
    this.logFile = path.join(process.cwd(), 'performance-metrics.log');
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

  // Write metrics to log file
  public async logMetrics(metrics: PerformanceMetric[]): Promise<void> {
    if (!this.isServer || metrics.length === 0) {
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
      console.error('Failed to write performance metrics to log:', error);
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

    try {
      await fs.appendFile(this.logFile, summary.join('\n'));
    } catch (error) {
      console.error('Failed to write summary report:', error);
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
    if (!this.isServer) return;
    
    try {
      await fs.writeFile(this.logFile, '');
    } catch (error) {
      console.error('Failed to clear performance log:', error);
    }
  }

  // Read log file
  public async readLog(): Promise<string> {
    if (!this.isServer) return '';
    
    try {
      return await fs.readFile(this.logFile, 'utf-8');
    } catch {
      return '';
    }
  }
}

export const performanceLogger = new PerformanceLogger();