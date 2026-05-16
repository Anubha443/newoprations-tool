export type ChannelType = 'public' | 'private' | 'dm';
export interface Channel { id: number; name: string; type: ChannelType; unread?: number; }
export interface Topic { id: number; name: string; message_count: number; last_preview?: string; }
export interface Message { id: number; sender_id: string; sender_name: string; avatar_url?: string; content: string; created_at: string; reactions?: Record<string, string[]>; mine?: boolean; }
export interface PresenceMap { [userId: string]: 'online' | 'away' | 'offline'; }
