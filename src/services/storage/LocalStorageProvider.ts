/**
 * Local storage provider implementation
 * Handles access to music files stored on the device's local file system
 */

import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import uuid from 'react-native-uuid';

import { BaseStorageProvider } from './StorageProvider';
import { Track } from '../../types';
import { logger } from '../../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const LOCAL_TRACKS_STORAGE_KEY = '@sonora/local_tracks';
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac'];

export class LocalStorageProvider extends BaseStorageProvider {
  private tracks: Map<string, Track>;
  private initialized: boolean = false;
  
  constructor() {
    super('Local Storage', 'local');
    this.tracks = new Map<string, Track>();
  }
  
  /**
   * Check if local storage is available and initialized
   */
  async isConnected(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.initialized;
  }
  
  /**
   * Initialize the local storage provider
   */
  async connect(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch (error) {
      logger.error('Failed to connect to local storage', error);
      return false;
    }
  }
  
  /**
   * Clean up resources
   */
  async disconnect(): Promise<void> {
    this.tracks.clear();
    this.initialized = false;
  }
  
  /**
   * List all audio files in local storage
   */
  async listAudioFiles(): Promise<Track[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return Array.from(this.tracks.values());
  }
  
  /**
   * Get a specific audio file by ID
   */
  async getAudioFile(id: string): Promise<Track | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.tracks.get(id) || null;
  }
  
  /**
   * Get the playable URI for an audio file
   */
  async getAudioFileUri(track: Track): Promise<string> {
    if (track.source !== 'local') {
      throw new Error('Track is not from local storage');
    }
    
    // For local files, the URI is already playable
    return track.uri;
  }
  
  /**
   * Import audio files from the device
   */
  async importAudioFiles(): Promise<Track[]> {
    try {
      logger.info('Importing audio files from device');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: true
      });
      
      if (result.canceled) {
        logger.info('User canceled audio file import');
        return [];
      }
      
      const newTracks: Track[] = [];
      
      for (const file of result.assets) {
        // Check if file is an audio file
        const fileExtension = this.getFileExtension(file.name).toLowerCase();
        if (!SUPPORTED_AUDIO_EXTENSIONS.includes(fileExtension)) {
          logger.warn(`Skipping unsupported file: ${file.name}`);
          continue;
        }
        
        // Create a track object
        const track: Track = {
          id: uuid.v4().toString(),
          title: this.getFileNameWithoutExtension(file.name),
          uri: file.uri,
          source: 'local',
          path: file.uri,
          duration: await this.getAudioDuration(file.uri)
        };
        
        // Add to tracks map
        this.tracks.set(track.id, track);
        newTracks.push(track);
      }
      
      // Save updated tracks to persistent storage
      await this.saveTracks();
      
      logger.info(`Imported ${newTracks.length} audio files`);
      return newTracks;
    } catch (error) {
      logger.error('Error importing audio files', error);
      throw error;
    }
  }
  
  /**
   * Initialize the local storage provider
   */
  private async initialize(): Promise<void> {
    try {
      // Load saved tracks from AsyncStorage
      const savedTracksJson = await AsyncStorage.getItem(LOCAL_TRACKS_STORAGE_KEY);
      
      if (savedTracksJson) {
        const savedTracks: Track[] = JSON.parse(savedTracksJson);
        
        // Populate tracks map
        this.tracks.clear();
        for (const track of savedTracks) {
          this.tracks.set(track.id, track);
        }
        
        logger.info(`Loaded ${savedTracks.length} tracks from local storage`);
      }
      
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize local storage provider', error);
      throw error;
    }
  }
  
  /**
   * Save tracks to persistent storage
   */
  private async saveTracks(): Promise<void> {
    try {
      const tracksArray = Array.from(this.tracks.values());
      await AsyncStorage.setItem(LOCAL_TRACKS_STORAGE_KEY, JSON.stringify(tracksArray));
      logger.debug(`Saved ${tracksArray.length} tracks to persistent storage`);
    } catch (error) {
      logger.error('Failed to save tracks to persistent storage', error);
      throw error;
    }
  }
  
  /**
   * Get the duration of an audio file
   */
  private async getAudioDuration(uri: string): Promise<number | undefined> {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync(); // Clean up
      
      return status.durationMillis || undefined;
    } catch (error) {
      logger.warn(`Could not get duration for audio file: ${uri}`, error);
      return undefined;
    }
  }
  
  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 1);
  }
  
  /**
   * Get filename without extension
   */
  private getFileNameWithoutExtension(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }
}