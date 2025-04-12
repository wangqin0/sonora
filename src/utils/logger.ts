/**
 * Logger utility for the Sonora music player app
 * Provides rich debug messaging with appropriate log levels
 */

import { LogLevel } from '../types';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// Default configuration
const DEFAULT_LOG_LEVEL = LogLevel.INFO;
const MAX_LOG_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const LOG_FILE_PATH = `${FileSystem.documentDirectory}sonora-logs.txt`;

class Logger {
  private static instance: Logger;
  private currentLogLevel: LogLevel = DEFAULT_LOG_LEVEL;
  private isFileLoggingEnabled = false;

  private constructor() {
    // Initialize file logging if in production
    if (!__DEV__) {
      this.setupFileLogging();
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set the current log level
   */
  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
    this.info(`Log level set to ${level}`);
  }

  /**
   * Enable or disable file logging
   */
  public enableFileLogging(enable: boolean): void {
    this.isFileLoggingEnabled = enable;
    if (enable) {
      this.setupFileLogging();
    }
  }

  /**
   * Debug level logging
   */
  public debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log('DEBUG', message, data);
    }
  }

  /**
   * Info level logging
   */
  public info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log('INFO', message, data);
    }
  }

  /**
   * Warning level logging
   */
  public warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log('WARN', message, data);
    }
  }

  /**
   * Error level logging
   */
  public error(message: string, error?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.log('ERROR', message, error);
      
      // Always log errors to file regardless of file logging setting
      if (!__DEV__) {
        this.writeToFile('ERROR', message, error);
      }
    }
  }

  /**
   * Check if the given log level should be logged based on current settings
   */
  private shouldLog(level: LogLevel): boolean {
    const logLevelPriority = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3
    };

    return logLevelPriority[level] >= logLevelPriority[this.currentLogLevel];
  }

  /**
   * Format and output log message
   */
  private log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    switch (level) {
      case 'ERROR':
        console.error(formattedMessage, data ? data : '');
        break;
      case 'WARN':
        console.warn(formattedMessage, data ? data : '');
        break;
      case 'INFO':
        console.info(formattedMessage, data ? data : '');
        break;
      default:
        console.log(formattedMessage, data ? data : '');
    }

    // Write to file if enabled
    if (this.isFileLoggingEnabled && !__DEV__) {
      this.writeToFile(level, message, data);
    }
  }

  /**
   * Setup file logging
   */
  private async setupFileLogging(): Promise<void> {
    try {
      // Check if log file exists
      const fileInfo = await FileSystem.getInfoAsync(LOG_FILE_PATH);
      
      if (!fileInfo.exists) {
        // Create log file if it doesn't exist
        await FileSystem.writeAsStringAsync(LOG_FILE_PATH, '');
      } else if (fileInfo.size && fileInfo.size > MAX_LOG_FILE_SIZE) {
        // Rotate log file if it's too large
        await this.rotateLogFile();
      }
      
      this.isFileLoggingEnabled = true;
    } catch (error) {
      console.error('Failed to setup file logging:', error);
      this.isFileLoggingEnabled = false;
    }
  }

  /**
   * Write log message to file
   */
  private async writeToFile(level: string, message: string, data?: any): Promise<void> {
    try {
      if (!this.isFileLoggingEnabled) return;

      const timestamp = new Date().toISOString();
      const appVersion = Constants.expoConfig?.version || 'unknown';
      let logEntry = `[${timestamp}] [${level}] [v${appVersion}] ${message}`;
      
      if (data) {
        if (data instanceof Error) {
          logEntry += `\nError: ${data.message}\nStack: ${data.stack || 'No stack trace'}`;
        } else {
          try {
            logEntry += `\nData: ${JSON.stringify(data)}`;
          } catch (e) {
            logEntry += `\nData: [Cannot stringify data]`;
          }
        }
      }
      
      logEntry += '\n';
      
      // Read existing content and append new log entry
      const existingContent = await FileSystem.readAsStringAsync(LOG_FILE_PATH);
      await FileSystem.writeAsStringAsync(LOG_FILE_PATH, existingContent + logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Rotate log file when it gets too large
   */
  private async rotateLogFile(): Promise<void> {
    try {
      const backupPath = `${LOG_FILE_PATH}.bak`;
      
      // Delete old backup if exists
      const backupInfo = await FileSystem.getInfoAsync(backupPath);
      if (backupInfo.exists) {
        await FileSystem.deleteAsync(backupPath);
      }
      
      // Rename current log to backup
      await FileSystem.moveAsync({
        from: LOG_FILE_PATH,
        to: backupPath
      });
      
      // Create new empty log file
      await FileSystem.writeAsStringAsync(LOG_FILE_PATH, '');
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const debug = (message: string, data?: any) => logger.debug(message, data);
export const info = (message: string, data?: any) => logger.info(message, data);
export const warn = (message: string, data?: any) => logger.warn(message, data);
export const error = (message: string, error?: any) => logger.error(message, error);