import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { create } from 'zustand';
import { motion } from 'framer-motion';
import './styles.css';
import { Avatar, Badge, Button, Card, Dropdown, EmptyState, Input, Modal, Select, Skeleton, Table, Tabs, ToastHost, Tooltip } from '@nexusone/shared-ui';
import AIAssistantPanel from './modules/ai/AIAssistantPanel';
import HomeDashboard from './pages/dashboard/HomeDashboard';
import GlobalSettings from './pages/dashboard/GlobalSettings';
import NotificationsCenter from './pages/dashboard/NotificationsCenter';
import CommunicationModule from './modules/communication/components';
import { EmployeesPage, EmployeeProfilePage, LeavePage, AttendancePage, PayrollPage, RecruitmentPage } from './modules/hrm/pages/HrmPages';
import { CrmDashboardPage, ContactsPage, CompaniesPage, PipelinePage, ActivitiesPage, GlobalSearchResults } from './modules/crm/pages/CrmPages';



const queryClient = new QueryClient();
const Page = (title: string, items: string[]) => () => <div className='space-y-4'><h1 className='text-2xl font-semibold'>{title}</h1><Card><div className='flex gap-2'>{items.map((i) => <Badge key={i}>{i}</Badge>)}</div></Card></div>;
const Dashboard = lazy(async () => ({ default: HomeDashboard }));
const Channels = lazy(async () => ({ default: CommunicationModule }));
const DirectMessages = lazy(async () => ({ default: Page('Direct Messages', ['Inbox']) }));
const Threads = lazy(async () => ({ default: Page('Threads', ['Recent']) }));
const Employees = lazy(async () => ({ default: EmployeesPage }));
const Recruitment = lazy(async () => ({ default: RecruitmentPage }));
const Attendance = lazy(async () => ({ default: AttendancePage }));
const Payroll = lazy(async () => ({ default: PayrollPage }));
const Leave = lazy(async () => ({ default: LeavePage }));
const Contacts = lazy(async () => ({ default: ContactsPage }));
const Companies = lazy(async () => ({ default: CompaniesPage }));
const Deals = lazy(async () => ({ default: CrmDashboardPage }));
const Pipeline = lazy(async () => ({ default: PipelinePage }));
const Activities = lazy(async () => ({ default: ActivitiesPage }));
const AIChat = lazy(async () => ({ default: Page('Chat with AI', ['Ask']) }));
const Automations = lazy(async () => ({ default: Page('Automations', ['Rules']) }));
const Insights = lazy(async () => ({ default: Page('Insights', ['KPIs']) }));
const OrgSettings = lazy(async () => ({ default: GlobalSettings }));
const Users = lazy(async () => ({ default: GlobalSettings }));
const Integrations = lazy(async () => ({ default: GlobalSettings }));
const Billing = lazy(async () => ({ default: GlobalSettings }));

const routes = [
  ['/','Dashboard',Dashboard], ['/comm/channels','Channels',Channels], ['/comm/dm','Direct Messages',DirectMessages], ['/comm/threads','Threads',Threads],
  ['/hrm/employees','Employees',Employees], ['/people/employees/:id','Employee Profile',EmployeeProfilePage], ['/hrm/recruitment','Recruitment',Recruitment], ['/hrm/attendance','Attendance',Attendance], ['/hrm/payroll','Payroll',Payroll], ['/hrm/leave','Leave',Leave],
  ['/customers/dashboard','CRM Dashboard',CrmDashboardPage], ['/customers/search','Global Search',GlobalSearchResults], ['/crm/contacts','Contacts',Contacts], ['/crm/companies','Companies',Companies], ['/crm/deals','Deals',Deals], ['/crm/pipeline','Pipeline',Pipeline], ['/crm/activities','Activities',Activities],
  ['/ai/chat','Chat with AI',AIChat], ['/ai/automations','Automations',Automations], ['/ai/insights','Insights',Insights], ['/settings/org','Org settings',OrgSettings], ['/settings/users','Users',Users], ['/settings/integrations','Integrations',Integrations], ['/settings/billing','Billing',Billing]
] as const;

const useUI = create<{collapsed:boolean; setCollapsed:(v:boolean)=>void}>((set)=>({collapsed:false,setCollapsed:(v)=>set({collapsed:v})}));

function Sidebar() { const { collapsed, setCollapsed } = useUI(); const width = collapsed ? 80 : 240; return <motion.aside animate={{ width }} className='hidden border-r border-slate-700 bg-slate-800/60 md:block overflow-hidden'><div className='p-3'><Button variant='ghost' onClick={()=>setCollapsed(!collapsed)}>{collapsed ? '»' : '«'}</Button></div><nav className='space-y-1 px-2 pb-4'>{routes.map(([to,label]) => <NavLink key={to} to={to} className={({isActive})=>`block rounded px-3 py-2 text-sm ${isActive ? 'bg-indigo-500 text-white':'text-slate-300 hover:bg-slate-700'}`}>{collapsed ? label.slice(0,1) : label}</NavLink>)}</nav></motion.aside>; }
function MobileBottomNav(){ return <nav className='fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 gap-1 border-t border-slate-700 bg-slate-900 p-2 md:hidden'>{[['/','Home'],['/comm/channels','Comm'],['/hrm/employees','People'],['/crm/contacts','CRM'],['/ai/chat','AI']].map(([to,l])=><NavLink key={to} to={to} className='rounded px-2 py-1 text-center text-xs text-slate-200'>{l}</NavLink>)}</nav>; }

function Topbar(){ const [sel,setSel]=React.useState('all'); return <header className='flex items-center gap-2 border-b border-slate-700 bg-slate-900 p-3'><Input placeholder='Global search across modules...' /><div className='w-40'><Select value={sel} onValueChange={setSel} items={[{value:'all',label:'All modules'},{value:'comm',label:'Comm'},{value:'hrm',label:'HRM'},{value:'crm',label:'CRM'}]} /></div><Tooltip content='Notifications'><Dropdown label='🔔' items={[{label:'Open Notifications',onClick:()=>{location.hash='#notifications';}}]} /></Tooltip><Button>AI Assistant</Button><Dropdown label='Menu' items={[{label:'Profile',onClick:()=>{}},{label:'Logout',onClick:()=>{}}]} /><Avatar name='Nexus User' /></header>; }

function DemoWidgets(){return <div className='grid gap-4 lg:grid-cols-2'><Card><h3 className='mb-2 font-semibold'>Design System</h3><div className='flex flex-wrap gap-2'><Button>Primary</Button><Button variant='secondary'>Secondary</Button><Badge>Success</Badge></div><div className='mt-3'><Tabs tabs={[{value:'table',label:'Table',content:<Table headers={['Name','Role']} rows={[['Ari','owner'],['Sam','employee']]} />},{value:'empty',label:'Empty',content:<EmptyState title='No data' description='Start by creating one item.' />}]} /></div></Card><Card><h3 className='mb-2 font-semibold'>Utilities</h3><div className='space-y-2'><Skeleton className='h-4 w-full' /><Skeleton className='h-4 w-4/5' /><Modal title='Quick action' trigger={<Button variant='ghost'>Open Modal</Button>}><p>Modal content</p></Modal><Drawer title='Drawer' trigger={<Button variant='ghost'>Open Drawer</Button>}><p>Drawer content</p></Drawer></div></Card></div>}

function App(){
  return <QueryClientProvider client={queryClient}><BrowserRouter><div className='dark min-h-screen bg-slate-900 text-slate-100'><div className='flex min-h-screen pb-16 md:pb-0'><Sidebar /><div className='flex-1'><Topbar /><main className='space-y-4 p-4'><DemoWidgets /><Suspense fallback={<Skeleton className='h-20 w-full' />}><Routes>{routes.map(([p,_l,C])=><Route key={p} path={p} element={<C />} />)}</Routes></Suspense></main></div></div><MobileBottomNav /><AIAssistantPanel /><div className='p-4'><NotificationsCenter /></div><ToastHost /></div></BrowserRouter></QueryClientProvider>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
