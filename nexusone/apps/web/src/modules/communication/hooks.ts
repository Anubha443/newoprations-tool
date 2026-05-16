import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Channel, Message, Topic } from './types';

const j = (r: Response) => r.json();
export const useChannels = () => useQuery<Channel[]>({ queryKey: ['comm-channels'], queryFn: () => fetch('/comm/channels').then(j), initialData: [] });
export const useTopics = (channelId?: number) => useQuery<Topic[]>({ queryKey: ['comm-topics', channelId], queryFn: () => fetch(`/comm/channels/${channelId}/messages?limit=1`).then(() => []), enabled: !!channelId, initialData: [] });
export const useMessages = (channelId?: number, topic?: string) => useQuery<Message[]>({ queryKey: ['comm-messages', channelId, topic], queryFn: () => fetch(`/comm/channels/${channelId}/messages?topic=${encodeURIComponent(topic || '')}&limit=50`).then(j), enabled: !!channelId && !!topic, initialData: [] });

export function useCommSocket(onMessage: (payload: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    let alive = true;
    let retry = 500;
    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/ws/comm`);
      wsRef.current = ws;
      ws.onopen = () => { retry = 500; ws.send(JSON.stringify({ event: 'heartbeat' })); };
      ws.onmessage = (evt) => { try { onMessage(JSON.parse(evt.data)); } catch {} };
      ws.onclose = () => alive && setTimeout(connect, Math.min(retry *= 2, 8000));
    };
    connect();
    return () => { alive = false; wsRef.current?.close(); };
  }, [onMessage]);
  return wsRef;
}

export function optimisticAddMessage(queryClient: ReturnType<typeof useQueryClient>, key: any[], msg: Message) {
  queryClient.setQueryData<Message[]>(key, (old = []) => [...old, msg]);
}
