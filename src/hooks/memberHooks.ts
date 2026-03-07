import { useCallback, useEffect, useState } from 'react';
import humanizeDuration from 'humanize-duration';
import { useApp } from '../contexts/AppContext';
import { WorkAppointment, WorkParticipant } from '../types/models';
import { User } from '../types/models';
import { calculateWorkHoursForUsers, UserWorkHoursSnapshot, WorkHourEntry } from '../domain/workHours';

const humanizer = humanizeDuration.humanizer({ language: 'de', round: true, units: ['h', 'm'], delimiter: ' und ' });

export interface MemberEligibility {
  loading: boolean;
  canReserve: boolean;
  missingRequirements: string[];
}

export interface UserWorkHours {
  user: User;
  completedDuration: number;
  upcomingDuration: number;
  declinedDuration: number;
  completedMinutes: number;
  upcomingMinutes: number;
  declinedMinutes: number;
  requiredMinutes: number;
  remainingMinutes: number;
  status: 'open' | 'planned' | 'done' | 'paused' | 'attention';
  accountingEntries: WorkHourEntry[];
  appointments: {
    completed: WorkAppointment[];
    upcoming: WorkAppointment[];
    declined: WorkAppointment[];
  };
}

const mapSnapshotToUserWorkHours = (
  snapshot: UserWorkHoursSnapshot,
  appointments: WorkAppointment[],
): UserWorkHours => {
  const appointmentIds = {
    completed: new Set(snapshot.completedEntries.map((entry) => entry.appointmentId)),
    pending: new Set(snapshot.pendingEntries.map((entry) => entry.appointmentId)),
    declined: new Set(snapshot.declinedEntries.map((entry) => entry.appointmentId)),
  };

  return {
    user: snapshot.user,
    completedDuration: snapshot.summary.completedMinutes * 60000,
    upcomingDuration: snapshot.summary.pendingMinutes * 60000,
    declinedDuration: snapshot.summary.declinedMinutes * 60000,
    completedMinutes: snapshot.summary.completedMinutes,
    upcomingMinutes: snapshot.summary.pendingMinutes,
    declinedMinutes: snapshot.summary.declinedMinutes,
    requiredMinutes: snapshot.summary.requiredMinutes,
    remainingMinutes: snapshot.summary.remainingMinutes,
    status: snapshot.summary.status,
    accountingEntries: snapshot.entries,
    appointments: {
      completed: appointments.filter((appointment) => appointmentIds.completed.has(appointment.id)),
      upcoming: appointments.filter((appointment) => appointmentIds.pending.has(appointment.id)),
      declined: appointments.filter((appointment) => appointmentIds.declined.has(appointment.id)),
    },
  };
};

export const useCalculateWorkHours = (onlyAppointments?: WorkAppointment[], onlyUser?: User): { loading: boolean; error: string | null; userWorkHours: UserWorkHours[]; users: User[]; reload: () => void } => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [computedUsers, setComputedUsers] = useState<User[]>([]);
  const [userWorkHours, setUserWorkHours] = useState<UserWorkHours[]>([]);
  const { database, systemConfig } = useApp();

  const fetchData = useCallback(async (appointments?: WorkAppointment[], user?: User) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch necessary users
      let users: User[] = [];
      if (!user) {
        users = await database.getDocuments<User>('users');
      } else {
        users = [user];
      }
      setComputedUsers(users);

      // Fetch work appointments if not provided
      if (!appointments) {
        appointments = await database.getDocuments<WorkAppointment>('workAppointments');
      }

      const result = calculateWorkHoursForUsers(users, appointments, systemConfig, new Date());
      const userHours: UserWorkHours[] = result.users.map((snapshot) => mapSnapshotToUserWorkHours(snapshot, appointments!));

      setUserWorkHours(userHours);
    } catch (err: any) {
      console.error('Error fetching work hours:', err);
      setError(err.code === 'permission-denied' 
        ? 'Keine Berechtigung zum Abrufen der Arbeitsstunden' 
        : 'Fehler beim Abrufen der Arbeitsstunden');
    } finally {
      setLoading(false);
    }
  }, [database, systemConfig.yearChangeDate]);

  useEffect(() => {
    fetchData(onlyAppointments, onlyUser);
  }, [database, onlyAppointments, onlyUser, fetchData]);

  const reload = useCallback(fetchData, [database, onlyAppointments, onlyUser, fetchData]);

  return { loading, error, userWorkHours, users: computedUsers, reload };
};

export const useMemberReservationEligibility = (): MemberEligibility => {
  const { currentUser, systemConfig } = useApp();
  const { loading, error, userWorkHours } = useCalculateWorkHours(undefined, currentUser || undefined);
  const currentWorkMinutes = userWorkHours?.find(workHours => workHours.user.id === currentUser?.id)?.completedMinutes || 0;
    
  if (!currentUser) {
    return {
      loading,
      canReserve: false,
      missingRequirements: ['Bitte melden Sie sich an.'],
    };
  }

  const missingRequirements: string[] = [];

  if (!currentUser.feesPaid) {
    missingRequirements.push('Mitgliedsbeitrag nicht bezahlt');
  }
  if (currentUser.deactivated) {
    missingRequirements.push('Mitglied deaktiviert');
  }

  // Only check work hours if skipHours is not enabled
  if (!currentUser.skipHours) {
    const remainingDuration = (systemConfig.workHourThreshold * 60) - currentWorkMinutes;

    if (remainingDuration > 0) {
      missingRequirements.push(
        `Arbeitsstunden nicht erfüllt (${humanizer(remainingDuration * 60000)})`
      );
    }
  }

  if (error) {
    missingRequirements.push('Fehler beim Abrufen der Arbeitsstunden');
  }

  return {
    loading,
    canReserve: missingRequirements.length === 0,
    missingRequirements,
  };
};
