import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, Input } from '@nexusone/shared-ui';
import { useAIStore } from './store';

const prompts=['Summarize my day','Show open deals',"Who's on leave today",'Draft follow-up email for [deal]'];

export default function AIAssistantPanel(){
  const s=useAIStore(); const [streaming,setStreaming]=useState('');
  useEffect(()=>s.load(),[]);
  const send=useMutation({mutationFn: async (text:string)=>{
    s.add({role:'user',content:text,ts:Date.now()});
    const r=await fetch('/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,context_type:s.moduleContext,context_data:{route:location.pathname}})});
    const reader=r.body?.getReader(); const dec=new TextDecoder(); let all='';
    while(reader){const {done,value}=await reader.read(); if(done)break; const chunk=dec.decode(value); all+=chunk; setStreaming(all);} 
    s.add({role:'assistant',content:all.replace(/data:\s?/g,''),ts:Date.now(),action:{label:'Confirm action',payload:{}}}); setStreaming('');
  }});
  const typing = useMemo(()=>streaming?streaming+'▌':'', [streaming]);
  return <>
    <button className='fixed bottom-6 right-6 z-30 rounded-full bg-indigo-500 px-4 py-3 text-white' onClick={()=>s.setOpen(true)}>AI</button>
    <AnimatePresence>{s.open&&<motion.aside initial={{x:420}} animate={{x:0}} exit={{x:420}} className='fixed right-0 top-0 z-40 h-full w-[420px] border-l border-slate-700 bg-slate-900 p-4'>
      <div className='mb-3 flex items-center justify-between'><h3 className='font-semibold'>AI Assistant</h3><div className='flex gap-2'><Button variant='ghost' onClick={()=>s.clear()}>Clear</Button><Button variant='ghost' onClick={()=>s.setOpen(false)}>Close</Button></div></div>
      <div className='mb-2 flex flex-wrap gap-2'>{prompts.map(p=><button key={p} className='rounded bg-slate-800 px-2 py-1 text-xs' onClick={()=>send.mutate(p)}>{p}</button>)}</div>
      <div className='h-[68vh] space-y-2 overflow-auto'>{s.messages.map((m,i)=><Card key={i} className={m.role==='user'?'bg-indigo-500/20':''}><div className='whitespace-pre-wrap text-sm'>{m.content}</div>{m.action&&<Button className='mt-2'>{m.action.label}</Button>}</Card>)}{typing&&<Card><div className='whitespace-pre-wrap text-sm'>{typing}</div></Card>}</div>
      <div className='mt-3 flex gap-2'><Input value={s.input} onChange={(e:any)=>s.setInput(e.target.value)} placeholder='Ask anything…' /><Button onClick={()=>{send.mutate(s.input);s.setInput('');}}>Send</Button></div>
    </motion.aside>}</AnimatePresence>
  </>;
}
