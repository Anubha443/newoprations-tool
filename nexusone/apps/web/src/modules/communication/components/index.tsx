import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, Badge, Button, Card, Drawer, Input } from '@nexusone/shared-ui';
import { useChannels, useCommSocket, useMessages } from '../hooks';
import { useCommStore } from '../store';
import { Channel, Message } from '../types';

export const UserPresence = ({ status }: { status: 'online'|'away'|'offline' }) => <span className={`inline-block h-2.5 w-2.5 rounded-full ${status==='online'?'bg-emerald-400':status==='away'?'bg-amber-400':'bg-slate-500'}`} />;

export function ChannelSidebar() {
  const { data } = useChannels(); const { activeChannelId, setActiveChannel } = useCommStore(); const [q, setQ] = useState('');
  const grouped = useMemo(() => ['public','private','dm'].map((t) => [t, data.filter((c) => c.type===t && c.name.toLowerCase().includes(q.toLowerCase()))] as const), [data, q]);
  return <aside className='w-72 border-r border-slate-700 p-3'><Input placeholder='Search channels' value={q} onChange={(e:any)=>setQ(e.target.value)} />{grouped.map(([group,items]) => <div key={group} className='mt-4'><p className='mb-1 text-xs uppercase text-slate-400'>{group}</p>{items.map((c:Channel)=><button key={c.id} onClick={()=>setActiveChannel(c.id)} className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${activeChannelId===c.id?'bg-indigo-500/30':'hover:bg-slate-800'}`}>#{c.name}{!!c.unread && <Badge>{c.unread}</Badge>}</button>)}</div>)}</aside>;
}

export function TopicList({ topics, onPick }: { topics: string[]; onPick: (t: string)=>void }) { return <div className='border-r border-slate-700 p-3 w-64'><p className='mb-2 text-sm text-slate-300'>Topics</p>{topics.map((t)=><button key={t} onClick={()=>onPick(t)} className='mb-2 block w-full rounded bg-slate-800 p-2 text-left hover:bg-slate-700'><div className='font-medium'>{t}</div><div className='text-xs text-slate-400'>Last message preview...</div></button>)}</div>; }

export function MessageBubble({ m }: { m: Message }) { return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='group rounded-lg bg-slate-800 p-3'><div className='flex items-center gap-2'><Avatar name={m.sender_name} src={m.avatar_url} /><strong>{m.sender_name}</strong><span className='text-xs text-slate-400'>{new Date(m.created_at).toLocaleTimeString()}</span></div><div className='prose prose-invert mt-2 max-w-none text-sm whitespace-pre-wrap'>{m.content}</div><div className='mt-2 hidden gap-2 group-hover:flex'><Button variant='ghost'>😀</Button>{m.mine && <><Button variant='ghost'>Edit</Button><Button variant='ghost'>Delete</Button></>}<Button variant='ghost'>View thread</Button></div></motion.div>; }

export function MessageThread({ channelId, topic }: { channelId?: number; topic?: string }) {
  const { data } = useMessages(channelId, topic); const [typing, setTyping] = useState<string[]>([]);
  useCommSocket((payload) => { if (payload.event==='typing') setTyping((x)=>Array.from(new Set([...x, payload.user_id]))); });
  return <div className='flex-1 overflow-auto p-4 space-y-3'>{data.map((m)=> <MessageBubble key={m.id} m={m} />)}{typing.length>0 && <div className='text-xs text-slate-400'>{typing.join(', ')} typing…</div>}</div>;
}

export function MessageComposer({ topic }: { topic?: string }) {
  const key = `draft:${topic||'general'}`; const { drafts, setDraft } = useCommStore(); const text = drafts[key] || ''; const [files, setFiles] = useState<File[]>([]);
  const send = () => { if (!(window as any).nexusToast) return; (window as any).nexusToast('Message queued'); setDraft(key, ''); setFiles([]); };
  return <div className='border-t border-slate-700 p-3 space-y-2'><div className='flex gap-2 text-xs'><Button variant='ghost'>B</Button><Button variant='ghost'>I</Button><Button variant='ghost'>{'</>'}</Button><Button variant='ghost'>Link</Button><Button variant='ghost'>• List</Button><Button variant='ghost'>@ Mention</Button><Button variant='ghost'># Channel</Button><Button variant='ghost'>😊</Button></div><Input value={text} onChange={(e:any)=>setDraft(key,e.target.value)} onKeyDown={(e:any)=>e.ctrlKey&&e.key==='Enter'&&send()} placeholder='Write with markdown. Ctrl+Enter to send.' /><div onDrop={(e)=>{e.preventDefault(); setFiles([...files, ...Array.from(e.dataTransfer.files)]);}} onDragOver={(e)=>e.preventDefault()} className='rounded border border-dashed border-slate-600 p-2 text-xs text-slate-400'>Drop attachments here</div><div className='flex items-center justify-between'><span className='text-xs text-slate-400'>Topic: {topic || 'general'} · {files.length} file(s)</span><Button onClick={send}>Send</Button></div></div>;
}

export function ThreadSummarizer() { const [open,setOpen]=useState(false); const [summary,setSummary]=useState(''); const run=async()=>{setOpen(true); const r=await fetch('/ai/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action_type:'summarize_thread',payload:{messages:[]}})}); const j=await r.json(); setSummary(JSON.stringify(j.result||j));}; return <Drawer title='AI Summary' trigger={<Button variant='ghost' onClick={run}>Summarize topic</Button>}><p className='text-sm text-slate-200 whitespace-pre-wrap'>{summary||'No summary yet.'}</p></Drawer>; }
export function NotificationPanel() { const { notificationsOpen, setNotificationsOpen } = useCommStore(); return <AnimatePresence>{notificationsOpen && <motion.div initial={{x:320}} animate={{x:0}} exit={{x:320}} className='fixed right-0 top-0 z-30 h-full w-80 border-l border-slate-700 bg-slate-900 p-3'><div className='flex items-center justify-between'><h3 className='font-semibold'>Notifications</h3><Button variant='ghost' onClick={()=>setNotificationsOpen(false)}>Close</Button></div><Card className='mt-3'>@mentions and alerts will appear here.</Card></motion.div>}</AnimatePresence>; }
export const DMComposer = () => <Card><p className='text-sm'>Direct message composer</p><Input placeholder='Message user...' /></Card>;

export default function CommunicationModule() {
  const { activeChannelId, activeTopic, setActiveTopic, setNotificationsOpen } = useCommStore();
  return <div className='flex h-[calc(100vh-120px)] rounded-xl border border-slate-700'><ChannelSidebar /><TopicList topics={['general','product','hiring']} onPick={setActiveTopic} /><section className='flex flex-1 flex-col'><header className='flex items-center justify-between border-b border-slate-700 p-3'><div><h2 className='font-semibold'>Channel {activeChannelId || '-'}</h2><p className='text-xs text-slate-400'>Topic: {activeTopic || 'general'}</p></div><div className='flex gap-2'><ThreadSummarizer /><Button variant='ghost' onClick={()=>setNotificationsOpen(true)}>Notifications</Button></div></header><MessageThread channelId={activeChannelId} topic={activeTopic || 'general'} /><MessageComposer topic={activeTopic || 'general'} /></section><NotificationPanel /></div>;
}
