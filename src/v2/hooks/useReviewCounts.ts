import { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useLiveData } from '../data/LiveDataContext';
import { getPendingReservationReviews, getPendingWorkReviews, PendingWorkReview } from '../data/selectors';
import { BoatReservation } from '../../types/models';

/** Offene Prüfungen des angemeldeten Nutzers (Arbeitsstunden und Reservierungen), live aktualisiert. */
export const useReviewQueues = (): { work: PendingWorkReview[]; reservations: BoatReservation[] } => {
  const { currentUser, isAdmin, isAnyBootswart, boats, systemConfig } = useApp();
  const { appointments, reservations } = useLiveData();
  return useMemo(() => {
    if (!currentUser || !(isAdmin || isAnyBootswart)) return { work: [], reservations: [] };
    const viewer = { userId: currentUser.id, isAdmin };
    return {
      work: getPendingWorkReviews(appointments, boats, viewer, systemConfig),
      reservations: getPendingReservationReviews(reservations, boats, viewer),
    };
  }, [currentUser, isAdmin, isAnyBootswart, appointments, reservations, boats, systemConfig]);
};

export const useReviewCounts = (): { work: number; reservations: number; total: number } => {
  const { work, reservations } = useReviewQueues();
  return { work: work.length, reservations: reservations.length, total: work.length + reservations.length };
};
