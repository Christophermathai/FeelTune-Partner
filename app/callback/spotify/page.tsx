'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SpotifyService } from '@/services/spotify';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #FF0F7B 0%, #F89B29 100%);
  color: white;
  gap: 16px;
`;

const LoadingMessage = styled.div`
  font-size: 24px;
  font-weight: 500;
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  font-size: 16px;
  max-width: 400px;
  text-align: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

export default function SpotifyCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setError('Authentication failed: ' + error);
        return;
      }

      if (!code || !state) {
        setError('Missing required parameters');
        return;
      }

      try {
        const spotifyService = SpotifyService.getInstance();
        const success = await spotifyService.handleAuthCallback(code, state);
        
        if (success) {
          router.push('/');
        } else {
          setError('Failed to authenticate with Spotify');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error(err);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <LoadingContainer>
      <LoadingMessage>
        {error ? 'Authentication Failed' : 'Connecting to Spotify...'}
      </LoadingMessage>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </LoadingContainer>
  );
}