'use client';

import { useState, useEffect, useCallback } from 'react';
import { PerformanceMetric } from '@/types/performance';
import { performanceMonitor } from '@/lib/performance-monitor';

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [healthScore, setHealthScore] = useState<number>(0);

  // Collect all performance metrics
  const collectMetrics = useCallback(async () => {
    setIsCollecting(true);
    try {
      const allMetrics = await performanceMonitor.collectAllMetrics();
      setMetrics(allMetrics);
      
      // Calculate health score
      const score = calculateHealthScore(allMetrics);
      setHealthScore(score);

      // Send metrics to server for logging
      if (allMetrics.length > 0) {
        await fetch('/api/performance/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ metrics: allMetrics }),
        }).catch(error => {
          console.warn('Failed to log performance metrics:', error);
        });
      }
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    } finally {
      setIsCollecting(false);
    }
  }, []);

  // Track database query performance
  const trackDatabaseQuery = useCallback((queryType: string, duration: number, recordCount?: number) => {
    const metric = performanceMonitor.trackDatabaseQuery(queryType, duration, recordCount);
    setMetrics(prev => [...prev, metric]);
    
    // Send to server for logging
    fetch('/api/performance/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metrics: [metric] }),
    }).catch(error => {
      console.warn('Failed to log database metric:', error);
    });
  }, []);

  // Track component render performance
  const trackComponentRender = useCallback((componentName: string, renderTime: number, mountTime?: number) => {
    const metric = performanceMonitor.trackComponentRender(componentName, renderTime, mountTime);
    setMetrics(prev => [...prev, metric]);
    
    // Send to server for logging
    fetch('/api/performance/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metrics: [metric] }),
    }).catch(error => {
      console.warn('Failed to log component metric:', error);
    });
  }, []);

  // Calculate health score
  const calculateHealthScore = (metrics: PerformanceMetric[]): number => {
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
  };

  // Auto-collect metrics on mount and periodically
  useEffect(() => {
    // Initial collection after page load
    const timer = setTimeout(() => {
      collectMetrics();
    }, 3000);

    // Periodic collection (every 5 minutes)
    const interval = setInterval(() => {
      collectMetrics();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [collectMetrics]);

  // Performance observer for monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Monitor navigation timing changes
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          // Re-collect metrics when navigation occurs
          setTimeout(collectMetrics, 1000);
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });

    return () => observer.disconnect();
  }, [collectMetrics]);

  return {
    metrics,
    healthScore,
    isCollecting,
    collectMetrics,
    trackDatabaseQuery,
    trackComponentRender,
  };
}