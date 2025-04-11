/**
 * OneDrive storage provider implementation
 * Handles access to music files stored in Microsoft OneDrive
 */

import { BaseStorageProvider } from './StorageProvider';
import { Track, OneDriveAuthResult } from '../../types';
import { logger } from '../../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

// Constants
const ONEDRIVE_TRACKS_STORAGE_KEY = '@sonora/onedrive_tracks';
const ONEDRIVE_AUTH_STORAGE_KEY = '@sonora/onedrive_auth';
const ONEDRIVE_CACHE_DIR = FileSystem.cacheDirectory + 'onedrive/';
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac'];

// Microsoft Graph API endpoints
const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';
const GRAPH_API_DRIVE_ENDPOINT = `${GRAPH_API_ENDPOINT}/me/drive`;

// Default OneDrive auth config
const DEFAULT_AUTH_CONFIG = {
  clientId: '', // To be provided by the app
  redirectUri: Linking.createURL('auth/onedrive'),
  scopes: ['Files.Read', 'offline_access']
};

export class OneDriveStorageProvider extends BaseStorageProvider {
  private tracks: Map<string, Track>;
  private authConfig: {
    clientId: string;
    redirectUri: string;
    scopes: string[];
  };
  private authResult: OneDriveAuthResult | null = null;
  private initialized: boolean = false;
  
  constructor(clientId?: string) {
    super('OneDrive', 'onedrive');
    this.tracks = new Map<string, Track>();
    this.authConfig = {
      ...DEFAULT_AUTH_CONFIG,
      clientId: clientId || DEFAULT_AUTH_CONFIG.clientId
    };
  }
  
  /**
   * Set the client ID for OneDrive authentication
   */
  setClientId(clientId: string): void {
    this.authConfig.clientId = clientId;
  }
  
  /**
   * Check if connected to OneDrive
   */
  async isConnected(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    return !!this.authResult && this.isTokenValid();
  }
  
  /**
   * Connect to OneDrive
   */
  async connect(): Promise<boolean> {
    try {
      if (!this.authConfig.clientId) {
        logger.error('OneDrive client ID not set');
        return false;
      }
      
      // Check if we already have a valid token
      if (await this.isConnected()) {
        logger.info('Already connected to OneDrive');
        return true;
      }
      
      // Start the authentication flow
      await this.authenticate();
      
      return await this.isConnected();
    } catch (error) {
      logger.error('Failed to connect to OneDrive', error);
      return false;
    }
  }
  
  /**
   * Disconnect from OneDrive
   */
  async disconnect(): Promise<void> {
    try {
      // Clear auth data
      this.authResult = null;
      await AsyncStorage.removeItem(ONEDRIVE_AUTH_STORAGE_KEY);
      
      // Clear tracks
      this.tracks.clear();
      await AsyncStorage.removeItem(ONEDRIVE_TRACKS_STORAGE_KEY);
      
      logger.info('Disconnected from OneDrive');
    } catch (error) {
      logger.error('Error disconnecting from OneDrive', error);
      throw error;
    }
  }
  
  /**
   * List all audio files in OneDrive
   */
  async listAudioFiles(): Promise<Track[]> {
    if (!await this.isConnected()) {
      throw new Error('Not connected to OneDrive');
    }
    
    try {
      // First try to load from cache
      if (this.tracks.size > 0) {
        return Array.from(this.tracks.values());
      }
      
      // Fetch audio files from OneDrive
      await this.fetchAudioFiles();
      
      return Array.from(this.tracks.values());
    } catch (error) {
      logger.error('Error listing audio files from OneDrive', error);
      throw error;
    }
  }
  
  /**
   * Get a specific audio file by ID
   */
  async getAudioFile(id: string): Promise<Track | null> {
    if (!await this.isConnected()) {
      throw new Error('Not connected to OneDrive');
    }
    
    return this.tracks.get(id) || null;
  }
  
  /**
   * Get the playable URI for an audio file
   */
  async getAudioFileUri(track: Track): Promise<string> {
    if (track.source !== 'onedrive') {
      throw new Error('Track is not from OneDrive');
    }
    
    if (!await this.isConnected()) {
      throw new Error('Not connected to OneDrive');
    }
    
    try {
      // Check if we have a cached version
      const cachedPath = `${ONEDRIVE_CACHE_DIR}${track.id}${this.getFileExtension(track.path || '')}`;
      const cacheInfo = await FileSystem.getInfoAsync(cachedPath);
      
      if (cacheInfo.exists) {
        logger.debug(`Using cached file for ${track.title}`);
        return cachedPath;
      }
      
      // Download the file
      logger.info(`Downloading file from OneDrive: ${track.title}`);
      
      // Ensure cache directory exists
      await this.ensureCacheDirectory();
      
      // Get download URL
      const downloadUrl = await this.getDownloadUrl(track);
      
      // Download the file
      await FileSystem.downloadAsync(downloadUrl, cachedPath);
      
      return cachedPath;
    } catch (error) {
      logger.error(`Error getting audio file URI for ${track.title}`, error);
      throw error;
    }
  }
  
  /**
   * Initialize the OneDrive storage provider
   */
  private async initialize(): Promise<void> {
    try {
      // Load auth data
      const authData = await AsyncStorage.getItem(ONEDRIVE_AUTH_STORAGE_KEY);
      if (authData) {
        try {
          const parsedData = JSON.parse(authData) as OneDriveAuthResult;
          if (parsedData && typeof parsedData === 'object' && 'accessToken' in parsedData && 'expiresOn' in parsedData) {
            this.authResult = parsedData;
            // Convert the expiresOn string back to a Date object
            this.authResult.expiresOn = new Date(this.authResult.expiresOn);
          } else {
            logger.warn('Invalid OneDrive auth data format, resetting');
            this.authResult = null;
          }
        } catch (parseError) {
          logger.error('Error parsing OneDrive auth data', parseError);
          this.authResult = null;
        }
      }
      
      // Load saved tracks
      const tracksData = await AsyncStorage.getItem(ONEDRIVE_TRACKS_STORAGE_KEY);
      if (tracksData) {
        const tracks: Track[] = JSON.parse(tracksData);
        this.tracks.clear();
        for (const track of tracks) {
          this.tracks.set(track.id, track);
        }
        logger.info(`Loaded ${tracks.length} tracks from OneDrive cache`);
      }
      
      // Ensure cache directory exists
      await this.ensureCacheDirectory();
      
      this.initialized = true;
    } catch (error) {
      logger.error('Error initializing OneDrive storage provider', error);
      throw error;
    }
  }
  
  /**
   * Authenticate with OneDrive using OAuth
   */
  private async authenticate(): Promise<void> {
    try {
      // Construct the auth URL
      const authUrl = this.buildAuthUrl();
      
      // Register a URL handler for the redirect
      const redirectListener = Linking.addEventListener('url', (event) => {
        this.handleRedirect(event.url);
      });
      
      // Open the auth URL in a browser
      const result = await WebBrowser.openAuthSessionAsync(authUrl, this.authConfig.redirectUri);
      
      // Clean up the listener
      redirectListener.remove();
      
      if (result.type !== 'success') {
        throw new Error('Authentication was canceled or failed');
      }
    } catch (error) {
      logger.error('OneDrive authentication error', error);
      throw error;
    }
  }
  
  /**
   * Build the OAuth authorization URL
   */
  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.authConfig.clientId,
      response_type: 'token',
      redirect_uri: this.authConfig.redirectUri,
      scope: this.authConfig.scopes.join(' ')
    });
    
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }
  
  /**
   * Handle the redirect from OAuth
   */
  private async handleRedirect(url: string): Promise<void> {
    try {
      // Parse the URL to extract the token
      const parsedUrl = new URL(url);
      const hash = parsedUrl.hash.substring(1); // Remove the # character
      const params = new URLSearchParams(hash);
      
      const accessToken = params.get('access_token');
      const expiresIn = params.get('expires_in');
      
      if (!accessToken || !expiresIn) {
        throw new Error('Invalid redirect URL: missing token or expiration');
      }
      
      // Calculate expiration date
      const expiresOn = new Date();
      expiresOn.setSeconds(expiresOn.getSeconds() + parseInt(expiresIn, 10));
      
      // Save the auth result
      this.authResult = {
        accessToken,
        expiresOn
      };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(ONEDRIVE_AUTH_STORAGE_KEY, JSON.stringify(this.authResult));
      
      logger.info('Successfully authenticated with OneDrive');
    } catch (error) {
      logger.error('Error handling OAuth redirect', error);
      throw error;
    }
  }
  
  /**
   * Check if the current token is valid
   */
  private isTokenValid(): boolean {
    if (!this.authResult) return false;
    
    try {
      // Check if token is expired (with 5 minute buffer)
      const now = new Date();
      
      // Make sure expiresOn is a valid Date object
      const expiresOn = this.authResult.expiresOn instanceof Date 
        ? this.authResult.expiresOn 
        : new Date(this.authResult.expiresOn);
      
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      return expiresOn.getTime() - now.getTime() > bufferTime;
    } catch (error) {
      logger.error('Error validating token', error);
      return false;
    }
  }
  
  /**
   * Fetch audio files from OneDrive
   */
  private async fetchAudioFiles(): Promise<void> {
    try {
      logger.info('Fetching audio files from OneDrive');
      
      // Clear existing tracks
      this.tracks.clear();
      
      // Recursively search for audio files
      await this.searchAudioFilesInFolder('root');
      
      // Save tracks to AsyncStorage
      const tracksArray = Array.from(this.tracks.values());
      await AsyncStorage.setItem(ONEDRIVE_TRACKS_STORAGE_KEY, JSON.stringify(tracksArray));
      
      logger.info(`Found ${tracksArray.length} audio files in OneDrive`);
    } catch (error) {
      logger.error('Error fetching audio files from OneDrive', error);
      throw error;
    }
  }
  
  /**
   * Recursively search for audio files in a folder
   */
  private async searchAudioFilesInFolder(folderId: string): Promise<void> {
    try {
      // Get items in the folder
      const response = await this.makeGraphRequest(`${GRAPH_API_DRIVE_ENDPOINT}/items/${folderId}/children`);
      const data = await response.json();
      
      // Process each item
      for (const item of data.value) {
        if (item.folder) {
          // Recursively search subfolders
          await this.searchAudioFilesInFolder(item.id);
        } else if (item.file) {
          // Check if it's an audio file
          const fileExtension = this.getFileExtension(item.name).toLowerCase();
          if (SUPPORTED_AUDIO_EXTENSIONS.includes(`.${fileExtension}`)) {
            // Create a track object
            const track: Track = {
              id: uuidv4(),
              title: this.getFileNameWithoutExtension(item.name),
              uri: item['@microsoft.graph.downloadUrl'] || '',
              source: 'onedrive',
              path: item.id,
              duration: undefined // We'll get this when playing
            };
            
            // Add to tracks map
            this.tracks.set(track.id, track);
          }
        }
      }
    } catch (error) {
      logger.error(`Error searching audio files in folder ${folderId}`, error);
      throw error;
    }
  }
  
  /**
   * Get the download URL for a track
   */
  private async getDownloadUrl(track: Track): Promise<string> {
    try {
      // Get the item from OneDrive
      const response = await this.makeGraphRequest(`${GRAPH_API_DRIVE_ENDPOINT}/items/${track.path}`);
      const data = await response.json();
      
      if (!data['@microsoft.graph.downloadUrl']) {
        throw new Error(`No download URL available for ${track.title}`);
      }
      
      return data['@microsoft.graph.downloadUrl'];
    } catch (error) {
      logger.error(`Error getting download URL for ${track.title}`, error);
      throw error;
    }
  }
  
  /**
   * Make a request to the Microsoft Graph API
   */
  private async makeGraphRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.authResult) {
      throw new Error('Not authenticated with OneDrive');
    }
    
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.authResult.accessToken}`);
    
    return fetch(url, {
      ...options,
      headers
    });
  }
  
  /**
   * Ensure the cache directory exists
   */
  private async ensureCacheDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(ONEDRIVE_CACHE_DIR);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(ONEDRIVE_CACHE_DIR, { intermediates: true });
        logger.debug('Created OneDrive cache directory');
      }
    } catch (error) {
      logger.error('Error ensuring cache directory exists', error);
      throw error;
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