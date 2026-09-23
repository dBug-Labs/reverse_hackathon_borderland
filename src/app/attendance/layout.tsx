import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Check-in Terminal', template: '%s · Borderland Check-in' },
  robots: { index: false, follow: false },
};

export default function AttendanceRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
