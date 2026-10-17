import { formatActivity } from '../activityFormat';
import { ActivityLogEntry, ActivityType } from '../../types/models';

const context = { boatName: (id: string) => ({ b1: 'Laser', b2: 'Optimist' } as Record<string, string>)[id] };

const entry = (type: ActivityType, details: Record<string, unknown>, entityType: ActivityLogEntry['entityType'] = 'workHour'): ActivityLogEntry => ({
  id: 'log', type, entityId: 'x1', entityType, actorId: 'a', actorName: 'Admin', timestamp: new Date(), details,
});

describe('formatActivity', () => {
  it('describes participant decisions as a sentence with a status change', () => {
    const result = formatActivity(entry('workHour.updated', {
      action: 'participant_status_changed', title: 'Bootsputztag', targetUserId: 'u1', targetUserName: 'Max', previousStatus: 'pending', newStatus: 'confirmed',
    }), context);
    expect(result.summary).toBe('Max bei „Bootsputztag“ bestätigt');
    expect(result.fields).toEqual([{ label: 'Status', value: 'Offen → Bestätigt' }]);
  });

  it('describes a withdrawn confirmation', () => {
    const result = formatActivity(entry('workHour.updated', {
      action: 'participant_status_changed', title: 'Slip', targetUserName: 'Max', previousStatus: 'confirmed', newStatus: 'pending',
    }), context);
    expect(result.summary).toBe('Freigabe für Max bei „Slip“ zurückgenommen');
  });

  it('resolves boat names and shows "Kein Boot"', () => {
    const result = formatActivity(entry('workHour.updated', { action: 'boat_changed', title: 'Slip', previousBoatId: '', newBoatId: 'b1' }), context);
    expect(result.fields).toEqual([{ label: 'Boot', value: 'Kein Boot → Laser' }]);
  });

  it('formats reservation status changes with German labels', () => {
    const result = formatActivity(entry('reservation.status_changed', { title: 'Tour', previousStatus: 'pending', newStatus: 'approved' }, 'reservation'), context);
    expect(result.summary).toBe('Reservierung „Tour“: Genehmigt');
    expect(result.fields[0].value).toBe('Ausstehend → Genehmigt');
  });

  it('formats season events', () => {
    expect(formatActivity(entry('season.activated', { currentSeason: 2026, nextSeasonOpen: true }, 'system'), context).summary)
      .toBe('Saisonmodell aktiviert – aktuelle Saison 2026, Buchung für 2027 geöffnet');
    const backfill = formatActivity(entry('season.backfill', { appointments: 3, participants: 4, modelActive: false, countsBySeason: '{"2026":3,"2027":1}' }, 'system'), context);
    expect(backfill.fields).toEqual([
      { label: 'Saisonmodell aktiv', value: 'nein' },
      { label: 'Einträge je Saison', value: 'Saison 2027: 1, Saison 2026: 3' },
    ]);
  });

  it('keeps unknown fields and hides technical ids', () => {
    const result = formatActivity(entry('member.updated', { displayName: 'Max', roles: 'MEMBER,ADMIN', feesPaid: true }, 'member'), context);
    expect(result.summary).toBe('Mitglied „Max“ bearbeitet');
    expect(result.fields).toEqual([
      { label: 'Rollen', value: 'Mitglied, Admin' },
      { label: 'Beitrag bezahlt', value: 'ja' },
    ]);
  });

  it('falls back gracefully for unknown event types', () => {
    const result = formatActivity(entry('custom.event' as ActivityType, { foo: 'bar' }), context);
    expect(result.summary).toBe('custom.event');
    expect(result.fields).toEqual([{ label: 'foo', value: 'bar' }]);
  });
});
