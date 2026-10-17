import { SystemConfig, User, WorkAppointment, WorkParticipant } from '../types/models';
import { getAccountingYearStart, getCurrentSeason, getLegacySeason, resolveEntrySeason } from './seasons';

export { getAccountingYearStart } from './seasons';

export interface WorkHourEntry {
  appointmentId: string;
  title: string;
  description: string;
  boatId?: string;
  userId: string;
  participantStatus: WorkParticipant['status'];
  startTime: Date;
  endTime: Date;
  minutes: number;
  season: number;
  seasonManual: boolean;
  isPrivate: boolean;
}

export interface WorkHourSummary {
  completedMinutes: number;
  pendingMinutes: number;
  declinedMinutes: number;
  requiredMinutes: number;
  remainingMinutes: number;
  status: 'open' | 'planned' | 'done' | 'paused' | 'attention';
}

export interface UserWorkHoursSnapshot {
  user: User;
  season: number;
  entries: WorkHourEntry[];
  completedEntries: WorkHourEntry[];
  pendingEntries: WorkHourEntry[];
  declinedEntries: WorkHourEntry[];
  summary: WorkHourSummary;
}

export interface WorkHourCalculationResult {
  season: number;
  users: UserWorkHoursSnapshot[];
}

const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60 * 1000;

export function getNextAccountingYearStart(config: SystemConfig, accountingYearStart: Date): Date {
  return new Date(accountingYearStart.getFullYear() + 1, accountingYearStart.getMonth(), accountingYearStart.getDate(), 0, 0, 0, 0);
}

/** @deprecated Nur noch für Alt-Einträge relevant – siehe `getLegacySeason`. */
export function getAccountingYear(config: SystemConfig, referenceDate: Date): number {
  return getAccountingYearStart(config, referenceDate).getFullYear();
}

export function calculateDurationMinutes(startTime: Date, endTime: Date): number {
  if (!(startTime instanceof Date) || !(endTime instanceof Date)) {
    return 0;
  }

  const durationMs = endTime.getTime() - startTime.getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return 0;
  }

  return Math.round(durationMs / MS_PER_MINUTE);
}

export function resolveParticipantWindow(appointment: WorkAppointment, participant: WorkParticipant): { startTime: Date; endTime: Date } {
  return {
    startTime: participant.startTime ?? appointment.startTime,
    endTime: participant.endTime ?? appointment.endTime,
  };
}

export function classifyWorkEntry(entry: WorkHourEntry, now: Date): 'completed' | 'pending' | 'declined' {
  if (entry.participantStatus === 'declined') {
    return 'declined';
  }

  if (entry.participantStatus === 'confirmed' && entry.endTime.getTime() <= now.getTime()) {
    return 'completed';
  }

  return 'pending';
}

export function mapAppointmentToWorkEntries(
  appointment: WorkAppointment,
  config: SystemConfig,
  relevantUserIds?: Set<string>,
): WorkHourEntry[] {
  return appointment.participants
    .filter((participant) => !relevantUserIds || relevantUserIds.has(participant.userId))
    .map((participant) => {
      const { startTime, endTime } = resolveParticipantWindow(appointment, participant);
      const minutes = calculateDurationMinutes(startTime, endTime);
      const season = resolveEntrySeason(appointment, participant, config);

      return {
        appointmentId: appointment.id,
        title: appointment.title,
        description: appointment.description,
        boatId: appointment.boatId,
        userId: participant.userId,
        participantStatus: participant.status,
        startTime,
        endTime,
        minutes,
        season,
        seasonManual: participant.seasonManual === true && season === participant.season,
        isPrivate: appointment.private === true,
      };
    })
    .filter((entry) => entry.minutes > 0);
}

export function calculateUserWorkHourSnapshot(
  user: User,
  appointments: WorkAppointment[],
  config: SystemConfig,
  now: Date = new Date(),
  season: number = getCurrentSeason(config, now),
): UserWorkHoursSnapshot {
  const allEntries = appointments
    .flatMap((appointment) => mapAppointmentToWorkEntries(appointment, config, new Set([user.id])))
    .filter((entry) => entry.season === season)
    .sort((left, right) => right.startTime.getTime() - left.startTime.getTime());

  const completedEntries = allEntries.filter((entry) => classifyWorkEntry(entry, now) === 'completed');
  const pendingEntries = allEntries.filter((entry) => classifyWorkEntry(entry, now) === 'pending');
  const declinedEntries = allEntries.filter((entry) => classifyWorkEntry(entry, now) === 'declined');

  const completedMinutes = completedEntries.reduce((total, entry) => total + entry.minutes, 0);
  const pendingMinutes = pendingEntries.reduce((total, entry) => total + entry.minutes, 0);
  const declinedMinutes = declinedEntries.reduce((total, entry) => total + entry.minutes, 0);
  const requiredMinutes = Math.max(0, Math.round(config.workHourThreshold * MINUTES_PER_HOUR));
  const remainingMinutes = Math.max(0, requiredMinutes - completedMinutes - pendingMinutes);

  let status: WorkHourSummary['status'] = 'open';
  if (user.skipHours) {
    status = 'paused';
  } else if (declinedEntries.length > 0) {
    status = 'attention';
  } else if (completedMinutes >= requiredMinutes) {
    status = 'done';
  } else if (completedMinutes + pendingMinutes >= requiredMinutes) {
    status = 'planned';
  }

  return {
    user,
    season,
    entries: allEntries,
    completedEntries,
    pendingEntries,
    declinedEntries,
    summary: {
      completedMinutes,
      pendingMinutes,
      declinedMinutes,
      requiredMinutes,
      remainingMinutes,
      status,
    },
  };
}

/**
 * Ob die Pflichtstunden der angegebenen Saison durch bestätigte und ausstehende Einträge bereits abgedeckt sind.
 * Grundlage für die Standard-Saison neuer Einträge in der Überlappungsphase.
 */
export function isSeasonRequirementCovered(
  user: User,
  appointments: WorkAppointment[],
  config: SystemConfig,
  season: number,
  now: Date = new Date(),
): boolean {
  if (user.skipHours) {
    return true;
  }
  return calculateUserWorkHourSnapshot(user, appointments, config, now, season).summary.remainingMinutes === 0;
}

export function calculateWorkHoursForUsers(
  users: User[],
  appointments: WorkAppointment[],
  config: SystemConfig,
  now: Date = new Date(),
  season: number = getCurrentSeason(config, now),
): WorkHourCalculationResult {
  return {
    season,
    users: users.map((user) => calculateUserWorkHourSnapshot(user, appointments, config, now, season)),
  };
}

export { getLegacySeason };
