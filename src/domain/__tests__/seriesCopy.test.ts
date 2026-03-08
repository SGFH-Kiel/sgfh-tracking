import { BoatReservation, WorkAppointment } from '../../types/models';

// --- stripUndefined (mirrors the implementation in database.ts) ---

function stripUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefined(v)])
  );
}

// --- Series copy helpers (mirrors the logic in the dialog components) ---

function buildReservationSeriesCopies(
  reservation: BoatReservation,
  intervalDays: number,
  count: number,
  currentUserId: string,
  currentUserName: string,
  eligibilitySnapshot: { feesPaid: boolean; skipHours: boolean; workHoursMet: boolean },
): Omit<BoatReservation, 'id'>[] {
  const durationMs = reservation.endTime.getTime() - reservation.startTime.getTime();
  return Array.from({ length: count }, (_, i) => {
    const newStart = new Date(reservation.startTime.getTime() + intervalDays * (i + 1) * 86400000);
    const copy: Omit<BoatReservation, 'id'> = {
      boatId: reservation.boatId,
      userId: currentUserId,
      userName: currentUserName,
      title: reservation.title,
      status: 'draft',
      visibility: 'private',
      startTime: newStart,
      endTime: new Date(newStart.getTime() + durationMs),
      eligibilitySnapshot,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (reservation.description) copy.description = reservation.description;
    return copy;
  });
}

function buildAppointmentSeriesCopies(
  appointment: WorkAppointment,
  intervalDays: number,
  count: number,
): Omit<WorkAppointment, 'id'>[] {
  const durationMs = appointment.endTime.getTime() - appointment.startTime.getTime();
  return Array.from({ length: count }, (_, i) => {
    const newStart = new Date(appointment.startTime.getTime() + intervalDays * (i + 1) * 86400000);
    const copy: Omit<WorkAppointment, 'id'> = {
      title: appointment.title,
      description: appointment.description,
      startTime: newStart,
      endTime: new Date(newStart.getTime() + durationMs),
      participants: [],
      supplies: [...appointment.supplies],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (appointment.boatId) copy.boatId = appointment.boatId;
    if (appointment.maxParticipants) copy.maxParticipants = appointment.maxParticipants;
    if (appointment.private !== undefined) copy.private = appointment.private;
    if (appointment.createdByUserId) copy.createdByUserId = appointment.createdByUserId;
    if (appointment.createdByUserName) copy.createdByUserName = appointment.createdByUserName;
    return copy;
  });
}

// --- Fixtures ---

const baseReservation: BoatReservation = {
  id: 'r1',
  boatId: 'boat-1',
  userId: 'user-1',
  userName: 'Erika Muster',
  title: 'Wochentour',
  description: 'Beschreibung',
  startTime: new Date('2025-06-01T09:00:00Z'),
  endTime: new Date('2025-06-01T17:00:00Z'),
  status: 'approved',
  visibility: 'public',
  publicDetails: { freeSeatsText: '2 Plätze' },
  eligibilitySnapshot: { feesPaid: true, skipHours: false, workHoursMet: true },
  createdAt: new Date('2025-05-01T00:00:00Z'),
  updatedAt: new Date('2025-05-01T00:00:00Z'),
};

const baseAppointment: WorkAppointment = {
  id: 'a1',
  title: 'Bootsputzen',
  description: 'Herbstputz',
  boatId: 'boat-1',
  startTime: new Date('2025-06-01T09:00:00Z'),
  endTime: new Date('2025-06-01T13:00:00Z'),
  participants: [{ userId: 'user-1', userName: 'Erika', status: 'confirmed', createdAt: new Date(), updatedAt: new Date() }],
  supplies: ['Schwamm', 'Eimer'],
  maxParticipants: 5,
  createdByUserId: 'user-1',
  createdByUserName: 'Erika',
  createdAt: new Date('2025-05-01T00:00:00Z'),
  updatedAt: new Date('2025-05-01T00:00:00Z'),
};

const eligibility = { feesPaid: true, skipHours: false, workHoursMet: true };

// --- Tests ---

describe('stripUndefined', () => {
  it('removes top-level undefined fields', () => {
    const result = stripUndefined({ a: 1, b: undefined, c: 'x' });
    expect(result).toEqual({ a: 1, c: 'x' });
    expect('b' in result).toBe(false);
  });

  it('removes nested undefined fields', () => {
    const result = stripUndefined({ outer: { inner: undefined, keep: 42 } });
    expect(result.outer).toEqual({ keep: 42 });
  });

  it('preserves null values', () => {
    const result = stripUndefined({ a: null });
    expect(result.a).toBeNull();
  });

  it('preserves Date objects without stripping', () => {
    const d = new Date('2025-01-01T00:00:00Z');
    const result = stripUndefined({ ts: d });
    expect(result.ts).toBeInstanceOf(Date);
    expect(result.ts).toEqual(d);
  });

  it('handles arrays correctly', () => {
    const result = stripUndefined({ list: [1, undefined, 3] });
    expect(result.list).toEqual([1, undefined, 3]);
  });

  it('handles primitives at top level', () => {
    expect(stripUndefined(42)).toBe(42);
    expect(stripUndefined('hello')).toBe('hello');
    expect(stripUndefined(null)).toBeNull();
  });
});

describe('reservation series copy', () => {
  it('generates the correct number of copies', () => {
    const copies = buildReservationSeriesCopies(baseReservation, 7, 4, 'user-2', 'Hans', eligibility);
    expect(copies).toHaveLength(4);
  });

  it('shifts dates by the correct interval', () => {
    const copies = buildReservationSeriesCopies(baseReservation, 7, 3, 'user-2', 'Hans', eligibility);
    const expectedFirst = new Date('2025-06-08T09:00:00Z');
    const expectedSecond = new Date('2025-06-15T09:00:00Z');
    expect(copies[0].startTime).toEqual(expectedFirst);
    expect(copies[1].startTime).toEqual(expectedSecond);
  });

  it('preserves original duration', () => {
    const durationMs = baseReservation.endTime.getTime() - baseReservation.startTime.getTime();
    const copies = buildReservationSeriesCopies(baseReservation, 7, 2, 'user-2', 'Hans', eligibility);
    copies.forEach(copy => {
      const copyDuration = copy.endTime.getTime() - copy.startTime.getTime();
      expect(copyDuration).toBe(durationMs);
    });
  });

  it('stamps current user identity, not original owner', () => {
    const copies = buildReservationSeriesCopies(baseReservation, 7, 1, 'user-2', 'Hans', eligibility);
    expect(copies[0].userId).toBe('user-2');
    expect(copies[0].userName).toBe('Hans');
  });

  it('always sets status to draft regardless of source status', () => {
    const copies = buildReservationSeriesCopies(baseReservation, 7, 2, 'user-1', 'Erika Muster', eligibility);
    copies.forEach(copy => expect(copy.status).toBe('draft'));
  });

  it('always sets visibility to private regardless of source', () => {
    const copies = buildReservationSeriesCopies(baseReservation, 7, 2, 'user-1', 'Erika Muster', eligibility);
    copies.forEach(copy => expect(copy.visibility).toBe('private'));
  });

  it('does not copy publicDetails from public source', () => {
    const copies = buildReservationSeriesCopies(baseReservation, 7, 1, 'user-1', 'Erika Muster', eligibility);
    expect((copies[0] as any).publicDetails).toBeUndefined();
  });

  it('injects fresh eligibilitySnapshot', () => {
    const snap = { feesPaid: false, skipHours: true, workHoursMet: false };
    const copies = buildReservationSeriesCopies(baseReservation, 7, 1, 'user-2', 'Hans', snap);
    expect(copies[0].eligibilitySnapshot).toEqual(snap);
  });

  it('copies description when present', () => {
    const copies = buildReservationSeriesCopies(baseReservation, 7, 1, 'user-1', 'Erika Muster', eligibility);
    expect(copies[0].description).toBe('Beschreibung');
  });

  it('works with custom day intervals', () => {
    const copies = buildReservationSeriesCopies(baseReservation, 14, 2, 'user-1', 'Erika Muster', eligibility);
    const expectedFirst = new Date('2025-06-15T09:00:00Z');
    expect(copies[0].startTime).toEqual(expectedFirst);
  });
});

describe('work appointment series copy', () => {
  it('generates the correct number of copies', () => {
    const copies = buildAppointmentSeriesCopies(baseAppointment, 7, 3);
    expect(copies).toHaveLength(3);
  });

  it('shifts dates by the correct interval', () => {
    const copies = buildAppointmentSeriesCopies(baseAppointment, 7, 1);
    expect(copies[0].startTime).toEqual(new Date('2025-06-08T09:00:00Z'));
  });

  it('preserves original duration', () => {
    const durationMs = baseAppointment.endTime.getTime() - baseAppointment.startTime.getTime();
    const copies = buildAppointmentSeriesCopies(baseAppointment, 7, 2);
    copies.forEach(copy => {
      expect(copy.endTime.getTime() - copy.startTime.getTime()).toBe(durationMs);
    });
  });

  it('resets participants to empty array', () => {
    const copies = buildAppointmentSeriesCopies(baseAppointment, 7, 2);
    copies.forEach(copy => expect(copy.participants).toEqual([]));
  });

  it('copies supplies from source', () => {
    const copies = buildAppointmentSeriesCopies(baseAppointment, 7, 1);
    expect(copies[0].supplies).toEqual(['Schwamm', 'Eimer']);
  });

  it('copies optional fields when present', () => {
    const copies = buildAppointmentSeriesCopies(baseAppointment, 7, 1);
    expect(copies[0].boatId).toBe('boat-1');
    expect(copies[0].maxParticipants).toBe(5);
    expect(copies[0].createdByUserId).toBe('user-1');
  });

  it('does not include boatId when not set on source', () => {
    const noBoat = { ...baseAppointment, boatId: undefined };
    const copies = buildAppointmentSeriesCopies(noBoat, 7, 1);
    expect('boatId' in copies[0]).toBe(false);
  });
});
