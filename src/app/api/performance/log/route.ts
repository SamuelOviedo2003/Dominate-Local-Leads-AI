import { NextRequest, NextResponse } from 'next/server';
import { performanceLogger } from '@/lib/performance-logger';
import { PerformanceMetric } from '@/types/performance';

export async function POST(request: NextRequest) {
  try {
    const { metrics }: { metrics: PerformanceMetric[] } = await request.json();

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json(
        { error: 'Invalid metrics data' },
        { status: 400 }
      );
    }

    // Convert timestamp strings back to Date objects
    const processedMetrics = metrics.map(metric => ({
      ...metric,
      timestamp: new Date(metric.timestamp)
    }));

    // Log metrics (will handle file/console logging automatically)
    await performanceLogger.logMetrics(processedMetrics);

    // Get current logging configuration for response
    const config = performanceLogger.getLogConfig();

    return NextResponse.json({ 
      success: true,
      logConfig: {
        useFileLogging: config.useFileLogging,
        logFile: config.useFileLogging ? config.logFile : null
      }
    });
  } catch (error) {
    console.error('Performance logging error:', error);
    return NextResponse.json(
      { error: 'Failed to log performance metrics' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const config = performanceLogger.getLogConfig();
    
    if (!config.useFileLogging) {
      return NextResponse.json({ 
        log: 'File logging is disabled. Performance metrics are logged to console.',
        logConfig: config
      });
    }

    const logContent = await performanceLogger.readLog();
    return NextResponse.json({ 
      log: logContent,
      logConfig: config
    });
  } catch (error) {
    console.error('Failed to read performance log:', error);
    return NextResponse.json(
      { error: 'Failed to read performance log' },
      { status: 500 }
    );
  }
}