export interface PerformanceMetric {
  metric: string;
  measuredValue: number | string;
  targetValue: number | string;
  observations: string;
  timestamp: Date;
  unit?: string;
  category: 'memory' | 'timing' | 'core-vitals' | 'network' | 'database' | 'component';
}

export interface MemoryInfo {
  usedHeapSize: number;
  totalHeapSize: number;
  heapSizeLimit: number;
}

export interface CoreWebVitals {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
}

export interface TimingMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
}

export interface DatabaseMetrics {
  queryTime: number;
  queryType: string;
  recordCount?: number;
}

export interface ComponentMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
}

export interface PerformanceLog {
  timestamp: string;
  metric: string;
  measuredValue: string;
  targetValue: string;
  observations: string;
}