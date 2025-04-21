/**
 * Now Playing Bar Component
 * Displays the currently playing track with controls at the bottom of the screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../../store';
import { usePlayerStore } from '../../store/playerStore';
import { formatTime } from '../../utils/formatters';
import { logger } from '../../utils/logger';
import { useTheme } from '../../theme/ThemeContext';
import { formatArtworkUri } from '../../utils/artworkHelper';

const NowPlayingBar = () => {
  const navigation = useNavigation<any>();
  // Get player controls from the main store
  const { togglePlayPause, nextTrack, seekTo } = useStore();
  // Get player state directly from the player store
  const playerState = usePlayerStore(state => state.playerState);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [sliderValue, setSliderValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [progressWidth] = useState(new Animated.Value(0));
  
  const { currentTrack, isPlaying, currentPosition, duration } = playerState;
  
  // Log current track when component mounts or updates
  useEffect(() => {
    logger.debug(`NowPlayingBar - currentTrack: ${currentTrack ? currentTrack.title : 'null'}, isPlaying: ${isPlaying}`);
  }, [currentTrack, isPlaying]);
  
  // Update slider position based on current playback position
  useEffect(() => {
    if (!isSeeking && currentTrack) {
      setSliderValue(currentPosition);
      
      // Update progress bar width directly (removed animation)
      const progress = duration > 0 ? currentPosition / duration : 0;
      progressWidth.setValue(progress);
    }
  }, [currentPosition, isSeeking, currentTrack, duration, progressWidth]);
  
  // Handle press on the player to open Playing tab
  const handlePress = () => {
    navigation.navigate('MainTabs', { screen: 'Playing' });
  };
  
  // Handle play/pause button press
  const handlePlayPause = (e: import('react-native').GestureResponderEvent) => {
    e.stopPropagation(); // Prevent opening the full player
    if (currentTrack) {
      togglePlayPause();
    }
  };
  
  // Handle next track button press
  const handleNextTrack = (e: import('react-native').GestureResponderEvent) => {
    e.stopPropagation(); // Prevent opening the full player
    if (currentTrack) {
      nextTrack();
    }
  };
  
  // Handle slider value change
  const handleSliderValueChange = (value: number) => {
    if (!currentTrack) return;
    setIsSeeking(true);
    setSliderValue(value);
  };
  
  // Handle slider seek complete
  const handleSliderSlidingComplete = async (value: number) => {
    if (!currentTrack) return;
    try {
      await seekTo(value);
    } catch (error) {
      console.error('Error seeking to position', error);
    } finally {
      setIsSeeking(false);
    }
  };
  
  // Only render if there's a track playing
  if (!currentTrack) return null;
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.cardBackground,
          borderTopColor: theme.border,
          borderBottomColor: theme.border,
          borderBottomWidth: 1,
        }
      ]} 
      onPress={handlePress} 
      activeOpacity={0.9}
    >
      {/* Progress bar - only show when a track is playing */}
      <Animated.View 
        style={[
          styles.progressBar,
          { 
            width: progressWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            }),
            backgroundColor: theme.primary 
          }
        ]}
      />
      
      <View style={styles.content}>
        {/* Track artwork */}
        <View style={styles.artworkContainer}>
          {currentTrack.artwork ? (
            <Image 
              source={{ uri: formatArtworkUri(currentTrack.artwork) }} 
              style={styles.artwork} 
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.placeholderArtwork, { backgroundColor: theme.surface }]}>
              <Ionicons name="musical-note" size={20} color={theme.primary} />
            </View>
          )}
        </View>
        
        {/* Track info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={[styles.artist, { color: theme.textSecondary }]} numberOfLines={1}>
            {currentTrack.artist || 'Unknown artist'}
          </Text>
        </View>
        
        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={handlePlayPause}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons 
              name={isPlaying ? 'pause' : 'play'} 
              size={28} 
              color={theme.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={handleNextTrack}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons 
              name="play-skip-forward" 
              size={24} 
              color={theme.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Hidden slider for seeking - only enable when track is playing */}
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={duration || 1}
        value={sliderValue}
        minimumTrackTintColor="transparent"
        maximumTrackTintColor="transparent"
        thumbTintColor="transparent"
        onValueChange={handleSliderValueChange}
        onSlidingComplete={handleSliderSlidingComplete}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  artworkContainer: {
    marginRight: 12,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  placeholderArtwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  artist: {
    fontSize: 14,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  slider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 64,
    opacity: 0, // Hidden but still functional for seeking
  },
});

export default NowPlayingBar;