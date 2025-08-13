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

    // Log metrics to file
    await performanceLogger.logMetrics(processedMetrics);

    return NextResponse.json({ success: true });
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
    const logContent = await performanceLogger.readLog();
    return NextResponse.json({ log: logContent });
  } catch (error) {
    console.error('Failed to read performance log:', error);
    return NextResponse.json(
      { error: 'Failed to read performance log' },
      { status: 500 }
    );
  }
}