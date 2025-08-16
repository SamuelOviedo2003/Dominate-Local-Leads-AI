'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePerformance } from '@/hooks';
import { PerformanceMetric } from '@/types/performance';

interface PerformanceContextType {
  metrics: PerformanceMetric[];
  healthScore: number;
  isCollecting: boolean;
  collectMetrics: () => Promise<void>;
  trackDatabaseQuery: (queryType: string, duration: number, recordCount?: number) => void;
  trackComponentRender: (componentName: string, renderTime: number, mountTime?: number) => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

interface PerformanceProviderProps {
  children: ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const performanceData = usePerformance();

  return (
    <PerformanceContext.Provider value={performanceData}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformanceContext() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformanceContext must be used within a PerformanceProvider');
  }
  return context;
}

// HOC for tracking component render performance
export function withPerformanceTracking<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: T) {
    const { trackComponentRender } = usePerformanceContext();
    const [mounted, setMounted] = React.useState(false);
    const renderStartTime = React.useRef<number>();

    React.useEffect(() => {
      const mountTime = performance.now();
      if (renderStartTime.current) {
        const renderTime = mountTime - renderStartTime.current;
        trackComponentRender(componentName, renderTime, mountTime);
      }
      setMounted(true);
    }, [trackComponentRender]);

    React.useEffect(() => {
      renderStartTime.current = performance.now();
    });

    return <WrappedComponent {...props} />;
  };
}