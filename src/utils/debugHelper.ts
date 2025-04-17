/**
 * Debug helper for development and troubleshooting
 * This file contains utilities for debugging purposes
 */

import { logger } from './logger';
import { LogLevel } from '../types';

/**
 * Enable debug level logging
 */
export const enableDebugLogging = () => {
  logger.setLogLevel(LogLevel.DEBUG);
  logger.debug('DEBUG logging enabled for troubleshooting');
  
  // Log the app environment
  logger.debug('App environment:', {
    nodeEnv: process.env.NODE_ENV,
    isDev: __DEV__,
    platform: require('react-native').Platform.OS,
    version: require('expo-constants').default.expoConfig?.version || 'unknown'
  });
};

/**
 * Debug utility to log detailed OAuth-related information
 */
export const logOAuthDetails = (message: string, details: any) => {
  // Only log in debug mode and exclude sensitive data
  const safeDetails = { ...details };
  
  // Redact sensitive information
  if (safeDetails.accessToken) {
    safeDetails.accessToken = safeDetails.accessToken.substring(0, 5) + '...';
  }
  
  if (safeDetails.clientId) {
    safeDetails.clientId = safeDetails.clientId.substring(0, 5) + '...';
  }
  
  logger.debug(`[OAuth] ${message}`, safeDetails);
}; 