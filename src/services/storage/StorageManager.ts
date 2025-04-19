/**
 * Storage Manager
 * Manages and coordinates different storage providers
 */

import { LocalStorageProvider } from './LocalStorageProvider';
import { OneDriveStorageProvider } from './OneDriveStorageProvider';
import { StorageProviderInterface } from './StorageProvider';
import { Track } from '../../types';
import { logger } from '../../utils/logger';
import { ONEDRIVE_CLIENT_ID } from '../../config/onedrive';
import { BaseStorageProvider } from './StorageProvider';

class StorageManager {
  private static instance: StorageManager;
  private providers: Map<string, BaseStorageProvider>;
  private initialized: boolean = false;
  
  private constructor() {
    this.providers = new Map<string, BaseStorageProvider>();
    
    // Initialize built-in providers
    const localProvider = new LocalStorageProvider();
    const oneDriveProvider = new OneDriveStorageProvider();
    
    this.providers.set(localProvider.getId(), localProvider);
    this.providers.set(oneDriveProvider.getId(), oneDriveProvider);
    
    logger.info('StorageManager initialized with providers: local, onedrive');
  }
  
  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }
  
  /**
   * Initialize all storage providers
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      logger.info('Initializing storage providers');
      
      // Initialize local storage provider
      const localProvider = this.getProvider('local');
      if (localProvider) {
        await localProvider.connect();
        logger.info('Local storage provider initialized');
      }
      
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize storage providers', error);
      throw error;
    }
  }
  
  /**
   * Register a new storage provider
   */
  public registerProvider(provider: BaseStorageProvider): void {
    this.providers.set(provider.getId(), provider);
    logger.debug(`Registered storage provider: ${provider.getName()}`);
  }
  
  /**
   * Get a specific storage provider by ID
   */
  public getProvider(id: string): BaseStorageProvider | undefined {
    return this.providers.get(id);
  }
  
  /**
   * Get all registered storage providers
   */
  public getAllProviders(): BaseStorageProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get all connected storage providers
   */
  public async getConnectedProviders(): Promise<BaseStorageProvider[]> {
    const connectedProviders: BaseStorageProvider[] = [];
    
    for (const provider of this.providers.values()) {
      if (await provider.isConnected()) {
        connectedProviders.push(provider);
      }
    }
    
    return connectedProviders;
  }
  
  /**
   * Connect to a specific storage provider
   */
  public async connectProvider(id: string): Promise<boolean> {
    const provider = this.getProvider(id);
    
    if (!provider) {
      logger.warn(`Provider not found: ${id}`);
      return false;
    }
    
    try {
      const connected = await provider.connect();
      if (connected) {
        logger.info(`Connected to provider: ${provider.getName()}`);
      } else {
        logger.warn(`Failed to connect to provider: ${provider.getName()}`);
      }
      return connected;
    } catch (error) {
      logger.error(`Error connecting to provider: ${provider.getName()}`, error);
      return false;
    }
  }
  
  /**
   * Disconnect from a specific storage provider
   */
  public async disconnectProvider(id: string): Promise<void> {
    const provider = this.getProvider(id);
    
    if (!provider) {
      logger.warn(`Provider not found: ${id}`);
      return;
    }
    
    try {
      await provider.disconnect();
      logger.info(`Disconnected from provider: ${provider.getName()}`);
    } catch (error) {
      logger.error(`Error disconnecting from provider: ${provider.getName()}`, error);
      throw error;
    }
  }
  
  /**
   * Get all tracks from all connected providers
   */
  public async getAllTracks(): Promise<Track[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const allTracks: Track[] = [];
    const connectedProviders = await this.getConnectedProviders();
    
    for (const provider of connectedProviders) {
      try {
        const tracks = await provider.listAudioFiles();
        allTracks.push(...tracks);
      } catch (error) {
        logger.error(`Error getting tracks from provider: ${provider.getName()}`, error);
      }
    }
    
    return allTracks;
  }
  
  /**
   * Get a specific track by ID
   */
  public async getTrack(id: string): Promise<Track | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const connectedProviders = await this.getConnectedProviders();
    
    for (const provider of connectedProviders) {
      try {
        const track = await provider.getAudioFile(id);
        if (track) {
          return track;
        }
      } catch (error) {
        logger.error(`Error getting track from provider: ${provider.getName()}`, error);
      }
    }
    
    return null;
  }
  
  /**
   * Get a playable URI for a track
   */
  public async getPlayableUri(track: Track): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const provider = this.getProvider(track.source);
    
    if (!provider) {
      throw new Error(`Provider not found for track: ${track.id}`);
    }
    
    try {
      return await provider.getAudioFileUri(track);
    } catch (error) {
      logger.error(`Error getting playable URI for track: ${track.title}`, error);
      throw error;
    }
  }
  
  /**
   * Import audio files from local storage
   */
  public async importLocalAudioFiles(): Promise<Track[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const localProvider = this.getProvider('local') as LocalStorageProvider;
    
    if (!localProvider) {
      throw new Error('Local storage provider not found');
    }
    
    try {
      return await localProvider.importAudioFiles();
    } catch (error) {
      logger.error('Error importing local audio files', error);
      throw error;
    }
  }

  /**
   * Import audio files from a folder in local storage
   */
  public async importLocalAudioFilesFromFolder(): Promise<Track[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const localProvider = this.getProvider('local') as LocalStorageProvider;
    
    if (!localProvider) {
      throw new Error('Local storage provider not found');
    }
    
    try {
      return await localProvider.importAudioFilesFromFolder();
    } catch (error) {
      logger.error('Error importing local audio files from folder', error);
      throw error;
    }
  }

  /**
   * Extract metadata from a track
   * @param track The track to extract metadata from
   */
  async extractTrackMetadata(track: Track): Promise<void> {
    logger.debug(`Extracting metadata for track: ${track.title}`);
    
    // Get the provider for this track
    const provider = this.getProviderForTrack(track);
    
    if (!provider) {
      logger.error(`No provider found for track: ${track.title}`);
      throw new Error(`No provider found for track: ${track.title}`);
    }
    
    try {
      // Check if the provider is LocalStorageProvider
      if (provider instanceof LocalStorageProvider) {
        if (track.path) {
          await (provider as LocalStorageProvider).extractAndUpdateMetadata(track, track.path);
          logger.debug(`Metadata extracted for: ${track.title} using LocalStorageProvider`);
        }
      } 
      // Check if the provider is OneDriveStorageProvider
      else if (provider instanceof OneDriveStorageProvider) {
        if (track.path) {
          await (provider as OneDriveStorageProvider).extractAndUpdateMetadata(track, track.path);
          logger.debug(`Metadata extracted for: ${track.title} using OneDriveStorageProvider`);
        }
      } else {
        logger.warn(`Provider ${provider.getName()} does not support metadata extraction`);
      }
    } catch (error) {
      logger.error(`Error extracting metadata for ${track.title}`, error);
      throw error;
    }
  }
  
  /**
   * Get the appropriate storage provider for a track
   */
  private getProviderForTrack(track: Track): BaseStorageProvider | null {
    // Use the source property to determine the provider
    const provider = this.providers.get(track.source);
    return provider || null;
  }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();