import { create } from 'zustand';

export type Msg = { role:'user'|'assistant'; content:string; ts:number; action?:{label:string; payload:any} };
interface AIState { open:boolean; input:string; moduleContext:string; messages:Msg[]; setOpen:(v:boolean)=>void; setInput:(v:string)=>void; setModuleContext:(v:string)=>void; add:(m:Msg)=>void; clear:()=>void; load:()=>void; }
const KEY='nexus_ai_chat_v1';
export const useAIStore=create<AIState>((set,get)=>({ open:false,input:'',moduleContext:'general',messages:[], setOpen:(open)=>set({open}), setInput:(input)=>set({input}), setModuleContext:(moduleContext)=>set({moduleContext}), add:(m)=>{const messages=[...get().messages,m]; localStorage.setItem(KEY,JSON.stringify(messages)); set({messages});}, clear:()=>{localStorage.removeItem(KEY); set({messages:[]});}, load:()=>{try{set({messages:JSON.parse(localStorage.getItem(KEY)||'[]')});}catch{}} }));
