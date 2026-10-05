/**
 * Attendance check-in sessions. Stored in `attendance[].day`:
 * 1 = Day 1 morning, 3 = Day 1 after lunch, 2 = Day 2 morning, 4 = Day 2 after lunch
 * (the 4 decides who is drawn into the final judging panels).
 * Client-safe (no server imports).
 */
export type AttendanceDay = 1 | 2 | 3 | 4;

/** Display order on the desk and in the report. */
export const SESSIONS: AttendanceDay[] = [1, 3, 2, 4];

export const isSession = (n: unknown): n is AttendanceDay => n === 1 || n === 2 || n === 3 || n === 4;

export const sessionLabel = (d: AttendanceDay): string => (d === 3 ? 'Day 1 · post-lunch' : d === 4 ? 'Day 2 · post-lunch' : `Day ${d}`);

/** Short label for tabs and chips. */
export const sessionShort = (d: AttendanceDay): string => (d === 3 ? 'D1 PM' : d === 4 ? 'D2 PM' : `Day ${d}`);
