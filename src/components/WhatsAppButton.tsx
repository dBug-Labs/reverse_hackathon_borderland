import React from 'react';

export function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.72 4.31 3.81.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.22-.19-.47-.32z" />
    </svg>
  );
}

interface WhatsAppCommunityCardProps {
  href: string;
  className?: string;
}

export function WhatsAppCommunityCard({ href, className = '' }: WhatsAppCommunityCardProps) {
  if (!href) return null;
  return (
    <div className={`p-5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-center ${className}`}>
      <p className="font-label text-xs uppercase tracking-widest text-[#15803d] font-bold">
        Official Participant Community
      </p>
      <p className="mt-1.5 text-sm font-label text-[var(--ink)]/80 max-w-md mx-auto leading-relaxed">
        Join the WhatsApp community for round updates, game announcements, and organizer support.
      </p>
      <div className="mt-4">
        <WhatsAppCommunityButton href={href} className="w-full sm:w-auto" />
      </div>
    </div>
  );
}

interface WhatsAppCommunityButtonProps {
  href: string;
  className?: string;
  text?: string;
}

export function WhatsAppCommunityButton({
  href,
  className = '',
  text = 'Join WhatsApp Community',
}: WhatsAppCommunityButtonProps) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`px-6 py-3 rounded-md bg-[#25D366] hover:bg-[#20ba59] text-black font-label text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow active:scale-95 ${className}`}
    >
      <WhatsAppIcon className="w-4 h-4 fill-current shrink-0" />
      <span>{text}</span>
    </a>
  );
}
