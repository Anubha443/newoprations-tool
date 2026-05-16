import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card } from '@nexusone/shared-ui';
import { useAIStore } from '../../modules/ai/store';

export default function HomeDashboard(){
  const {data}=useQuery({queryKey:['home-stats'],queryFn:async()=>({comm:{unread:18,active:7},people:{leave:4,pending:6,open:12},customers:{closing:5,due:9,pipeline:482000}})});
  const ai=useAIStore();
  const d=new Date().toLocaleDateString();
  return <div className='space-y-4'><Card><h1 className='text-2xl font-semibold'>Good day 👋</h1><p className='text-slate-400'>{d}</p></Card>
    <div className='grid gap-3 md:grid-cols-3'><Card><h3>COMMUNICATION</h3><p>Unread: {data?.comm.unread}</p><p>Active channels: {data?.comm.active}</p></Card><Card><h3>PEOPLE</h3><p>On leave: {data?.people.leave}</p><p>Pending approvals: {data?.people.pending}</p><p>Open positions: {data?.people.open}</p></Card><Card><h3>CUSTOMERS</h3><p>Closing this week: {data?.customers.closing}</p><p>Activities due: {data?.customers.due}</p><p>Pipeline: ${data?.customers.pipeline?.toLocaleString()}</p></Card></div>
    <Card><h3 className='mb-2 font-semibold'>AI Insights</h3><p>Your day at a glance: team workload is balanced; sales focus should remain on late-stage deals.</p><div className='mt-2 flex flex-wrap gap-2'><Badge>Sales pipeline dropped 20% this week</Badge><Badge>3 employees have attendance issues</Badge></div><div className='mt-3 flex gap-2'><Button variant='ghost' onClick={()=>{ai.setOpen(true);ai.setInput('Summarize my day')}}>Summarize my day</Button><Button variant='ghost' onClick={()=>{ai.setOpen(true);ai.setInput('Show open deals')}}>Show open deals</Button></div></Card>
  </div>
}
