'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { ArrowLeft, Eye, EyeOff, Lock, User } from 'lucide-react';
import { playAccessGranted, playHudClick } from '@/utils/sound';
import { post, saveActorName, type Area } from './api';
import { Banner, Button, CityBackdrop, Field, Wordmark, inputCls } from './ui';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const COPY: Record<Area, { kicker: string; title: string; sub: string; nameLabel: string; namePh: string; suit: string; cta: string; home: string }> = {
  admin: {
    kicker: 'Game master console',
    title: 'Game Master Access',
    sub: 'Restricted area. Every action you take is logged under your name.',
    nameLabel: 'Your name',
    namePh: 'e.g. Shaurya',
    suit: '♦',
    cta: 'Enter console',
    home: '/admin',
  },
  attendance: {
    kicker: 'Check-in desk',
    title: 'Gate Keeper Access',
    sub: 'Scan Entry Visas and mark players present for Day 1 and Day 2.',
    nameLabel: 'Volunteer name',
    namePh: 'e.g. Riya',
    suit: '♣',
    cta: 'Open the gate',
    home: '/attendance',
  },
};

const ERRORS: Record<string, string> = {
  INVALID_PASSWORD: 'Incorrect password.',
  RATE_LIMITED: 'Too many attempts. Wait 15 minutes and try again.',
  CAPTCHA_FAILED: "Couldn't verify you're human — complete the check again.",
  VALIDATION_ERROR: 'Enter your name and the password.',
};

export function LoginScreen({ area }: { area: Area }) {
  const c = COPY[area];
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);
  const [next, setNext] = useState(c.home);
  const ts = useRef<TurnstileInstance | undefined>(undefined);

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get('next');
    if (n && n.startsWith(`/${area}`) && !n.startsWith(`/${area}/login`)) setNext(n);
  }, [area]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    playHudClick();
    setError(null);
    if (!name.trim() || !password) {
      setError(ERRORS.VALIDATION_ERROR);
      return;
    }
    setBusy(true);
    const res = await post<{ name: string }>(`/api/${area}/login`, {
      name: name.trim(),
      password,
      turnstileToken: token,
    });
    if (!res.ok) {
      setError(ERRORS[res.code] ?? res.message);
      setToken('');
      ts.current?.reset(); // tokens are single-use
      setBusy(false);
      return;
    }
    saveActorName(area, res.data?.name ?? name.trim());
    setGranted(true);
    playAccessGranted();
    setTimeout(() => router.replace(next), 700);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08080a] text-[#ededed] selection:bg-red-600/30">
      <CityBackdrop />

      <header className="relative z-10 mx-auto flex h-16 max-w-lg items-center justify-between px-4">
        <Wordmark />
        <Link
          href="/"
          onClick={() => playHudClick()}
          className="inline-flex items-center gap-1.5 font-label text-sm font-semibold text-neutral-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to site
        </Link>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col justify-center px-4 pb-12 pt-4">
        <div className="mb-8 flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="font-caps text-xs uppercase tracking-[0.3em] text-[var(--card-red)] sm:text-sm">{c.kicker}</p>
            <h1 className="mt-3 font-poster text-5xl uppercase leading-[0.95] text-[#f5eee1] sm:text-6xl">{c.title}</h1>
            <p className="mt-3 font-label text-[15px] leading-relaxed text-neutral-400">{c.sub}</p>
          </div>
          {/* A single playing card, as on the landing hero */}
          <div aria-hidden className="float-card hidden shrink-0 sm:block">
            <div className="paper-card w-20 rotate-6 rounded-xl p-1.5">
              <div className="flex aspect-[5/7] flex-col rounded-lg border border-[var(--card-red)]/45 p-1.5">
                <span className={`text-xs leading-none ${c.suit === '♦' ? 'text-[var(--card-red)]' : 'text-[var(--ink)]'}`}>{c.suit}</span>
                <span className={`flex flex-1 items-center justify-center text-3xl leading-none ${c.suit === '♦' ? 'text-[var(--card-red)]' : 'text-[var(--ink)]'}`}>
                  {c.suit}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="relative space-y-5 rounded-2xl border border-neutral-800 bg-[#0d0d10]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-sm sm:p-7">
          {error && <Banner onClose={() => setError(null)}>{error}</Banner>}
          {granted && <Banner tone="success">Signed in — opening…</Banner>}

          <Field label={c.nameLabel} htmlFor="login-name" hint="Shown in the audit log next to everything you do.">
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                id="login-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={c.namePh}
                className={`${inputCls()} pl-11`}
                maxLength={40}
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="login-pass">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                id="login-pass"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls(!!error && error === ERRORS.INVALID_PASSWORD)} pl-11 pr-11`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-neutral-500 hover:text-white"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <Turnstile
            ref={ts}
            siteKey={TURNSTILE_SITE_KEY}
            options={{ action: `${area}_login`, theme: 'dark', size: 'flexible' }}
            onSuccess={setToken}
            onExpire={() => setToken('')}
            onError={() => setToken('')}
          />

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} disabled={!token || granted}>
            {busy ? 'Checking…' : c.cta}
          </Button>
        </form>

        <p className="mt-6 text-center font-label text-sm text-neutral-600">Hackback · dBug Labs × SRM IST</p>
      </div>
    </div>
  );
}
