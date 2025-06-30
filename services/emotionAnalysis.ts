export interface EmotionAnalysis {
  emotion: string;
  intensity: number;
  suggestion: string;
}

interface EmotionRule {
  keywords: string[];
  intensity: number;
  suggestions: string[];
}

export class EmotionAnalysisService {
  private static instance: EmotionAnalysisService | null = null;

  private emotionRules: Record<string, EmotionRule> = {
    happy: {
      keywords: ['happy', 'joy', 'excited', 'great', 'wonderful', 'delighted', 'pleased'],
      intensity: 0.8,
      suggestions: [
        "Let's keep this positive energy going with some upbeat tunes",
        "I'm glad you're feeling good! How about some happy music to match?",
        "That's wonderful to hear! Would you like to explore more uplifting songs?"
      ]
    },
    sad: {
      keywords: ['sad', 'down', 'depressed', 'unhappy', 'miserable', 'hurt', 'lost'],
      intensity: 0.3,
      suggestions: [
        "I understand you're feeling down. Would you like to hear something soothing?",
        "Let's find some music that might help lift your spirits",
        "Sometimes music can help process these emotions. Shall we try something gentle?"
      ]
    },
    angry: {
      keywords: ['angry', 'mad', 'frustrated', 'annoyed', 'furious', 'rage'],
      intensity: 0.9,
      suggestions: [
        "I hear your frustration. Would you like some music to help release that tension?",
        "Sometimes energetic music can help process anger. Want to try that?",
        "Let's find a rhythm that matches your energy and helps you express it"
      ]
    },
    calm: {
      keywords: ['calm', 'peaceful', 'relaxed', 'serene', 'quiet', 'tranquil'],
      intensity: 0.2,
      suggestions: [
        "That peaceful state is precious. Shall we maintain it with some gentle melodies?",
        "I can suggest some ambient music to maintain this calm atmosphere",
        "Would you like to explore some serene musical landscapes?"
      ]
    },
    energetic: {
      keywords: ['energetic', 'pumped', 'motivated', 'active', 'dynamic', 'ready'],
      intensity: 0.85,
      suggestions: [
        "Great energy! Let's find some music to match your enthusiasm",
        "I've got some high-energy tracks that might be perfect for this mood",
        "Would you like to explore some upbeat, energetic songs?"
      ]
    }
  };

  private constructor() {}

  public static getInstance(): EmotionAnalysisService {
    if (!EmotionAnalysisService.instance) {
      EmotionAnalysisService.instance = new EmotionAnalysisService();
    }
    return EmotionAnalysisService.instance;
  }

  public async analyzeEmotion(message: string): Promise<EmotionAnalysis> {
    const normalizedMessage = message.toLowerCase();
    let detectedEmotion = 'neutral';
    let maxMatches = 0;
    let intensity = 0.5;

    // Analyze each emotion's keywords
    for (const [emotion, rule] of Object.entries(this.emotionRules)) {
      const matches = rule.keywords.filter(keyword => 
        normalizedMessage.includes(keyword)
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        detectedEmotion = emotion;
        intensity = rule.intensity;
      }
    }

    // Get random suggestion for the detected emotion
    const suggestions = this.emotionRules[detectedEmotion]?.suggestions || [
      "Would you like to explore some music that matches your mood?",
      "I can suggest some tracks that might resonate with how you're feeling",
      "Let's find some music that complements your current state"
    ];

    return {
      emotion: detectedEmotion,
      intensity: intensity,
      suggestion: suggestions[Math.floor(Math.random() * suggestions.length)]
    };
  }

  // Advanced sentiment analysis with context awareness
  private analyzeContext(message: string): number {
    // Intensity modifiers
    const intensifiers = ['very', 'really', 'extremely', 'so', 'totally'];
    const diminishers = ['slightly', 'kind of', 'somewhat', 'a bit', 'little'];
    
    let contextualIntensity = 0;
    
    intensifiers.forEach(word => {
      if (message.toLowerCase().includes(word)) {
        contextualIntensity += 0.1;
      }
    });

    diminishers.forEach(word => {
      if (message.toLowerCase().includes(word)) {
        contextualIntensity -= 0.1;
      }
    });

    return contextualIntensity;
  }

  // Method to get suggested music features based on emotion
  public getMusicFeatures(emotion: string): { valence: number; energy: number } {
    const defaultFeatures = { valence: 0.5, energy: 0.5 };
    
    const featuresMap: Record<string, typeof defaultFeatures> = {
      happy: { valence: 0.8, energy: 0.7 },
      sad: { valence: 0.2, energy: 0.3 },
      angry: { valence: 0.4, energy: 0.8 },
      calm: { valence: 0.6, energy: 0.2 },
      energetic: { valence: 0.7, energy: 0.9 },
      neutral: defaultFeatures
    };

    return featuresMap[emotion] || defaultFeatures;
  }
}

// Export the analyzeEmotion function for direct use
export const analyzeEmotion = async (message: string): Promise<EmotionAnalysis> => {
  return EmotionAnalysisService.getInstance().analyzeEmotion(message);
};