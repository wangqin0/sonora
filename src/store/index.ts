/**
 * Application state management using Zustand
 */

import { create } from 'zustand';
import { Track, Playlist, PlayerState, AppSettings, LogLevel } from '../types';
import { storageManager } from '../services/storage/StorageManager';
import { logger } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerStore } from './playerStore';

// Constants
const PLAYLISTS_STORAGE_KEY = '@sonora/playlists';
const SETTINGS_STORAGE_KEY = '@sonora/settings';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  audioQuality: 'auto',
  downloadStrategy: 'wifi-only',
  logLevel: LogLevel.INFO
};

interface AppState {
  // Library state
  tracks: Track[];
  playlists: Playlist[];
  isLibraryLoading: boolean;
  
  // Player state
  playerState: PlayerState;
  
  // App settings
  settings: AppSettings;
  
  // Actions - Library
  loadLibrary: () => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist>;
  updatePlaylist: (playlist: Playlist) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addTracksToPlaylist: (playlistId: string, tracks: Track[]) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  importLocalTracks: () => Promise<void>;
  
  // Actions - Player
  playTrack: (track: Track) => Promise<void>;
  playPlaylist: (playlist: Playlist, startIndex?: number) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  
  // Actions - Settings
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  tracks: [],
  playlists: [],
  isLibraryLoading: false,
  get playerState() {
    return usePlayerStore.getState().playerState;
  },
  settings: DEFAULT_SETTINGS,
  
  // Actions - Library
  loadLibrary: async () => {
    try {
      set({ isLibraryLoading: true });
      
      // Initialize storage manager if not already
      await storageManager.initialize();
      
      // Load tracks from all active providers
      const tracks = await storageManager.getAllTracks();
      
      // Load playlists from AsyncStorage
      const playlistsJson = await AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY);
      const playlists: Playlist[] = playlistsJson ? JSON.parse(playlistsJson) : [];
      
      // Load settings from AsyncStorage
      const settingsJson = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      const settings: AppSettings = settingsJson 
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) } 
        : DEFAULT_SETTINGS;
      
      // Apply settings
      logger.setLogLevel(settings.logLevel);
      
      set({ tracks, playlists, settings, isLibraryLoading: false });
      logger.info(`Loaded ${tracks.length} tracks and ${playlists.length} playlists`);
    } catch (error) {
      logger.error('Error loading library', error);
      set({ isLibraryLoading: false });
    }
  },
  
  createPlaylist: async (name: string) => {
    try {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name,
        tracks: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const playlists = [...get().playlists, newPlaylist];
      set({ playlists });
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
      
      logger.info(`Created playlist: ${name}`);
      return newPlaylist;
    } catch (error) {
      logger.error(`Error creating playlist: ${name}`, error);
      throw error;
    }
  },
  
  updatePlaylist: async (playlist: Playlist) => {
    try {
      const playlists = get().playlists.map(p => 
        p.id === playlist.id ? { ...playlist, updatedAt: new Date() } : p
      );
      
      set({ playlists });
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
      
      logger.info(`Updated playlist: ${playlist.name}`);
    } catch (error) {
      logger.error(`Error updating playlist: ${playlist.name}`, error);
      throw error;
    }
  },
  
  deletePlaylist: async (playlistId: string) => {
    try {
      const playlists = get().playlists.filter(p => p.id !== playlistId);
      set({ playlists });
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
      
      logger.info(`Deleted playlist: ${playlistId}`);
    } catch (error) {
      logger.error(`Error deleting playlist: ${playlistId}`, error);
      throw error;
    }
  },
  
  addTracksToPlaylist: async (playlistId: string, tracks: Track[]) => {
    try {
      const playlists = get().playlists.map(p => {
        if (p.id === playlistId) {
          // Filter out duplicates
          const existingTrackIds = new Set(p.tracks.map(t => t.id));
          const newTracks = tracks.filter(t => !existingTrackIds.has(t.id));
          
          return {
            ...p,
            tracks: [...p.tracks, ...newTracks],
            updatedAt: new Date()
          };
        }
        return p;
      });
      
      set({ playlists });
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
      
      logger.info(`Added ${tracks.length} tracks to playlist: ${playlistId}`);
    } catch (error) {
      logger.error(`Error adding tracks to playlist: ${playlistId}`, error);
      throw error;
    }
  },
  
  removeTrackFromPlaylist: async (playlistId: string, trackId: string) => {
    try {
      const playlists = get().playlists.map(p => {
        if (p.id === playlistId) {
          return {
            ...p,
            tracks: p.tracks.filter(t => t.id !== trackId),
            updatedAt: new Date()
          };
        }
        return p;
      });
      
      set({ playlists });
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
      
      logger.info(`Removed track ${trackId} from playlist: ${playlistId}`);
    } catch (error) {
      logger.error(`Error removing track from playlist: ${playlistId}`, error);
      throw error;
    }
  },
  
  importLocalTracks: async () => {
    try {
      set({ isLibraryLoading: true });
      
      // Import tracks from local storage
      const newTracks = await storageManager.importLocalAudioFiles();
      
      // Merge with existing tracks
      const existingTracks = get().tracks;
      const allTracks = [...existingTracks, ...newTracks];
      
      // Remove duplicates by ID
      const uniqueTracks = Array.from(
        new Map(allTracks.map(track => [track.id, track])).values()
      );
      
      set({ tracks: uniqueTracks, isLibraryLoading: false });
      logger.info(`Imported ${newTracks.length} tracks from local storage`);
    } catch (error) {
      logger.error('Error importing local tracks', error);
      set({ isLibraryLoading: false });
      throw error;
    }
  },
  
  // Player actions - delegate to playerStore
  playTrack: async (track: Track) => {
    return usePlayerStore.getState().playTrack(track);
  },
  
  playPlaylist: async (playlist: Playlist) => {
    return usePlayerStore.getState().playPlaylist(playlist);
  },
  
  togglePlayPause: async () => {
    return usePlayerStore.getState().togglePlayPause();
  },
  
  nextTrack: async () => {
    return usePlayerStore.getState().nextTrack();
  },
  
  previousTrack: async () => {
    return usePlayerStore.getState().previousTrack();
  },
  
  seekTo: async (position: number) => {
    return usePlayerStore.getState().seekTo(position);
  },
  
  toggleRepeat: () => {
    usePlayerStore.getState().toggleRepeat();
  },
  
  toggleShuffle: () => {
    usePlayerStore.getState().toggleShuffle();
  },
  
  // Settings actions
  updateSettings: async (settings: Partial<AppSettings>) => {
    try {
      const currentSettings = get().settings;
      const newSettings = { ...currentSettings, ...settings };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      
      // Update state
      set({ settings: newSettings });
      
      // Apply settings
      logger.setLogLevel(newSettings.logLevel);
      
      logger.info('Settings updated');
    } catch (error) {
      logger.error('Error updating settings', error);
      throw error;
    }
  },
}));