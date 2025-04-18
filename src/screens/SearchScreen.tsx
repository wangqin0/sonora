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
  Keyboard,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../store';
import { Track } from '../types';
import { logger } from '../utils/logger';
import { useTheme } from '../theme/ThemeContext';

/**
 * Format duration in milliseconds to mm:ss format
 */
const formatDuration = (durationMs?: number): string => {
  if (!durationMs) return '';
  
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SearchScreen = () => {
  const { tracks, playTrack } = useStore();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const insets = useSafeAreaInsets();

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
  const renderTrackItem = ({ item }: { item: Track }) => {
    // Extract clean title (without artist prefix)
    let cleanTitle = item.title;
    if (cleanTitle.includes('-') && item.artist && cleanTitle.startsWith(item.artist)) {
      cleanTitle = cleanTitle.substring(item.artist.length).replace(/^\s*-\s*/, '').trim();
    }
    
    return (
      <TouchableOpacity 
        style={[styles.trackItem, { borderBottomColor: theme.border }]} 
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
          <Text style={[styles.trackSource, { color: theme.textSecondary }]}>
            {item.source === 'local' ? 'Local' : 'OneDrive'}
            {item.duration ? ` • ${formatDuration(item.duration)}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.trackAction}>
          <Ionicons name="play" size={20} color={theme.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isSearching) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.text }]}>Searching...</Text>
        </View>
      );
    }

    if (searchQuery.trim() && !searchResults.length) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.text }]}>No results found</Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Try a different search term</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search" size={64} color={theme.primary} />
        <Text style={[styles.emptyText, { color: theme.text }]}>Search your music</Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Find songs by title, artist, or album</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search input */}
      <View style={[
        styles.searchContainer, 
        { 
          backgroundColor: theme.surface,
          marginTop: 16 + (insets.top > 0 ? insets.top : 0),
        }
      ]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search songs, artists, albums"
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results list */}
      <FlatList
        data={searchResults}
        renderItem={renderTrackItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, searchResults.length === 0 ? { flex: 1 } : null]}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
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
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    marginBottom: 2,
  },
  trackSource: {
    fontSize: 12,
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
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
});

export default SearchScreen;