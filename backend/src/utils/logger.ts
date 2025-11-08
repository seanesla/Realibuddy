import { NODE_ENV } from './config.js';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * A simple logger utility for consistent console output.
 * Respects NODE_ENV to suppress debug logs in production.
 */
class Logger {
    private log(level: LogLevel, message: string, ...args: unknown[]) {
        if (level === 'DEBUG' && NODE_ENV === 'production') {
            return;
        }

        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] ${message}`;

        switch (level) {
            case 'DEBUG':
                console.debug(formattedMessage, ...args);
                break;
            case 'INFO':
                console.info(formattedMessage, ...args);
                break;
            case 'WARN':
                console.warn(formattedMessage, ...args);
                break;
            case 'ERROR':
                console.error(formattedMessage, ...args);
                break;
        }
    }

    debug(message: string, ...args: unknown[]) {
        this.log('DEBUG', message, ...args);
    }

    info(message: string, ...args: unknown[]) {
        this.log('INFO', message, ...args);
    }

    warn(message: string, ...args: unknown[]) {
        this.log('WARN', message, ...args);
    }

    error(message: string, error?: unknown, ...args: unknown[]) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log('ERROR', `${message} | Error: ${errorMessage}`, ...args);
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
    }
}

export const logger = new Logger();