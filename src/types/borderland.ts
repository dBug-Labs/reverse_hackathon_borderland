export type Suit = 'spades' | 'diamonds' | 'clubs' | 'hearts';

export interface GameInfo {
  id: Suit;
  suitSymbol: string;
  suitName: string;
  gameName: string;
  skill: string;
  timeSlot: string;
  duration: string;
  objective: string;
  whyItExists: string;
  scoring: string[];
  difficulty: string;
  color: string;
  accentBg: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
  format?: string;
  duration?: string;
  description: string;
  bulletPoints?: string[];
  suit?: Suit;
  badge?: string;
}

export interface PlayerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  courseYear: string;
  githubLinkedIn: string;
  role: 'Captain' | 'Specialist' | 'Strategist' | 'Investigator';
}

export interface TeamRegistration {
  registrationId: string;
  teamName: string;
  captainName: string;
  teamSize: number;
  players: PlayerData[];
  specialization: string;
  priorExperience: string;
  survivalThesis: string;
  initialVisaPoints: number;
  registeredAt: string;
  status: 'CONFIRMED' | 'VERIFIED' | 'STANDBY';
}

export interface LeaderboardEntry {
  rank: number;
  team: string;
  spades: number | string;
  diamonds: number | string;
  clubs: number | string;
  hearts: number | string;
  visa: number;
  total: number;
  status: 'ACTIVE' | 'HIGH RISK CHOSEN' | 'WARNING';
}
