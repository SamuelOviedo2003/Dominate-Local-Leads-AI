import { PerformanceMetric, MemoryInfo, CoreWebVitals, TimingMetrics, DatabaseMetrics, ComponentMetrics } from '@/types/performance';

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private isClient = typeof window !== 'undefined';

  // Memory monitoring
  public getMemoryMetrics(): PerformanceMetric[] {
    if (!this.isClient || !('memory' in performance)) {
      return [];
    }

    const memory = (performance as any).memory as MemoryInfo;
    const usedHeapMB = Math.round(memory.usedHeapSize / 1024 / 1024);
    const totalHeapMB = Math.round(memory.totalHeapSize / 1024 / 1024);
    const heapLimitMB = Math.round(memory.heapSizeLimit / 1024 / 1024);

    return [
      {
        metric: 'Memory: Used Heap',
        measuredValue: usedHeapMB,
        targetValue: '< 50',
        observations: `${usedHeapMB}MB used of ${totalHeapMB}MB allocated`,
        timestamp: new Date(),
        unit: 'MB',
        category: 'memory'
      },
      {
        metric: 'Memory: Heap Utilization',
        measuredValue: Math.round((memory.usedHeapSize / memory.totalHeapSize) * 100),
        targetValue: '< 80',
        observations: `${Math.round((memory.usedHeapSize / memory.totalHeapSize) * 100)}% heap utilization`,
        timestamp: new Date(),
        unit: '%',
        category: 'memory'
      }
    ];
  }

  // Core Web Vitals monitoring
  public getCoreWebVitals(): Promise<PerformanceMetric[]> {
    return new Promise((resolve) => {
      if (!this.isClient) {
        resolve([]);
        return;
      }

      const vitals: PerformanceMetric[] = [];

      // LCP (Largest Contentful Paint)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcp = entries[entries.length - 1] as PerformanceEntry;
        
        vitals.push({
          metric: 'Core Web Vitals: LCP',
          measuredValue: Math.round(lcp.startTime),
          targetValue: '< 2500',
          observations: lcp.startTime < 2500 ? 'Good' : lcp.startTime < 4000 ? 'Needs improvement' : 'Poor',
          timestamp: new Date(),
          unit: 'ms',
          category: 'core-vitals'
        });
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // FID (First Input Delay)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          vitals.push({
            metric: 'Core Web Vitals: FID',
            measuredValue: Math.round(entry.processingStart - entry.startTime),
            targetValue: '< 100',
            observations: entry.processingStart - entry.startTime < 100 ? 'Good' : entry.processingStart - entry.startTime < 300 ? 'Needs improvement' : 'Poor',
            timestamp: new Date(),
            unit: 'ms',
            category: 'core-vitals'
          });
        });
      }).observe({ entryTypes: ['first-input'] });

      // CLS (Cumulative Layout Shift)
      new PerformanceObserver((list) => {
        let cls = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        });
        
        vitals.push({
          metric: 'Core Web Vitals: CLS',
          measuredValue: cls.toFixed(3),
          targetValue: '< 0.1',
          observations: cls < 0.1 ? 'Good' : cls < 0.25 ? 'Needs improvement' : 'Poor',
          timestamp: new Date(),
          unit: 'score',
          category: 'core-vitals'
        });
      }).observe({ entryTypes: ['layout-shift'] });

      // Resolve after a delay to collect metrics
      setTimeout(() => resolve(vitals), 3000);
    });
  }

  // Timing metrics
  public getTimingMetrics(): PerformanceMetric[] {
    if (!this.isClient || !performance.timing) {
      return [];
    }

    const timing = performance.timing;
    const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
    const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
    const firstPaint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0;
    const fcp = performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

    return [
      {
        metric: 'Timing: Page Load Time',
        measuredValue: Math.round(pageLoadTime),
        targetValue: '< 3000',
        observations: pageLoadTime < 3000 ? 'Good' : pageLoadTime < 5000 ? 'Acceptable' : 'Needs optimization',
        timestamp: new Date(),
        unit: 'ms',
        category: 'timing'
      },
      {
        metric: 'Timing: DOM Content Loaded',
        measuredValue: Math.round(domContentLoaded),
        targetValue: '< 2000',
        observations: domContentLoaded < 2000 ? 'Good' : domContentLoaded < 3000 ? 'Acceptable' : 'Slow',
        timestamp: new Date(),
        unit: 'ms',
        category: 'timing'
      },
      {
        metric: 'Timing: First Paint',
        measuredValue: Math.round(firstPaint),
        targetValue: '< 1000',
        observations: firstPaint < 1000 ? 'Good' : firstPaint < 2000 ? 'Acceptable' : 'Slow',
        timestamp: new Date(),
        unit: 'ms',
        category: 'timing'
      },
      {
        metric: 'Timing: First Contentful Paint',
        measuredValue: Math.round(fcp),
        targetValue: '< 1500',
        observations: fcp < 1500 ? 'Good' : fcp < 2500 ? 'Acceptable' : 'Slow',
        timestamp: new Date(),
        unit: 'ms',
        category: 'timing'
      }
    ];
  }

  // Network metrics
  public getNetworkMetrics(): PerformanceMetric[] {
    if (!this.isClient) {
      return [];
    }

    const resourceEntries = performance.getEntriesByType('resource');
    const totalResources = resourceEntries.length;
    const totalTransferSize = resourceEntries.reduce((total: number, entry: any) => total + (entry.transferSize || 0), 0);
    const avgLoadTime = resourceEntries.reduce((total, entry) => total + entry.duration, 0) / totalResources;

    return [
      {
        metric: 'Network: Total Resources',
        measuredValue: totalResources,
        targetValue: '< 50',
        observations: totalResources < 50 ? 'Good' : totalResources < 100 ? 'Acceptable' : 'Too many resources',
        timestamp: new Date(),
        unit: 'count',
        category: 'network'
      },
      {
        metric: 'Network: Total Transfer Size',
        measuredValue: Math.round(totalTransferSize / 1024),
        targetValue: '< 2000',
        observations: `${Math.round(totalTransferSize / 1024)}KB transferred`,
        timestamp: new Date(),
        unit: 'KB',
        category: 'network'
      },
      {
        metric: 'Network: Average Load Time',
        measuredValue: Math.round(avgLoadTime),
        targetValue: '< 500',
        observations: avgLoadTime < 500 ? 'Good' : avgLoadTime < 1000 ? 'Acceptable' : 'Slow resources',
        timestamp: new Date(),
        unit: 'ms',
        category: 'network'
      }
    ];
  }

  // Database query performance tracking
  public trackDatabaseQuery(queryType: string, duration: number, recordCount?: number): PerformanceMetric {
    return {
      metric: `Database: ${queryType} Query`,
      measuredValue: Math.round(duration),
      targetValue: '< 500',
      observations: `${recordCount || 'N/A'} records ${duration < 500 ? 'Good' : duration < 1000 ? 'Acceptable' : 'Slow'}`,
      timestamp: new Date(),
      unit: 'ms',
      category: 'database'
    };
  }

  // Component render performance
  public trackComponentRender(componentName: string, renderTime: number, mountTime?: number): PerformanceMetric {
    return {
      metric: `Component: ${componentName} Render`,
      measuredValue: Math.round(renderTime),
      targetValue: '< 16',
      observations: `${renderTime < 16 ? 'Good (60fps)' : renderTime < 33 ? 'Acceptable (30fps)' : 'Slow rendering'}`,
      timestamp: new Date(),
      unit: 'ms',
      category: 'component'
    };
  }

  // Collect all metrics
  public async collectAllMetrics(): Promise<PerformanceMetric[]> {
    const allMetrics: PerformanceMetric[] = [];
    
    // Immediate metrics
    allMetrics.push(...this.getMemoryMetrics());
    allMetrics.push(...this.getTimingMetrics());
    allMetrics.push(...this.getNetworkMetrics());
    
    // Async metrics
    const vitals = await this.getCoreWebVitals();
    allMetrics.push(...vitals);
    
    this.metrics = allMetrics;
    return allMetrics;
  }

  // Get current metrics
  public getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  // Clear metrics
  public clearMetrics(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();