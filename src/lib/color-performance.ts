'use client'

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

export interface PerformanceReport {
  summary: {
    totalExtractions: number
    averageTime: number
    cacheHitRate: number
    errorRate: number
    workerUsageRate: number
  }
  metrics: PerformanceMetric[]
  recommendations: string[]
  alerts: string[]
}

/**
 * Color extraction performance monitor
 */
export class ColorPerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private alerts: string[] = []
  private maxMetrics: number = 1000 // Keep last 1000 metrics
  private isMonitoring: boolean = false

  // Performance thresholds
  private readonly thresholds = {
    SLOW_EXTRACTION: 2000, // 2 seconds
    VERY_SLOW_EXTRACTION: 5000, // 5 seconds
    HIGH_ERROR_RATE: 0.1, // 10%
    LOW_CACHE_HIT_RATE: 0.5, // 50%
    HIGH_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  }

  constructor() {
    this.startMonitoring()
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    
    // Monitor every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics()
      this.checkAlerts()
      this.cleanupOldMetrics()
    }, 30000)

    console.log('[PERFORMANCE MONITOR] Started monitoring color extraction performance')
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)

    // Check for immediate alerts
    this.checkMetricAlert(metric)

    console.log(`[PERFORMANCE] ${name}: ${value}${this.getUnitForMetric(name)}`, metadata || '')
  }

  /**
   * Record color extraction timing
   */
  recordExtraction(
    duration: number,
    source: 'cache' | 'worker' | 'main-thread' | 'fallback',
    businessId?: string,
    imageUrl?: string,
    success: boolean = true
  ): void {
    this.recordMetric('extraction_time', duration, {
      source,
      businessId,
      imageUrl,
      success
    })

    this.recordMetric('extraction_count', 1, { source, success })
  }

  /**
   * Record cache performance
   */
  recordCacheHit(hitType: 'memory' | 'localStorage' | 'database', duration: number): void {
    this.recordMetric('cache_hit', duration, { type: hitType })
    this.recordMetric('cache_access', 1, { type: hitType, hit: true })
  }

  recordCacheMiss(duration: number): void {
    this.recordMetric('cache_miss', duration)
    this.recordMetric('cache_access', 1, { hit: false })
  }

  /**
   * Record worker pool metrics
   */
  recordWorkerMetrics(
    activeWorkers: number,
    busyWorkers: number,
    queueLength: number,
    pendingRequests: number
  ): void {
    this.recordMetric('worker_pool_active', activeWorkers)
    this.recordMetric('worker_pool_busy', busyWorkers)
    this.recordMetric('worker_queue_length', queueLength)
    this.recordMetric('worker_pending_requests', pendingRequests)
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(memoryUsage: number, source: string): void {
    this.recordMetric('memory_usage', memoryUsage, { source })
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    try {
      // Memory usage (if available)
      if ('memory' in performance) {
        const memInfo = (performance as any).memory
        this.recordMemoryUsage(memInfo.usedJSHeapSize, 'js_heap')
        this.recordMemoryUsage(memInfo.totalJSHeapSize, 'js_heap_total')
        this.recordMemoryUsage(memInfo.jsHeapSizeLimit, 'js_heap_limit')
      }

      // Performance timing
      if ('timing' in performance) {
        const timing = performance.timing
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart
        this.recordMetric('page_load_time', pageLoadTime)
      }

    } catch (error) {
      console.warn('[PERFORMANCE MONITOR] Error collecting system metrics:', error)
    }
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(): void {
    const now = Date.now()
    const recent = this.metrics.filter(m => now - m.timestamp < 300000) // Last 5 minutes

    // Check extraction time trends
    const extractionTimes = recent
      .filter(m => m.name === 'extraction_time')
      .map(m => m.value)

    if (extractionTimes.length > 0) {
      const avgTime = extractionTimes.reduce((a, b) => a + b, 0) / extractionTimes.length
      
      if (avgTime > this.thresholds.VERY_SLOW_EXTRACTION) {
        this.addAlert(`Very slow color extraction detected: ${avgTime.toFixed(2)}ms average`)
      } else if (avgTime > this.thresholds.SLOW_EXTRACTION) {
        this.addAlert(`Slow color extraction detected: ${avgTime.toFixed(2)}ms average`)
      }
    }

    // Check error rate
    const extractions = recent.filter(m => m.name === 'extraction_count')
    const successes = extractions.filter(m => m.metadata?.success === true).length
    const total = extractions.length

    if (total > 0) {
      const errorRate = 1 - (successes / total)
      if (errorRate > this.thresholds.HIGH_ERROR_RATE) {
        this.addAlert(`High error rate detected: ${(errorRate * 100).toFixed(1)}%`)
      }
    }

    // Check cache hit rate
    const cacheAccesses = recent.filter(m => m.name === 'cache_access')
    const cacheHits = cacheAccesses.filter(m => m.metadata?.hit === true).length
    const totalAccesses = cacheAccesses.length

    if (totalAccesses > 0) {
      const hitRate = cacheHits / totalAccesses
      if (hitRate < this.thresholds.LOW_CACHE_HIT_RATE) {
        this.addAlert(`Low cache hit rate detected: ${(hitRate * 100).toFixed(1)}%`)
      }
    }

    // Check memory usage
    const memoryMetrics = recent.filter(m => m.name === 'memory_usage' && m.metadata?.source === 'js_heap')
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1].value
      if (latestMemory > this.thresholds.HIGH_MEMORY_USAGE) {
        this.addAlert(`High memory usage detected: ${(latestMemory / 1024 / 1024).toFixed(2)}MB`)
      }
    }
  }

  /**
   * Check individual metric for alerts
   */
  private checkMetricAlert(metric: PerformanceMetric): void {
    switch (metric.name) {
      case 'extraction_time':
        if (metric.value > this.thresholds.VERY_SLOW_EXTRACTION) {
          this.addAlert(`Very slow extraction: ${metric.value.toFixed(2)}ms`)
        }
        break
      
      case 'worker_queue_length':
        if (metric.value > 10) {
          this.addAlert(`High worker queue length: ${metric.value} requests`)
        }
        break
      
      case 'memory_usage':
        if (metric.value > this.thresholds.HIGH_MEMORY_USAGE) {
          this.addAlert(`High memory usage: ${(metric.value / 1024 / 1024).toFixed(2)}MB`)
        }
        break
    }
  }

  /**
   * Add an alert
   */
  private addAlert(message: string): void {
    const alertKey = `${Date.now()}-${message}`
    if (!this.alerts.some(alert => alert.includes(message.split(':')[0]))) {
      this.alerts.push(`[${new Date().toISOString()}] ${message}`)
      console.warn('[PERFORMANCE ALERT]', message)
      
      // Keep only last 20 alerts
      if (this.alerts.length > 20) {
        this.alerts.shift()
      }
    }
  }

  /**
   * Get unit for metric
   */
  private getUnitForMetric(name: string): string {
    if (name.includes('time') || name.includes('duration')) return 'ms'
    if (name.includes('memory') || name.includes('usage')) return 'B'
    if (name.includes('rate')) return '%'
    if (name.includes('count') || name.includes('length')) return ''
    return ''
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
    
    // Also limit by count
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const now = Date.now()
    const recent = this.metrics.filter(m => now - m.timestamp < 3600000) // Last hour

    // Calculate summary statistics
    const extractionTimes = recent
      .filter(m => m.name === 'extraction_time')
      .map(m => m.value)

    const cacheAccesses = recent.filter(m => m.name === 'cache_access')
    const cacheHits = cacheAccesses.filter(m => m.metadata?.hit === true).length

    const extractions = recent.filter(m => m.name === 'extraction_count')
    const successes = extractions.filter(m => m.metadata?.success === true).length

    const workerExtractions = recent.filter(m => 
      m.name === 'extraction_count' && m.metadata?.source === 'worker'
    ).length

    const summary = {
      totalExtractions: extractions.length,
      averageTime: extractionTimes.length > 0 
        ? extractionTimes.reduce((a, b) => a + b, 0) / extractionTimes.length 
        : 0,
      cacheHitRate: cacheAccesses.length > 0 ? cacheHits / cacheAccesses.length : 0,
      errorRate: extractions.length > 0 ? 1 - (successes / extractions.length) : 0,
      workerUsageRate: extractions.length > 0 ? workerExtractions / extractions.length : 0
    }

    // Generate recommendations
    const recommendations: string[] = []

    if (summary.averageTime > this.thresholds.SLOW_EXTRACTION) {
      recommendations.push('Consider optimizing image sizes or increasing worker pool size')
    }

    if (summary.cacheHitRate < this.thresholds.LOW_CACHE_HIT_RATE) {
      recommendations.push('Consider implementing cache warming strategies')
    }

    if (summary.errorRate > this.thresholds.HIGH_ERROR_RATE) {
      recommendations.push('Investigate error causes and improve error handling')
    }

    if (summary.workerUsageRate < 0.8) {
      recommendations.push('Consider enabling worker usage for better performance')
    }

    return {
      summary,
      metrics: recent,
      recommendations,
      alerts: [...this.alerts]
    }
  }

  /**
   * Get recent metrics by name
   */
  getMetricsByName(name: string, limit: number = 100): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.name === name)
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Clear all metrics and alerts
   */
  clear(): void {
    this.metrics = []
    this.alerts = []
    console.log('[PERFORMANCE MONITOR] Cleared all metrics and alerts')
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false
    console.log('[PERFORMANCE MONITOR] Stopped monitoring')
  }

  /**
   * Get alerts
   */
  getAlerts(): string[] {
    return [...this.alerts]
  }

  /**
   * Get metrics count
   */
  getMetricsCount(): number {
    return this.metrics.length
  }
}

// Global performance monitor instance
let performanceMonitor: ColorPerformanceMonitor | null = null

/**
 * Get the global performance monitor instance
 */
export function getPerformanceMonitor(): ColorPerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new ColorPerformanceMonitor()
  }
  return performanceMonitor
}

/**
 * Destroy the global performance monitor
 */
export function destroyPerformanceMonitor(): void {
  if (performanceMonitor) {
    performanceMonitor.stopMonitoring()
    performanceMonitor = null
  }
}

/**
 * Quick performance snapshot
 */
export function getPerformanceSnapshot() {
  const monitor = getPerformanceMonitor()
  return monitor.generateReport()
}