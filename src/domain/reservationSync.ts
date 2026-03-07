import { DatabaseProvider } from '../services/interfaces/database';
import { Boat, BoatReservation, PublicBoatReservation } from '../types/models';
import { buildPublicReservationFeedItem } from './reservations';

const PUBLIC_COLLECTION_NAME = 'publicBoatReservations';

export async function syncPublicReservationFeed(
  database: DatabaseProvider,
  reservation: BoatReservation,
  boats: Boat[],
): Promise<void> {
  const boat = boats.find((entry) => entry.id === reservation.boatId);
  const isPublic = reservation.visibility === 'public';
  const isVisibleStatus = reservation.status !== 'cancelled' && reservation.status !== 'rejected';

  if (!boat || !isPublic || !isVisibleStatus) {
    try {
      await database.deleteDocument(PUBLIC_COLLECTION_NAME, reservation.id);
    } catch (error) {
      console.error('Error deleting public reservation projection:', error);
    }
    return;
  }

  const projection: PublicBoatReservation = buildPublicReservationFeedItem({
    reservation,
    boatName: boat.name,
  });

  await database.setDocument<PublicBoatReservation>(PUBLIC_COLLECTION_NAME, reservation.id, projection);
}

export async function deletePublicReservationFeed(database: DatabaseProvider, reservationId: string): Promise<void> {
  try {
    await database.deleteDocument(PUBLIC_COLLECTION_NAME, reservationId);
  } catch (error) {
    console.error('Error deleting public reservation projection:', error);
  }
}
