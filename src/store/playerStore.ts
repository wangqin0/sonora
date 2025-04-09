/**
 * Player Store
 * Handles player state management and actions
 */

import { create } from 'zustand';
import { Track, Playlist, PlayerState } from '../types';
import { playerService } from '../services/player/PlayerService';
import { storageManager } from '../services/storage/StorageManager';
import { logger } from '../utils/logger';

interface PlayerStore {
  // Player state
  playerState: PlayerState;
  
  // Actions
  playTrack: (track: Track) => Promise<void>;
  playPlaylist: (playlist: Playlist, startIndex?: number) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  updatePlayerState: (partial: Partial<PlayerState>) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // Initial state
  playerState: {
    currentTrack: null,
    isPlaying: false,
    queue: [],
    repeatMode: 'off',
    shuffleMode: false,
    currentPosition: 0,
    duration: 0
  },
  
  // Play a single track
  playTrack: async (track: Track) => {
    try {
      logger.info(`Playing track: ${track.title}`);
      
      // Get playable URI from storage manager
      const uri = await storageManager.getPlayableUri(track);
      const trackWithUri = { ...track, uri };
      
      // Play the track
      await playerService.play(trackWithUri);
      
      // Update player state
      set({
        playerState: {
          ...get().playerState,
          currentTrack: trackWithUri,
          queue: [trackWithUri],
          isPlaying: true,
          currentPosition: 0
        }
      });
      
      // Start listening for playback status updates
      playerService.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          set({
            playerState: {
              ...get().playerState,
              isPlaying: status.isPlaying,
              currentPosition: status.positionMillis || 0,
              duration: status.durationMillis || 0
            }
          });
          
          // Handle playback completion
          if (status.didJustFinish) {
            get().nextTrack();
          }
        }
      });
    } catch (error) {
      logger.error(`Error playing track: ${track.title}`, error);
      throw error;
    }
  },
  
  // Play a playlist
  playPlaylist: async (playlist: Playlist, startIndex = 0) => {
    try {
      if (!playlist.tracks.length) {
        logger.warn(`Playlist ${playlist.name} is empty`);
        return;
      }
      
      // Limit startIndex to valid range
      const validStartIndex = Math.max(0, Math.min(startIndex, playlist.tracks.length - 1));
      
      // Create queue based on shuffle mode
      let queue = [...playlist.tracks];
      if (get().playerState.shuffleMode) {
        // Shuffle the queue, but keep the starting track at the beginning
        const startTrack = queue[validStartIndex];
        queue = queue.filter((_, i) => i !== validStartIndex);
        queue = shuffleArray(queue);
        queue.unshift(startTrack);
      }
      
      // Update queue in player state
      set({
        playerState: {
          ...get().playerState,
          queue
        }
      });
      
      // Play the first track
      await get().playTrack(queue[0]);
      
      logger.info(`Playing playlist: ${playlist.name}`);
    } catch (error) {
      logger.error(`Error playing playlist: ${playlist.name}`, error);
      throw error;
    }
  },
  
  // Toggle play/pause
  togglePlayPause: async () => {
    try {
      const { playerState } = get();
      
      if (!playerState.currentTrack) {
        logger.warn('No track loaded');
        return;
      }
      
      if (playerState.isPlaying) {
        await playerService.pause();
      } else {
        await playerService.resume();
      }
      
      // State will be updated via the playback status update callback
    } catch (error) {
      logger.error('Error toggling play/pause', error);
      throw error;
    }
  },
  
  // Play next track in queue
  nextTrack: async () => {
    try {
      const { playerState } = get();
      const { queue, currentTrack, repeatMode } = playerState;
      
      if (!currentTrack || queue.length === 0) {
        logger.warn('No track loaded or queue is empty');
        return;
      }
      
      // Find current track index
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      
      // Handle repeat modes
      if (repeatMode === 'track') {
        // Repeat current track
        await get().playTrack(currentTrack);
        return;
      }
      
      // Check if we're at the end of the queue
      if (currentIndex === queue.length - 1) {
        if (repeatMode === 'queue') {
          // Loop back to the beginning
          await get().playTrack(queue[0]);
        } else {
          // Stop playback at the end
          await playerService.stop();
          set({
            playerState: {
              ...playerState,
              isPlaying: false,
              currentPosition: 0
            }
          });
        }
      } else {
        // Play next track
        await get().playTrack(queue[currentIndex + 1]);
      }
    } catch (error) {
      logger.error('Error playing next track', error);
      throw error;
    }
  },
  
  // Play previous track in queue
  previousTrack: async () => {
    try {
      const { playerState } = get();
      const { queue, currentTrack, currentPosition } = playerState;
      
      if (!currentTrack || queue.length === 0) {
        logger.warn('No track loaded or queue is empty');
        return;
      }
      
      // If we're more than 3 seconds into the track, restart it instead of going to previous
      if (currentPosition > 3000) {
        await get().seekTo(0);
        return;
      }
      
      // Find current track index
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      
      // Check if we're at the beginning of the queue
      if (currentIndex === 0) {
        // Just restart the current track
        await get().seekTo(0);
      } else {
        // Play previous track
        await get().playTrack(queue[currentIndex - 1]);
      }
    } catch (error) {
      logger.error('Error playing previous track', error);
      throw error;
    }
  },
  
  // Seek to position
  seekTo: async (position: number) => {
    try {
      await playerService.seekTo(position);
      
      // Update position in state
      set({
        playerState: {
          ...get().playerState,
          currentPosition: position
        }
      });
    } catch (error) {
      logger.error(`Error seeking to position: ${position}`, error);
      throw error;
    }
  },
  
  // Toggle repeat mode
  toggleRepeat: () => {
    const { playerState } = get();
    const modes: Array<'off' | 'track' | 'queue'> = ['off', 'track', 'queue'];
    const currentIndex = modes.indexOf(playerState.repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    
    set({
      playerState: {
        ...playerState,
        repeatMode: modes[nextIndex]
      }
    });
    
    logger.debug(`Repeat mode set to: ${modes[nextIndex]}`);
  },
  
  // Toggle shuffle mode
  toggleShuffle: () => {
    const { playerState } = get();
    const newShuffleMode = !playerState.shuffleMode;
    
    // If we have a queue and turning shuffle on, shuffle the remaining tracks
    if (newShuffleMode && playerState.queue.length > 1 && playerState.currentTrack) {
      const currentTrack = playerState.currentTrack;
      const remainingTracks = playerState.queue.filter(t => t.id !== currentTrack.id);
      const shuffledRemaining = shuffleArray(remainingTracks);
      
      set({
        playerState: {
          ...playerState,
          shuffleMode: newShuffleMode,
          queue: [currentTrack, ...shuffledRemaining]
        }
      });
    } else {
      set({
        playerState: {
          ...playerState,
          shuffleMode: newShuffleMode
        }
      });
    }
    
    logger.debug(`Shuffle mode set to: ${newShuffleMode}`);
  },
  
  // Update player state
  updatePlayerState: (partial: Partial<PlayerState>) => {
    set({
      playerState: {
        ...get().playerState,
        ...partial
      }
    });
  }
}));

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}