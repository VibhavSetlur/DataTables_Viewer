/**
 * Structured Logger with History
 *
 * Production-grade logging utility with configurable log levels,
 * in-memory history for debugging, and global error capture.
 *
 * @module logger
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: unknown;
}

const MAX_LOG_HISTORY = 1000;
const logHistory: LogEntry[] = [];

/**
 * Get configured log level from environment or default to 'debug' in dev, 'info' in prod.
 */
function getLogLevel(): LogLevel {
    const envLevel = (import.meta.env?.VITE_LOG_LEVEL as string)?.toLowerCase();
    if (envLevel && envLevel in LOG_LEVELS) {
        return envLevel as LogLevel;
    }
    // Always capture info+ in production so logs are useful
    return import.meta.env?.DEV ? 'debug' : 'info';
}

const currentLevel = getLogLevel();

/**
 * Check if a log level should be output based on current configuration.
 */
function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Format log message with timestamp and prefix.
 */
function formatMessage(prefix: string, msg: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${prefix}] ${msg}`;
}

/**
 * Add entry to history (always, regardless of log level).
 */
function addToHistory(level: LogLevel, msg: string, data?: unknown): void {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message: msg,
        data: data !== undefined ? data : undefined
    };
    logHistory.push(entry);
    if (logHistory.length > MAX_LOG_HISTORY) {
        logHistory.shift();
    }
}

/**
 * Structured logger with configurable levels and history tracking.
 *
 * Log levels (from lowest to highest priority):
 * - debug: Development debugging information
 * - info: General operational information
 * - warn: Warning conditions that may require attention
 * - error: Error conditions that need immediate attention
 *
 * Set VITE_LOG_LEVEL environment variable to control output.
 */
export const logger = {
    debug(msg: string, data?: unknown): void {
        addToHistory('debug', msg, data);
        if (shouldLog('debug')) {
            if (data !== undefined) {
                console.info(formatMessage('DEBUG', msg), data);
            } else {
                console.info(formatMessage('DEBUG', msg));
            }
        }
    },

    info(msg: string, data?: unknown): void {
        addToHistory('info', msg, data);
        if (shouldLog('info')) {
            if (data !== undefined) {
                console.info(formatMessage('INFO', msg), data);
            } else {
                console.info(formatMessage('INFO', msg));
            }
        }
    },

    warn(msg: string, data?: unknown): void {
        addToHistory('warn', msg, data);
        if (shouldLog('warn')) {
            if (data !== undefined) {
                console.warn(formatMessage('WARN', msg), data);
            } else {
                console.warn(formatMessage('WARN', msg));
            }
        }
    },

    error(msg: string, data?: unknown): void {
        addToHistory('error', msg, data);
        if (shouldLog('error')) {
            if (data !== undefined) {
                console.error(formatMessage('ERROR', msg), data);
            } else {
                console.error(formatMessage('ERROR', msg));
            }
        }
    },

    /**
     * Get the log history (all logs, regardless of current level).
     */
    getLogHistory(): LogEntry[] {
        return [...logHistory];
    },

    /**
     * Clear log history.
     */
    clearHistory(): void {
        logHistory.length = 0;
    }
};

// =============================================================================
// GLOBAL ERROR CAPTURE
// =============================================================================
// Captures uncaught errors and unhandled promise rejections so they always
// appear in the LogViewer, even if no explicit logger.error() call exists.

let _globalHandlersInstalled = false;

export function installGlobalErrorHandlers(): void {
    if (_globalHandlersInstalled || typeof window === 'undefined') return;
    _globalHandlersInstalled = true;

    window.addEventListener('error', (event: ErrorEvent) => {
        const msg = event.message || 'Unknown error';
        const location = event.filename
            ? ` (${event.filename}:${event.lineno}:${event.colno})`
            : '';
        addToHistory('error', `[Uncaught] ${msg}${location}`, {
            source: 'frontend',
            stack: event.error?.stack
        });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        const msg = reason instanceof Error
            ? reason.message
            : (typeof reason === 'string' ? reason : JSON.stringify(reason));
        addToHistory('error', `[UnhandledPromise] ${msg}`, {
            source: 'frontend',
            stack: reason instanceof Error ? reason.stack : undefined
        });
    });

    // Intercept console.error and console.warn so that third-party code
    // (or browser-generated warnings) also lands in the log history.
    const origError = console.error;
    const origWarn = console.warn;

    console.error = (...args: any[]) => {
        const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
        // Avoid duplicates from our own logger (which already calls addToHistory)
        if (!msg.includes('[ERROR]')) {
            addToHistory('error', `[console.error] ${msg}`);
        }
        origError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
        const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
        if (!msg.includes('[WARN]')) {
            addToHistory('warn', `[console.warn] ${msg}`);
        }
        origWarn.apply(console, args);
    };
}

export default logger;
