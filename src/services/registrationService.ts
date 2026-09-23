import crypto from 'crypto';
import connectToDatabase from '../lib/mongodb';
import { Registration, IRegistration, RegistrationStatus } from '../models/Registration';
import { TeamRegistrationInput, sanitizeEmail, sanitizeRegNo, sanitizePhone } from '../validators/registration';

// In-memory fallback for local dev when MongoDB is not connected
const localDevRegistrations = new Map<string, any>();

function generateTeamId(): string {
  const num = crypto.randomInt(100, 1000);
  return `DBG-${num}`;
}

export interface RegistrationResult {
  ok: boolean;
  registrationId?: string;
  teamName?: string;
  fee?: number;
  upiId?: string;
  payeeName?: string;
  status?: RegistrationStatus;
  message?: string;
  fields?: Record<string, string>;
}

export async function createRegistration(
  input: TeamRegistrationInput
): Promise<RegistrationResult> {
  const db = await connectToDatabase();

  const cleanedPlayers = input.players.map((p, idx) => ({
    name: p.name.trim(),
    email: sanitizeEmail(p.email),
    regNo: sanitizeRegNo(p.regNo),
    phone: idx === 0 ? sanitizePhone(p.phone || '') : p.phone ? sanitizePhone(p.phone) : '',
    year: p.year || '2',
    department: p.department?.trim() || 'CSE',
    college: p.college?.trim() || 'SRM Institute of Science and Technology',
  }));

  const leader = cleanedPlayers[0];
  const teamNameClean = input.teamName.trim();
  const teamNameLower = teamNameClean.toLowerCase();

  if (db) {
    // 1. Check duplicate team name
    const existingTeam = await Registration.findOne({ teamNameLower });
    if (existingTeam) {
      return {
        ok: false,
        message: 'That team name is already taken. Please choose another name.',
        fields: { teamName: 'That team name is taken' },
      };
    }

    // 2. Check duplicate leader phone
    const existingPhone = await Registration.findOne({ phone: leader.phone });
    if (existingPhone) {
      return {
        ok: false,
        message: 'This mobile number is already registered with another team.',
        fields: { 'players.0.phone': 'Mobile number already registered' },
      };
    }

    // 3. Check duplicate player emails & register numbers
    for (let i = 0; i < cleanedPlayers.length; i++) {
      const p = cleanedPlayers[i];
      const dupEmail = await Registration.findOne({ 'players.email': p.email });
      if (dupEmail) {
        return {
          ok: false,
          message: `Player ${i + 1} (${p.email}) is already registered in another team.`,
          fields: { [`players.${i}.email`]: 'Email already registered in another team' },
        };
      }

      const dupRegNo = await Registration.findOne({ 'players.regNo': p.regNo });
      if (dupRegNo) {
        return {
          ok: false,
          message: `Player ${i + 1} (${p.regNo}) is already registered in another team.`,
          fields: { [`players.${i}.regNo`]: 'Register number already registered in another team' },
        };
      }
    }

    // 4. Generate unique DBG-XXX ID and insert
    let attempts = 0;
    let registrationId = '';
    let saved: IRegistration | null = null;

    while (attempts < 20) {
      registrationId = generateTeamId();
      try {
        const doc = new Registration({
          registrationId,
          teamName: teamNameClean,
          teamNameLower,
          teamSize: input.teamSize,
          fullName: leader.name,
          email: leader.email,
          phone: leader.phone,
          college: leader.college,
          department: leader.department,
          year: leader.year,
          players: cleanedPlayers,
          consent: input.consent,
          status: 'PAYMENT_PENDING',
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hrs to complete payment
        });
        saved = await doc.save();
        break;
      } catch (err: any) {
        if (err.code === 11000 && err.keyPattern?.registrationId) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    if (!saved) {
      return { ok: false, message: 'Server busy generating Team ID. Please retry.' };
    }

    return {
      ok: true,
      registrationId: saved.registrationId,
      teamName: saved.teamName,
      fee: 300,
      upiId: 'dbuglabs@upi',
      payeeName: 'SRM DBUG Labs',
      status: saved.status,
    };
  }

  // --- LOCAL DEV IN-MEMORY FALLBACK ---
  for (const reg of localDevRegistrations.values()) {
    if (reg.teamNameLower === teamNameLower) {
      return {
        ok: false,
        message: 'That team name is already taken.',
        fields: { teamName: 'That team name is taken' },
      };
    }
    if (reg.phone === leader.phone) {
      return {
        ok: false,
        message: 'This mobile number is already registered with another team.',
        fields: { 'players.0.phone': 'Mobile number already registered' },
      };
    }
    for (let i = 0; i < cleanedPlayers.length; i++) {
      const p = cleanedPlayers[i];
      if (reg.players.some((rp: any) => rp.email === p.email)) {
        return {
          ok: false,
          message: `Player ${i + 1} (${p.email}) is already registered.`,
          fields: { [`players.${i}.email`]: 'Email already registered' },
        };
      }
      if (reg.players.some((rp: any) => rp.regNo === p.regNo)) {
        return {
          ok: false,
          message: `Player ${i + 1} (${p.regNo}) is already registered.`,
          fields: { [`players.${i}.regNo`]: 'Register number already registered' },
        };
      }
    }
  }

  const registrationId = generateTeamId();
  const mockReg = {
    registrationId,
    teamName: teamNameClean,
    teamNameLower,
    teamSize: input.teamSize,
    fullName: leader.name,
    email: leader.email,
    phone: leader.phone,
    players: cleanedPlayers,
    consent: input.consent,
    status: 'PAYMENT_PENDING' as RegistrationStatus,
    createdAt: new Date(),
  };

  localDevRegistrations.set(registrationId, mockReg);

  return {
    ok: true,
    registrationId,
    teamName: teamNameClean,
    fee: 300,
    upiId: 'dbuglabs@upi',
    payeeName: 'SRM DBUG Labs',
    status: 'PAYMENT_PENDING',
  };
}

export async function getRegistration(registrationId: string) {
  const db = await connectToDatabase();
  if (db) {
    return await Registration.findOne({ registrationId });
  }
  return localDevRegistrations.get(registrationId) || null;
}
