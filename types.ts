export interface User {
  name: string;
  passwordHash: string; // Storing password hash instead of plain text
}

export interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export interface FinalSummary {
  mood: string;
  message: string;
}

export interface Conversation {
  id: string; // Unique ID for each conversation
  timestamp: number;
  messages: Message[];
  summary: FinalSummary;
}

export type MoodMeterQuadrant = 'YELLOW' | 'RED' | 'BLUE' | 'GREEN';

export interface StudentMood {
    name: string;
    mood: string;
    quadrant: MoodMeterQuadrant;
    timestamp: number;
}
