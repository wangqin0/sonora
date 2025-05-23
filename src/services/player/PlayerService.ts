/**
 * Player Service
 * Handles audio playback functionality
 */

import { Audio } from 'expo-av';
import { Track } from '../../types';
import { logger } from '../../utils/logger';
import { storageManager } from '../storage/StorageManager';

class PlayerService {
  private static instance: PlayerService;
  private sound: Audio.Sound | null = null;
  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private position: number = 0;
  private duration: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private onPlaybackStatusUpdate: ((status: any) => void) | null = null;
  
  private constructor() {}
  
  /**
   * Get the singleton instance of the player service
   */
  public static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }
  
  /**
   * Play a track
   */
  public async play(track: Track): Promise<void> {
    try {
      logger.info(`Playing track: ${track.title}`);
      
      // Unload current sound if exists
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      
      // Store track info
      this.currentTrack = track;
      
      // If no URI is provided, get it from the storage manager
      let uri = track.uri;
      if (!uri) {
        uri = await storageManager.getPlayableUri(track);
      }
      
      // Try to extract artwork if not already present
      if (!track.artwork) {
        await this.tryExtractArtwork(track);
      }
      
      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        this.handlePlaybackStatusUpdate
      );
      
      this.sound = sound;
      this.isPlaying = true;
      
      logger.debug(`Sound loaded for track: ${track.title}`);
    } catch (error) {
      logger.error(`Error playing track: ${track.title}`, error);
      throw error;
    }
  }
  
  /**
   * Try to extract artwork from the audio file if not already present
   */
  private async tryExtractArtwork(track: Track): Promise<void> {
    try {
      // Let the appropriate storage provider extract metadata
      await storageManager.extractTrackMetadata(track);
    } catch (error) {
      logger.warn(`Failed to extract artwork for: ${track.title}`, error);
      // Continue without artwork
    }
  }
  
  /**
   * Pause playback
   */
  public async pause(): Promise<void> {
    if (!this.sound || !this.isPlaying) {
      return;
    }
    
    try {
      await this.sound.pauseAsync();
      this.isPlaying = false;
      
      // Stop position update interval
      this.stopPositionUpdateInterval();
      
      logger.debug('Playback paused');
    } catch (error) {
      logger.error('Error pausing playback', error);
      throw error;
    }
  }
  
  /**
   * Resume playback
   */
  public async resume(): Promise<void> {
    if (!this.sound || this.isPlaying) {
      return;
    }
    
    try {
      await this.sound.playAsync();
      this.isPlaying = true;
      
      // Start position update interval
      this.startPositionUpdateInterval();
      
      logger.debug('Playback resumed');
    } catch (error) {
      logger.error('Error resuming playback', error);
      throw error;
    }
  }
  
  /**
   * Stop playback
   */
  public async stop(): Promise<void> {
    if (!this.sound) {
      return;
    }
    
    try {
      await this.sound.stopAsync();
      this.isPlaying = false;
      this.position = 0;
      
      // Stop position update interval
      this.stopPositionUpdateInterval();
      
      logger.debug('Playback stopped');
    } catch (error) {
      logger.error('Error stopping playback', error);
      throw error;
    }
  }
  
  /**
   * Seek to a specific position
   */
  public async seekTo(position: number): Promise<void> {
    if (!this.sound) {
      return;
    }
    
    try {
      await this.sound.setPositionAsync(position);
      this.position = position;
      
      logger.debug(`Seeked to position: ${position}ms`);
    } catch (error) {
      logger.error(`Error seeking to position: ${position}`, error);
      throw error;
    }
  }
  
  /**
   * Get current playback status
   */
  public async getStatus(): Promise<{
    isPlaying: boolean;
    position: number;
    duration: number;
    currentTrack: Track | null;
  }> {
    if (this.sound) {
      const status = await this.sound.getStatusAsync();
      // Check if status is not an error status before accessing properties
      if ('positionMillis' in status) {
        // Check if status is not an error status before accessing properties
        if ('positionMillis' in status) {
          this.position = status.positionMillis || 0;
        }
        this.duration = status.durationMillis || 0;
        this.isPlaying = status.isPlaying;
      }
    }
    
    return {
      isPlaying: this.isPlaying,
      position: this.position,
      duration: this.duration,
      currentTrack: this.currentTrack
    };
  }
  
  /**
   * Set playback status update callback
   */
  public setOnPlaybackStatusUpdate(callback: (status: any) => void): void {
    this.onPlaybackStatusUpdate = callback;
  }
  
  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    await this.unloadSound();
    this.stopPositionUpdateInterval();
    this.onPlaybackStatusUpdate = null;
  }
  
  /**
   * Unload the current sound
   */
  private async unloadSound(): Promise<void> {
    if (this.sound) {
      try {
        this.stopPositionUpdateInterval();
        await this.sound.unloadAsync();
        this.sound = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.position = 0;
        this.duration = 0;
      } catch (error) {
        logger.error('Error unloading sound', error);
      }
    }
  }
  
  /**
   * Handle playback status updates
   */
  private handlePlaybackStatusUpdate = (status: any): void => {
    if (status.isLoaded) {
      this.position = status.positionMillis;
      this.duration = status.durationMillis || 0;
      this.isPlaying = status.isPlaying;
      
      // Call external callback if set
      if (this.onPlaybackStatusUpdate) {
        this.onPlaybackStatusUpdate(status);
      }
      
      // Handle playback completion
      if (status.didJustFinish) {
        this.stopPositionUpdateInterval();
        this.position = 0;
        this.isPlaying = false;
        
        logger.debug('Playback completed');
      }
    } else if (status.error) {
      logger.error(`Playback error: ${status.error}`);
    }
  };
  
  /**
   * Start position update interval
   */
  private startPositionUpdateInterval(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      if (this.sound && this.isPlaying) {
        const status = await this.sound.getStatusAsync();
        // Check if status is not an error status before accessing properties
        if ('positionMillis' in status) {
          this.position = status.positionMillis || 0;
        }
      }
    }, 1000);
  }
  
  /**
   * Stop position update interval
   */
  private stopPositionUpdateInterval(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Export singleton instance
export const playerService = PlayerService.getInstance();