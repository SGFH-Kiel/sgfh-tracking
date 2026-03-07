import { BoatReservation, ReservationStatus, ReservationVisibility } from '../types/models';

export interface ReservationConflictResult {
  hardConflicts: BoatReservation[];
  warningConflicts: BoatReservation[];
}

export interface PublicReservationFeedItem {
  id: string;
  boatId: string;
  boatName: string;
  title: string;
  startTime: Date;
  endTime: Date;
  visibility: ReservationVisibility;
  reservationStatus: ReservationStatus;
  freeSeatsText?: string;
  updatedAt: Date;
}

export const HARD_BLOCKING_RESERVATION_STATUSES: ReservationStatus[] = ['pending', 'approved'];
export const WARNING_ONLY_RESERVATION_STATUSES: ReservationStatus[] = ['draft'];

export function overlaps(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date): boolean {
  return leftStart.getTime() < rightEnd.getTime() && rightStart.getTime() < leftEnd.getTime();
}

export function isReservationFinal(status: ReservationStatus): boolean {
  return status === 'pending' || status === 'approved';
}

export function getReservationConflictResult(
  reservations: BoatReservation[],
  requestedBoatId: string,
  requestedStart: Date,
  requestedEnd: Date,
  excludeReservationId?: string,
): ReservationConflictResult {
  const relevant = reservations.filter((reservation) => {
    if (excludeReservationId && reservation.id === excludeReservationId) {
      return false;
    }

    if (reservation.boatId !== requestedBoatId) {
      return false;
    }

    if (reservation.status === 'cancelled' || reservation.status === 'rejected') {
      return false;
    }

    return overlaps(reservation.startTime, reservation.endTime, requestedStart, requestedEnd);
  });

  return {
    hardConflicts: relevant.filter((reservation) => HARD_BLOCKING_RESERVATION_STATUSES.includes(reservation.status)),
    warningConflicts: relevant.filter((reservation) => WARNING_ONLY_RESERVATION_STATUSES.includes(reservation.status)),
  };
}

export function buildPublicReservationFeedItem(input: {
  reservation: BoatReservation;
  boatName: string;
}): PublicReservationFeedItem {
  const { reservation, boatName } = input;

  return {
    id: reservation.id,
    boatId: reservation.boatId,
    boatName,
    title: reservation.title,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    visibility: reservation.visibility,
    reservationStatus: reservation.status,
    freeSeatsText: reservation.publicDetails?.freeSeatsText,
    updatedAt: reservation.updatedAt,
  };
}
