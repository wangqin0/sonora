/**
 * Storage Providers Screen
 * Allows users to connect to different storage sources
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useStore } from '../store';
import { storageManager } from '../services/storage/StorageManager';
import { StorageProviderInterface } from '../services/storage/StorageProvider';
import { logger } from '../utils/logger';

const StorageProvidersScreen = () => {
  const { importLocalTracks, importLocalTracksFromFolder } = useStore();
  const [providers, setProviders] = useState<StorageProviderInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  // Load providers on component mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        await storageManager.initialize();
        const allProviders = storageManager.getAllProviders();
        setProviders(allProviders);
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

  // Render provider item
  const renderProviderItem = (provider: StorageProviderInterface) => {
    const isConnecting = connectingProvider === provider.getId();
    const isLocal = provider.getId() === 'local';
    
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
        </View>
        
        {isConnecting ? (
          <ActivityIndicator size="small" color="#6200ee" />
        ) : (
          <View style={styles.providerActions}>
            {isLocal ? (
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
            ) : (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleConnectProvider(provider.getId())}
              >
                <Text style={styles.actionButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  infoContainer: {
    padding: 20,
    marginTop: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
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
});

export default StorageProvidersScreen;