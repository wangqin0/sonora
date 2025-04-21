/**
 * Local storage provider implementation
 * Handles access to music files stored on the device's local file system
 */

import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import uuid from 'react-native-uuid';
import MusicInfo from 'expo-music-info-2';

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
    
    try {
      // On Android, we need to handle both file:// and non-file:// URIs
      let normalizedUri = track.uri;
      if (Platform.OS === 'android' && !normalizedUri.startsWith('file://')) {
        normalizedUri = `file://${normalizedUri}`;
      }
      
      // Check if the file still exists
      const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
      
      if (fileInfo.exists) {
        logger.debug(`Local file exists: ${track.title}`);
        return normalizedUri;
      }
      
      // Try the original URI if we modified it
      if (normalizedUri !== track.uri) {
        const originalFileInfo = await FileSystem.getInfoAsync(track.uri);
        if (originalFileInfo.exists) {
          logger.debug(`Local file exists at original URI: ${track.title}`);
          return track.uri;
        }
      }
      
      // File doesn't exist at the saved path, try to find it in other directories
      logger.warn(`Local file not found at path: ${track.uri}`);
      
      // Extract filename from the URI
      const uriParts = track.uri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      
      // Check if file exists in current document directory (new location)
      const audioDocDir = `${FileSystem.documentDirectory}audio/`;
      const docPath = `${audioDocDir}${fileName}`;
      const docFileInfo = await FileSystem.getInfoAsync(docPath);
      
      if (docFileInfo.exists) {
        logger.info(`Found file in document directory: ${docPath}`);
        
        // Update the track's URI and path for future use
        const persistentUri = Platform.OS === 'android' ? `file://${docPath}` : docPath;
        track.uri = persistentUri;
        track.path = persistentUri;
        
        // Save the updated track info
        await this.saveTracks();
        
        return persistentUri;
      }
      
      // Check if file exists in legacy cache directory
      const audioCacheDir = `${FileSystem.cacheDirectory}audio/`;
      const cachePath = `${audioCacheDir}${fileName}`;
      const cacheFileInfo = await FileSystem.getInfoAsync(cachePath);
      
      if (cacheFileInfo.exists) {
        logger.info(`Found file in cache directory: ${cachePath}`);
        
        // Copy the file to the document directory for persistence
        const docPath = await this.copyFileToDocumentDirectory(cachePath, fileName);
        
        // Update the track's URI and path for future use
        const persistentUri = Platform.OS === 'android' ? `file://${docPath}` : docPath;
        track.uri = persistentUri;
        track.path = persistentUri;
        
        // Save the updated track info
        await this.saveTracks();
        
        return persistentUri;
      }
      
      // If we can't find the file, throw an error
      throw new Error(`Local audio file not found: ${track.title}`);
    } catch (error) {
      logger.error(`Error getting audio file URI for ${track.title}`, error);
      throw error;
    }
  }
  
  /**
   * Import audio files from the device
   */
  async importAudioFiles(): Promise<Track[]> {
    try {
      logger.info('Importing audio files from device');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: false, // We'll handle caching ourselves
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
        if (!SUPPORTED_AUDIO_EXTENSIONS.includes(`.${fileExtension}`)) {
          logger.warn(`Skipping unsupported file: ${file.name}`);
          continue;
        }
        
        // Copy file to document directory to ensure it's readable
        const cachePath = await this.copyFileToDocumentDirectory(file.uri, file.name);
        
        // Extract metadata from the audio file including artwork
        let metadata = null;
        try {
          metadata = await MusicInfo.getMusicInfoAsync(cachePath, {
            title: true,
            artist: true,
            album: true,
            genre: true,
            picture: true
          });
          logger.debug(`Extracted metadata for ${file.name}:`, metadata);
        } catch (error) {
          logger.warn(`Failed to extract metadata from ${file.name}`, error);
        }
        
        // Try to extract artist from filename if not in metadata
        let artistFromFilename;
        const filenameWithoutExt = this.getFileNameWithoutExtension(file.name);
        if (filenameWithoutExt.includes('-')) {
          const parts = filenameWithoutExt.split('-');
          if (parts.length >= 2) {
            artistFromFilename = parts[0].trim();
          }
        }
        
        // Create a track object with metadata
        const track: Track = {
          id: uuid.v4().toString(),
          title: metadata?.title || this.getFileNameWithoutExtension(file.name),
          artist: metadata?.artist || artistFromFilename || 'Unknown artist',
          album: metadata?.album || undefined,
          uri: cachePath,
          source: 'local',
          path: cachePath,
          duration: await this.getAudioDuration(cachePath),
          artwork: metadata?.picture?.pictureData || undefined
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
   * Import audio files from a folder in the device
   */
  async importAudioFilesFromFolder(): Promise<Track[]> {
    try {
      logger.info('Importing audio files from folder');
      
      // Use document picker to select multiple files
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all file types, we'll filter them after
        copyToCacheDirectory: false, // We'll handle caching ourselves
        multiple: true // Allow multiple selection
      });
      
      if (result.canceled) {
        logger.info('User canceled folder selection');
        return [];
      }
      
      const newTracks: Track[] = [];
      
      // Process selected files
      for (const file of result.assets) {
        // Check if file is an audio file by extension
        const fileExtension = `.${this.getFileExtension(file.name).toLowerCase()}`;
        if (!SUPPORTED_AUDIO_EXTENSIONS.includes(fileExtension)) {
          logger.warn(`Skipping unsupported file: ${file.name}`);
          continue;
        }
        
        // Copy file to document directory to ensure it's readable
        const cachePath = await this.copyFileToDocumentDirectory(file.uri, file.name);
        
        // Extract metadata from the audio file
        let metadata = null;
        try {
          metadata = await MusicInfo.getMusicInfoAsync(cachePath, {
            title: true,
            artist: true,
            album: true,
            genre: true,
            picture: true
          });
          logger.debug(`Extracted metadata for ${file.name}:`, metadata);
        } catch (error) {
          logger.warn(`Failed to extract metadata from ${file.name}`, error);
        }
        
        // Try to extract artist from filename if not in metadata
        let artistFromFilename;
        const filenameWithoutExt = this.getFileNameWithoutExtension(file.name);
        if (filenameWithoutExt.includes('-')) {
          const parts = filenameWithoutExt.split('-');
          if (parts.length >= 2) {
            artistFromFilename = parts[0].trim();
          }
        }
        
        // Create a track object with metadata
        const track: Track = {
          id: uuid.v4().toString(),
          title: metadata?.title || this.getFileNameWithoutExtension(file.name),
          artist: metadata?.artist || artistFromFilename || 'Unknown artist',
          album: metadata?.album || undefined,
          uri: cachePath,
          source: 'local',
          path: cachePath,
          duration: await this.getAudioDuration(cachePath),
          artwork: metadata?.picture?.pictureData || undefined
        };
        
        // Add to tracks map
        this.tracks.set(track.id, track);
        newTracks.push(track);
      }
      
      // Save updated tracks to persistent storage
      await this.saveTracks();
      
      logger.info(`Imported ${newTracks.length} audio files from folder`);
      return newTracks;
    } catch (error) {
      logger.error('Error importing audio files from folder', error);
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
          // Verify and fix file paths for Android
          if (Platform.OS === 'android') {
            // Ensure URI has file:// protocol
            if (track.uri && !track.uri.startsWith('file://')) {
              track.uri = `file://${track.uri}`;
            }
            // Ensure path has file:// protocol
            if (track.path && !track.path.startsWith('file://')) {
              track.path = `file://${track.path}`;
            }
          }
          
          // Check if the file still exists
          if (track.uri) {
            const fileInfo = await FileSystem.getInfoAsync(track.uri);
            if (fileInfo.exists) {
              this.tracks.set(track.id, track);
            } else {
              logger.warn(`Track file not found, will attempt to locate: ${track.title}`);
              // Try to find the file by name in document directory
              const found = await this.findFileByName(track);
              if (found) {
                this.tracks.set(track.id, track);
              } else {
                logger.warn(`Could not locate file for track: ${track.title}`);
              }
            }
          }
        }
        
        logger.info(`Loaded ${this.tracks.size} tracks from local storage`);
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
      await sound.unloadAsync(); // Clean up resources
      
      // Check if the status is not an error status
      if ('durationMillis' in status) {
        return status.durationMillis;
      }
      return undefined;
    } catch (error) {
      logger.warn(`Could not get duration for audio file: ${uri}`, error);
      return undefined;
    }
  }
  
  /**
   * Copy a file to the app's document directory (persistent storage)
   */
  private async copyFileToDocumentDirectory(uri: string, fileName: string): Promise<string> {
    try {
      // Ensure the audio directory exists in document storage (persistent)
      const audioDir = `${FileSystem.documentDirectory}audio/`;
      const dirInfo = await FileSystem.getInfoAsync(audioDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
      }
      
      // Create a unique filename to prevent collisions
      const uniqueFileName = `${Date.now()}_${fileName}`;
      const destinationUri = `${audioDir}${uniqueFileName}`;
      
      // Copy the file
      await FileSystem.copyAsync({
        from: uri,
        to: destinationUri
      });
      
      // On Android, ensure we're using the correct path format that will persist between app launches
      let persistentUri = destinationUri;
      if (Platform.OS === 'android') {
        // Make sure we're using the file:// protocol which is more reliable on Android
        if (!persistentUri.startsWith('file://')) {
          persistentUri = `file://${persistentUri}`;
        }
        logger.debug(`Using Android-specific persistent URI: ${persistentUri}`);
      }
      
      logger.debug(`Copied file to document storage: ${persistentUri}`);
      return persistentUri;
    } catch (error) {
      logger.error(`Failed to copy file to document storage: ${fileName}`, error);
      throw error;
    }
  }
  
  /**
   * Get the file extension from a filename
   */
  private getFileExtension(filename: string): string {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
  }
  
  /**
   * Get the filename without extension
   */
  private getFileNameWithoutExtension(filename: string): string {
    return filename.split('.').slice(0, -1).join('.');
  }

  /**
   * Try to find a file by its name in the document directory
   * This is useful for Android where file paths might change between app launches
   */
  private async findFileByName(track: Track): Promise<boolean> {
    try {
      if (!track.uri) return false;
      
      // Extract filename from the URI
      const uriParts = track.uri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      
      // Check document directory
      const audioDocDir = `${FileSystem.documentDirectory}audio/`;
      const dirInfo = await FileSystem.getInfoAsync(audioDocDir);
      
      if (!dirInfo.exists) return false;
      
      // List all files in the audio directory
      const files = await FileSystem.readDirectoryAsync(audioDocDir);
      
      // Look for files with similar names
      for (const file of files) {
        // Check if file contains the original filename (without timestamp prefix)
        if (file.includes(fileName) || fileName.includes(file)) {
          const newPath = `${audioDocDir}${file}`;
          const persistentUri = Platform.OS === 'android' ? `file://${newPath}` : newPath;
          
          // Update track with new path
          track.uri = persistentUri;
          track.path = persistentUri;
          
          logger.info(`Found relocated file for track: ${track.title} at ${persistentUri}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error(`Error finding file by name for track: ${track.title}`, error);
      return false;
    }
  }

  /**
   * Extract metadata from an audio file and update the track object
   * @param track Track to update
   * @param filePath Path to the audio file
   */
  public async extractAndUpdateMetadata(track: Track, filePath: string): Promise<void> {
    try {
      // Only extract metadata if track is missing information
      if (!track.artist || !track.album || !track.artwork) {
        const metadata = await MusicInfo.getMusicInfoAsync(filePath, {
          title: true,
          artist: true,
          album: true,
          genre: true,
          picture: true
        });
        
        // Try to extract artist from filename if metadata doesn't provide it
        let artistFromFilename;
        if (track.title.includes('-')) {
          const parts = track.title.split('-');
          if (parts.length >= 2) {
            artistFromFilename = parts[0].trim();
          }
        }
        
        if (metadata) {
          // Update track with extracted metadata
          if (metadata.title && track.title === this.getFileNameWithoutExtension(track.title)) {
            track.title = metadata.title;
          }
          
          if (!track.artist) {
            track.artist = metadata.artist || artistFromFilename || 'Unknown artist';
          }
          
          if (!track.album && metadata.album) {
            track.album = metadata.album;
          }
          
          if (!track.artwork && metadata.picture?.pictureData) {
            track.artwork = metadata.picture.pictureData;
            logger.debug(`Extracted artwork for track: ${track.title}`);
          }
          
          // Save the updated tracks to persistent storage
          await this.saveTracks();
        } else if (!track.artist) {
          // If no metadata but we have an artist from filename, use it
          track.artist = artistFromFilename || 'Unknown artist';
          
          // Save the updated tracks to persistent storage
          await this.saveTracks();
        }
      }
    } catch (error) {
      logger.warn(`Failed to extract metadata for ${track.title}`, error);
      // Don't throw an error, just continue with the existing track data
    }
  }
}