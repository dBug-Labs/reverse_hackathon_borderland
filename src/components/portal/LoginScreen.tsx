'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { ArrowLeft, Eye, EyeOff, Lock, User } from 'lucide-react';
import { playAccessGranted, playHudClick } from '@/utils/sound';
import { post, saveActorName, type Area } from './api';
import { Banner, Button, CityBackdrop, Field, Kicker, inputCls } from './ui';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const COPY: Record<Area, { kicker: string; title: string; sub: string; nameLabel: string; namePh: string; suit: string; cta: string; home: string }> = {
  admin: {
    kicker: 'GAME MASTER CONSOLE',
    title: 'Game Master Access',
    sub: 'Restricted area. Every action you take is logged under your name.',
    nameLabel: 'Your name',
    namePh: 'e.g. Shaurya',
    suit: '♦',
    cta: 'Enter console',
    home: '/admin',
  },
  attendance: {
    kicker: 'CHECK-IN TERMINAL',
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

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 self-start font-mono text-xs text-neutral-400 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4 text-red-500" />
          RETURN TO BASE
        </Link>

        <div className="mb-6 text-center">
          <Kicker>{c.kicker}</Kicker>
          <div className="mt-6 font-display text-6xl font-black leading-none text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]" aria-hidden>
            {c.suit}
          </div>
          <h1 className="glow-red mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">{c.title}</h1>
          <p className="mx-auto mt-2 max-w-sm font-mono text-xs leading-relaxed text-neutral-400">{c.sub}</p>
        </div>

        <form
          onSubmit={submit}
          className="hud-corner relative space-y-5 rounded-xl border-2 border-red-600/60 bg-[#0b0c12]/90 p-6 shadow-[0_0_60px_rgba(220,38,38,0.25)] backdrop-blur-md sm:p-7"
        >
          {error && <Banner onClose={() => setError(null)}>{error}</Banner>}
          {granted && <Banner tone="success">ACCESS GRANTED — loading…</Banner>}

          <Field label={c.nameLabel} htmlFor="login-name" hint="Shown in the audit log next to everything you do.">
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                id="login-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={c.namePh}
                className={`${inputCls()} pl-10`}
                maxLength={40}
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="login-pass">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                id="login-pass"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls(!!error && error === ERRORS.INVALID_PASSWORD)} pl-10 pr-11`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-neutral-500 hover:text-white"
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
            {busy ? 'VERIFYING…' : c.cta}
          </Button>
        </form>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-neutral-600">
          Borderland Protocol · SRM DBUG Labs
        </p>
      </div>
    </div>
  );
}
