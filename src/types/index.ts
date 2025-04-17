/**
 * Type definitions for the Sonora music player app
 */

// Music track type
export interface Track {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number; // in milliseconds
  uri: string;
  artwork?: string;
  source: 'local' | 'onedrive';
  path?: string; // file path for local files or OneDrive path
}

// Playlist type
export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: Date;
  updatedAt: Date;
}

// Player state
export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  repeatMode: 'off' | 'track' | 'queue';
  shuffleMode: boolean;
  currentPosition: number; // in milliseconds
  duration: number; // in milliseconds
}

// Storage provider types
export interface StorageProvider {
  name: string;
  id: string;
  type: 'local' | 'onedrive';
  isConnected: boolean;
  icon: string; // icon name or path
}

// OneDrive authentication types
export interface OneDriveAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface OneDriveAuthResult {
  accessToken: string;
  expiresOn: Date;
  refreshToken?: string;
}

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// App settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  audioQuality: 'auto' | 'high' | 'medium' | 'low';
  downloadStrategy: 'wifi-only' | 'always' | 'never';
  logLevel: LogLevel;
  oneDriveSync: {
    enabled: boolean;
    interval: number; // in seconds
    onAppStart: boolean;
    onWifiOnly: boolean;
  };
}