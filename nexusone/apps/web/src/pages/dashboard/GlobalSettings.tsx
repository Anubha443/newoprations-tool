import React from 'react';
import { Button, Card, Input, Select, Tabs } from '@nexusone/shared-ui';

export default function GlobalSettings(){
  return <Tabs tabs={[
    {value:'org',label:'Organization',content:<Card><div className='grid gap-2 md:grid-cols-2'><Input placeholder='Organization name' /><Input placeholder='Logo URL' /><Input placeholder='Timezone' /><Select value='pro' onValueChange={()=>{}} items={[{value:'starter',label:'Starter'},{value:'pro',label:'Pro'}]} /></div><Button className='mt-3'>Save</Button></Card>},
    {value:'users',label:'Users',content:<Card><Input placeholder='Invite by email' /><div className='mt-2'>Roles + module access toggles</div><Button className='mt-3'>Invite</Button></Card>},
    {value:'int',label:'Integrations',content:<Card><Input placeholder='API key' /><Input placeholder='Webhook URL' /><Input placeholder='SMTP host' /></Card>},
    {value:'app',label:'Appearance',content:<Card><p>Dark mode default</p><Button variant='ghost'>Toggle light mode</Button></Card>},
  ]} />
}
