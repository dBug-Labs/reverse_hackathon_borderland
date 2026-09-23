'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { playHudClick } from '@/utils/sound';

/**
 * Page frame for the public registration flow (/register, /register/pay, /r):
 * poster header, faint city backdrop, and a consistent title block.
 */
export const RegisterShell: React.FC<{
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  width?: 'narrow' | 'wide' | 'xl';
  children: React.ReactNode;
}> = ({ eyebrow, title, subtitle, width = 'wide', children }) => (
  <div className="min-h-screen bg-[#08080a] text-[#ededed] relative overflow-x-clip">
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-[520px] bg-cover bg-top opacity-40"
      style={{ backgroundImage: "url('/images/inverted_city_bg.jpg')" }}
    />
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-[520px]"
      style={{ background: 'linear-gradient(to bottom, rgba(8,8,10,0.55), #08080a 95%)' }}
    />

    <header className={`relative mx-auto px-4 sm:px-6 h-16 flex items-center justify-between ${width === 'xl' ? 'max-w-6xl' : 'max-w-4xl'}`}>
      <Link href="/" className="flex items-center gap-2 font-poster uppercase text-2xl text-[#f5eee1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/dbuglabs-logo.png" alt="" className="w-7 h-7" />
        Hackback
      </Link>
      <Link
        href="/"
        onClick={() => playHudClick()}
        className="inline-flex items-center gap-1.5 text-sm font-label font-semibold text-neutral-300 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to site
      </Link>
    </header>

    <main className={`relative mx-auto px-4 sm:px-6 pt-8 pb-20 ${width === 'narrow' ? 'max-w-xl' : width === 'xl' ? 'max-w-6xl' : 'max-w-4xl'}`}>
      <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.3em] text-[var(--card-red)]">{eyebrow}</p>
      <h1 className="font-poster uppercase text-5xl sm:text-6xl text-[#f5eee1] leading-none mt-3">{title}</h1>
      {subtitle && <div className="mt-3 text-neutral-400 text-base sm:text-lg leading-relaxed max-w-2xl">{subtitle}</div>}
      <div className="mt-10">{children}</div>
    </main>
  </div>
);
