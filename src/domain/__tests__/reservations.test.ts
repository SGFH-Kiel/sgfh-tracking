import { buildPublicReservationFeedItem, getReservationConflictResult, overlaps } from '../reservations';
import { BoatReservation } from '../../types/models';

const baseReservation: BoatReservation = {
  id: 'r1',
  boatId: 'boat-1',
  userId: 'user-1',
  userName: 'Tester',
  title: 'Tour',
  description: 'Beschreibung',
  startTime: new Date('2025-06-10T10:00:00Z'),
  endTime: new Date('2025-06-10T12:00:00Z'),
  status: 'approved',
  visibility: 'private',
  createdAt: new Date('2025-05-01T00:00:00Z'),
  updatedAt: new Date('2025-05-01T00:00:00Z'),
};

describe('reservation domain', () => {
  it('detects time overlaps', () => {
    expect(overlaps(new Date('2025-01-01T10:00:00Z'), new Date('2025-01-01T11:00:00Z'), new Date('2025-01-01T10:30:00Z'), new Date('2025-01-01T12:00:00Z'))).toBe(true);
  });

  it('separates hard and warning conflicts', () => {
    const result = getReservationConflictResult([
      baseReservation,
      { ...baseReservation, id: 'r2', status: 'draft' },
    ], 'boat-1', new Date('2025-06-10T11:00:00Z'), new Date('2025-06-10T13:00:00Z'));

    expect(result.hardConflicts).toHaveLength(1);
    expect(result.warningConflicts).toHaveLength(1);
  });

  it('ignores cancelled reservations for conflicts', () => {
    const result = getReservationConflictResult([
      { ...baseReservation, status: 'cancelled' },
    ], 'boat-1', new Date('2025-06-10T11:00:00Z'), new Date('2025-06-10T13:00:00Z'));

    expect(result.hardConflicts).toHaveLength(0);
  });

  it('builds minimal public feed item', () => {
    const feedItem = buildPublicReservationFeedItem({
      reservation: { ...baseReservation, visibility: 'public', publicDetails: { freeSeatsText: '2 freie Plätze' } },
      boatName: 'Laser',
    });

    expect(feedItem.boatName).toBe('Laser');
    expect(feedItem.freeSeatsText).toBe('2 freie Plätze');
  });
});
