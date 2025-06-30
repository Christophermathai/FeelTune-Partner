'use client';

import { useState, useEffect, useCallback } from 'react';
import SpotifyService from '@/services/spotify';

interface SpotifyTrack {
  name: string;
  artist: string;
  albumCover: string;
  uri: string;
  duration: number;
}

interface PlayerState {
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  volume: number;
}

export const useSpotifyPlayer = () => {
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTrack: null,
    volume: 1
  });

  const spotify = SpotifyService.getInstance();

  const updatePlayerState = useCallback(async () => {
    try {
      const response = await spotify.fetchSpotifyApi('/me/player');
      
      if (response) {
        setPlayerState({
          isPlaying: response.is_playing,
          currentTrack: response.item ? {
            name: response.item.name,
            artist: response.item.artists.map((a: any) => a.name).join(', '),
            albumCover: response.item.album.images[0]?.url,
            uri: response.item.uri,
            duration: response.item.duration_ms
          } : null,
          volume: response.device.volume_percent / 100
        });
      }
    } catch (error) {
      console.error('Error updating player state:', error);
    }
  }, [spotify]);

  useEffect(() => {
    updatePlayerState();
    const interval = setInterval(updatePlayerState, 1000);
    return () => clearInterval(interval);
  }, [updatePlayerState]);

  const togglePlayback = useCallback(async () => {
    try {
      await spotify.fetchSpotifyApi(
        `/me/player/${playerState.isPlaying ? 'pause' : 'play'}`,
        { method: 'PUT' }
      );
      await updatePlayerState();
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  }, [playerState.isPlaying, spotify, updatePlayerState]);

  const nextTrack = useCallback(async () => {
    try {
      await spotify.fetchSpotifyApi('/me/player/next', { method: 'POST' });
      await updatePlayerState();
    } catch (error) {
      console.error('Error skipping to next track:', error);
    }
  }, [spotify, updatePlayerState]);

  const previousTrack = useCallback(async () => {
    try {
      await spotify.fetchSpotifyApi('/me/player/previous', { method: 'POST' });
      await updatePlayerState();
    } catch (error) {
      console.error('Error going to previous track:', error);
    }
  }, [spotify, updatePlayerState]);

  const setVolume = useCallback(async (volume: number) => {
    try {
      await spotify.fetchSpotifyApi(`/me/player/volume?volume_percent=${volume}`, {
        method: 'PUT'
      });
      setPlayerState(prev => ({ ...prev, volume: volume / 100 }));
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }, [spotify]);

  return {
    playerState,
    togglePlayback,
    nextTrack,
    previousTrack,
    setVolume
  };
};