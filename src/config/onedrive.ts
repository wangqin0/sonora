/**
 * OneDrive configuration
 */

// Replace with your actual Microsoft/OneDrive Application Client ID
export const ONEDRIVE_CLIENT_ID = 'ac09c1d9-2586-41d1-b8ab-b4cac2005185';

// Redirect URI - explicitly defined to match Azure portal configuration
export const ONEDRIVE_REDIRECT_URI = 'sonora://auth/onedrive';

// Public client - for mobile apps (no client secret)
export const ONEDRIVE_IS_PUBLIC_CLIENT = true;

// Default sync settings
export const DEFAULT_SYNC_SETTINGS = {
  syncEnabled: false,
  syncInterval: 3600, // seconds (1 hour)
  syncOnAppStart: true,
  syncOnWifiOnly: true,
  lastSyncTime: null,
};

// OneDrive API endpoints
export const ONEDRIVE_API = {
  AUTH_ENDPOINT: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  TOKEN_ENDPOINT: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  GRAPH_API_ENDPOINT: 'https://graph.microsoft.com/v1.0',
};

// Sync status
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  ERROR = 'error',
  SUCCESS = 'success',
}