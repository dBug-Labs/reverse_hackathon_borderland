import { AdminShell } from '@/components/portal/AdminShell';

// Every page inside (panel) is behind the admin session (see src/proxy.ts).
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
