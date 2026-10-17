import {
  getMyUpcomingReservations,
  getPendingReservationReviews,
  getPendingWorkReviews,
  getUpcomingWorkAppointments,
} from '../selectors';
import { Boat, BoatReservation, SystemConfig, WorkAppointment, WorkParticipant } from '../../../types/models';

const config: SystemConfig = { id: 'default', yearChangeDate: new Date(2000, 9, 1), workHourThreshold: 8 };
const boats: Boat[] = [
  { id: 'b1', name: 'Laser', bootswart: 'bw', requiresApproval: true, blocked: false, color: '#000', createdAt: new Date(), updatedAt: new Date() },
  { id: 'b2', name: 'Opti', bootswart: 'other', requiresApproval: false, blocked: false, color: '#000', createdAt: new Date(), updatedAt: new Date() },
];

const participant = (userId: string, status: WorkParticipant['status'] = 'pending'): WorkParticipant => ({
  userId, userName: userId, status, createdAt: new Date(), updatedAt: new Date(),
});

const appointment = (id: string, boatId: string | undefined, participants: WorkParticipant[], start = new Date(2026, 9, 10, 9), extra: Partial<WorkAppointment> = {}): WorkAppointment => ({
  id, title: id, description: '', boatId, participants, supplies: [],
  startTime: start, endTime: new Date(start.getTime() + 2 * 3600000), createdAt: new Date(), updatedAt: new Date(), ...extra,
});

const reservation = (id: string, boatId: string, userId: string, status: BoatReservation['status'], start: Date): BoatReservation => ({
  id, boatId, userId, userName: userId, title: id, startTime: start, endTime: new Date(start.getTime() + 3600000),
  status, visibility: 'private', createdAt: new Date(), updatedAt: new Date(),
});

describe('v2 selectors', () => {
  const appointments = [
    appointment('own-boat', 'b1', [participant('m1'), participant('m2', 'confirmed'), participant('bw')]),
    appointment('foreign-boat', 'b2', [participant('m3')]),
    appointment('no-boat', undefined, [participant('m4')]),
  ];

  it('limits work reviews to own boats for bootswarte and excludes own entries', () => {
    const reviews = getPendingWorkReviews(appointments, boats, { userId: 'bw', isAdmin: false }, config);
    expect(reviews.map((r) => r.key)).toEqual(['own-boat:m1']);
    expect(reviews[0].minutes).toBe(120);
    expect(reviews[0].season).toBe(2027);
  });

  it('lets admins review everything except their own entries', () => {
    const reviews = getPendingWorkReviews(appointments, boats, { userId: 'm4', isAdmin: true }, config);
    expect(reviews.map((r) => r.key).sort()).toEqual(['foreign-boat:m3', 'own-boat:bw', 'own-boat:m1']);
  });

  it('lists pending reservations of own boats only', () => {
    const now = new Date(2026, 9, 17);
    const reservations = [
      reservation('r1', 'b1', 'm1', 'pending', now),
      reservation('r2', 'b2', 'm1', 'pending', now),
      reservation('r3', 'b1', 'bw', 'pending', now),
      reservation('r4', 'b1', 'm2', 'approved', now),
    ];
    expect(getPendingReservationReviews(reservations, boats, { userId: 'bw', isAdmin: false }).map((r) => r.id)).toEqual(['r1']);
    expect(getPendingReservationReviews(reservations, boats, { userId: 'adm', isAdmin: true }).map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('returns my next active reservations in order', () => {
    const now = new Date(2026, 9, 17, 12);
    const reservations = [
      reservation('later', 'b1', 'me', 'approved', new Date(2026, 9, 20)),
      reservation('past', 'b1', 'me', 'approved', new Date(2026, 9, 1)),
      reservation('cancelled', 'b1', 'me', 'cancelled', new Date(2026, 9, 18)),
      reservation('soon', 'b1', 'me', 'draft', new Date(2026, 9, 18)),
      reservation('other', 'b1', 'x', 'approved', new Date(2026, 9, 18)),
    ];
    expect(getMyUpcomingReservations(reservations, 'me', now).map((r) => r.id)).toEqual(['soon', 'later']);
  });

  it('shows upcoming public appointments with free spots or own participation', () => {
    const now = new Date(2026, 9, 1);
    const list = [
      appointment('full', 'b1', [participant('a'), participant('b')], new Date(2026, 9, 5), { maxParticipants: 2 }),
      appointment('full-but-mine', 'b1', [participant('me'), participant('b')], new Date(2026, 9, 6), { maxParticipants: 2 }),
      appointment('open', 'b1', [], new Date(2026, 9, 4), { maxParticipants: 3 }),
      appointment('private', undefined, [participant('me')], new Date(2026, 9, 3), { private: true }),
      appointment('past', 'b1', [], new Date(2026, 8, 1)),
    ];
    const result = getUpcomingWorkAppointments(list, 'me', now);
    expect(result.map((r) => r.appointment.id)).toEqual(['open', 'full-but-mine']);
    expect(result[0].freeSpots).toBe(3);
  });
});
