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
import * as NetInfo from '@react-native-community/netinfo';
import { 
  ONEDRIVE_CLIENT_ID, 
  ONEDRIVE_REDIRECT_URI, 
  ONEDRIVE_IS_PUBLIC_CLIENT,
  ONEDRIVE_API,
  DEFAULT_SYNC_SETTINGS, 
  SyncStatus 
} from '../../config/onedrive';
import { logOAuthDetails } from '../../utils/debugHelper';

// Constants
const ONEDRIVE_TRACKS_STORAGE_KEY = '@sonora/onedrive_tracks';
const ONEDRIVE_AUTH_STORAGE_KEY = '@sonora/onedrive_auth';
const ONEDRIVE_SYNC_SETTINGS_KEY = '@sonora/onedrive_sync_settings';
const ONEDRIVE_DOCUMENT_DIR = FileSystem.documentDirectory + 'onedrive/';
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac', '.wma', '.alac', '.aiff'];

// Microsoft Graph API endpoints
const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';
const GRAPH_API_DRIVE_ENDPOINT = `${GRAPH_API_ENDPOINT}/me/drive`;

// Default OneDrive auth config
const DEFAULT_AUTH_CONFIG = {
  clientId: ONEDRIVE_CLIENT_ID,
  redirectUri: ONEDRIVE_REDIRECT_URI,
  scopes: ['Files.Read', 'offline_access']
};

// Types
interface SyncSettings {
  syncEnabled: boolean;
  syncInterval: number; // in seconds
  syncOnAppStart: boolean;
  syncOnWifiOnly: boolean;
  lastSyncTime: Date | null;
}

export class OneDriveStorageProvider extends BaseStorageProvider {
  private tracks: Map<string, Track>;
  private authConfig: {
    clientId: string;
    redirectUri: string;
    scopes: string[];
  };
  private authResult: OneDriveAuthResult | null = null;
  private initialized: boolean = false;
  private syncSettings: SyncSettings = { ...DEFAULT_SYNC_SETTINGS };
  private syncStatus: SyncStatus = SyncStatus.IDLE;
  private syncTimer: NodeJS.Timeout | null = null;
  private onSyncStatusChange: ((status: SyncStatus) => void) | null = null;
  
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
   * Set sync status change callback
   */
  setSyncStatusChangeCallback(callback: (status: SyncStatus) => void): void {
    this.onSyncStatusChange = callback;
  }
  
  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }
  
  /**
   * Get sync settings
   */
  getSyncSettings(): SyncSettings {
    return { ...this.syncSettings };
  }
  
  /**
   * Update sync settings
   */
  async updateSyncSettings(settings: Partial<SyncSettings>): Promise<void> {
    try {
      this.syncSettings = { ...this.syncSettings, ...settings };
      await AsyncStorage.setItem(ONEDRIVE_SYNC_SETTINGS_KEY, JSON.stringify(this.syncSettings));
      
      // If sync enabled, start sync timer
      if (this.syncSettings.syncEnabled) {
        this.startSyncTimer();
      } else {
        this.stopSyncTimer();
      }
      
      logger.info('OneDrive sync settings updated');
    } catch (error) {
      logger.error('Error updating OneDrive sync settings', error);
      throw error;
    }
  }
  
  /**
   * Check if connected to OneDrive
   */
  async isConnected(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Only return true if we have a valid auth result
    // Don't attempt to sync or show Disconnect button if we never connected
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
      
      logger.debug('Starting OneDrive connection with client ID: ' + this.authConfig.clientId.substring(0, 5) + '...');
      logger.debug('Using redirect URI: ' + this.authConfig.redirectUri);
      logOAuthDetails('Attempting to connect', this.authConfig);
      
      // Check if we already have a valid token
      if (await this.isConnected()) {
        logger.info('Already connected to OneDrive');
        
        // Start sync timer if enabled
        if (this.syncSettings.syncEnabled) {
          this.startSyncTimer();
        }
        
        return true;
      }
      
      // Start the authentication flow
      logger.debug('No valid token found, starting authentication flow...');
      await this.authenticate();
      
      const connected = await this.isConnected();
      logger.debug('Authentication completed, connected status: ' + connected);
      
      // Start sync timer if enabled and connected successfully
      if (connected && this.syncSettings.syncEnabled) {
        this.startSyncTimer();
      }
      
      return connected;
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
      // Stop sync timer
      this.stopSyncTimer();
      
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
   * Start a manual sync
   */
  async syncNow(): Promise<void> {
    try {
      // Check if already syncing
      if (this.syncStatus === SyncStatus.SYNCING) {
        logger.info('OneDrive sync already in progress');
        return;
      }
      
      // Check if connected
      if (!await this.isConnected()) {
        logger.info('Skipping OneDrive sync - not connected');
        this.updateSyncStatus(SyncStatus.IDLE);
        return;
      }
      
      // Check if should sync only on WiFi
      if (this.syncSettings.syncOnWifiOnly) {
        const networkState = await NetInfo.fetch();
        if (networkState.type !== 'wifi') {
          logger.info('Skipping OneDrive sync - not on WiFi');
          return;
        }
      }
      
      // Update sync status
      this.updateSyncStatus(SyncStatus.SYNCING);
      
      logger.info('Starting OneDrive sync (logging files only, not downloading)');
      
      // Fetch audio files from OneDrive
      await this.fetchAudioFiles();
      
      // Update last sync time
      this.syncSettings.lastSyncTime = new Date();
      await AsyncStorage.setItem(ONEDRIVE_SYNC_SETTINGS_KEY, JSON.stringify(this.syncSettings));
      
      logger.info('OneDrive sync completed successfully (logging only)');
      this.updateSyncStatus(SyncStatus.SUCCESS);
    } catch (error) {
      logger.error('OneDrive sync failed', error);
      this.updateSyncStatus(SyncStatus.ERROR);
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
      // Extract file extension from the path or title
      let fileExtension = '';
      if (track.path && track.path.includes('.')) {
        fileExtension = `.${this.getFileExtension(track.path)}`;
      } else if (track.title && track.title.includes('.')) {
        fileExtension = `.${this.getFileExtension(track.title)}`;
      } else {
        // Default to .mp3 if no extension found
        fileExtension = '.mp3';
      }
      
      // Create consistent file name for caching
      const fileName = `onedrive-${track.id}${fileExtension}`;
      
      // Check if file exists in document directory (new location)
      const docPath = `${ONEDRIVE_DOCUMENT_DIR}${fileName}`;
      const docInfo = await FileSystem.getInfoAsync(docPath);
      
      if (docInfo.exists) {
        logger.debug(`Using cached file for ${track.title} from document directory`);
        return docPath;
      }
      
      // Check if file exists in legacy cache directory
      const legacyCacheDir = `${FileSystem.cacheDirectory}onedrive/`;
      const cachePath = `${legacyCacheDir}${fileName}`;
      const cacheInfo = await FileSystem.getInfoAsync(cachePath);
      
      if (cacheInfo.exists) {
        logger.debug(`Found file in legacy cache directory, moving to document directory: ${track.title}`);
        
        // Ensure document directory exists
        await this.ensureDocumentDirectory();
        
        // Copy file to document directory
        await FileSystem.copyAsync({
          from: cachePath,
          to: docPath
        });
        
        return docPath;
      }
      
      // Download the file
      logger.info(`Downloading file from OneDrive: ${track.title}`);
      
      // Ensure document directory exists
      await this.ensureDocumentDirectory();
      
      // Get download URL
      const downloadUrl = await this.getDownloadUrl(track);
      logger.debug(`Download URL: ${downloadUrl}`);
      
      // Download the file
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, docPath);
      logger.debug(`File downloaded to: ${downloadResult.uri}`);
      
      return downloadResult.uri;
    } catch (error) {
      logger.error(`Error getting audio file URI for ${track.title}`, error);
      
      // If we can't download/cache the file, return the direct download URL as fallback
      try {
        const downloadUrl = await this.getDownloadUrl(track);
        logger.info(`Using direct download URL for ${track.title} as fallback`);
        return downloadUrl;
      } catch (fallbackError) {
        logger.error(`Fallback also failed for ${track.title}`, fallbackError);
        throw error; // Throw the original error
      }
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
            // Clear invalid auth data
            await AsyncStorage.removeItem(ONEDRIVE_AUTH_STORAGE_KEY);
          }
        } catch (parseError) {
          logger.error('Error parsing OneDrive auth data', parseError);
          this.authResult = null;
          // Clear invalid auth data
          await AsyncStorage.removeItem(ONEDRIVE_AUTH_STORAGE_KEY);
        }
      }
      
      // Load sync settings
      const syncSettingsData = await AsyncStorage.getItem(ONEDRIVE_SYNC_SETTINGS_KEY);
      if (syncSettingsData) {
        try {
          const parsedSettings = JSON.parse(syncSettingsData);
          this.syncSettings = {
            ...DEFAULT_SYNC_SETTINGS,
            ...parsedSettings,
            // Convert lastSyncTime back to Date if it exists
            lastSyncTime: parsedSettings.lastSyncTime ? new Date(parsedSettings.lastSyncTime) : null
          };
        } catch (parseError) {
          logger.error('Error parsing OneDrive sync settings', parseError);
          this.syncSettings = { ...DEFAULT_SYNC_SETTINGS };
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
      
      // Ensure document directory exists
      await this.ensureDocumentDirectory();
      
      // If sync on app start is enabled and we are connected, trigger a sync
      if (this.syncSettings.syncEnabled && 
          this.syncSettings.syncOnAppStart && 
          !!this.authResult && 
          this.isTokenValid()) {
        // Use setTimeout to allow the app to finish initializing first
        setTimeout(() => this.syncNow(), 5000);
      }
      
      // Start sync timer if enabled and connected
      if (this.syncSettings.syncEnabled && !!this.authResult && this.isTokenValid()) {
        this.startSyncTimer();
      }
      
      this.initialized = true;
    } catch (error) {
      logger.error('Error initializing OneDrive storage provider', error);
      throw error;
    }
  }
  
  /**
   * Start the sync timer based on the sync interval
   */
  private startSyncTimer(): void {
    // Clear existing timer if any
    this.stopSyncTimer();
    
    if (this.syncSettings.syncEnabled && this.syncSettings.syncInterval > 0) {
      logger.debug(`Setting up OneDrive sync timer to run every ${this.syncSettings.syncInterval} seconds`);
      
      // Convert seconds to milliseconds for setTimeout
      this.syncTimer = setInterval(() => {
        this.syncNow().catch(error => {
          logger.error('Error in automatic OneDrive sync', error);
        });
      }, this.syncSettings.syncInterval * 1000);
    }
  }
  
  /**
   * Stop the sync timer
   */
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.debug('OneDrive sync timer stopped');
    }
  }
  
  /**
   * Update sync status and notify listeners
   */
  private updateSyncStatus(status: SyncStatus): void {
    this.syncStatus = status;
    
    // Notify callback if registered
    if (this.onSyncStatusChange) {
      this.onSyncStatusChange(status);
    }
  }
  
  /**
   * Authenticate with OneDrive using OAuth
   */
  private async authenticate(): Promise<void> {
    try {
      // Construct the auth URL
      const authUrl = this.buildAuthUrl();
      logger.debug('Opening authentication URL: ' + authUrl);
      
      // Register a URL handler for the redirect
      logger.debug('Registering redirect URL handler for ' + this.authConfig.redirectUri);
      
      // Open the auth URL in a browser
      logger.debug('Opening auth session in browser...');
      const result = await WebBrowser.openAuthSessionAsync(authUrl, this.authConfig.redirectUri);
      logOAuthDetails('WebBrowser result', result);
      
      logger.debug('WebBrowser result type: ' + result.type);
      
      if (result.type !== 'success') {
        logger.error('Authentication failed or was canceled: ' + result.type);
        throw new Error('Authentication was canceled or failed');
      }
      
      // With WebBrowser.openAuthSessionAsync, the redirect URL comes in the result
      // rather than triggering the URL handler
      if (result.url) {
        logger.debug('Processing redirect URL from WebBrowser result: ' + result.url);
        await this.handleRedirect(result.url);
      } else {
        logger.error('No URL returned in WebBrowser result');
        throw new Error('Authentication failed: No redirect URL received');
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
      response_type: 'code',
      redirect_uri: this.authConfig.redirectUri,
      scope: this.authConfig.scopes.join(' ')
    });
    
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    logOAuthDetails('Built auth URL', {
      client_id: this.authConfig.clientId,
      response_type: 'code',
      redirect_uri: this.authConfig.redirectUri,
      scope: this.authConfig.scopes.join(' '),
      fullUrl: url
    });
    
    return url;
  }
  
  /**
   * Handle the redirect from OAuth
   */
  private async handleRedirect(url: string): Promise<void> {
    try {
      logger.debug('Handling redirect URL: ' + url);
      
      // Parse the URL to extract the code or error
      const parsedUrl = new URL(url);
      
      // Check if we're using the authorization code flow (code in query) or implicit flow (token in hash)
      let params;
      if (parsedUrl.hash && parsedUrl.hash.length > 1) {
        // Hash-based parameters (implicit flow)
        const hash = parsedUrl.hash.substring(1); // Remove the # character
        params = new URLSearchParams(hash);
        logger.debug('Parsed URL hash: ' + hash);
      } else {
        // Query-based parameters (authorization code flow)
        params = parsedUrl.searchParams;
        logger.debug('Parsed URL query: ' + parsedUrl.search);
      }
      
      logOAuthDetails('Parsed redirect URL', { 
        url: parsedUrl.toString(),
        params: Array.from(params.entries())
      });
      
      // Check for errors
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      
      if (error) {
        logger.error(`OAuth error: ${error} - ${errorDescription}`);
        throw new Error(`OAuth error: ${error} - ${errorDescription}`);
      }
      
      // Check for authorization code (code flow)
      const code = params.get('code');
      if (code) {
        logger.debug('Got authorization code, exchanging for token...');
        await this.exchangeCodeForToken(code);
        return;
      }
      
      // Check for access token (implicit flow)
      const accessToken = params.get('access_token');
      const expiresIn = params.get('expires_in');
      
      if (!accessToken || !expiresIn) {
        logger.error('Invalid redirect URL: missing token or expiration');
        logger.debug('Params found: ' + JSON.stringify(Array.from(params.entries())));
        throw new Error('Invalid redirect URL: missing token or expiration');
      }
      
      // Calculate expiration date
      const expiresOn = new Date();
      expiresOn.setSeconds(expiresOn.getSeconds() + parseInt(expiresIn, 10));
      
      logger.debug('Got access token (first 5 chars): ' + accessToken.substring(0, 5) + '...');
      logger.debug('Token expires in: ' + expiresIn + ' seconds');
      
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
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string): Promise<void> {
    try {
      logger.debug('Exchanging authorization code for token');
      
      const tokenEndpoint = ONEDRIVE_API.TOKEN_ENDPOINT;
      const params = new URLSearchParams({
        client_id: this.authConfig.clientId,
        redirect_uri: this.authConfig.redirectUri,
        code: code,
        grant_type: 'authorization_code'
      });
      
      logger.debug('Token exchange request params: ' + params.toString());
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });
      
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        logger.error('Failed to parse token response as JSON', { text: responseText });
        throw new Error('Invalid token response format');
      }
      
      if (!response.ok) {
        logger.error('Token exchange failed', { 
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          errorDescription: data.error_description
        });
        throw new Error(`Failed to exchange code for token: ${data.error_description || data.error || 'Unknown error'}`);
      }
      
      logOAuthDetails('Received token response', data);
      
      if (!data.access_token || !data.expires_in) {
        logger.error('Invalid token response: missing required fields', { 
          hasAccessToken: !!data.access_token,
          hasExpiresIn: !!data.expires_in
        });
        throw new Error('Invalid token response: missing required fields');
      }
      
      // Calculate expiration date
      const expiresOn = new Date();
      expiresOn.setSeconds(expiresOn.getSeconds() + parseInt(data.expires_in, 10));
      
      // Save the auth result
      this.authResult = {
        accessToken: data.access_token,
        expiresOn,
        refreshToken: data.refresh_token
      };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(ONEDRIVE_AUTH_STORAGE_KEY, JSON.stringify(this.authResult));
      
      logger.info('Successfully exchanged code for token');
    } catch (error) {
      logger.error('Error exchanging code for token', error);
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
   * Refresh the access token using the refresh token
   */
  private async refreshToken(): Promise<boolean> {
    try {
      if (!this.authResult?.refreshToken) {
        logger.warn('No refresh token available');
        return false;
      }
      
      logger.debug('Refreshing access token');
      
      const tokenEndpoint = ONEDRIVE_API.TOKEN_ENDPOINT;
      const params = new URLSearchParams({
        client_id: this.authConfig.clientId,
        refresh_token: this.authResult.refreshToken,
        grant_type: 'refresh_token',
        scope: this.authConfig.scopes.join(' ')
      });
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        logger.error('Token refresh failed', data);
        return false;
      }
      
      logOAuthDetails('Received refresh token response', data);
      
      // Calculate expiration date
      const expiresOn = new Date();
      expiresOn.setSeconds(expiresOn.getSeconds() + parseInt(data.expires_in, 10));
      
      // Save the auth result
      this.authResult = {
        accessToken: data.access_token,
        expiresOn,
        refreshToken: data.refresh_token || this.authResult.refreshToken // Use new refresh token if provided
      };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(ONEDRIVE_AUTH_STORAGE_KEY, JSON.stringify(this.authResult));
      
      logger.info('Successfully refreshed access token');
      return true;
    } catch (error) {
      logger.error('Error refreshing token', error);
      return false;
    }
  }
  
  /**
   * Fetch audio files from OneDrive
   */
  private async fetchAudioFiles(): Promise<void> {
    try {
      logger.info('Finding audio files in OneDrive (logging only, not syncing)');
      
      // Clear existing tracks
      this.tracks.clear();
      
      // Search only in the specified folders
      const targetFolders = ['sonora', 'music', 'Music'];
      
      // Get root folder contents
      const rootResponse = await this.makeGraphRequest(`${GRAPH_API_DRIVE_ENDPOINT}/root/children`);
      const rootData = await rootResponse.json();
      
      // Find the specified folders and search them
      let foldersFound = 0;
      for (const item of rootData.value) {
        if (item.folder && targetFolders.includes(item.name)) {
          foldersFound++;
          logger.info(`Searching for audio files in ${item.name} folder (ID: ${item.id})`);
          await this.searchAudioFilesInFolder(item.id);
        }
      }
      
      if (foldersFound === 0) {
        logger.info(`None of the target folders found: ${targetFolders.join(', ')}`);
      }
      
      // Save tracks to AsyncStorage
      const tracksArray = Array.from(this.tracks.values());
      await AsyncStorage.setItem(ONEDRIVE_TRACKS_STORAGE_KEY, JSON.stringify(tracksArray));
      
      logger.info(`Found ${tracksArray.length} audio files in OneDrive specified folders (logging only)`);
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
            // Just log the file instead of adding it to tracks
            logger.info(`Found audio file: ${item.name} (${item.id})`);
            
            // Generate a simpler ID instead of using UUID
            const simpleId = `onedrive-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            
            // Create a track object
            const track: Track = {
              id: simpleId,
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
    
    // Check if token is expired or about to expire
    if (!this.isTokenValid() && this.authResult.refreshToken) {
      logger.debug('Access token expired or about to expire, refreshing...');
      const refreshSuccess = await this.refreshToken();
      if (!refreshSuccess) {
        throw new Error('Failed to refresh token');
      }
    }
    
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.authResult.accessToken}`);
    
    return fetch(url, {
      ...options,
      headers
    });
  }
  
  /**
   * Ensure the document directory exists
   */
  private async ensureDocumentDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(ONEDRIVE_DOCUMENT_DIR);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(ONEDRIVE_DOCUMENT_DIR, { intermediates: true });
        logger.debug('Created OneDrive document directory');
      }
    } catch (error) {
      logger.error('Error ensuring document directory exists', error);
      throw error;
    }
  }
  
  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
  }
  
  /**
   * Get filename without extension
   */
  private getFileNameWithoutExtension(filename: string): string {
    return filename.split('.').slice(0, -1).join('.');
  }
}