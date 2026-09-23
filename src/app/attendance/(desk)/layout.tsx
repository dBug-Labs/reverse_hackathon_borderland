import { AttendanceShell } from '@/components/portal/AttendanceShell';

// Everything inside (desk) needs the attendance session (see src/proxy.ts).
export default function AttendanceDeskLayout({ children }: { children: React.ReactNode }) {
  return <AttendanceShell>{children}</AttendanceShell>;
}
