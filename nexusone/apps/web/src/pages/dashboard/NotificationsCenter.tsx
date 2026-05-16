import React, { useState } from 'react';
import { Button, Card } from '@nexusone/shared-ui';

export default function NotificationsCenter(){
  const [items,setItems]=useState([
    '@mention in #product', 'Leave approval request', 'Deal assigned to you', 'Recruitment stage changed', 'AI digest scheduled for 9:00 AM'
  ]);
  return <Card><div className='flex items-center justify-between'><h3 className='font-semibold'>Notifications</h3><Button variant='ghost' onClick={()=>setItems([])}>Mark all read</Button></div><ul className='mt-2 text-sm'>{items.map((i)=><li key={i} className='py-1'>{i}</li>)}</ul></Card>;
}
