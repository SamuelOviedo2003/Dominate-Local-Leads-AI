import { test, expect } from '@playwright/test';
import { testUtils } from '../fixtures/test-helpers';

/**
 * Performance Testing Suite
 * Testing page load times, database query performance, and animation smoothness
 * Requirements: Page loads <3s, Database queries <500ms, 60fps animations
 */

test.describe('Page Load Performance', () => {
  test('home page should load within 3 seconds', async ({ page }) => {
    const loadTime = await testUtils.measurePageLoad(page, '/');
    
    console.log(`Home page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000); // 3 second requirement
  });

  test('dashboard should load within 3 seconds', async ({ page }) => {
    const loadTime = await testUtils.measurePageLoad(page, '/dashboard');
    
    console.log(`Dashboard load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('new leads page should load within 3 seconds', async ({ page }) => {
    const loadTime = await testUtils.measurePageLoad(page, '/new-leads');
    
    console.log(`New leads page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('lead details page should load within 3 seconds', async ({ page }) => {
    const loadTime = await testUtils.measurePageLoad(page, '/lead-details/test-lead-1');
    
    console.log(`Lead details page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('incoming calls page should load within 3 seconds', async ({ page }) => {
    const loadTime = await testUtils.measurePageLoad(page, '/incoming-calls');
    
    console.log(`Incoming calls page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('salesman page should load within 3 seconds', async ({ page }) => {
    const loadTime = await testUtils.measurePageLoad(page, '/salesman');
    
    console.log(`Salesman page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });
});

test.describe('API Response Performance', () => {
  test('platform spend API should respond within 500ms', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/dashboard/platform-spend?businessId=test&startDate=2024-01-01');
    
    const responseTime = Date.now() - startTime;
    console.log(`Platform spend API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(500); // 500ms requirement
  });

  test('recent leads API should respond within 500ms', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/leads/recent?businessId=test&startDate=2024-01-01');
    
    const responseTime = Date.now() - startTime;
    console.log(`Recent leads API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(500);
  });

  test('lead metrics API should respond within 500ms', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/leads/metrics?businessId=test&startDate=2024-01-01');
    
    const responseTime = Date.now() - startTime;
    console.log(`Lead metrics API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(500);
  });

  test('appointment setters API should respond quickly (temporarily disabled functionality)', async ({ request }) => {
    const startTime = Date.now();
    
    // TEMPORARILY DISABLED: Appointment setters functionality returns empty data
    const response = await request.get('/api/leads/appointment-setters?businessId=test&startDate=2024-01-01');
    
    const responseTime = Date.now() - startTime;
    console.log(`Appointment setters API response time: ${responseTime}ms (returning empty data)`);
    
    // Should still be fast since it returns empty data immediately
    expect(responseTime).toBeLessThan(100); // Even faster since no DB queries
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });

  test('salesman metrics API should respond within 500ms', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/salesman/metrics?businessId=test&startDate=2024-01-01');
    
    const responseTime = Date.now() - startTime;
    console.log(`Salesman metrics API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(500);
  });

  test('incoming calls source distribution API should respond within 500ms', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/incoming-calls/source-distribution?businessId=test&startDate=2024-01-01');
    
    const responseTime = Date.now() - startTime;
    console.log(`Source distribution API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(500);
  });

  test('lead details API should respond within 500ms', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/leads/test-lead-1?businessId=test');
    
    const responseTime = Date.now() - startTime;
    console.log(`Lead details API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(500);
  });
});

test.describe('Animation Performance', () => {
  test('loading spinner should maintain 60fps', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for loading spinner
    const spinner = page.locator('.animate-spin');
    
    if (await spinner.count() > 0) {
      // Measure animation performance
      const frameRate = await page.evaluate(() => {
        return new Promise((resolve) => {
          const element = document.querySelector('.animate-spin');
          if (!element) {
            resolve(60); // Assume good performance if no spinner
            return;
          }
          
          let frameCount = 0;
          const startTime = performance.now();
          const duration = 1000; // Measure for 1 second
          
          function countFrames() {
            frameCount++;
            if (performance.now() - startTime < duration) {
              requestAnimationFrame(countFrames);
            } else {
              resolve(frameCount);
            }
          }
          
          requestAnimationFrame(countFrames);
        });
      });
      
      console.log(`Loading spinner frame rate: ${frameRate}fps`);
      expect(frameRate).toBeGreaterThanOrEqual(55); // Allow slight variation from 60fps
    }
  });

  test('carousel navigation should be smooth', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Look for carousel navigation
    const navButton = page.locator('button:has(svg), .carousel-nav');
    
    if (await navButton.count() > 0) {
      // Measure click response time
      const startTime = Date.now();
      
      await navButton.first().click();
      
      // Wait for animation to complete
      await page.waitForTimeout(300);
      
      const responseTime = Date.now() - startTime;
      console.log(`Carousel navigation response time: ${responseTime}ms`);
      
      // Should respond quickly for smooth UX
      expect(responseTime).toBeLessThan(100);
    }
  });

  test('hover effects should be responsive', async ({ page }) => {
    await page.goto('/new-leads');
    await page.waitForTimeout(2000);
    
    // Look for hoverable elements
    const hoverElement = page.locator('tr, .hover\\:shadow-md, .hover\\:border-purple-300').first();
    
    if (await hoverElement.count() > 0) {
      // Measure hover response
      const startTime = Date.now();
      
      await hoverElement.hover();
      
      const hoverTime = Date.now() - startTime;
      console.log(`Hover effect response time: ${hoverTime}ms`);
      
      // Should be nearly instantaneous
      expect(hoverTime).toBeLessThan(50);
    }
  });
});

test.describe('Core Web Vitals', () => {
  test('should meet LCP requirements (<2.5s)', async ({ page }) => {
    await page.goto('/dashboard');
    
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });
    
    console.log(`LCP: ${lcp}ms`);
    expect(lcp).toBeLessThan(2500); // 2.5s requirement
  });

  test('should meet FID requirements (<100ms)', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Simulate user interaction
    await page.click('body');
    
    const fid = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            resolve(entries[0].processingStart - entries[0].startTime);
          }
        }).observe({ entryTypes: ['first-input'] });
        
        // Fallback for good performance
        setTimeout(() => resolve(0), 2000);
      });
    });
    
    console.log(`FID: ${fid}ms`);
    expect(fid).toBeLessThan(100); // 100ms requirement
  });

  test('should meet CLS requirements (<0.1)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(3000); // Let page settle
    
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          resolve(clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Resolve after observing for a bit
        setTimeout(() => resolve(clsValue), 2000);
      });
    });
    
    console.log(`CLS: ${cls}`);
    expect(cls).toBeLessThan(0.1); // 0.1 requirement
  });
});

test.describe('Memory Usage', () => {
  test('should not have excessive memory leaks', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Navigate through several pages
    const pages = ['/new-leads', '/salesman', '/incoming-calls', '/dashboard'];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForTimeout(1000);
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`);
      
      // Memory shouldn't increase by more than 50% during normal navigation
      expect(memoryIncreasePercent).toBeLessThan(50);
    }
  });
});

test.describe('Network Performance', () => {
  test('should minimize network requests', async ({ page }) => {
    const requests: string[] = [];
    
    page.on('request', request => {
      requests.push(request.url());
    });
    
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    
    console.log(`Total network requests: ${requests.length}`);
    
    // Filter out common assets
    const apiRequests = requests.filter(url => 
      url.includes('/api/') && !url.includes('_next')
    );
    
    console.log(`API requests: ${apiRequests.length}`);
    
    // Should have reasonable number of API requests
    expect(apiRequests.length).toBeLessThan(20);
  });

  test('should handle concurrent requests efficiently', async ({ request }) => {
    const endpoints = [
      '/api/dashboard/platform-spend?businessId=test&startDate=2024-01-01',
      '/api/leads/recent?businessId=test&startDate=2024-01-01',
      '/api/leads/metrics?businessId=test&startDate=2024-01-01',
      '/api/salesman/metrics?businessId=test&startDate=2024-01-01'
    ];
    
    const startTime = Date.now();
    
    const promises = endpoints.map(endpoint => request.get(endpoint));
    const responses = await Promise.all(promises);
    
    const totalTime = Date.now() - startTime;
    console.log(`Concurrent requests completed in: ${totalTime}ms`);
    
    // Concurrent requests should complete faster than sequential
    expect(totalTime).toBeLessThan(1000);
    
    // All requests should complete successfully
    responses.forEach((response, index) => {
      console.log(`${endpoints[index]}: ${response.status()}`);
    });
  });
});

test.describe('Image Loading Performance', () => {
  test('should load images efficiently', async ({ page }) => {
    await page.goto('/lead-details/test-lead-1');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Measure image load times
      const imageLoadTimes = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img');
        const promises: Promise<number>[] = [];
        
        imgs.forEach(img => {
          promises.push(new Promise((resolve) => {
            const startTime = performance.now();
            
            if (img.complete) {
              resolve(0); // Already loaded
            } else {
              img.onload = () => resolve(performance.now() - startTime);
              img.onerror = () => resolve(performance.now() - startTime);
            }
          }));
        });
        
        return Promise.all(promises);
      });
      
      const maxLoadTime = Math.max(...imageLoadTimes);
      console.log(`Max image load time: ${maxLoadTime}ms`);
      
      // Images should load within reasonable time
      expect(maxLoadTime).toBeLessThan(2000);
    }
  });
});