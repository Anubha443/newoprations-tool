import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const cn = (...v: (string | false | undefined)[]) => v.filter(Boolean).join(' ');

export const theme = {
  primary: '#6366F1', secondary: '#8B5CF6', success: '#10B981', warning: '#F59E0B', error: '#EF4444', dark: '#0F172A', card: '#1E293B', border: '#334155'
};

export const Card = ({ children, className = '' }: any) => <div className={cn('rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100', className)}>{children}</div>;
export const Badge = ({ children }: any) => <span className='rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300'>{children}</span>;
export const Avatar = ({ src, name }: any) => <div className='h-9 w-9 overflow-hidden rounded-full bg-slate-600 text-center leading-9 text-xs'>{src ? <img src={src} alt={name} /> : name?.slice(0,2)}</div>;
export const Button = ({ children, className = '', variant = 'primary', ...props }: any) => <button className={cn('rounded-md px-3 py-2 text-sm transition hover:opacity-90', variant === 'primary' && 'bg-indigo-500 text-white', variant === 'secondary' && 'bg-violet-500 text-white', variant === 'ghost' && 'bg-slate-700 text-slate-100', className)} {...props}>{children}</button>;
export const Input = (props: any) => <input {...props} className={cn('w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500', props.className)} />;
export const Table = ({ headers, rows }: any) => <div className='overflow-auto rounded-md border border-slate-700'><table className='w-full text-sm'><thead className='bg-slate-800'><tr>{headers.map((h: string) => <th className='px-3 py-2 text-left' key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r: string[], i: number) => <tr key={i} className='border-t border-slate-700'>{r.map((c, j) => <td key={j} className='px-3 py-2'>{c}</td>)}</tr>)}</tbody></table></div>;
export const Skeleton = ({ className = '' }: any) => <div className={cn('animate-pulse rounded bg-slate-700/50', className)} />;
export const EmptyState = ({ title, description }: any) => <Card><h3 className='font-semibold'>{title}</h3><p className='text-slate-400'>{description}</p></Card>;

export function Select({ value, onValueChange, items }: any) { return <SelectPrimitive.Root value={value} onValueChange={onValueChange}><SelectPrimitive.Trigger className='w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-left text-slate-100'><SelectPrimitive.Value placeholder='Select' /></SelectPrimitive.Trigger><SelectPrimitive.Portal><SelectPrimitive.Content className='rounded-md border border-slate-700 bg-slate-800 p-1 text-slate-100'>{items.map((it: any) => <SelectPrimitive.Item key={it.value} value={it.value} className='cursor-pointer rounded px-2 py-1 hover:bg-slate-700'><SelectPrimitive.ItemText>{it.label}</SelectPrimitive.ItemText></SelectPrimitive.Item>)}</SelectPrimitive.Content></SelectPrimitive.Portal></SelectPrimitive.Root>; }

export function Modal({ title, trigger, children }: any) { return <Dialog.Root><Dialog.Trigger asChild>{trigger}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className='fixed inset-0 bg-black/50' /><Dialog.Content className='fixed left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100'><Dialog.Title>{title}</Dialog.Title>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>; }
export function Drawer({ title, trigger, children }: any) { return <Dialog.Root><Dialog.Trigger asChild>{trigger}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className='fixed inset-0 bg-black/50' /><Dialog.Content className='fixed right-0 top-0 h-full w-[90vw] max-w-md border-l border-slate-700 bg-slate-800 p-4 text-slate-100'><Dialog.Title>{title}</Dialog.Title>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>; }

export function Tabs({ tabs }: any) { return <TabsPrimitive.Root defaultValue={tabs[0]?.value}><TabsPrimitive.List className='mb-3 flex gap-2'>{tabs.map((t: any) => <TabsPrimitive.Trigger key={t.value} value={t.value} className='rounded-md bg-slate-700 px-3 py-1 text-sm data-[state=active]:bg-indigo-500'>{t.label}</TabsPrimitive.Trigger>)}</TabsPrimitive.List>{tabs.map((t: any) => <TabsPrimitive.Content key={t.value} value={t.value}>{t.content}</TabsPrimitive.Content>)}</TabsPrimitive.Root>; }
export function Tooltip({ content, children }: any) { return <TooltipPrimitive.Provider><TooltipPrimitive.Root><TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger><TooltipPrimitive.Portal><TooltipPrimitive.Content className='rounded bg-slate-950 px-2 py-1 text-xs text-white'>{content}</TooltipPrimitive.Content></TooltipPrimitive.Portal></TooltipPrimitive.Root></TooltipPrimitive.Provider>; }
export function Dropdown({ label, items }: any) { return <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button variant='ghost'>{label}</Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className='rounded-md border border-slate-700 bg-slate-800 p-1'>{items.map((i: any) => <DropdownMenu.Item key={i.label} className='cursor-pointer rounded px-2 py-1 text-slate-100 hover:bg-slate-700' onClick={i.onClick}>{i.label}</DropdownMenu.Item>)}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>; }
export function ToastHost() { const [toasts, setToasts] = useState<any[]>([]); (globalThis as any).nexusToast = (m: string) => setToasts((t) => [...t, { id: Date.now(), m }]); return <div className='fixed bottom-4 right-4 space-y-2'>{toasts.map((t) => <div key={t.id} className='rounded bg-slate-900 px-3 py-2 text-sm text-white'>{t.m}</div>)}</div>; }
