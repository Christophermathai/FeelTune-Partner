// services/spotify.ts
'use client';

/**
 * SpotifyService: Singleton for Spotify PKCE OAuth and Web Playback SDK control.
 * Fully SSR-safe, reads client ID and redirect URI from env (with HTTP localhost fallback).
 */

export interface SpotifyTrack {
  uri: string;
  name: string;
  artist: string;
  duration: number;
  albumCover: string;
  mood?: string;
}

interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}

interface SpotifyPlayerState {
  device_id: string | null;
  paused?: boolean;
  position?: number;
  duration?: number;
  track_window?: {
    current_track?: {
      uri: string;
      name: string;
      artists: Array<{ name: string }>;
      album: { images: Array<{ url: string }> };
      duration_ms: number;
    };
  };
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(
    event: 'ready' | 'not_ready' | 'player_state_changed',
    callback: (state: SpotifyPlayerState) => void
  ): void;
  getCurrentState(): Promise<SpotifyPlayerState | null>;
  setVolume(volume: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(position_ms: number): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
}

interface SpotifySDK {
  Player: new (opts: SpotifyPlayerOptions) => SpotifyPlayer;
}

declare global {
  interface Window {
    Spotify?: SpotifySDK;
  }
}

interface SpotifyCredentials {
  clientId: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  deviceId: string | null;
}

interface PlayerCallbacks {
  onReady?: (deviceId: string) => void;
  onNotReady?: () => void;
  onPlaybackStateChanged?: (state: SpotifyPlayerState) => void;
  onError?: (error: Error) => void;
}

interface QueueItem { uri: string; mood?: string; }

interface SpotifyAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface SpotifyRecommendation {
  uri: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
  duration_ms: number;
}

interface SpotifyPlaybackState {
  is_playing: boolean;
  progress_ms: number;
  item: {
    uri: string;
    duration_ms: number;
    name: string;
    artists: Array<{ name: string }>;
    album: { images: Array<{ url: string }> };
  };
}

interface EmotionFeatures { valence: number; energy: number; }

export class SpotifyService {
  private static instance: SpotifyService | null = null;
  private player: SpotifyPlayer | null = null;
  private playerReady = false;
  private credentials: SpotifyCredentials = {
    clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '',
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    deviceId: null,
  };
  private callbacks: PlayerCallbacks = {};
  private queue: QueueItem[] = [];
  private currentTrackIndex = -1;
  private autoplay = false;
  private readonly EMOTION_TO_FEATURES: Record<string, EmotionFeatures> = {
    happy: { valence: 0.8, energy: 0.7 },
    sad: { valence: 0.2, energy: 0.3 },
    energetic: { valence: 0.6, energy: 0.9 },
    calm: { valence: 0.5, energy: 0.2 },
    angry: { valence: 0.3, energy: 0.8 },
    neutral: { valence: 0.5, energy: 0.5 },
  };

  private constructor() {
    if (typeof window !== 'undefined') this.loadCredentialsFromStorage();
  }

  public static getInstance(): SpotifyService {
    if (!SpotifyService.instance) SpotifyService.instance = new SpotifyService();
    return SpotifyService.instance;
  }

  private loadCredentialsFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('spotify_credentials');
      if (stored) this.credentials = { ...this.credentials, ...JSON.parse(stored) };
    } catch {
      // ignore
    }
  }

  private saveCredentialsToStorage(): void {
    if (typeof window === 'undefined') return;
    const { accessToken, refreshToken, expiresAt, deviceId } = this.credentials;
    try {
      localStorage.setItem(
        'spotify_credentials',
        JSON.stringify({ accessToken, refreshToken, expiresAt, deviceId })
      );
    } catch {
      // ignore
    }
  }

  private generateCodeVerifier(): string {
    if (typeof window === 'undefined' || !window.crypto) throw new Error('Crypto unavailable');
    const arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr)).replace(/=/g, '');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  public registerCallbacks(cb: PlayerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...cb };
  }

  public async authenticate(): Promise<void> {
    if (typeof window === 'undefined') return;
    const verifier = this.generateCodeVerifier();
    const challenge = await this.generateCodeChallenge(verifier);
    localStorage.setItem('code_verifier', verifier);
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback/spotify';
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope:
        'streaming user-read-playback-state user-modify-playback-state user-read-currently-playing app-remote-control',
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  }

  public async handleCallback(code: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const verifier = localStorage.getItem('code_verifier');
    if (!verifier) throw new Error('Missing code verifier');
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback/spotify';
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.credentials.clientId,
        code_verifier: verifier,
      }),
    });
    const data: SpotifyAuthResponse = await res.json();
    this.credentials.accessToken = data.access_token;
    this.credentials.refreshToken = data.refresh_token || null;
    this.credentials.expiresAt = Date.now() + data.expires_in * 1000;
    this.saveCredentialsToStorage();
    localStorage.removeItem('code_verifier');
  }

  private async refreshAccessToken(): Promise<void> {
    const rt = this.credentials.refreshToken;
    if (!rt) throw new Error('Missing refresh token');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: rt,
        client_id: this.credentials.clientId,
      }),
    });
    const data: SpotifyAuthResponse = await res.json();
    this.credentials.accessToken = data.access_token;
    this.credentials.expiresAt = Date.now() + data.expires_in * 1000;
    if (data.refresh_token) this.credentials.refreshToken = data.refresh_token;
    this.saveCredentialsToStorage();
  }

  private async ensureValidToken(): Promise<string> {
    const { accessToken, expiresAt } = this.credentials;
    if (!accessToken || !expiresAt) throw new Error('Not authenticated');
    if (Date.now() >= expiresAt - 60000) await this.refreshAccessToken();
    return this.credentials.accessToken!;
  }

  public async init(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.credentials.accessToken) return this.authenticate();
    if (!window.Spotify) await this.loadSpotifySDK();
    await this.initializePlayer();
  }

  private loadSpotifySDK(): Promise<void> {
    return new Promise((res, rej) => {
      if (typeof document === 'undefined') return rej();
      const s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error('SDK load fail'));
      document.body.appendChild(s);
    });
  }

  private async initializePlayer(): Promise<void> {
    const token = await this.ensureValidToken();
    this.player = new window.Spotify!.Player({
      name: 'FeelTune',
      getOAuthToken: cb => cb(token),
      volume: 0.5,
    });
    this.player.addListener('ready', st => {
      this.credentials.deviceId = st.device_id!;
      this.playerReady = true;
      this.saveCredentialsToStorage();
      this.callbacks.onReady?.(st.device_id!);
    });
    this.player.addListener('not_ready', () => {
      this.playerReady = false;
      this.credentials.deviceId = null;
      this.callbacks.onNotReady?.();
    });
    this.player.addListener('player_state_changed', st => this.callbacks.onPlaybackStateChanged?.(st));
    await this.player.connect();
  }

  public async getRecommendations(emotion: string): Promise<SpotifyTrack[]> {
    const token = await this.ensureValidToken();
    const f = this.EMOTION_TO_FEATURES[emotion] || this.EMOTION_TO_FEATURES.neutral;
    const params = new URLSearchParams({
      limit: '5',
      target_valence: f.valence.toString(),
      target_energy: f.energy.toString(),
      min_popularity: '50',
    });
    const res = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Fetch recs failed');
    const { tracks } = await res.json();
    return tracks.map((t: SpotifyRecommendation) => ({
      uri: t.uri,
      name: t.name,
      artist: t.artists[0].name,
      duration: Math.round(t.duration_ms / 1000),
      albumCover: t.album.images[0]?.url || '',
      mood: emotion,
    }));
  }

  public async playTrack(uri: string): Promise<void> {
    const token = await this.ensureValidToken();
    if (!this.credentials.deviceId) throw new Error('No active device');
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.credentials.deviceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri] }),
    });
  }

  public async pause(): Promise<void> { if (!this.player) throw new Error('Init first'); await this.player.pause(); }
  public async resume(): Promise<void> { if (!this.player) throw new Error('Init first'); await this.player.resume(); }
  public async previous(): Promise<void> { if (!this.player) throw new Error('Init first'); await this.player.previousTrack(); }
  public async next(): Promise<void> { if (!this.player) throw new Error('Init first'); await this.player.nextTrack(); }
  public async seek(ms: number): Promise<void> { if (!this.player) throw new Error('Init first'); await this.player.seek(ms); }
  public async setVolume(percent: number): Promise<void> { if (!this.player) throw new Error('Init first'); await this.player.setVolume(Math.max(0, Math.min(1, percent/100))); }
  public async getPlayerState(): Promise<SpotifyPlayerState | null> { return this.player ? await this.player.getCurrentState() : null; }
  public async getPlaybackState(): Promise<SpotifyPlaybackState | null> {
    const token = await this.ensureValidToken();
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 204) return null;
    if (!res.ok) throw new Error('Playback fetch failed');
    return await res.json();
  }

  public disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.playerReady = false;
    }
  }

  public isAuthenticated(): boolean {
    const { accessToken, expiresAt } = this.credentials;
    return !!(accessToken && expiresAt && Date.now() < expiresAt);
  }
}

export default SpotifyService;
