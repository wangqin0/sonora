/**
 * Library Screen
 * Main screen for browsing music library
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../navigation/AppNavigator';

import { useStore } from '../store';
import { Track, Playlist } from '../types';
import { logger } from '../utils/logger';

const LibraryScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { tracks, playlists, isLibraryLoading, loadLibrary, playTrack, playPlaylist } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists'>('tracks');

  // Load library on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadLibrary();
      } catch (error) {
        logger.error('Error loading library data', error);
      }
    };

    loadData();
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLibrary();
    } catch (error) {
      logger.error('Error refreshing library data', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle track press
  const handleTrackPress = (track: Track) => {
    playTrack(track);
  };

  // Handle playlist press
  const handlePlaylistPress = (playlist: Playlist) => {
    navigation.navigate('PlaylistDetail', { playlistId: playlist.id });
  };

  // Render track item
  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity style={styles.trackItem} onPress={() => handleTrackPress(item)}>
      <View style={styles.trackIconContainer}>
        <Ionicons name="musical-note" size={24} color="#6200ee" />
      </View>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artist || 'Unknown artist'}</Text>
      </View>
      <TouchableOpacity style={styles.trackAction}>
        <Ionicons name="ellipsis-vertical" size={20} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render playlist item
  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity style={styles.playlistItem} onPress={() => handlePlaylistPress(item)}>
      <View style={styles.playlistIconContainer}>
        <Ionicons name="list" size={24} color="#6200ee" />
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.playlistCount}>{item.tracks.length} tracks</Text>
      </View>
      <TouchableOpacity 
        style={styles.playlistAction}
        onPress={() => playPlaylist(item)}
      >
        <Ionicons name="play" size={20} color="#6200ee" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isLibraryLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.emptyText}>Loading your music...</Text>
        </View>
      );
    }

    if (activeTab === 'tracks' && tracks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color="#6200ee" />
          <Text style={styles.emptyTitle}>No tracks found</Text>
          <Text style={styles.emptyText}>Import music from your device or connect to OneDrive</Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => navigation.navigate('StorageProviders' as never)}
          >
            <Text style={styles.emptyButtonText}>Add Music</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'playlists' && playlists.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={64} color="#6200ee" />
          <Text style={styles.emptyTitle}>No playlists yet</Text>
          <Text style={styles.emptyText}>Create playlists to organize your music</Text>
          <TouchableOpacity style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Create Playlist</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Tab selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tracks' && styles.activeTab]}
          onPress={() => setActiveTab('tracks')}
        >
          <Text style={[styles.tabText, activeTab === 'tracks' && styles.activeTabText]}>Tracks</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'playlists' && styles.activeTab]}
          onPress={() => setActiveTab('playlists')}
        >
          <Text style={[styles.tabText, activeTab === 'playlists' && styles.activeTabText]}>Playlists</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'tracks' ? (
        <FlatList
          data={tracks}
          renderItem={renderTrackItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tracks.length === 0 ? { flex: 1 } : null}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      ) : (
        <FlatList
          data={playlists}
          renderItem={renderPlaylistItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={playlists.length === 0 ? { flex: 1 } : null}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {/* Floating action button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          if (activeTab === 'tracks') {
            navigation.navigate('StorageProviders' as never);
          } else {
            // TODO: Show create playlist dialog
          }
        }}
      >
        <Ionicons 
          name={activeTab === 'tracks' ? 'add' : 'create'} 
          size={24} 
          color="#fff" 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6200ee',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trackIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  trackAction: {
    padding: 8,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playlistIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  playlistCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  playlistAction: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: '#6200ee',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default LibraryScreen;