import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Code review', robots: { index: false, follow: false } };

export default function CrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
