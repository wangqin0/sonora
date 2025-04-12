/**
 * Now Playing Bar Component
 * Displays the currently playing track with controls at the bottom of the screen
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import { useStore } from '../../store';
import { formatTime } from '../../utils/formatters';

const NowPlayingBar = () => {
  const navigation = useNavigation();
  const { playerState, togglePlayPause, nextTrack, seekTo } = useStore();
  const [sliderValue, setSliderValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [progressWidth] = useState(new Animated.Value(0));
  
  const { currentTrack, isPlaying, currentPosition, duration } = playerState;
  
  // Update slider position based on current playback position
  useEffect(() => {
    if (!isSeeking && currentTrack) {
      setSliderValue(currentPosition);
      
      // Animate progress bar
      const progress = duration > 0 ? currentPosition / duration : 0;
      Animated.timing(progressWidth, {
        toValue: progress,
        duration: 100,
        useNativeDriver: false
      }).start();
    }
  }, [currentPosition, isSeeking, currentTrack, duration, progressWidth]);
  
  // If no track is playing, don't show the player
  if (!currentTrack) {
    return null;
  }
  
  // Handle press on the player to open full player
  const handlePress = () => {
    navigation.navigate('Player' as never);
  };
  
  // Handle play/pause button press
  const handlePlayPause = (e: import('react-native').GestureResponderEvent) => {
    e.stopPropagation(); // Prevent opening the full player
    togglePlayPause();
  };
  
  // Handle next track button press
  const handleNextTrack = (e: import('react-native').GestureResponderEvent) => {
    e.stopPropagation(); // Prevent opening the full player
    nextTrack();
  };
  
  // Handle slider value change
  const handleSliderValueChange = (value: number) => {
    setIsSeeking(true);
    setSliderValue(value);
  };
  
  // Handle slider seek complete
  const handleSliderSlidingComplete = async (value: number) => {
    try {
      await seekTo(value);
    } catch (error) {
      console.error('Error seeking to position', error);
    } finally {
      setIsSeeking(false);
    }
  };
  
  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.9}>
      {/* Progress bar */}
      <Animated.View 
        style={[
          styles.progressBar,
          { width: progressWidth.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%']
          }) }
        ]}
      />
      
      <View style={styles.content}>
        {/* Track artwork */}
        <View style={styles.artworkContainer}>
          {currentTrack.artwork ? (
            <Image 
              source={{ uri: currentTrack.artwork }} 
              style={styles.artwork} 
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderArtwork}>
              <Ionicons name="musical-note" size={20} color="#6200ee" />
            </View>
          )}
        </View>
        
        {/* Track info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
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
              color="#6200ee" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={handleNextTrack}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="play-skip-forward" size={24} color="#6200ee" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Hidden slider for seeking */}
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    backgroundColor: '#6200ee',
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
    backgroundColor: '#f0f0f0',
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
    color: '#333',
  },
  artist: {
    fontSize: 14,
    color: '#666',
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