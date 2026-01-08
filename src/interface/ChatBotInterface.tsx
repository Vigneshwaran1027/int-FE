// Update ChatMessage interface to handle point-based content
export interface ChatPoint {
  chunkIds: string[];
  point: string;
}

export interface ChatMessage {
  chatId: string | "";
  role: 'bot' | 'user';
  content: string | ChatPoint[]; // Changed from any to union type
  contentType: 'txt' | 'btn' | 'error';
  options?: Array<{options: string}>;
}

export interface ChatHistory {
  chatConversation: ChatMessage[];
  conversationId: number;
  email: string;
  userName: string;
  caseId: string;
  userId?:string;
}

export interface feedBackMessage {
  chatId: string | "";
  role: 'bot' | 'user';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  contentType: 'txt' | 'btn' | 'error';
  options : ButtonOptions[]
}
 
 
export interface ButtonOptions {
 
  options: string
}
 