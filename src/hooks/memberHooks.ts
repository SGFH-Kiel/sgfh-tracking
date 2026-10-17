import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { WorkAppointment } from '../types/models';
import { User } from '../types/models';
import { calculateUserWorkHourSnapshot, calculateWorkHoursForUsers, UserWorkHoursSnapshot, WorkHourEntry } from '../domain/workHours';
import { getCurrentSeason, getDefaultSeasonForNewEntry, isNextSeasonOpen } from '../domain/seasons';
import { getReservationEligibility } from '../domain/eligibility';

export interface MemberEligibility {
  loading: boolean;
  canReserve: boolean;
  missingRequirements: string[];
}

export interface UserWorkHours {
  user: User;
  season: number;
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
    season: snapshot.season,
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

/**
 * Berechnet die Arbeitsstunden einer Saison. Ohne `season` wird die aktuelle Saison verwendet
 * (vor Aktivierung des Saisonmodells: der Zeitraum gemäß Stichtag).
 */
export const useCalculateWorkHours = (onlyAppointments?: WorkAppointment[], onlyUser?: User, season?: number): { loading: boolean; refreshing: boolean; error: string | null; userWorkHours: UserWorkHours[]; users: User[]; appointments: WorkAppointment[]; season: number; reload: () => void } => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computedUsers, setComputedUsers] = useState<User[]>([]);
  const [userWorkHours, setUserWorkHours] = useState<UserWorkHours[]>([]);
  const [loadedAppointments, setLoadedAppointments] = useState<WorkAppointment[]>([]);
  const { database, systemConfig } = useApp();
  const effectiveSeason = season ?? getCurrentSeason(systemConfig);

  const fetchData = useCallback(async (appointments?: WorkAppointment[], user?: User) => {
    const isInitial = !hasLoadedOnce;
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
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
      setLoadedAppointments(appointments);

      const result = calculateWorkHoursForUsers(users, appointments, systemConfig, new Date(), effectiveSeason);
      const userHours: UserWorkHours[] = result.users.map((snapshot) => mapSnapshotToUserWorkHours(snapshot, appointments!));

      setUserWorkHours(userHours);
    } catch (err: any) {
      console.error('Error fetching work hours:', err);
      setError(err.code === 'permission-denied'
        ? 'Keine Berechtigung zum Abrufen der Arbeitsstunden'
        : 'Fehler beim Abrufen der Arbeitsstunden');
    } finally {
      if (isInitial) {
        setLoading(false);
        setHasLoadedOnce(true);
      } else {
        setRefreshing(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, systemConfig.yearChangeDate.getTime(), systemConfig.workHourThreshold, systemConfig.currentSeason, systemConfig.nextSeasonOpen, systemConfig.seasonModelActivatedAt?.getTime(), effectiveSeason, hasLoadedOnce]);

  useEffect(() => {
    fetchData(onlyAppointments, onlyUser);
  }, [database, onlyAppointments, onlyUser, fetchData]);

  const reload = useCallback(fetchData, [database, onlyAppointments, onlyUser, fetchData]);

  return { loading, refreshing, error, userWorkHours, users: computedUsers, appointments: loadedAppointments, season: effectiveSeason, reload };
};

export interface DefaultSeasonInfo {
  loading: boolean;
  /** true, wenn Mitglieder zwischen aktueller und nächster Saison wählen können. */
  selectable: boolean;
  currentSeason: number;
  defaultSeason: number;
  /** Noch offene Minuten der aktuellen Saison (bestätigt + ausstehend eingerechnet). */
  missingCurrentMinutes: number;
}

/**
 * Ermittelt die Standard-Saison für neue Einträge eines Mitglieds. Nur in der Überlappungsphase
 * werden dafür Daten geladen, sonst ist die Standard-Saison immer die aktuelle Saison.
 */
export const useDefaultSeason = (user: User | null | undefined, enabled: boolean = true): DefaultSeasonInfo => {
  const { database, systemConfig } = useApp();
  const currentSeason = getCurrentSeason(systemConfig);
  const selectable = isNextSeasonOpen(systemConfig);
  const [state, setState] = useState<{ loading: boolean; missingCurrentMinutes: number }>({ loading: false, missingCurrentMinutes: 0 });

  useEffect(() => {
    if (!enabled || !selectable || !user) {
      setState({ loading: false, missingCurrentMinutes: 0 });
      return;
    }
    let isActive = true;
    setState((prev) => ({ ...prev, loading: true }));
    database.getDocuments<WorkAppointment>('workAppointments')
      .then((appointments) => {
        if (!isActive) return;
        const snapshot = calculateUserWorkHourSnapshot(user, appointments, systemConfig, new Date(), currentSeason);
        setState({ loading: false, missingCurrentMinutes: user.skipHours ? 0 : snapshot.summary.remainingMinutes });
      })
      .catch((error) => {
        console.error('Error determining default season:', error);
        if (isActive) setState({ loading: false, missingCurrentMinutes: 0 });
      });
    return () => {
      isActive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, enabled, selectable, user?.id, user?.skipHours, currentSeason, systemConfig.workHourThreshold]);

  return {
    loading: state.loading,
    selectable,
    currentSeason,
    defaultSeason: getDefaultSeasonForNewEntry(systemConfig, state.missingCurrentMinutes === 0),
    missingCurrentMinutes: state.missingCurrentMinutes,
  };
};

export const useMemberReservationEligibility = (): MemberEligibility => {
  const { currentUser, systemConfig } = useApp();
  const { loading, error, userWorkHours, season } = useCalculateWorkHours(undefined, currentUser || undefined);
  const currentWorkMinutes = userWorkHours?.find(workHours => workHours.user.id === currentUser?.id)?.completedMinutes || 0;

  if (!currentUser) {
    return {
      loading,
      canReserve: false,
      missingRequirements: ['Bitte melden Sie sich an.'],
    };
  }

  const { missingRequirements } = getReservationEligibility(currentUser, currentWorkMinutes, systemConfig, season);

  if (error) {
    missingRequirements.push('Fehler beim Abrufen der Arbeitsstunden');
  }

  return {
    loading,
    canReserve: missingRequirements.length === 0,
    missingRequirements,
  };
};
