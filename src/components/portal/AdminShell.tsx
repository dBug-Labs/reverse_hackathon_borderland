'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  ScrollText,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { playHudClick } from '@/utils/sound';
import { clearActorName, post, readActorName } from './api';
import { GridBackdrop, cx } from './ui';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, suit: '♠' },
  { href: '/admin/registrations', label: 'Registrations', icon: Users, suit: '♦' },
  { href: '/admin/reconcile', label: 'Bank reconcile', icon: FileSpreadsheet, suit: '♦' },
  { href: '/admin/attendance-report', label: 'Attendance', icon: ClipboardCheck, suit: '♣' },
  { href: '/admin/emails', label: 'Email outbox', icon: Mail, suit: '♥' },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText, suit: '♥' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => setName(readActorName('admin')), []);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  async function logout() {
    playHudClick();
    await post('/api/admin/logout');
    clearActorName('admin');
    router.replace('/admin/login');
  }

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {NAV.map(({ href, label, icon: Icon, suit }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => playHudClick()}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'group flex items-center gap-3 rounded border px-3 py-2.5 font-mono text-xs uppercase tracking-wider transition-all',
              active
                ? 'border-red-600/70 bg-red-950/40 text-white shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                : 'border-transparent text-neutral-400 hover:border-neutral-800 hover:bg-neutral-900/60 hover:text-white'
            )}
          >
            <Icon className={cx('h-4 w-4', active ? 'text-red-400' : 'text-neutral-500 group-hover:text-red-400')} />
            <span className="flex-1">{label}</span>
            <span className={cx('font-display text-sm', active ? 'text-red-400' : 'text-neutral-700')}>{suit}</span>
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto space-y-3 border-t border-neutral-800 pt-4">
      <div className="flex items-center gap-3 rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Game Master</div>
          <div className="truncate font-mono text-sm text-white">{name || '—'}</div>
        </div>
      </div>
      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded border border-neutral-800 px-3 py-2 font-mono text-xs uppercase tracking-wider text-neutral-400 transition-colors hover:border-red-700 hover:text-red-300"
      >
        <LogOut className="h-3.5 w-3.5" /> Log out
      </button>
    </div>
  );

  const brand = (
    <Link href="/admin" className="block">
      <div className="font-display text-xl font-black uppercase tracking-tight text-white">
        Borderland<span className="text-red-500">.</span>
      </div>
      <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-red-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Game Master Console
      </div>
    </Link>
  );

  return (
    <div className="relative min-h-screen bg-[#08080a] text-[#ededed] selection:bg-red-600/30 selection:text-red-200">
      <GridBackdrop />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-8 border-r border-neutral-800 bg-[#0b0b10]/95 p-5 backdrop-blur-md lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-800 bg-[#0b0b10]/95 px-4 py-3 backdrop-blur-md lg:hidden">
        {brand}
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-300"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-72 max-w-[85vw] flex-col gap-8 border-r border-red-900/50 bg-[#0b0b10] p-5"
          >
            <div className="flex items-start justify-between">
              {brand}
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded border border-neutral-700 p-1.5 text-neutral-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <main className="relative z-10 px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
