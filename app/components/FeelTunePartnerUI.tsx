'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MemorySystem } from '@/services/memory/MemorySystem';
import { TransitionManager } from '@/services/transition/TransitionManager';
import { SpotifyService } from '@/services/spotify';
import { analyzeEmotion } from '@/services/emotionAnalysis';
import AudioVisualizer from './AudioVisualizer';

// Types
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  emotion?: string;
}

interface ChatState {
  messages: Message[];
  currentEmotion: string;
  currentMusicMood: string;
  transitionInProgress: boolean;
}

interface SpotifyTrack {
  uri: string;
  name: string;
  artist: string;
  duration: number;
  albumCover: string;
  mood?: string;
}

interface EmotionalState {
  emotion: string;
  intensity: number;
  timestamp: string;
}

interface EmotionAnalysis {
  emotion: string;
  intensity: number;
  suggestion: string;
}

interface MusicTransition {
  from: {
    trackId: string;
    mood: string;
    energy: number;
  };
  to: {
    trackId: string;
    mood: string;
    energy: number;
  };
  duration: number;
  type: 'crossfade' | 'fade' | 'immediate';
}

// Styled Components
const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden;
    width: 100%;
    height: 100vh;
    background: linear-gradient(135deg, #FF0F7B 0%, #F89B29 100%);
  }

  body {
    position: fixed;
    width: 100%;
    height: 100%;
  }

  #__next {
    height: 100%;
  }
`;

const Container = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #FF0F7B 0%, #F89B29 100%);
  font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  displayTrack: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 32px;
  font-family: var(--font-playTrackfair), Georgia, serif;
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(to right, #FFF 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  letter-spacing: -1px;
  displayTrack: flex;
  align-items: center;
  justify-content: space-between;
`;

const UserInfo = styled.div`
  font-family: var(--font-inter), sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  displayTrack: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 20px;
  border-radius: 30px;
  backdrop-filter: blur(10px);
`;

const DateTime = styled.span`
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
`;

const Main = styled.div`
  displayTrack: flex;
  flex: 1;
  overflow: hidden;
  gap: 32px;
  padding: 0 32px 32px;
`;

const ChatSection = styled.div`
  flex: 1;
  padding: 40px;
  displayTrack: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
`;
// ... continuing from previous part

const ChatMessages = styled.div`
  width: 100%;
  max-width: 720px;
  flex: 1;
  overflow-y: auto;
  displayTrack: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 0;
  margin: 0 auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }
`;

const MessageBubble = styled.div<{ $isUser?: boolean }>`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: ${props => props.$isUser ? '20px 20px 0 20px' : '20px 20px 20px 0'};
  background: ${props => props.$isUser ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.4)'};
  color: ${props => props.$isUser ? '#000' : '#fff'};
  align-self: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  font-size: 15px;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ThinkingIndicator = styled.div`
  displayTrack: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
  border-radius: 20px 20px 20px 0;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  align-self: flex-start;
  font-size: 15px;
`;

const ThinkingDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  animation: bounce 1s infinite;

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.4s;
  }
`;

const ChatForm = styled.form`
  position: relative;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  isolation: isolate;
  displayTrack: flex;
  align-items: center;
  margin-top: 20px;
`;

const ChatBox = styled.textarea`
  width: 100%;
  height: 60px;
  padding: 18px 70px 18px 24px;
  border-radius: 30px;
  border: none;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-family: var(--font-inter), sans-serif;
  font-size: 16px;
  font-weight: 500;
  resize: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  outline: none;
  transition: all 0.3s ease;

  &:focus {
    background: rgba(0, 0, 0, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  &::-webkit-scrollbar {
    displayTrack: none;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const SendButtonWrapper = styled.div`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  height: 44px;
  width: 44px;
  displayTrack: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const SendButton = styled(motion.button)`
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  color: #FF0F7B;
  cursor: pointer;
  displayTrack: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
  transition: all 0.2s ease;

  &:hover {
    background: #fff;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const EnhancedplayTrackerWrapper = styled(motion.div)`
  width: 420px;
  background: #181818;
  color: white;
  displayTrack: flex;
  flex-direction: column;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  position: relative;
`;

const AlbumSection = styled.div`
  position: relative;
  padding: 24px;
  background: linear-gradient(to bottom, #535353, #282828);
`;

const AlbumCover = styled.div`
  position: relative;
  width: 100%;
  padding-top: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);

  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  &:hover img {
    transform: scale(1.02);
  }
`;

const TrackInfo = styled.div`
  padding: 24px;
  background: #282828;
`;

const TrackTitle = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
  line-height: 1.2;
`;

const TrackArtist = styled.div`
  font-size: 16px;
  color: #b3b3b3;
  font-weight: 500;

  &:hover {
    color: #fff;
    text-decoration: underline;
    cursor: pointer;
  }
`;

const MoodIndicator = styled(motion.div)<{ $mood: string }>`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 8px 16px;
  background: ${props => {
    switch(props.$mood.toLowerCase()) {
      case 'happy': return 'linear-gradient(135deg, #FFD700, #FFA500)';
      case 'sad': return 'linear-gradient(135deg, #4B0082, #483D8B)';
      case 'energetic': return 'linear-gradient(135deg, #FF4500, #FF6347)';
      case 'calm': return 'linear-gradient(135deg, #20B2AA, #48D1CC)';
      default: return 'linear-gradient(135deg, #808080, #A9A9A9)';
    }
  }};
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  z-index: 2;
  text-transform: capitalize;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  position: relative;
  cursor: pointer;
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: #1DB954;
    width: var(--progress, 0%);
    transition: width 0.1s linear;
  }
`;

const Controls = styled.div`
  displayTrack: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
`;

const ControlButton = styled(motion.button)`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  width: 40px;
  height: 40px;
  displayTrack: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

// ... continuing in next part with component implementation
// ... continuing from previous parts

const FeelTunePartnerUI: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isplayTracking, setIsplayTracking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const currentTime = '2025-06-29 14:41:09';
  const currentUser = 'Christophermathai';

  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    currentEmotion: 'neutral',
    currentMusicMood: 'neutral',
    transitionInProgress: false,
  });

  // Service instances using singleton pattern
  const memorySystem = useMemo(() => MemorySystem.getInstance(), []);
  const transitionManager = useMemo(() => TransitionManager.getInstance(), []);
  const spotifyService = useMemo(() => SpotifyService.getInstance(), []);

  // Audio Control Functions
  const handleplayTrackPause = async () => {
    try {
      if (isplayTracking) {
        await spotifyService.pause();
        setIsplayTracking(false);
      } else {
        if (currentTrack) {
          await spotifyService.playTrack(currentTrack.uri);
        } else {
          const recommendations = await spotifyService.getRecommendations(chatState.currentEmotion);
          if (recommendations.length > 0) {
            setCurrentTrack(recommendations[0]);
            await spotifyService.playTrack(recommendations[0].uri);
          }
        }
        setIsplayTracking(true);
      }
    } catch (error) {
      console.error('playTrackback control error:', error);
    }
  };

  const handleNext = async () => {
    try {
      const recommendations = await spotifyService.getRecommendations(chatState.currentEmotion);
      if (recommendations.length > 0) {
        const nextTrack = recommendations[0];
        setCurrentTrack(nextTrack);
        await spotifyService.playTrack(nextTrack.uri);
        setIsplayTracking(true);
      }
    } catch (error) {
      console.error('Next track error:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await spotifyService.previous();
    } catch (error) {
      console.error('Previous track error:', error);
    }
  };
  
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    spotifyService.setVolume(Math.floor(newVolume * 100));
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && currentTrack) {
      const rect = progressRef.current.getBoundingClientRect();
      const position = (e.clientX - rect.left) / rect.width;
      const newPosition = position * currentTrack.duration;
      spotifyService.seek(Math.floor(newPosition));
    }
  };

  // Emotion and Chat Handling
  const handleEmotionalChange = async (newEmotion: string, intensity: number): Promise<void> => {
    if (newEmotion !== chatState.currentEmotion || !chatState.transitionInProgress) {
      try {
        setChatState(prev => ({ ...prev, transitionInProgress: true }));
        
        const recommendations = await spotifyService.getRecommendations(newEmotion);
        if (recommendations.length > 0) {
          const newTrack = recommendations[0];
          setCurrentTrack(newTrack);
          
          await transitionManager.queueTransition({
            from: { 
              trackId: currentTrack?.uri || '', 
              mood: chatState.currentMusicMood, 
              energy: 0.5 
            },
            to: { 
              trackId: newTrack.uri, 
              mood: newEmotion, 
              energy: intensity 
            },
            duration: 3000,
            type: 'crossfade'
          });

          await spotifyService.playTrack(newTrack.uri);
          setIsplayTracking(true);
        }

        memorySystem.addEmotionalState({
          emotion: newEmotion,
          intensity,
          timestamp: new Date().toISOString()
        });

        setChatState(prev => ({
          ...prev,
          currentEmotion: newEmotion,
          currentMusicMood: newEmotion,
          transitionInProgress: false
        }));

      } catch (error) {
        console.error('Error during emotional transition:', error);
        setChatState(prev => ({ ...prev, transitionInProgress: false }));
      }
    }
  };

  const generateResponse = async (userMessage: string): Promise<void> => {
    setIsThinking(true);
    try {
      const emotionAnalysis = await analyzeEmotion(userMessage);
      await handleEmotionalChange(emotionAnalysis.emotion, emotionAnalysis.intensity);

      const emotionalTrend = memorySystem.getEmotionalTrend(7);
      const response = `I sense you're feeling ${emotionAnalysis.emotion}. ${
        emotionAnalysis.suggestion
      }. ${
        emotionalTrend.length > 0 ? 
        "I've noticed you've been feeling similar emotions lately. Would you like to talk about it?" : 
        "How's the music working for you?"
      }`;

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: response,
        isUser: false,
        timestamp: new Date().toISOString(),
        emotion: emotionAnalysis.emotion
      }]);

    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I apologize, but I'm having trouble processing your request right now. Please try again.",
        isUser: false,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!text.trim()) return;

    const userMessage = text.trim();
    setText('');

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: userMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    }]);

    await generateResponse(userMessage);
  };

  // Effects
  useEffect(() => {
    memorySystem.loadFromStorage();
    scrollToBottom();

    // Initialize Spotify SDK
    spotifyService.init().catch(console.error);

    return () => {
      spotifyService.disconnect();
    };
  }, [memorySystem]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
  const updateProgress = () => {
    spotifyService.getPlayerState().then(state => {
      if (state) {
        setProgress((state.position / state.duration) * 100);
      }
    });
  };

  const progressInterval = setInterval(updateProgress, 1000);
  return () => clearInterval(progressInterval);
}, []);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <GlobalStyle />
      <Container>
        <Header>
          <span>FeelTune</span>
          <UserInfo>
            <DateTime>{currentTime}</DateTime>
            <span>@{currentUser}</span>
          </UserInfo>
        </Header>
        <Main>
          <ChatSection>
            <ChatMessages>
              {messages.map(message => (
                <MessageBubble 
                  key={message.id} 
                  $isUser={message.isUser}
                  style={{
                    opacity: chatState.transitionInProgress ? 0.7 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                >
                  {message.text}
                </MessageBubble>
              ))}
              {isThinking && (
                <ThinkingIndicator>
                  <ThinkingDot />
                  <ThinkingDot />
                  <ThinkingDot />
                </ThinkingIndicator>
              )}
              <div ref={messagesEndRef} />
            </ChatMessages>
            <ChatForm onSubmit={handleSubmit}>
              <ChatBox
                placeholder="Share your thoughts and feelings..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                disabled={isThinking}
              />
              <SendButtonWrapper>
                <SendButton
                  type="submit"
                  disabled={isThinking || !text.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </SendButton>
              </SendButtonWrapper>
            </ChatForm>
          </ChatSection>

          <EnhancedplayTrackerWrapper
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatePresence mode="wait">
              <MoodIndicator
                key={chatState.currentEmotion}
                $mood={chatState.currentEmotion}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {chatState.currentEmotion}
              </MoodIndicator>
            </AnimatePresence>

            <AlbumSection>
              <AlbumCover>
                <motion.img 
                  src={currentTrack?.albumCover || "https://i.scdn.co/image/ab67616d0000b2734d9fbc34e37872520b5b4d18"}
                  alt="album cover"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </AlbumCover>
              {/* <AudioVisualizer audioRef={audioRef} /> */}
            </AlbumSection>

            <TrackInfo>
              <TrackTitle>
                {currentTrack?.name || "No track playTracking"}
              </TrackTitle>
              <TrackArtist>
                {currentTrack?.artist || "Select a mood to start"}
              </TrackArtist>
            </TrackInfo>

            <ProgressBar 
              ref={progressRef}
              onClick={handleProgressClick}
              style={{ '--progress': `${progress}%` } as React.CSSProperties} 
            />

            <Controls>
              <ControlButton 
                onClick={handlePrevious}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6L9 12L19 18V6Z" />
                  <rect x="5" y="6" width="2" height="12" />
                </svg>
              </ControlButton>

              <ControlButton 
                onClick={handleplayTrackPause}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isplayTracking ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5V19L19 12L8 5Z" />
                  </svg>
                )}
              </ControlButton>

              <ControlButton 
                onClick={handleNext}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 18L15 12L5 6V18Z" />
                  <rect x="17" y="6" width="2" height="12" />
                </svg>
              </ControlButton>
            </Controls>
          </EnhancedplayTrackerWrapper>
        </Main>
      </Container>
    </>
  );
};

export default FeelTunePartnerUI;