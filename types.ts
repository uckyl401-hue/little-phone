
export interface Message {
  id: string;
  sender: 'me' | 'partner';
  text: string;
  image?: string; // Base64 string
  audioUrl?: string; // Blob URL for voice strips
  audioDuration?: number; // Duration in seconds
  file?: { name: string; content: string; type: string }; 
  location?: { address: string; lat: number; lng: number };
  redEnvelope?: { amount: string; status: 'sent' | 'received' };
  music?: { 
    id: string;
    title: string; 
    artist: string; 
    coverUrl: string; 
    audioUrl: string;
    lyrics?: string;
  };
  timestamp: Date;
  readStatus?: 'sent' | 'read';
}

export interface UserSettings {
  partnerName: string;
  userName: string; 
  partnerAvatar: string; // Current active avatar
  partnerAvatarList: string[]; // List of available avatars
  userAvatar: string;
  backgroundImage: string; 
  
  // Basic Character Info
  partnerAge: string;
  partnerMBTI: string;
  partnerOccupation: string;

  // Appearance
  fontFamily: 'sans' | 'serif' | 'mono';
  fontSize: 'small' | 'medium' | 'large';

  // Language
  language: 'Chinese' | 'English' | 'Japanese' | 'Korean';

  // Model Config
  modelId: string;
  maxTokens: number;
  systemInstruction: string;
  replyLength: 'short' | 'medium' | 'long'; // short=sentences, medium=paragraph, long=paragraphs
  
  // API Keys
  geminiKey: string;
  deepSeekKey: string;
  claudeKey: string;
  siliconFlowKey: string;
  
  // Stickers
  stickerPack: string[]; 
  stickerFrequency: number; 
}

export enum SendingStatus {
  Idle,
  Sending,
  Typing,
}
