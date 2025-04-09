/**
 * Search Screen
 * Allows users to search for tracks in their music library
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useStore } from '../store';
import { Track } from '../types';
import { logger } from '../utils/logger';

const SearchScreen = () => {
  const { tracks, playTrack } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Perform search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Filter tracks based on search query
        const query = searchQuery.toLowerCase();
        const results = tracks.filter(track => 
          track.title.toLowerCase().includes(query) ||
          (track.artist && track.artist.toLowerCase().includes(query)) ||
          (track.album && track.album.toLowerCase().includes(query))
        );

        setSearchResults(results);
      } catch (error) {
        logger.error('Error performing search', error);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search to avoid excessive filtering
    const debounceTimeout = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, tracks]);

  // Handle track press
  const handleTrackPress = (track: Track) => {
    playTrack(track);
    Keyboard.dismiss();
  };

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Render track item
  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity style={styles.trackItem} onPress={() => handleTrackPress(item)}>
      <View style={styles.trackIconContainer}>
        <Ionicons name="musical-note" size={24} color="#6200ee" />
      </View>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist || 'Unknown artist'}
          {item.album ? ` • ${item.album}` : ''}
        </Text>
        <Text style={styles.trackSource}>
          {item.source === 'local' ? 'Local' : 'OneDrive'}
        </Text>
      </View>
      <TouchableOpacity style={styles.trackAction}>
        <Ionicons name="play" size={20} color="#6200ee" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isSearching) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      );
    }

    if (searchQuery.trim() && !searchResults.length) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#6200ee" />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={64} color="#6200ee" />
        <Text style={styles.emptyText}>Search your music</Text>
        <Text style={styles.emptySubtext}>Find songs by title, artist, or album</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs, artists, albums"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results list */}
      <FlatList
        data={searchResults}
        renderItem={renderTrackItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    marginBottom: 2,
  },
  trackSource: {
    fontSize: 12,
    color: '#999',
  },
  trackAction: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SearchScreen;