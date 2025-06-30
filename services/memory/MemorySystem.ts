interface EmotionalState {
  emotion: string;
  intensity: number;
  timestamp: string;
}

interface MusicPreference {
  genre: string;
  artist: string;
  track: string;
  mood: string;
  timestamp: string;
  rating: number;
}

interface ConversationMemory {
  topic: string;
  sentiment: string;
  timestamp: string;
  resolution: 'positive' | 'negative' | 'neutral';
  musicPlayed: string[];
}

export class MemorySystem {
  private static instance: MemorySystem;
  private emotionalHistory: EmotionalState[] = [];
  private musicPreferences: MusicPreference[] = [];
  private conversationHistory: ConversationMemory[] = [];
  private readonly MAX_HISTORY = 150;

  private constructor() {}

  static getInstance(): MemorySystem {
    if (!MemorySystem.instance) {
      MemorySystem.instance = new MemorySystem();
    }
    return MemorySystem.instance;
  }

  addEmotionalState(state: EmotionalState) {
    this.emotionalHistory.unshift(state);
    if (this.emotionalHistory.length > this.MAX_HISTORY) {
      this.emotionalHistory.pop();
    }
    this.persistToStorage();
  }

  addMusicPreference(preference: MusicPreference) {
    this.musicPreferences.unshift(preference);
    if (this.musicPreferences.length > this.MAX_HISTORY) {
      this.musicPreferences.pop();
    }
    this.persistToStorage();
  }

  addConversationMemory(memory: ConversationMemory) {
    this.conversationHistory.unshift(memory);
    if (this.conversationHistory.length > this.MAX_HISTORY) {
      this.conversationHistory.pop();
    }
    this.persistToStorage();
  }

  getEmotionalTrend(timeframe: number = 7): EmotionalState[] {
    const now = new Date();
    return this.emotionalHistory.filter(state => {
      const stateDate = new Date(state.timestamp);
      const diffDays = (now.getTime() - stateDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= timeframe;
    });
  }

  getMusicRecommendations(currentMood: string): string[] {
    return this.musicPreferences
      .filter(pref => pref.mood === currentMood)
      .sort((a, b) => b.rating - a.rating)
      .map(pref => pref.track);
  }

  private persistToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('emotionalHistory', JSON.stringify(this.emotionalHistory));
      localStorage.setItem('musicPreferences', JSON.stringify(this.musicPreferences));
      localStorage.setItem('conversationHistory', JSON.stringify(this.conversationHistory));
    }
  }

  loadFromStorage() {
    if (typeof window !== 'undefined') {
      const emotionalHistory = localStorage.getItem('emotionalHistory');
      const musicPreferences = localStorage.getItem('musicPreferences');
      const conversationHistory = localStorage.getItem('conversationHistory');

      if (emotionalHistory) this.emotionalHistory = JSON.parse(emotionalHistory);
      if (musicPreferences) this.musicPreferences = JSON.parse(musicPreferences);
      if (conversationHistory) this.conversationHistory = JSON.parse(conversationHistory);
    }
  }
}