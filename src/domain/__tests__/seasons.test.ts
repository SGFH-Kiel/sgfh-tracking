import {
  buildParticipantSeasonFields,
  collectKnownSeasons,
  getBookableSeasons,
  getCurrentSeason,
  getDefaultSeasonForNewEntry,
  getLegacySeason,
  getManageableSeasons,
  isSeasonModelActive,
  planSeasonBackfill,
  resolveEntrySeason,
  suggestSeasonActivation,
} from '../seasons';
import { calculateUserWorkHourSnapshot, isSeasonRequirementCovered } from '../workHours';
import { SystemConfig, User, UserRole, WorkAppointment, WorkParticipant } from '../../types/models';

// Produktivwert: Stichtag 01.10.
const legacyConfig: SystemConfig = {
  id: 'default',
  yearChangeDate: new Date(2000, 9, 1),
  workHourThreshold: 2,
};

const activeConfig = (overrides: Partial<SystemConfig> = {}): SystemConfig => ({
  ...legacyConfig,
  seasonBackfillAt: new Date(2026, 9, 16),
  seasonModelActivatedAt: new Date(2026, 9, 17),
  currentSeason: 2026,
  nextSeasonOpen: true,
  ...overrides,
});

const user: User = {
  id: 'u1',
  email: 'user@example.com',
  displayName: 'Test User',
  roles: [UserRole.MEMBER],
  feesPaid: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let idCounter = 0;
const participant = (overrides: Partial<WorkParticipant> = {}): WorkParticipant => ({
  userId: user.id,
  userName: user.displayName,
  status: 'confirmed',
  createdAt: new Date(2026, 0, 1),
  updatedAt: new Date(2026, 0, 1),
  ...overrides,
});

const appointmentAt = (start: Date, hours: number, participantOverrides: Partial<WorkParticipant> = {}): WorkAppointment => ({
  id: `a${++idCounter}`,
  title: 'Arbeitseinsatz',
  description: '',
  startTime: start,
  endTime: new Date(start.getTime() + hours * 3600000),
  participants: [participant(participantOverrides)],
  supplies: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('getLegacySeason', () => {
  it('maps the October cutoff to the season of the following summer', () => {
    expect(getLegacySeason(legacyConfig, new Date(2026, 8, 30, 23, 0))).toBe(2026);
    expect(getLegacySeason(legacyConfig, new Date(2026, 9, 1, 0, 0))).toBe(2027);
    expect(getLegacySeason(legacyConfig, new Date(2025, 9, 1, 0, 0))).toBe(2026);
  });

  it('maps a spring cutoff to the season of the same year', () => {
    const spring = { ...legacyConfig, yearChangeDate: new Date(2000, 3, 1) };
    expect(getLegacySeason(spring, new Date(2026, 2, 31))).toBe(2025);
    expect(getLegacySeason(spring, new Date(2026, 3, 1))).toBe(2026);
  });

  it('maps a 1 January cutoff to the calendar year', () => {
    const january = { ...legacyConfig, yearChangeDate: new Date(2000, 0, 1) };
    expect(getLegacySeason(january, new Date(2025, 11, 31))).toBe(2025);
    expect(getLegacySeason(january, new Date(2026, 0, 1))).toBe(2026);
  });
});

describe('legacy mode (season model not activated)', () => {
  it('is inactive without activation timestamp, even with backfill and season fields', () => {
    expect(isSeasonModelActive({ ...legacyConfig, currentSeason: 2026, seasonBackfillAt: new Date() })).toBe(false);
  });

  it('ignores stored season values and counts exactly like the old cutoff logic', () => {
    const now = new Date(2026, 9, 17);
    const beforeCutoff = appointmentAt(new Date(2026, 8, 15, 10), 1, { season: 2027 });
    const afterCutoff = appointmentAt(new Date(2026, 9, 5, 10), 1, { season: 2026 });

    const snapshot = calculateUserWorkHourSnapshot(user, [beforeCutoff, afterCutoff], legacyConfig, now);
    expect(snapshot.season).toBe(2027);
    expect(snapshot.summary.completedMinutes).toBe(60);
    expect(snapshot.entries.map((entry) => entry.appointmentId)).toEqual([afterCutoff.id]);
  });

  it('only offers the current legacy season for booking', () => {
    expect(getBookableSeasons(legacyConfig, new Date(2026, 9, 17))).toEqual([2027]);
  });

  it('writes no season fields when creating entries', () => {
    expect(buildParticipantSeasonFields(legacyConfig, 2027, 2027)).toEqual({});
  });
});

describe('active season model', () => {
  const now = new Date(2026, 9, 17);

  it('uses the configured current season instead of the cutoff', () => {
    expect(getCurrentSeason(activeConfig(), now)).toBe(2026);
    expect(getBookableSeasons(activeConfig(), now)).toEqual([2026, 2027]);
    expect(getBookableSeasons(activeConfig({ nextSeasonOpen: false }), now)).toEqual([2026]);
  });

  it('counts entries by their stored season and falls back to the cutoff for entries without one', () => {
    const backfilledSummer = appointmentAt(new Date(2026, 6, 1, 10), 1, { season: 2026 });
    const lateMember = appointmentAt(new Date(2026, 9, 10, 10), 1, { season: 2026, seasonManual: true });
    const winterWork = appointmentAt(new Date(2026, 9, 12, 10), 3, { season: 2027 });
    const legacyWithoutSeason = appointmentAt(new Date(2026, 4, 1, 10), 2);

    const snapshot2026 = calculateUserWorkHourSnapshot(user, [backfilledSummer, lateMember, winterWork, legacyWithoutSeason], activeConfig(), now);
    expect(snapshot2026.season).toBe(2026);
    expect(snapshot2026.summary.completedMinutes).toBe(60 + 60 + 120);
    expect(snapshot2026.entries.find((entry) => entry.appointmentId === lateMember.id)?.seasonManual).toBe(true);

    const snapshot2027 = calculateUserWorkHourSnapshot(user, [backfilledSummer, lateMember, winterWork, legacyWithoutSeason], activeConfig(), now, 2027);
    expect(snapshot2027.summary.completedMinutes).toBe(180);
  });

  it('keeps eligibility for the running season when the next season opens (no cliff)', () => {
    const summerHours = appointmentAt(new Date(2026, 5, 1, 10), 2, { season: 2026 });
    expect(isSeasonRequirementCovered(user, [summerHours], activeConfig(), 2026, now)).toBe(true);
    expect(isSeasonRequirementCovered(user, [summerHours], activeConfig(), 2027, now)).toBe(false);
  });

  it('resolves entry seasons with participant time overrides', () => {
    const appointment = appointmentAt(new Date(2026, 8, 30, 10), 1);
    const p = { ...appointment.participants[0], endTime: new Date(2026, 9, 2, 10) };
    expect(resolveEntrySeason(appointment, p, activeConfig())).toBe(2027);
  });
});

describe('default season for new entries', () => {
  const now = new Date(2026, 9, 17);

  it('books to the current season while hours are missing and to the next season otherwise', () => {
    expect(getDefaultSeasonForNewEntry(activeConfig(), false, now)).toBe(2026);
    expect(getDefaultSeasonForNewEntry(activeConfig(), true, now)).toBe(2027);
  });

  it('always books to the current season outside the overlap phase', () => {
    expect(getDefaultSeasonForNewEntry(activeConfig({ nextSeasonOpen: false }), true, now)).toBe(2026);
  });

  it('flags a deviating choice as manual', () => {
    expect(buildParticipantSeasonFields(activeConfig(), 2027, 2027)).toEqual({ season: 2027 });
    expect(buildParticipantSeasonFields(activeConfig(), 2026, 2027)).toEqual({ season: 2026, seasonManual: true });
  });

  it('lets managers pick the previous season and keeps existing values selectable', () => {
    expect(getManageableSeasons(activeConfig(), now)).toEqual([2025, 2026, 2027]);
    expect(getManageableSeasons(activeConfig({ nextSeasonOpen: false }), now, 2023)).toEqual([2023, 2025, 2026]);
  });
});

describe('suggestSeasonActivation', () => {
  it('suggests the running season with the next season open right after the October cutoff', () => {
    expect(suggestSeasonActivation(legacyConfig, new Date(2026, 9, 17))).toEqual({ currentSeason: 2026, nextSeasonOpen: true });
  });

  it('keeps the next season closed in mid summer', () => {
    expect(suggestSeasonActivation(legacyConfig, new Date(2026, 5, 1))).toEqual({ currentSeason: 2026, nextSeasonOpen: false });
  });

  it('keeps the previous season current during winter', () => {
    expect(suggestSeasonActivation(legacyConfig, new Date(2027, 1, 1))).toEqual({ currentSeason: 2026, nextSeasonOpen: true });
  });

  it('works for a spring cutoff', () => {
    const spring = { ...legacyConfig, yearChangeDate: new Date(2000, 3, 1) };
    expect(suggestSeasonActivation(spring, new Date(2026, 9, 17))).toEqual({ currentSeason: 2026, nextSeasonOpen: false });
  });
});

describe('planSeasonBackfill', () => {
  it('fills missing seasons and corrects stale ones before activation', () => {
    const missing = appointmentAt(new Date(2026, 8, 15, 10), 1);
    const stale = appointmentAt(new Date(2026, 9, 5, 10), 1, { season: 2026 });
    const correct = appointmentAt(new Date(2026, 9, 6, 10), 1, { season: 2027 });

    const plan = planSeasonBackfill([missing, stale, correct], legacyConfig);
    expect(plan.participantCount).toBe(3);
    expect(plan.changedParticipantCount).toBe(2);
    expect(plan.changes.map((change) => change.appointmentId)).toEqual([missing.id, stale.id]);
    expect(plan.changes[0].participants[0].season).toBe(2026);
    expect(plan.changes[1].participants[0].season).toBe(2027);
    expect(plan.countsBySeason).toEqual({ 2026: 1, 2027: 2 });
  });

  it('keeps all other participant fields untouched', () => {
    const appointment = appointmentAt(new Date(2026, 8, 15, 10), 1, { confirmedByUserId: 'admin', confirmedByUserName: 'Admin' });
    const plan = planSeasonBackfill([appointment], legacyConfig);
    expect(plan.changes[0].participants[0]).toEqual({ ...appointment.participants[0], season: 2026 });
  });

  it('only fills missing values after activation and never overrides chosen seasons', () => {
    const chosen = appointmentAt(new Date(2026, 9, 10, 10), 1, { season: 2026, seasonManual: true });
    const missing = appointmentAt(new Date(2026, 9, 11, 10), 1);
    const plan = planSeasonBackfill([chosen, missing], activeConfig());
    expect(plan.changes.map((change) => change.appointmentId)).toEqual([missing.id]);
    expect(plan.changes[0].participants[0].season).toBe(2027);
  });

  it('reports nothing to do when everything is in sync', () => {
    const plan = planSeasonBackfill([appointmentAt(new Date(2026, 8, 15, 10), 1, { season: 2026 })], legacyConfig);
    expect(plan.changes).toHaveLength(0);
  });
});

describe('collectKnownSeasons', () => {
  it('lists seasons with entries plus bookable seasons, newest first', () => {
    const appointments = [appointmentAt(new Date(2024, 5, 1, 10), 1, { season: 2024 })];
    expect(collectKnownSeasons(appointments, activeConfig(), new Date(2026, 9, 17))).toEqual([2027, 2026, 2024]);
  });
});
