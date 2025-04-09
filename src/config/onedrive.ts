/**
 * OneDrive Configuration
 */

export const ONEDRIVE_CONFIG = {
  // Replace with your actual Microsoft App Registration client ID
  clientId: 'YOUR_MICROSOFT_CLIENT_ID',
  
  // Scopes required for accessing OneDrive files
  scopes: ['Files.Read', 'offline_access'],
  
  // This should match the URL scheme in app.json
  redirectUri: 'sonora://auth/onedrive'
};