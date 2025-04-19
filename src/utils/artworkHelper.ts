/**
 * Artwork Helper Utilities
 * Provides functions for working with track artwork
 */

import { logger } from './logger';

/**
 * Validates if the artwork string is a valid URI
 * @param artwork The artwork string to validate
 * @returns True if the artwork is valid
 */
export const isValidArtwork = (artwork: string | undefined): boolean => {
  if (!artwork) return false;
  
  // Check if it's a data URI
  if (artwork.startsWith('data:image')) return true;
  
  // Check if it's a file URI
  if (artwork.startsWith('file://')) return true;
  
  // Check if it's a remote URL
  if (artwork.startsWith('http://') || artwork.startsWith('https://')) return true;
  
  // If none of the above, it's probably not a valid URI
  return false;
};

/**
 * Ensures the artwork URI is in the correct format for React Native Image component
 * @param artwork The artwork string to format
 * @returns A formatted artwork URI or undefined if invalid
 */
export const formatArtworkUri = (artwork: string | undefined): string | undefined => {
  if (!artwork) return undefined;
  
  try {
    // If it's already a valid URI, return it
    if (isValidArtwork(artwork)) return artwork;
    
    // If it's a base64 string without the data URI prefix, add it
    if (artwork.match(/^[A-Za-z0-9+/=]+$/)) {
      logger.debug('Converting base64 string to data URI');
      return `data:image/jpeg;base64,${artwork}`;
    }
    
    // If we can't determine the format, return undefined
    logger.warn('Unknown artwork format');
    return undefined;
  } catch (error) {
    logger.error('Error formatting artwork URI', error);
    return undefined;
  }
}; 