import { Boat, BoatReservation, SystemConfig, WorkAppointment, WorkParticipant } from '../../types/models';
import { resolveEntrySeason } from '../../domain/seasons';
import { calculateDurationMinutes, resolveParticipantWindow } from '../../domain/workHours';

export interface ReviewViewer {
  userId: string;
  isAdmin: boolean;
}

export interface PendingWorkReview {
  key: string;
  appointment: WorkAppointment;
  participant: WorkParticipant;
  startTime: Date;
  endTime: Date;
  minutes: number;
  season: number;
  seasonManual: boolean;
}

export const isBootswartOf = (boat: Boat | undefined, userId: string): boolean =>
  !!boat && (boat.bootswart === userId || boat.bootswart2 === userId);

/**
 * Offene Arbeitsstunden, die der Betrachter prüfen darf: Admins alle, Bootswarte die ihrer Boote.
 * Eigene Einträge erscheinen nicht (Vier-Augen-Prinzip).
 */
export function getPendingWorkReviews(
  appointments: WorkAppointment[],
  boats: Boat[],
  viewer: ReviewViewer,
  config: SystemConfig,
): PendingWorkReview[] {
  const reviews: PendingWorkReview[] = [];
  appointments.forEach((appointment) => {
    const boat = appointment.boatId ? boats.find((b) => b.id === appointment.boatId) : undefined;
    const mayReview = viewer.isAdmin || isBootswartOf(boat, viewer.userId);
    if (!mayReview) return;
    appointment.participants.forEach((participant) => {
      if (participant.status !== 'pending' || participant.userId === viewer.userId) return;
      const { startTime, endTime } = resolveParticipantWindow(appointment, participant);
      reviews.push({
        key: `${appointment.id}:${participant.userId}`,
        appointment,
        participant,
        startTime,
        endTime,
        minutes: calculateDurationMinutes(startTime, endTime),
        season: resolveEntrySeason(appointment, participant, config),
        seasonManual: participant.seasonManual === true,
      });
    });
  });
  return reviews.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
}

/** Offene Reservierungen der Boote, über die der Betrachter entscheiden darf (ohne eigene). */
export function getPendingReservationReviews(
  reservations: BoatReservation[],
  boats: Boat[],
  viewer: ReviewViewer,
): BoatReservation[] {
  return reservations
    .filter((reservation) => reservation.status === 'pending' && reservation.userId !== viewer.userId)
    .filter((reservation) => viewer.isAdmin || isBootswartOf(boats.find((b) => b.id === reservation.boatId), viewer.userId))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

const ACTIVE_RESERVATION_STATUSES: BoatReservation['status'][] = ['draft', 'pending', 'approved'];

export function getMyUpcomingReservations(reservations: BoatReservation[], userId: string, now: Date, limit = 3): BoatReservation[] {
  return reservations
    .filter((reservation) => reservation.userId === userId && reservation.endTime >= now && ACTIVE_RESERVATION_STATUSES.includes(reservation.status))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, limit);
}

export interface UpcomingWorkAppointment {
  appointment: WorkAppointment;
  freeSpots: number | null;
  isParticipant: boolean;
}

/** Nächste öffentliche Arbeitstermine mit freien Plätzen bzw. eigener Teilnahme. */
export function getUpcomingWorkAppointments(appointments: WorkAppointment[], userId: string, now: Date, limit = 5): UpcomingWorkAppointment[] {
  return appointments
    .filter((appointment) => !appointment.private && appointment.endTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .map((appointment) => ({
      appointment,
      freeSpots: appointment.maxParticipants ? Math.max(0, appointment.maxParticipants - appointment.participants.length) : null,
      isParticipant: appointment.participants.some((participant) => participant.userId === userId),
    }))
    .filter((item) => item.isParticipant || item.freeSpots === null || item.freeSpots > 0)
    .slice(0, limit);
}
