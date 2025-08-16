/**
 * Structured logging system for the application
 * Replaces console.log statements with proper logging
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogContext {
  component?: string;
  userId?: string;
  businessId?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.padEnd(5)} ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }

  // Specialized logging methods for common patterns
  performance(action: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${action}`, { ...context, duration, action });
  }

  navigation(action: string, href?: string, context?: LogContext): void {
    this.debug(`Navigation: ${action}`, { ...context, href, action });
  }

  colorExtraction(action: string, imageUrl?: string, context?: LogContext): void {
    this.debug(`Color Extraction: ${action}`, { ...context, imageUrl, action });
  }

  businessSwitching(action: string, businessId?: string, context?: LogContext): void {
    this.info(`Business Switching: ${action}`, { ...context, businessId, action });
  }

  apiCall(method: string, url: string, duration?: number, context?: LogContext): void {
    this.debug(`API Call: ${method} ${url}`, { ...context, method, url, duration });
  }
}

export const logger = new Logger();

// Convenience exports for specific logging patterns
export const logPerformance = (action: string, duration: number, context?: LogContext) => 
  logger.performance(action, duration, context);

export const logNavigation = (action: string, href?: string, context?: LogContext) => 
  logger.navigation(action, href, context);

export const logColorExtraction = (action: string, imageUrl?: string, context?: LogContext) => 
  logger.colorExtraction(action, imageUrl, context);

export const logBusinessSwitching = (action: string, businessId?: string, context?: LogContext) => 
  logger.businessSwitching(action, businessId, context);

export const logApiCall = (method: string, url: string, duration?: number, context?: LogContext) => 
  logger.apiCall(method, url, duration, context);