import { SystemConfig, User, WorkAppointment, WorkParticipant } from '../types/models';

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
  accountingYear: number;
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
  entries: WorkHourEntry[];
  completedEntries: WorkHourEntry[];
  pendingEntries: WorkHourEntry[];
  declinedEntries: WorkHourEntry[];
  summary: WorkHourSummary;
}

export interface WorkHourCalculationResult {
  accountingYear: number;
  accountingPeriodStart: Date;
  accountingPeriodEnd: Date;
  users: UserWorkHoursSnapshot[];
}

const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60 * 1000;

export function getAccountingYearStart(config: SystemConfig, referenceDate: Date): Date {
  const configuredMonth = config.yearChangeDate.getMonth();
  const configuredDay = config.yearChangeDate.getDate();
  const currentYearStart = new Date(referenceDate.getFullYear(), configuredMonth, configuredDay, 0, 0, 0, 0);

  if (referenceDate.getTime() >= currentYearStart.getTime()) {
    return currentYearStart;
  }

  return new Date(referenceDate.getFullYear() - 1, configuredMonth, configuredDay, 0, 0, 0, 0);
}

export function getNextAccountingYearStart(config: SystemConfig, accountingYearStart: Date): Date {
  return new Date(accountingYearStart.getFullYear() + 1, accountingYearStart.getMonth(), accountingYearStart.getDate(), 0, 0, 0, 0);
}

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
        accountingYear: getAccountingYear(config, endTime),
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
): UserWorkHoursSnapshot {
  const accountingYear = getAccountingYear(config, now);
  const allEntries = appointments
    .flatMap((appointment) => mapAppointmentToWorkEntries(appointment, config, new Set([user.id])))
    .filter((entry) => entry.accountingYear === accountingYear)
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

export function calculateWorkHoursForUsers(
  users: User[],
  appointments: WorkAppointment[],
  config: SystemConfig,
  now: Date = new Date(),
): WorkHourCalculationResult {
  const accountingPeriodStart = getAccountingYearStart(config, now);
  const accountingPeriodEnd = getNextAccountingYearStart(config, accountingPeriodStart);

  return {
    accountingYear: accountingPeriodStart.getFullYear(),
    accountingPeriodStart,
    accountingPeriodEnd,
    users: users.map((user) => calculateUserWorkHourSnapshot(user, appointments, config, now)),
  };
}
