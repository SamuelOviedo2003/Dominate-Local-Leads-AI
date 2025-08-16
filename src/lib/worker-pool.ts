'use client'

import { ExtractedColors, ColorExtractionOptions } from './color-extraction'

export interface WorkerColorExtractionRequest {
  id: string
  imageUrl: string
  options: ColorExtractionOptions
}

export interface WorkerColorExtractionResponse {
  id: string
  success: boolean
  colors?: ExtractedColors
  error?: string
  processingTime: number
}

interface QueuedRequest {
  request: WorkerColorExtractionRequest
  resolve: (colors: ExtractedColors) => void
  reject: (error: Error) => void
  priority: number
  timestamp: number
}

interface WorkerInstance {
  worker: Worker
  busy: boolean
  lastUsed: number
  requests: number
}

/**
 * Web Worker pool for color extraction
 * Manages multiple workers and request queuing for optimal performance
 */
export class ColorExtractionWorkerPool {
  private workers: WorkerInstance[] = []
  private requestQueue: QueuedRequest[] = []
  private pendingRequests = new Map<string, QueuedRequest>()
  private maxWorkers: number
  private isSupported: boolean
  private requestIdCounter = 0
  private isInitialized = false

  // Performance configuration
  private readonly config = {
    MAX_WORKERS: Math.min(navigator.hardwareConcurrency || 2, 4),
    MIN_WORKERS: 1,
    WORKER_TIMEOUT: 10000, // 10 seconds
    QUEUE_TIMEOUT: 15000, // 15 seconds
    MAX_QUEUE_SIZE: 50,
    WORKER_IDLE_TIMEOUT: 30000, // 30 seconds
    REQUEST_DEBOUNCE: 100, // 100ms
  }

  private stats = {
    totalRequests: 0,
    completedRequests: 0,
    failedRequests: 0,
    averageProcessingTime: 0,
    queueDrops: 0,
    workerErrors: 0,
  }

  constructor(maxWorkers?: number) {
    this.maxWorkers = maxWorkers || this.config.MAX_WORKERS
    this.isSupported = this.checkWebWorkerSupport()
    
    if (this.isSupported) {
      this.initialize()
    } else {
      console.warn('[WORKER POOL] Web Workers not supported, falling back to main thread')
    }
  }

  /**
   * Check if Web Workers are supported
   */
  private checkWebWorkerSupport(): boolean {
    return typeof Worker !== 'undefined' && typeof window !== 'undefined'
  }

  /**
   * Initialize the worker pool
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized || !this.isSupported) return

    try {
      // Start with minimum workers
      for (let i = 0; i < this.config.MIN_WORKERS; i++) {
        await this.createWorker()
      }

      // Set up periodic cleanup
      setInterval(() => this.cleanupIdleWorkers(), this.config.WORKER_IDLE_TIMEOUT)
      
      this.isInitialized = true
      console.log(`[WORKER POOL] Initialized with ${this.workers.length} workers`)
    } catch (error) {
      console.error('[WORKER POOL] Failed to initialize:', error)
      this.isSupported = false
    }
  }

  /**
   * Create a new worker instance
   */
  private async createWorker(): Promise<WorkerInstance> {
    try {
      const worker = new Worker(
        new URL('../workers/color-extraction.worker.ts', import.meta.url),
        { type: 'module' }
      )

      const workerInstance: WorkerInstance = {
        worker,
        busy: false,
        lastUsed: Date.now(),
        requests: 0
      }

      // Set up worker message handling
      worker.onmessage = (event) => {
        this.handleWorkerMessage(workerInstance, event.data)
      }

      worker.onerror = (error) => {
        this.handleWorkerError(workerInstance, error)
      }

      // Wait for worker to be ready
      await this.waitForWorkerReady(worker)

      this.workers.push(workerInstance)
      console.log(`[WORKER POOL] Created worker, total: ${this.workers.length}`)
      
      return workerInstance
    } catch (error) {
      console.error('[WORKER POOL] Failed to create worker:', error)
      throw error
    }
  }

  /**
   * Wait for worker to signal ready state
   */
  private waitForWorkerReady(worker: Worker): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker ready timeout'))
      }, 5000)

      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'worker-ready') {
          clearTimeout(timeout)
          worker.removeEventListener('message', handler)
          resolve()
        }
      }

      worker.addEventListener('message', handler)
    })
  }

  /**
   * Handle worker messages
   */
  private handleWorkerMessage(workerInstance: WorkerInstance, data: any): void {
    if (data.type === 'worker-ready') return

    const response = data as WorkerColorExtractionResponse
    const queuedRequest = this.pendingRequests.get(response.id)

    if (!queuedRequest) {
      console.warn('[WORKER POOL] Received response for unknown request:', response.id)
      return
    }

    // Update worker state
    workerInstance.busy = false
    workerInstance.lastUsed = Date.now()
    workerInstance.requests++

    // Remove from pending requests
    this.pendingRequests.delete(response.id)

    // Update stats
    this.stats.completedRequests++
    this.updateAverageProcessingTime(response.processingTime)

    // Resolve or reject the request
    if (response.success && response.colors) {
      queuedRequest.resolve(response.colors)
    } else {
      this.stats.failedRequests++
      queuedRequest.reject(new Error(response.error || 'Color extraction failed'))
    }

    // Process next queued request
    this.processQueue()
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(workerInstance: WorkerInstance, error: ErrorEvent): void {
    console.error('[WORKER POOL] Worker error:', error)
    this.stats.workerErrors++

    // Mark worker as not busy and remove from pool
    workerInstance.busy = false
    this.workers = this.workers.filter(w => w !== workerInstance)

    // Terminate the problematic worker
    try {
      workerInstance.worker.terminate()
    } catch (e) {
      console.warn('[WORKER POOL] Error terminating worker:', e)
    }

    // Create a replacement worker if needed
    if (this.workers.length < this.config.MIN_WORKERS) {
      this.createWorker().catch(error => {
        console.error('[WORKER POOL] Failed to create replacement worker:', error)
      })
    }

    // Process queue with remaining workers
    this.processQueue()
  }

  /**
   * Extract colors using worker pool
   */
  async extractColors(
    imageUrl: string, 
    options: ColorExtractionOptions = {},
    priority: number = 0,
    businessId?: string
  ): Promise<ExtractedColors> {
    if (!this.isSupported) {
      // Fallback to main thread
      return this.fallbackExtraction(imageUrl, options)
    }

    this.stats.totalRequests++

    return new Promise((resolve, reject) => {
      const requestId = `req_${++this.requestIdCounter}_${Date.now()}`
      
      const queuedRequest: QueuedRequest = {
        request: {
          id: requestId,
          imageUrl,
          options
        },
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      }

      // Check queue size limit
      if (this.requestQueue.length >= this.config.MAX_QUEUE_SIZE) {
        this.stats.queueDrops++
        reject(new Error('Request queue full'))
        return
      }

      // Add timeout handling
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        this.removeFromQueue(requestId)
        reject(new Error('Color extraction timeout'))
      }, this.config.QUEUE_TIMEOUT)

      // Store with cleanup on completion
      const originalResolve = queuedRequest.resolve
      const originalReject = queuedRequest.reject

      queuedRequest.resolve = (colors: ExtractedColors) => {
        clearTimeout(timeout)
        originalResolve(colors)
      }

      queuedRequest.reject = (error: Error) => {
        clearTimeout(timeout)
        originalReject(error)
      }

      // Add to queue
      this.requestQueue.push(queuedRequest)
      this.sortQueue()

      // Try to process immediately
      this.processQueue()
    })
  }

  /**
   * Process the request queue
   */
  private processQueue(): void {
    if (this.requestQueue.length === 0) return

    // Find available worker
    const availableWorker = this.workers.find(w => !w.busy)
    
    if (!availableWorker) {
      // Try to create additional worker if under limit
      if (this.workers.length < this.maxWorkers) {
        this.createWorker().then(() => {
          this.processQueue()
        }).catch(error => {
          console.warn('[WORKER POOL] Failed to create additional worker:', error)
        })
      }
      return
    }

    // Get highest priority request
    const queuedRequest = this.requestQueue.shift()
    if (!queuedRequest) return

    // Check if request has timed out
    if (Date.now() - queuedRequest.timestamp > this.config.QUEUE_TIMEOUT) {
      queuedRequest.reject(new Error('Request timed out in queue'))
      this.processQueue() // Try next request
      return
    }

    // Assign to worker
    availableWorker.busy = true
    availableWorker.lastUsed = Date.now()
    
    this.pendingRequests.set(queuedRequest.request.id, queuedRequest)

    // Send request to worker
    try {
      availableWorker.worker.postMessage(queuedRequest.request)
    } catch (error) {
      console.error('[WORKER POOL] Failed to send message to worker:', error)
      availableWorker.busy = false
      this.pendingRequests.delete(queuedRequest.request.id)
      queuedRequest.reject(new Error('Failed to send request to worker'))
    }
  }

  /**
   * Sort queue by priority and timestamp
   */
  private sortQueue(): void {
    this.requestQueue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      // Then by timestamp (FIFO)
      return a.timestamp - b.timestamp
    })
  }

  /**
   * Remove request from queue
   */
  private removeFromQueue(requestId: string): void {
    this.requestQueue = this.requestQueue.filter(req => req.request.id !== requestId)
  }

  /**
   * Clean up idle workers
   */
  private cleanupIdleWorkers(): void {
    const now = Date.now()
    const idleWorkers = this.workers.filter(
      w => !w.busy && 
           (now - w.lastUsed) > this.config.WORKER_IDLE_TIMEOUT &&
           this.workers.length > this.config.MIN_WORKERS
    )

    idleWorkers.forEach(worker => {
      try {
        worker.worker.terminate()
        this.workers = this.workers.filter(w => w !== worker)
        console.log(`[WORKER POOL] Terminated idle worker, remaining: ${this.workers.length}`)
      } catch (error) {
        console.warn('[WORKER POOL] Error terminating idle worker:', error)
      }
    })
  }

  /**
   * Fallback extraction on main thread
   */
  private async fallbackExtraction(imageUrl: string, options: ColorExtractionOptions): Promise<ExtractedColors> {
    try {
      const { extractColorsFromImage } = await import('./color-extraction')
      return await extractColorsFromImage(imageUrl, options)
    } catch (error) {
      console.error('[WORKER POOL] Fallback extraction failed:', error)
      throw error
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(newTime: number): void {
    const totalCompleted = this.stats.completedRequests
    this.stats.averageProcessingTime = (
      (this.stats.averageProcessingTime * (totalCompleted - 1)) + newTime
    ) / totalCompleted
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queueLength: this.requestQueue.length,
      pendingRequests: this.pendingRequests.size,
      isSupported: this.isSupported,
      isInitialized: this.isInitialized
    }
  }

  /**
   * Clear the request queue
   */
  clearQueue(): void {
    this.requestQueue.forEach(req => {
      req.reject(new Error('Queue cleared'))
    })
    this.requestQueue = []
    
    this.pendingRequests.forEach(req => {
      req.reject(new Error('Pending request cleared'))
    })
    this.pendingRequests.clear()
  }

  /**
   * Destroy the worker pool
   */
  destroy(): void {
    this.clearQueue()
    
    this.workers.forEach(workerInstance => {
      try {
        workerInstance.worker.terminate()
      } catch (error) {
        console.warn('[WORKER POOL] Error terminating worker:', error)
      }
    })
    
    this.workers = []
    this.isInitialized = false
    console.log('[WORKER POOL] Worker pool destroyed')
  }
}

// Global worker pool instance
let workerPool: ColorExtractionWorkerPool | null = null

/**
 * Get the global worker pool instance
 */
export function getWorkerPool(): ColorExtractionWorkerPool {
  if (!workerPool) {
    workerPool = new ColorExtractionWorkerPool()
  }
  return workerPool
}

/**
 * Destroy the global worker pool
 */
export function destroyWorkerPool(): void {
  if (workerPool) {
    workerPool.destroy()
    workerPool = null
  }
}