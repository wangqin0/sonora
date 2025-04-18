/**
 * Storage Providers Screen
 * Allows users to connect to different storage sources
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../store';
import { storageManager } from '../services/storage/StorageManager';
import { StorageProviderInterface } from '../services/storage/StorageProvider';
import { OneDriveStorageProvider } from '../services/storage/OneDriveStorageProvider';
import { logger } from '../utils/logger';
import { SyncStatus } from '../config/onedrive';
import { useTheme } from '../theme/ThemeContext';

const StorageProvidersScreen = () => {
  const { importLocalTracks, importLocalTracksFromFolder } = useStore();
  const [providers, setProviders] = useState<StorageProviderInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.IDLE);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [oneDriveConnected, setOneDriveConnected] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { theme } = useTheme();

  // Add insets hook
  const insets = useSafeAreaInsets();

  // Load providers on component mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        await storageManager.initialize();
        const allProviders = storageManager.getAllProviders();
        setProviders(allProviders);
        
        // Get OneDrive provider to check connection status
        const oneDriveProvider = storageManager.getProvider('onedrive') as OneDriveStorageProvider;
        if (oneDriveProvider) {
          // Check connection status
          const isConnected = await oneDriveProvider.isConnected();
          setOneDriveConnected(isConnected);
          
          // Set up sync status change callback
          oneDriveProvider.setSyncStatusChangeCallback(setSyncStatus);
          
          // Get current sync status
          setSyncStatus(oneDriveProvider.getSyncStatus());
          
          // Get last sync time if available
          const settings = oneDriveProvider.getSyncSettings();
          setLastSyncTime(settings.lastSyncTime);
        }
      } catch (error) {
        logger.error('Error loading storage providers', error);
        Alert.alert('Error', 'Failed to load storage providers');
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  // Handle connect to provider
  const handleConnectProvider = async (providerId: string) => {
    try {
      setConnectingProvider(providerId);
      const success = await storageManager.connectProvider(providerId);
      
      if (success) {
        // Refresh providers list
        const allProviders = storageManager.getAllProviders();
        setProviders(allProviders);
        
        // If OneDrive, update connection status
        if (providerId === 'onedrive') {
          setOneDriveConnected(true);
          const oneDriveProvider = storageManager.getProvider('onedrive') as OneDriveStorageProvider;
          const settings = oneDriveProvider.getSyncSettings();
          setLastSyncTime(settings.lastSyncTime);
        }
      } else {
        Alert.alert('Connection Failed', 'Could not connect to the storage provider');
      }
    } catch (error) {
      logger.error(`Error connecting to provider: ${providerId}`, error);
      Alert.alert('Error', 'Failed to connect to storage provider');
    } finally {
      setConnectingProvider(null);
    }
  };

  // Handle disconnect from provider
  const handleDisconnectProvider = async (providerId: string) => {
    try {
      setConnectingProvider(providerId);
      await storageManager.disconnectProvider(providerId);
      
      // Refresh providers list
      const allProviders = storageManager.getAllProviders();
      setProviders(allProviders);
      
      // If OneDrive, reset connection status
      if (providerId === 'onedrive') {
        setOneDriveConnected(false);
        setLastSyncTime(null);
      }
    } catch (error) {
      logger.error(`Error disconnecting from provider: ${providerId}`, error);
      Alert.alert('Error', 'Failed to disconnect from storage provider');
    } finally {
      setConnectingProvider(null);
    }
  };

  // Handle import from local storage
  const handleImportLocalFiles = async () => {
    try {
      setConnectingProvider('local');
      await importLocalTracks();
      Alert.alert('Success', 'Music files imported successfully');
    } catch (error) {
      logger.error('Error importing local files', error);
      Alert.alert('Error', 'Failed to import music files');
    } finally {
      setConnectingProvider(null);
    }
  };

  // Handle import from local folder
  const handleImportLocalFolder = async () => {
    try {
      setConnectingProvider('local');
      const tracks = await importLocalTracksFromFolder();
      
      if (tracks.length > 0) {
        Alert.alert('Success', `Successfully imported ${tracks.length} music files from folder`);
      } else {
        Alert.alert('Import Complete', 'No supported music files were found or selected');
      }
    } catch (error) {
      logger.error('Error importing folder', error);
      Alert.alert('Error', 'Failed to import music files from folder');
    } finally {
      setConnectingProvider(null);
    }
  };

  // Handle sync now button
  const handleSyncNow = async () => {
    try {
      const oneDriveProvider = storageManager.getProvider('onedrive') as OneDriveStorageProvider;
      
      if (!oneDriveProvider) {
        logger.error('OneDrive provider not found');
        Alert.alert('Error', 'OneDrive provider not available');
        return;
      }
      
      if (!oneDriveConnected) {
        logger.info('Cannot sync - OneDrive not connected');
        Alert.alert('Not Connected', 'Please connect to OneDrive first');
        return;
      }
      
      await oneDriveProvider.syncNow();
      setLastSyncTime(oneDriveProvider.getSyncSettings().lastSyncTime);
    } catch (error) {
      logger.error('Error syncing with OneDrive', error);
      Alert.alert('Sync Error', 'Failed to sync with OneDrive');
    }
  };

  // Handle download all non-local songs
  const handleDownloadAllSongs = async () => {
    try {
      setIsDownloading(true);
      const oneDriveProvider = storageManager.getProvider('onedrive') as OneDriveStorageProvider;
      
      if (!oneDriveProvider) {
        logger.error('OneDrive provider not found');
        Alert.alert('Error', 'OneDrive provider not available');
        return;
      }
      
      if (!oneDriveConnected) {
        logger.info('Cannot download - OneDrive not connected');
        Alert.alert('Not Connected', 'Please connect to OneDrive first');
        return;
      }
      
      const result = await oneDriveProvider.downloadAllTracks();
      if (result.success) {
        Alert.alert('Download Complete', `Successfully downloaded ${result.downloaded} songs from OneDrive.`);
      } else {
        Alert.alert('Download Failed', result.message || 'Failed to download songs from OneDrive');
      }
    } catch (error) {
      logger.error('Error downloading all songs from OneDrive', error);
      Alert.alert('Download Error', 'Failed to download songs from OneDrive');
    } finally {
      setIsDownloading(false);
    }
  };

  // Get sync status message
  const getSyncStatusMessage = () => {
    switch (syncStatus) {
      case SyncStatus.SYNCING:
        return 'Syncing...';
      case SyncStatus.SUCCESS:
        return `Last synced: ${lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}`;
      case SyncStatus.ERROR:
        return 'Sync failed';
      default:
        return lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleString()}` : 'Never synced';
    }
  };

  // Get sync status icon
  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case SyncStatus.SYNCING:
        return <ActivityIndicator size="small" color={theme.primary} />;
      case SyncStatus.SUCCESS:
        return <Ionicons name="checkmark-circle" size={16} color="green" />;
      case SyncStatus.ERROR:
        return <Ionicons name="alert-circle" size={16} color="red" />;
      default:
        return <Ionicons name="cloud-outline" size={16} color={theme.textSecondary} />;
    }
  };

  // Render provider item
  const renderProviderItem = (provider: StorageProviderInterface) => {
    const isConnecting = connectingProvider === provider.getId();
    const isLocal = provider.getId() === 'local';
    const isOneDrive = provider.getId() === 'onedrive';
    
    return (
      <View key={provider.getId()} style={[styles.providerItem, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
        <View style={[styles.providerIconContainer, { backgroundColor: theme.surface }]}>
          <Ionicons 
            name={isLocal ? 'phone-portrait-outline' : 'cloud-outline'} 
            size={24} 
            color={theme.primary} 
          />
        </View>
        
        <View style={styles.providerInfo}>
          <Text style={[styles.providerName, { color: theme.text }]}>{provider.getName()}</Text>
          <Text style={[styles.providerDescription, { color: theme.textSecondary }]}>
            {isLocal 
              ? 'Access music stored on your device' 
              : 'Access music stored in your OneDrive'}
          </Text>
          
          {isOneDrive && oneDriveConnected && (
            <View style={styles.syncStatusContainer}>
              {getSyncStatusIcon()}
              <Text style={[styles.syncStatusText, { color: theme.textSecondary }]}>{getSyncStatusMessage()}</Text>
            </View>
          )}
          
          {isOneDrive && (
            <Text style={[styles.providerNoteText, { color: theme.textSecondary }]}>
              OneDrive will search for audio files in these folders:
              {'\n'}• root/sonora
              {'\n'}• root/music
              {'\n'}• root/Music
            </Text>
          )}
        </View>
        
        {isConnecting ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <View style={styles.providerActions}>
            {isLocal ? (
              // Local provider actions
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.primary }]}
                  onPress={handleImportLocalFiles}
                >
                  <Ionicons name="document-outline" size={16} color="#fff" style={styles.actionButtonIcon} />
                  <Text style={styles.actionButtonText}>Import Files</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, { marginTop: 8, backgroundColor: theme.primary }]}
                  onPress={handleImportLocalFolder}
                >
                  <Ionicons name="folder-outline" size={16} color="#fff" style={styles.actionButtonIcon} />
                  <Text style={styles.actionButtonText}>Import Folder</Text>
                </TouchableOpacity>
              </>
            ) : isOneDrive ? (
              // OneDrive provider actions
              oneDriveConnected ? (
                // Connected actions
                <>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.primary }]}
                    onPress={() => handleDisconnectProvider(provider.getId())}
                  >
                    <Ionicons name="log-out-outline" size={16} color="#fff" style={styles.actionButtonIcon} />
                    <Text style={styles.actionButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, { marginTop: 8, backgroundColor: theme.primary }]}
                    onPress={handleSyncNow}
                    disabled={syncStatus === SyncStatus.SYNCING}
                  >
                    <Ionicons name="sync-outline" size={16} color="#fff" style={styles.actionButtonIcon} />
                    <Text style={styles.actionButtonText}>
                      {syncStatus === SyncStatus.SYNCING ? 'Syncing...' : 'Sync Now'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                // Not connected action
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleConnectProvider(provider.getId())}
                >
                  <Ionicons name="log-in-outline" size={16} color="#fff" style={styles.actionButtonIcon} />
                  <Text style={styles.actionButtonText}>Connect</Text>
                </TouchableOpacity>
              )
            ) : (
              // Other provider types (if any)
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={() => handleConnectProvider(provider.getId())}
              >
                <Ionicons name="log-in-outline" size={16} color="#fff" style={styles.actionButtonIcon} />
                <Text style={styles.actionButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render Download All Card
  const renderDownloadAllCard = () => {
    // Only show if OneDrive is connected
    if (!oneDriveConnected) return null;
    
    return (
      <View style={[styles.syncSettingsContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
        <View style={styles.downloadAllHeader}>
          <View style={[styles.providerIconContainer, { backgroundColor: theme.surface }]}>
            <Ionicons name="cloud-download-outline" size={24} color={theme.primary} />
          </View>
          
          <View style={styles.providerInfo}>
            <Text style={[styles.providerName, { color: theme.text }]}>Download All Songs</Text>
            <Text style={[styles.providerDescription, { color: theme.textSecondary }]}>
              Download all songs from connected storage providers to your device for offline listening.
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.syncNowButton, 
            { 
              backgroundColor: isDownloading ? theme.border : theme.primary,
              marginTop: 16
            }
          ]}
          onPress={handleDownloadAllSongs}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.syncNowButtonText}>Downloading...</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="download-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.syncNowButtonText}>Download All Songs</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading storage providers...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[
        styles.headerContainer, 
        { 
          paddingTop: 0,
          paddingBottom: 10,
          backgroundColor: theme.cardBackground, 
          borderBottomColor: theme.border 
        }
      ]}>
        <Text style={[styles.headerDescription, { color: theme.textSecondary }]}>
          Connect to different storage providers to access your music
        </Text>
      </View>
      
      <View style={styles.providersContainer}>
        {providers.map(renderProviderItem)}
      </View>
      
      {renderDownloadAllCard()}
      
      <View style={[styles.infoContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.text }]}>
        <Text style={[styles.infoTitle, { color: theme.text }]}>About Storage Providers</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Sonora can play music from multiple sources. Connect to OneDrive to access your cloud music, or import music from your device's local storage.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  headerContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerDescription: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  providersContainer: {
    marginTop: 16,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  providerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  providerDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  providerNoteText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  syncStatusText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  providerActions: {
    marginLeft: 8,
  },
  actionButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonIcon: {
    marginRight: 4,
  },
  syncSettingsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoContainer: {
    padding: 20,
    marginTop: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  syncNowButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncNowButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  downloadAllHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default StorageProvidersScreen;