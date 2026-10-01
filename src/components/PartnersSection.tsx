import React from 'react';
import { Briefcase, ExternalLink, Shield } from 'lucide-react';
import { CONTACT_EMAIL } from './contacts';

export const PartnersSection: React.FC = () => {
  return (
    <section id="partners" className="py-16 sm:py-20 bg-[#08080a] border-t border-neutral-900">
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

        {/* Sponsors & Opportunity Partners */}
        <div className="mt-14 pt-10 border-t border-neutral-900">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.3em] text-[var(--card-red)]">
              Event Sponsors &amp; Partners
            </p>
            <span className="text-xs font-label text-neutral-400">
              Industry &amp; Career Backers
            </span>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4 sm:gap-6">
            {/* 1. CyberThulir */}
            <a
              href="https://cyberthulir.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between rounded-2xl border border-neutral-800 bg-[#0e0e11] hover:border-cyan-500/50 hover:bg-[#12141a] p-6 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-cyan-950/30"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/10 transition-all duration-300" />
              <div className="relative">
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/cyberthulir-logo.png"
                    alt="CyberThulir"
                    className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.25)] group-hover:scale-105 transition-transform duration-300"
                  />
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-heading font-bold text-neutral-100 text-xl group-hover:text-cyan-300 transition-colors">
                        CyberThulir
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-label font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                        <Briefcase className="w-3 h-3" />
                        Internship Partner
                      </span>
                    </div>
                    <p className="text-sm text-neutral-300 mt-2 leading-relaxed">
                      India&apos;s gamified cybersecurity training platform. CyberThulir is offering exclusive internship opportunities and career exposure for standout participants and top teams.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative mt-5 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs font-label text-neutral-400 group-hover:text-cyan-300 transition-colors">
                <span className="font-semibold">cyberthulir.com</span>
                <span className="flex items-center gap-1 text-neutral-400 group-hover:text-cyan-300">
                  Visit platform <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            </a>

            {/* 2. HebeSec Technologies */}
            <a
              href="https://hebesec.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between rounded-2xl border border-neutral-800 bg-[#0e0e11] hover:border-amber-500/50 hover:bg-[#15130f] p-6 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-amber-950/30"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-all duration-300" />
              <div className="relative">
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/hebesec-mark.png"
                    alt="HebeSec Technologies"
                    className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 object-contain drop-shadow-[0_0_12px_rgba(234,179,8,0.25)] group-hover:scale-105 transition-transform duration-300"
                  />
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-heading font-bold text-neutral-100 text-xl group-hover:text-amber-300 transition-colors">
                        HebeSec
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-label font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60">
                        <Shield className="w-3 h-3" />
                        Cybersecurity Partner
                      </span>
                    </div>
                    <p className="text-sm text-neutral-300 mt-2 leading-relaxed">
                      Trusted cybersecurity and VAPT partner providing advanced penetration testing, cloud security assessments, digital forensics, and specialized security training.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative mt-5 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs font-label text-neutral-400 group-hover:text-amber-300 transition-colors">
                <span className="font-semibold">hebesec.com</span>
                <span className="flex items-center gap-1 text-neutral-400 group-hover:text-amber-300">
                  Visit services <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            </a>
          </div>
        </div>

        <p className="mt-8 text-sm text-neutral-500">
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
