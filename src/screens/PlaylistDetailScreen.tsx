/**
 * Playlist Detail Screen
 * Displays details and tracks for a specific playlist
 */

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useStore } from '../store';
import { Track, Playlist } from '../types';
import { logger } from '../utils/logger';
import { RootStackParamList } from '../navigation/AppNavigator';

type PlaylistDetailRouteProp = RouteProp<RootStackParamList, 'PlaylistDetail'>;

const PlaylistDetailScreen = () => {
  const route = useRoute<PlaylistDetailRouteProp>();
  const navigation = useNavigation();
  const { playlists, playTrack, playPlaylist } = useStore();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get playlist ID from route params
  const { playlistId } = route.params;

  // Load playlist data
  useEffect(() => {
    const loadPlaylist = () => {
      try {
        setIsLoading(true);
        const foundPlaylist = playlists.find(p => p.id === playlistId);
        
        if (foundPlaylist) {
          setPlaylist(foundPlaylist);
          // Set screen title to playlist name
          navigation.setOptions({ title: foundPlaylist.name });
        } else {
          logger.warn(`Playlist not found: ${playlistId}`);
          navigation.goBack();
        }
      } catch (error) {
        logger.error('Error loading playlist', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylist();
  }, [playlistId, playlists, navigation]);

  // Handle play all
  const handlePlayAll = () => {
    if (playlist) {
      playPlaylist(playlist);
    }
  };

  // Handle track press
  const handleTrackPress = (track: Track, index: number) => {
    if (playlist) {
      // Start playlist from the selected track
      playPlaylist(playlist, index);
    } else {
      // Fallback to playing just the track
      playTrack(track);
    }
  };

  // Render track item
  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => (
    <TouchableOpacity 
      style={styles.trackItem} 
      onPress={() => handleTrackPress(item, index)}
    >
      <Text style={styles.trackNumber}>{index + 1}</Text>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist || 'Unknown artist'}
          {item.album ? ` • ${item.album}` : ''}
        </Text>
      </View>
      <TouchableOpacity style={styles.trackAction}>
        <Ionicons name="ellipsis-vertical" size={20} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading playlist...</Text>
      </View>
    );
  }

  // Render empty state if playlist not found
  if (!playlist) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#6200ee" />
        <Text style={styles.emptyText}>Playlist not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Playlist header */}
      <View style={styles.header}>
        <View style={styles.playlistIconContainer}>
          <Ionicons name="musical-notes" size={40} color="#6200ee" />
        </View>
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistName}>{playlist.name}</Text>
          <Text style={styles.playlistDetails}>
            {playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.playButton}
          onPress={handlePlayAll}
          disabled={playlist.tracks.length === 0}
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.playButtonText}>Play All</Text>
        </TouchableOpacity>
      </View>

      {/* Tracks list */}
      <FlatList
        data={playlist.tracks}
        renderItem={renderTrackItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tracks in this playlist</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playlistIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playlistDetails: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  listContent: {
    flexGrow: 1,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trackNumber: {
    width: 24,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
  },
  trackAction: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default PlaylistDetailScreen;