import React from 'react';
import { CONTACT_EMAIL } from './contacts';

export const PartnersSection: React.FC = () => {
  return (
    <section className="py-16 sm:py-20 bg-[#08080a] border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.3em] text-[var(--card-red)]">
          Organised by
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-[#0e0e11] p-5 sm:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/dbuglabs-logo.png" alt="" className="w-12 h-12 shrink-0" />
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/dbuglabs-wordmark.png" alt="dBug Labs" className="h-7 w-auto" />
              <div className="text-sm text-neutral-400">Organising team and Game Masters</div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-[#0e0e11] p-5 sm:p-6">
            <div className="w-12 h-12 rounded-xl bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center font-poster text-lg shrink-0">
              SRM
            </div>
            <div>
              <div className="font-heading font-bold text-neutral-100 text-lg">SRM Institute of Science and Technology</div>
              <div className="text-sm text-neutral-400">Host campus · TP2 712</div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-neutral-500">
          Want to partner with us or join as a Game Master? Write to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-neutral-300 underline underline-offset-4 hover:text-white">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </section>
  );
};
