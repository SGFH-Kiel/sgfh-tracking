import { DatabaseProvider } from '../services/interfaces/database';
import { Boat, BoatReservation, User } from '../types/models';
import { writeActivityLog } from './activityLog';
import { syncPublicReservationFeed } from './reservationSync';

/**
 * Entscheidung über eine Reservierung (genehmigen, ablehnen, stornieren) durch Bootswart oder Admin:
 * Status speichern, öffentlichen Feed nachziehen und protokollieren. Gemeinsame Aktion für alle Oberflächen.
 */
export async function setReservationStatus(
  database: DatabaseProvider,
  reservation: BoatReservation,
  status: 'approved' | 'rejected' | 'cancelled',
  actor: Pick<User, 'id' | 'displayName'>,
  boats: Boat[],
): Promise<void> {
  const now = new Date();
  await database.updateDocument<BoatReservation>('boatReservations', reservation.id, {
    status,
    updatedAt: now,
  });
  await syncPublicReservationFeed(database, { ...reservation, status, updatedAt: now }, boats);
  await writeActivityLog(database, {
    type: 'reservation.status_changed',
    entityId: reservation.id,
    entityType: 'reservation',
    actorId: actor.id,
    actorName: actor.displayName,
    details: { title: reservation.title, previousStatus: reservation.status, newStatus: status },
  });
}
