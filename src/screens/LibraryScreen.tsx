/**
 * Library Screen
 * Main screen for browsing music library
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/AppNavigator';

import { useStore } from '../store';
import { Track, Playlist } from '../types';
import { logger } from '../utils/logger';
import { useTheme } from '../theme/ThemeContext';
import { formatTime as formatDuration, extractCleanTitle } from '../utils/formatters';
import FloatingActionButton from '../components/common/FloatingActionButton';
import { usePlayerStore } from '../store/playerStore';

const LibraryScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { tracks, playlists, isLibraryLoading, loadLibrary, playTrack, playPlaylist, importLocalTracksFromFolder } = useStore();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists'>('tracks');
  const insets = useSafeAreaInsets();
  const playerState = usePlayerStore(state => state.playerState);
  const hasTrack = !!playerState.currentTrack;

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

  // Handle add music button press
  const handleAddMusic = () => {
    // Navigate to the storage providers screen instead of directly importing files
    navigation.navigate('StorageProviders');
  };

  // Render track item
  const renderTrackItem = ({ item }: { item: Track }) => {
    // Extract clean title (without artist prefix)
    const cleanTitle = extractCleanTitle(item.title, item.artist);
    
    return (
      <TouchableOpacity 
        style={[styles.trackItem, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]} 
        onPress={() => handleTrackPress(item)}
      >
        <View style={[styles.trackIconContainer, { backgroundColor: theme.surface }]}>
          {item.artwork ? (
            <Image
              source={{ uri: item.artwork }}
              style={styles.artwork}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="musical-note" size={24} color={theme.primary} />
          )}
        </View>
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, { color: theme.text }]} numberOfLines={1}>{cleanTitle}</Text>
          <Text style={[styles.trackArtist, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.artist || 'Unknown artist'}
            {item.album ? ` • ${item.album}` : ''}
          </Text>
          <Text style={[styles.trackSource, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.source === 'local' ? 'Local' : 'OneDrive'}
            {item.duration ? ` • ${formatDuration(item.duration)}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.trackAction}>
          <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render playlist item
  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity 
      style={[styles.playlistItem, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]} 
      onPress={() => handlePlaylistPress(item)}
    >
      <View style={[styles.playlistIconContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="list" size={24} color={theme.primary} />
      </View>
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.playlistCount, { color: theme.textSecondary }]}>{item.tracks.length} tracks</Text>
      </View>
      <TouchableOpacity 
        style={styles.playlistAction}
        onPress={() => playPlaylist(item)}
      >
        <Ionicons name="play" size={20} color={theme.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isLibraryLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.text }]}>Loading your music...</Text>
        </View>
      );
    }

    if (activeTab === 'tracks' && tracks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color={theme.primary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No tracks found</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Import music from your device using the add button</Text>
        </View>
      );
    }

    if (activeTab === 'playlists' && playlists.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={64} color={theme.primary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No playlists yet</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Create playlists to organize your music</Text>
          <TouchableOpacity style={[styles.emptyButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.emptyButtonText}>Create Playlist</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Tab selector */}
      <View style={[
        styles.tabContainer, 
        { 
          backgroundColor: theme.cardBackground, 
          shadowColor: theme.text,
          paddingTop: insets.top > 0 ? insets.top : 0 
        }
      ]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tracks' && [styles.activeTab, { borderBottomColor: theme.primary }]]}
          onPress={() => setActiveTab('tracks')}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: theme.textSecondary },
              activeTab === 'tracks' && [styles.activeTabText, { color: theme.primary }]
            ]}
          >
            Tracks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'playlists' && [styles.activeTab, { borderBottomColor: theme.primary }]]}
          onPress={() => setActiveTab('playlists')}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: theme.textSecondary },
              activeTab === 'playlists' && [styles.activeTabText, { color: theme.primary }]
            ]}
          >
            Playlists
          </Text>
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
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
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
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        />
      )}

      {/* Add Music Floating Button */}
      <FloatingActionButton 
        onPress={handleAddMusic} 
        icon="add-outline"
        bottom={hasTrack ? 150 : 150}
        right={24}
        size={60}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    elevation: 2,
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
  },
  tabText: {
    fontSize: 16,
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  trackIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
  },
  trackSource: {
    fontSize: 12,
  },
  trackAction: {
    padding: 8,
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  playlistIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 4,
  },
  playlistCount: {
    fontSize: 14,
  },
  playlistAction: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LibraryScreen;