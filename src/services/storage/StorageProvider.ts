/**
 * Abstract storage provider interface
 * Defines common methods for accessing files across different storage backends
 */

import { Track } from '../../types';

export interface StorageProviderInterface {
  /**
   * Get the name of the storage provider
   */
  getName(): string;
  
  /**
   * Get the unique identifier for this storage provider
   */
  getId(): string;
  
  /**
   * Check if the storage provider is connected and ready
   */
  isConnected(): Promise<boolean>;
  
  /**
   * Connect to the storage provider
   */
  connect(): Promise<boolean>;
  
  /**
   * Disconnect from the storage provider
   */
  disconnect(): Promise<void>;
  
  /**
   * List all audio files in the storage
   */
  listAudioFiles(): Promise<Track[]>;
  
  /**
   * Get a specific audio file by ID
   */
  getAudioFile(id: string): Promise<Track | null>;
  
  /**
   * Get the content URI for an audio file
   * This URI can be used for playback
   */
  getAudioFileUri(track: Track): Promise<string>;
}

/**
 * Abstract base class for storage providers
 */
export abstract class BaseStorageProvider implements StorageProviderInterface {
  protected name: string;
  protected id: string;
  
  constructor(name: string, id: string) {
    this.name = name;
    this.id = id;
  }
  
  getName(): string {
    return this.name;
  }
  
  getId(): string {
    return this.id;
  }
  
  abstract isConnected(): Promise<boolean>;
  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract listAudioFiles(): Promise<Track[]>;
  abstract getAudioFile(id: string): Promise<Track | null>;
  abstract getAudioFileUri(track: Track): Promise<string>;
}