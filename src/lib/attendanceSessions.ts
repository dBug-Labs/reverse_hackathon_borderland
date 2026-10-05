/**
 * Attendance check-in sessions. Stored in `attendance[].day`:
 * 1 = Day 1 morning, 3 = Day 1 after lunch, 2 = Day 2.
 * Client-safe (no server imports).
 */
export type AttendanceDay = 1 | 2 | 3;

/** Display order on the desk and in the report. */
export const SESSIONS: AttendanceDay[] = [1, 3, 2];

export const isSession = (n: unknown): n is AttendanceDay => n === 1 || n === 2 || n === 3;

export const sessionLabel = (d: AttendanceDay): string => (d === 3 ? 'Day 1 · post-lunch' : `Day ${d}`);

/** Short label for tabs and chips. */
export const sessionShort = (d: AttendanceDay): string => (d === 3 ? 'D1 PM' : `Day ${d}`);
