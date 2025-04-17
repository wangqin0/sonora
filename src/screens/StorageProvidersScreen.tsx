/**
 * Storage Providers Screen
 * Allows users to connect to different storage sources
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useStore } from '../store';
import { storageManager } from '../services/storage/StorageManager';
import { StorageProviderInterface } from '../services/storage/StorageProvider';
import { OneDriveStorageProvider } from '../services/storage/OneDriveStorageProvider';
import { logger } from '../utils/logger';
import { SyncStatus } from '../config/onedrive';

const StorageProvidersScreen = () => {
  const { importLocalTracks, importLocalTracksFromFolder } = useStore();
  const [providers, setProviders] = useState<StorageProviderInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.IDLE);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncSettings, setSyncSettings] = useState({
    syncOnAppStart: true,
    syncOnWifiOnly: true,
    syncInterval: 3600,
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [oneDriveConnected, setOneDriveConnected] = useState(false);

  // Load providers on component mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        await storageManager.initialize();
        const allProviders = storageManager.getAllProviders();
        setProviders(allProviders);
        
        // Get OneDrive provider to check sync settings
        const oneDriveProvider = storageManager.getProvider('onedrive') as OneDriveStorageProvider;
        if (oneDriveProvider) {
          // Check connection status
          const isConnected = await oneDriveProvider.isConnected();
          setOneDriveConnected(isConnected);
          
          // Set up sync status change callback
          oneDriveProvider.setSyncStatusChangeCallback(setSyncStatus);
          
          // Get current sync status
          setSyncStatus(oneDriveProvider.getSyncStatus());
          
          // Get current sync settings
          const currentSettings = oneDriveProvider.getSyncSettings();
          setSyncEnabled(currentSettings.syncEnabled);
          setSyncSettings({
            syncOnAppStart: currentSettings.syncOnAppStart,
            syncOnWifiOnly: currentSettings.syncOnWifiOnly,
            syncInterval: currentSettings.syncInterval,
          });
          setLastSyncTime(currentSettings.lastSyncTime);
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
        
        // If OneDrive, get sync settings
        if (providerId === 'onedrive') {
          setOneDriveConnected(true);
          const oneDriveProvider = storageManager.getProvider('onedrive') as OneDriveStorageProvider;
          const currentSettings = oneDriveProvider.getSyncSettings();
          setSyncEnabled(currentSettings.syncEnabled);
          setSyncSettings({
            syncOnAppStart: currentSettings.syncOnAppStart,
            syncOnWifiOnly: currentSettings.syncOnWifiOnly,
            syncInterval: currentSettings.syncInterval,
          });
          setLastSyncTime(currentSettings.lastSyncTime);
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
      
      // If OneDrive, reset sync UI
      if (providerId === 'onedrive') {
        setOneDriveConnected(false);
        setSyncEnabled(false);
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

  // Handle toggle sync enabled
  const handleToggleSyncEnabled = useCallback(async (value: boolean) => {
    try {
      setSyncEnabled(value);
      const oneDriveProvider = storageManager.getProvider('onedrive') as OneDriveStorageProvider;
      if (oneDriveProvider) {
        await oneDriveProvider.updateSyncSettings({ syncEnabled: value });
      }
    } catch (error) {
      logger.error('Error updating sync settings', error);
      // Revert UI
      setSyncEnabled(!value);
      Alert.alert('Error', 'Failed to update sync settings');
    }
  }, []);

  // Handle toggle sync on app start
  const handleToggleSyncOnAppStart = useCallback(async (value: boolean) => {
    try {
      setSyncSettings(prev => ({ ...prev, syncOnAppStart: value }));
      const oneDriveProvider = storageManager.getProvider('onedrive') as OneDriveStorageProvider;
      if (oneDriveProvider) {
        await oneDriveProvider.updateSyncSettings({ syncOnAppStart: value });
      }
    } catch (error) {
      logger.error('Error updating sync settings', error);
      // Revert UI
      setSyncSettings(prev => ({ ...prev, syncOnAppStart: !value }));
      Alert.alert('Error', 'Failed to update sync settings');
    }
  }, []);

  // Handle toggle sync on WiFi only
  const handleToggleSyncOnWifiOnly = useCallback(async (value: boolean) => {
    try {
      setSyncSettings(prev => ({ ...prev, syncOnWifiOnly: value }));
      const oneDriveProvider = storageManager.getProvider('onedrive') as OneDriveStorageProvider;
      if (oneDriveProvider) {
        await oneDriveProvider.updateSyncSettings({ syncOnWifiOnly: value });
      }
    } catch (error) {
      logger.error('Error updating sync settings', error);
      // Revert UI
      setSyncSettings(prev => ({ ...prev, syncOnWifiOnly: !value }));
      Alert.alert('Error', 'Failed to update sync settings');
    }
  }, []);

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
        return <ActivityIndicator size="small" color="#6200ee" />;
      case SyncStatus.SUCCESS:
        return <Ionicons name="checkmark-circle" size={16} color="green" />;
      case SyncStatus.ERROR:
        return <Ionicons name="alert-circle" size={16} color="red" />;
      default:
        return <Ionicons name="cloud-outline" size={16} color="#666" />;
    }
  };

  // Render provider item
  const renderProviderItem = (provider: StorageProviderInterface) => {
    const isConnecting = connectingProvider === provider.getId();
    const isLocal = provider.getId() === 'local';
    const isOneDrive = provider.getId() === 'onedrive';
    
    return (
      <View key={provider.getId()} style={styles.providerItem}>
        <View style={styles.providerIconContainer}>
          <Ionicons 
            name={isLocal ? 'phone-portrait-outline' : 'cloud-outline'} 
            size={24} 
            color="#6200ee" 
          />
        </View>
        
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{provider.getName()}</Text>
          <Text style={styles.providerDescription}>
            {isLocal 
              ? 'Access music stored on your device' 
              : 'Access music stored in your OneDrive'}
          </Text>
          
          {isOneDrive && oneDriveConnected && (
            <View style={styles.syncStatusContainer}>
              {getSyncStatusIcon()}
              <Text style={styles.syncStatusText}>{getSyncStatusMessage()}</Text>
            </View>
          )}
        </View>
        
        {isConnecting ? (
          <ActivityIndicator size="small" color="#6200ee" />
        ) : (
          <View style={styles.providerActions}>
            {isLocal ? (
              // Local provider actions
              <>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleImportLocalFiles}
                >
                  <Ionicons name="document-outline" size={16} color="#fff" style={styles.actionButtonIcon} />
                  <Text style={styles.actionButtonText}>Import Files</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, { marginTop: 8 }]}
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
                    style={styles.actionButton}
                    onPress={() => handleDisconnectProvider(provider.getId())}
                  >
                    <Ionicons name="log-out-outline" size={16} color="#fff" style={styles.actionButtonIcon} />
                    <Text style={styles.actionButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, { marginTop: 8 }]}
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
                  style={styles.actionButton}
                  onPress={() => handleConnectProvider(provider.getId())}
                >
                  <Ionicons name="log-in-outline" size={16} color="#fff" style={styles.actionButtonIcon} />
                  <Text style={styles.actionButtonText}>Connect</Text>
                </TouchableOpacity>
              )
            ) : (
              // Other provider types (if any)
              <TouchableOpacity 
                style={styles.actionButton}
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

  // Render OneDrive sync settings
  const renderOneDriveSyncSettings = () => {
    const oneDriveProvider = providers.find(p => p.getId() === 'onedrive');
    if (!oneDriveProvider || !oneDriveConnected) return null;
    
    return (
      <View style={styles.syncSettingsContainer}>
        <Text style={styles.syncSettingsTitle}>OneDrive Sync Settings</Text>
        
        <View style={styles.syncSettingItem}>
          <Text style={styles.syncSettingLabel}>Enable automatic sync</Text>
          <Switch
            value={syncEnabled}
            onValueChange={handleToggleSyncEnabled}
            trackColor={{ false: '#d8d8d8', true: '#b39ddb' }}
            thumbColor={syncEnabled ? '#6200ee' : '#f4f3f4'}
          />
        </View>
        
        <Text style={styles.syncFolderInfo}>
          OneDrive Sync will only search for audio files in these folders:
          {'\n'}• root/sonora
          {'\n'}• root/music
          {'\n'}• root/Music
          {'\n\n'}Note: Sync currently only logs found files without downloading them.
        </Text>
        
        {syncEnabled && (
          <>
            <View style={styles.syncSettingItem}>
              <Text style={styles.syncSettingLabel}>Sync on app start</Text>
              <Switch
                value={syncSettings.syncOnAppStart}
                onValueChange={handleToggleSyncOnAppStart}
                trackColor={{ false: '#d8d8d8', true: '#b39ddb' }}
                thumbColor={syncSettings.syncOnAppStart ? '#6200ee' : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.syncSettingItem}>
              <Text style={styles.syncSettingLabel}>Sync only on WiFi</Text>
              <Switch
                value={syncSettings.syncOnWifiOnly}
                onValueChange={handleToggleSyncOnWifiOnly}
                trackColor={{ false: '#d8d8d8', true: '#b39ddb' }}
                thumbColor={syncSettings.syncOnWifiOnly ? '#6200ee' : '#f4f3f4'}
              />
            </View>
          </>
        )}
        
        <View style={styles.syncStatusContainer}>
          {getSyncStatusIcon()}
          <Text style={styles.syncStatusText}>{getSyncStatusMessage()}</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.syncNowButton, syncStatus === SyncStatus.SYNCING && styles.syncNowButtonDisabled]}
          onPress={handleSyncNow}
          disabled={syncStatus === SyncStatus.SYNCING}
        >
          <Text style={styles.syncNowButtonText}>
            {syncStatus === SyncStatus.SYNCING ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading storage providers...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Storage Providers</Text>
        <Text style={styles.headerDescription}>
          Connect to different storage providers to access your music
        </Text>
      </View>
      
      <View style={styles.providersContainer}>
        {providers.map(renderProviderItem)}
      </View>
      
      {renderOneDriveSyncSettings()}
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>About Storage Providers</Text>
        <Text style={styles.infoText}>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
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
  syncSettingsTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16,
  },
  syncSettingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  syncSettingLabel: {
    fontSize: 16,
    color: '#333',
  },
  syncFolderInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
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
  syncNowButtonDisabled: {
    backgroundColor: '#d8d8d8',
  },
  syncNowButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default StorageProvidersScreen;