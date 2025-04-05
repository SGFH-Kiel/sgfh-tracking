import { useCallback, useEffect, useState } from 'react';
import humanizeDuration from 'humanize-duration';
import { useApp } from '../contexts/AppContext';
import { WorkAppointment, WorkParticipant } from '../types/models';
import { User } from '../types/models';

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
  appointments: {
    completed: WorkAppointment[];
    upcoming: WorkAppointment[];
    declined: WorkAppointment[];
  };
}

const createReducer = ( user: User) => (total: number, apt: WorkAppointment) => {
  const up: WorkParticipant = apt.participants.find((p) => p.userId === user.id)!;
  const startTime = up.startTime ? up.startTime : apt.startTime;
  const endTime = up.endTime ? up.endTime : apt.endTime;
  const duration = (endTime.getTime() - startTime.getTime())
  return total + duration;
}

export const useCalculateWorkHours = (onlyAppointments?: WorkAppointment[], onlyUser?: User): { loading: boolean; error: string | null; userWorkHours: UserWorkHours[]; users: User[]; reload: () => void } => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [computedUsers, setComputedUsers] = useState<User[]>([]);
  const [userWorkHours, setUserWorkHours] = useState<UserWorkHours[]>([]);
  const { database, systemConfig } = useApp();

  const fetchData = useCallback(async (appointments?: WorkAppointment[], user?: User) => {
    try {
      const currentYearChangeDate = systemConfig.yearChangeDate;
      currentYearChangeDate.setFullYear(new Date().getFullYear());
      // Use the last year's change date if current year's change date is in the future, otherwise use the current year's change date
      const changeDate = currentYearChangeDate.getTime() > new Date().getTime()
        ? currentYearChangeDate.setFullYear(currentYearChangeDate.getFullYear() - 1)
        : currentYearChangeDate;

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
        appointments = await database.getDocuments<WorkAppointment>('workAppointments', [{
          field: 'endTime',
          operator: 'gte',
          value: changeDate
        }]);
        // todo: filter for system config date and think about cutoff logic for work hour calculation
      }

      const now = new Date();
      const userHours: UserWorkHours[] = users.map((user) => {
        const userAppointments = appointments!.filter((apt) =>
          apt.participants.some(
            (p) => p.userId === user.id
          )
        );

        const completed = userAppointments.filter(
          (apt) => apt.endTime.getTime() < now.getTime() &&
           apt.participants.find((p) => p.status === 'confirmed' && p.userId === user.id)
        );
        const upcoming = userAppointments.filter(
          (apt) => apt.participants.find((p) => (p.status === 'pending' || (p.status === 'confirmed' && apt.endTime.getTime() > now.getTime())) && p.userId === user.id)
        );
        const declined = userAppointments.filter(
          (apt) => apt.participants.find((p) => p.status === 'declined' && p.userId === user.id)
        );

        const reducer = createReducer(user);

        const completedDuration = completed.reduce(reducer, 0);

        const upcomingDuration = upcoming.reduce(reducer, 0);
        
        const declinedDuration = declined.reduce(reducer, 0);

        return {
          user,
          completedDuration,
          upcomingDuration,
          declinedDuration,
          appointments: {
            completed,
            upcoming,
            declined,
          },
        };
      });

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
  const currentWorkDuration = userWorkHours?.find(workHours => workHours.user.id === currentUser?.id)?.completedDuration || 0;
    
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

  const remainingDuration = (systemConfig.workHourThreshold * 3600000) - currentWorkDuration;

  if (remainingDuration > 0) {
    missingRequirements.push(
      `Arbeitsstunden nicht erfüllt (${humanizer(remainingDuration)} )`
    );
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
