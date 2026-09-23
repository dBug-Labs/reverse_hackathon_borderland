'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeCheck,
  ClipboardCheck,
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
import { GridBackdrop, Wordmark, cx } from './ui';

const NAV = [
  { href: '/admin', label: 'Verify payments', icon: BadgeCheck, suit: '♠' },
  { href: '/admin/registrations', label: 'All teams', icon: Users, suit: '♦' },
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
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 font-label text-[15px] font-semibold transition-colors',
              active ? 'bg-[var(--paper)] text-[var(--ink)] shadow-lg shadow-black/30' : 'text-neutral-400 hover:bg-[#141417] hover:text-white'
            )}
          >
            <Icon className={cx('h-4 w-4', active ? 'text-[var(--ink)]' : 'text-neutral-500 group-hover:text-neutral-200')} />
            <span className="flex-1">{label}</span>
            <span
              className={cx(
                'text-base leading-none',
                suit === '♥' || suit === '♦'
                  ? active
                    ? 'text-[var(--card-red)]'
                    : 'text-[var(--card-red)]/50'
                  : active
                  ? 'text-[var(--ink)]'
                  : 'text-neutral-700'
              )}
            >
              {suit}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto space-y-3 border-t border-neutral-800 pt-4">
      <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-[#0d0d10] px-3 py-3">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <div className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">Signed in</div>
          <div className="truncate font-label text-[15px] font-semibold text-white">{name || '—'}</div>
        </div>
      </div>
      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-800 px-3 py-2.5 font-label text-sm font-semibold text-neutral-400 transition-colors hover:border-[var(--card-red)]/70 hover:text-[#ff8a8a]"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );

  const brand = (
    <div>
      <Wordmark href="/admin" />
      <p className="mt-2 font-caps text-[11px] uppercase tracking-[0.3em] text-[var(--card-red)]">Game master console</p>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#08080a] text-[#ededed] selection:bg-red-600/30 selection:text-red-200">
      <GridBackdrop />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-8 border-r border-neutral-800/80 bg-[#08080a]/95 p-5 backdrop-blur-md lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-800/80 bg-[#08080a]/90 px-4 backdrop-blur-md lg:hidden">
        <Wordmark href="/admin" suffix="Admin" />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg border border-neutral-800 bg-[#141417] p-2 text-neutral-300"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="backdrop-in fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-72 max-w-[85vw] flex-col gap-8 border-r border-neutral-800 bg-[#08080a] p-5"
          >
            <div className="flex items-start justify-between">
              {brand}
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg border border-neutral-800 p-1.5 text-neutral-400">
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
