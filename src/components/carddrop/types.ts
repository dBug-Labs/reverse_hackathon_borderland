/** Client-side shapes of the Card Drop APIs (dates arrive as ISO strings). */

export type Phase = 'CLOSED' | 'PREFS_OPEN' | 'DRAWN' | 'LOCKED';

export interface AssignmentDTO {
  teamId: string;
  teamName: string;
  pick: number;
  card: string;
  via: 0 | 1 | 2 | 3;
  title?: string;
  risk?: 'STANDARD' | 'HIGH';
  lockedAt?: string;
  movedBy?: string;
}

export interface AdminViewDTO {
  phase: Phase;
  seedHash?: string;
  seed?: string;
  cap: number;
  presentOnly?: boolean;
  openedAt?: string;
  drawnAt?: string;
  drawnBy?: string;
  lockedAt?: string;
  order: string[];
  assignments: AssignmentDTO[];
  teams: Array<{
    teamId: string;
    teamName: string;
    players: number;
    presentDay1: boolean;
    choices: string[];
    prefsBy?: string;
    prefsAt?: string;
  }>;
}

export interface TeamViewDTO {
  phase: Phase;
  seedHash?: string;
  choices: string[];
  assignment?: AssignmentDTO;
  rivals: Array<{ teamId: string; teamName: string }>;
}
