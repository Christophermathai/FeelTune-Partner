'use client';

import React, { useState } from 'react';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';

interface SpotifyPlayerProps {
  currentEmotion?: string;
}

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ currentEmotion }) => {
  const {
    playerState,
    togglePlayback,
    nextTrack,
    previousTrack,
    setVolume,
  } = useSpotifyPlayer();

  const [volume, setVolumeState] = useState(50);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolumeState(newVolume);
    setVolume(newVolume);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-95 text-white p-4">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        {/* Track Info */}
        <div className="flex items-center space-x-4 w-1/3">
          {playerState.currentTrack?.albumCover && (
            <img
              src={playerState.currentTrack.albumCover}
              alt="Album Cover"
              className="w-16 h-16 rounded-md"
            />
          )}
          <div className="flex flex-col">
            <span className="font-medium truncate">
              {playerState.currentTrack?.name || 'No track playing'}
            </span>
            <span className="text-gray-400 text-sm truncate">
              {playerState.currentTrack?.artist}
            </span>
            {currentEmotion && (
              <span className="text-xs text-blue-400">
                Mood: {currentEmotion}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-6 w-1/3 justify-center">
          <button
            onClick={previousTrack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/>
            </svg>
          </button>

          <button
            onClick={togglePlayback}
            className="bg-white rounded-full p-2 hover:scale-105 transition-transform"
          >
            {playerState.isPlaying ? (
              <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button
            onClick={nextTrack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2 w-1/3 justify-end">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default SpotifyPlayer;