import React from 'react';
import { Badge, Card } from '@nexusone/shared-ui';

export function HrmDashboardWidget() {
  const stats = [
    ['Headcount', '124'],
    ['On-leave today', '9'],
    ['Open positions', '14'],
    ['Pending approvals', '6'],
  ];
  return <div className='grid gap-3 md:grid-cols-4'>{stats.map(([k,v]) => <Card key={k}><p className='text-xs text-slate-400'>{k}</p><p className='mt-1 text-2xl font-semibold'>{v}</p>{k==='Pending approvals' && <Badge>action needed</Badge>}</Card>)}</div>;
}
