import { ActivityEntityType, ActivityLogEntry } from '../types/models';

/**
 * Lesbare Darstellung von Audit-Log-Einträgen (v2-Aktivitätslog).
 * Jeder Ereignistyp bekommt einen Satz und eine kurze Feldliste; unbekannte Typen und
 * zusätzliche Felder fallen auf eine generische Darstellung zurück, damit nichts verloren geht.
 */

export interface ActivityField {
  label: string;
  value: string;
}

export interface FormattedActivity {
  category: ActivityEntityType;
  /** Ein Satz ohne Akteur (der Akteur wird separat angezeigt). */
  summary: string;
  fields: ActivityField[];
}

export interface ActivityFormatContext {
  boatName: (boatId: string) => string | undefined;
}

const PARTICIPANT_STATUS: Record<string, string> = { pending: 'Offen', confirmed: 'Bestätigt', declined: 'Abgelehnt' };
const RESERVATION_STATUS: Record<string, string> = {
  draft: 'Vormerkung', pending: 'Ausstehend', approved: 'Genehmigt', rejected: 'Abgelehnt', cancelled: 'Storniert',
};
const ROLE_LABELS: Record<string, string> = { SUPERADMIN: 'Superadmin', ADMIN: 'Admin', MEMBER: 'Mitglied', APPLICANT: 'Bewerber' };

/** Deutsche Bezeichnungen für Detailfelder, die nicht von einem Formatierer verarbeitet werden. */
const FIELD_LABELS: Record<string, string> = {
  title: 'Titel', name: 'Name', displayName: 'Name', email: 'E-Mail', roles: 'Rollen', feesPaid: 'Beitrag bezahlt',
  blocked: 'Gesperrt', status: 'Status', boatId: 'Boot', private: 'Privat', autoConfirmed: 'Direkt bestätigt',
  season: 'Saison', seasonManual: 'Saison abweichend gewählt', seriesCopy: 'Serienkopie', targetUserName: 'Mitglied',
  previousStatus: 'Status vorher', newStatus: 'Status neu', previousSeason: 'Saison vorher', newSeason: 'Saison neu',
  previousBoatId: 'Boot vorher', newBoatId: 'Boot neu', currentSeason: 'Aktuelle Saison', nextSeason: 'Nächste Saison',
  nextSeasonOpen: 'Nächste Saison geöffnet', appointments: 'Termine',
  participants: 'Einträge', countsBySeason: 'Einträge je Saison', modelActive: 'Saisonmodell aktiv', undo: 'Rücknahme',
  action: 'Aktion',
};

/** Technische Felder, die in der Feldliste nicht angezeigt werden (stehen in den Rohdaten). */
const HIDDEN_FIELDS = new Set(['targetUserId', 'action']);

const quote = (value: unknown) => `„${String(value ?? '')}“`;

export function formatValue(key: string, value: unknown, context: ActivityFormatContext): string {
  if (value === null || value === undefined || value === '') return '–';
  if (typeof value === 'boolean') return value ? 'ja' : 'nein';
  if (key.toLowerCase().includes('boatid')) return context.boatName(String(value)) ?? String(value);
  if (key === 'roles') return String(value).split(',').filter(Boolean).map((role) => ROLE_LABELS[role] ?? role).join(', ');
  if (key === 'countsBySeason') {
    try {
      const counts = JSON.parse(String(value)) as Record<string, number>;
      return Object.entries(counts).sort(([a], [b]) => Number(b) - Number(a)).map(([season, count]) => `Saison ${season}: ${count}`).join(', ');
    } catch {
      return String(value);
    }
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const change = (label: string, from: string, to: string): ActivityField => ({ label, value: `${from} → ${to}` });

/** Generische Feldliste für alle nicht explizit verarbeiteten Detailfelder. */
function remainingFields(details: Record<string, unknown>, used: string[], context: ActivityFormatContext): ActivityField[] {
  return Object.entries(details)
    .filter(([key]) => !used.includes(key) && !HIDDEN_FIELDS.has(key))
    .map(([key, value]) => ({ label: FIELD_LABELS[key] ?? key, value: formatValue(key, value, context) }));
}

export function formatActivity(entry: ActivityLogEntry, context: ActivityFormatContext): FormattedActivity {
  const d = (entry.details ?? {}) as Record<string, any>;
  const title = d.title ? quote(d.title) : 'Eintrag';
  const result = (summary: string, fields: ActivityField[], used: string[]): FormattedActivity => ({
    category: entry.entityType,
    summary,
    fields: [...fields, ...remainingFields(d, used, context)],
  });

  switch (entry.type) {
    case 'workHour.updated': {
      if (d.action === 'participant_status_changed') {
        const verb = d.newStatus === 'confirmed' ? 'bestätigt' : d.newStatus === 'declined' ? 'abgelehnt' : 'Freigabe zurückgenommen';
        return result(
          d.newStatus === 'pending' ? `Freigabe für ${d.targetUserName ?? 'Mitglied'} bei ${title} zurückgenommen` : `${d.targetUserName ?? 'Mitglied'} bei ${title} ${verb}`,
          [change('Status', PARTICIPANT_STATUS[d.previousStatus] ?? String(d.previousStatus ?? '–'), PARTICIPANT_STATUS[d.newStatus] ?? String(d.newStatus))],
          ['title', 'targetUserName', 'previousStatus', 'newStatus'],
        );
      }
      if (d.action === 'season_changed') {
        return result(
          `Saison von ${d.targetUserName ?? 'Mitglied'} bei ${title} geändert`,
          [change('Saison', String(d.previousSeason ?? '–'), String(d.newSeason ?? '–'))],
          ['title', 'targetUserName', 'previousSeason', 'newSeason'],
        );
      }
      if (d.action === 'boat_changed') {
        const from = d.previousBoatId ? (context.boatName(d.previousBoatId) ?? d.previousBoatId) : 'Kein Boot';
        const to = d.newBoatId ? (context.boatName(d.newBoatId) ?? d.newBoatId) : 'Kein Boot';
        return result(`Boot von ${title} geändert`, [change('Boot', from, to)], ['title', 'previousBoatId', 'newBoatId']);
      }
      if (d.season !== undefined && d.previousSeason !== undefined) {
        return result(`${title} bearbeitet`, [change('Saison', String(d.previousSeason ?? '–'), String(d.season))], ['title', 'previousSeason', 'season']);
      }
      return result(`${title} bearbeitet`, [], ['title']);
    }
    case 'workHour.created':
      if (d.private) {
        return result(`Private Stunden eingetragen: ${title}${d.autoConfirmed ? ' (direkt bestätigt)' : ''}`, [], ['title', 'private', 'autoConfirmed']);
      }
      return result(d.seriesCopy ? `Serienkopie angelegt: ${title}` : `Arbeitstermin angelegt: ${title}`, [], ['title', 'seriesCopy']);
    case 'workHour.deleted':
      return result(`${title} gelöscht`, [], ['title']);

    case 'reservation.created': {
      const boat = d.boatId ? context.boatName(d.boatId) : undefined;
      const status = RESERVATION_STATUS[d.status] ?? d.status;
      return result(
        `${d.seriesCopy ? 'Serienkopie' : 'Reservierung'} ${title}${boat ? ` (${boat})` : ''} angelegt${status ? ` – ${status}` : ''}`,
        [],
        ['title', 'boatId', 'status', 'seriesCopy'],
      );
    }
    case 'reservation.status_changed':
      if (d.action === 'updated') {
        return result(`Reservierung ${title} bearbeitet`, [], ['title', 'action']);
      }
      return result(
        `Reservierung ${title}: ${RESERVATION_STATUS[d.newStatus] ?? d.newStatus}`,
        [change('Status', RESERVATION_STATUS[d.previousStatus] ?? String(d.previousStatus ?? '–'), RESERVATION_STATUS[d.newStatus] ?? String(d.newStatus))],
        ['title', 'previousStatus', 'newStatus'],
      );
    case 'reservation.deleted':
      return result(`Reservierung ${title} gelöscht`, [], ['title']);

    case 'boat.created':
      return result(`Boot ${quote(d.name)} angelegt`, [], ['name']);
    case 'boat.updated':
      return result(`Boot ${quote(d.name)} bearbeitet${d.blocked === true ? ' – gesperrt' : d.blocked === false ? ' – freigegeben' : ''}`, [], ['name', 'blocked']);
    case 'boat.deleted':
      return result(`Boot ${quote(d.name)} gelöscht`, [], ['name']);

    case 'member.created':
      return result(`Mitglied ${quote(d.displayName)} angelegt`, [], ['displayName']);
    case 'member.updated':
      return result(`Mitglied ${quote(d.displayName)} bearbeitet`, [], ['displayName']);
    case 'member.deactivated':
      return result(`Mitglied ${quote(d.displayName)} deaktiviert`, [], ['displayName']);
    case 'member.deleted':
      return result(`Mitglied ${quote(d.displayName)} gelöscht`, [], ['displayName']);

    case 'season.backfill':
      return result(`Saison-Backfill: ${d.participants ?? 0} Einträge in ${d.appointments ?? 0} Terminen aktualisiert`, [], ['participants', 'appointments']);
    case 'season.activated':
      return result(
        `Saisonmodell aktiviert – aktuelle Saison ${d.currentSeason}${d.nextSeasonOpen ? `, Buchung für ${Number(d.currentSeason) + 1} geöffnet` : ''}`,
        [],
        ['currentSeason', 'nextSeasonOpen'],
      );
    case 'season.next_opened':
      return result(`Buchung für Saison ${d.nextSeason} geöffnet`, [], ['nextSeason']);
    case 'season.started':
      return d.undo
        ? result(`Saisonstart zurückgenommen – Saison ${d.currentSeason} ist wieder aktuell`, [change('Saison', String(d.previousSeason), String(d.currentSeason))], ['previousSeason', 'currentSeason', 'undo'])
        : result(`Saison ${d.currentSeason} gestartet`, [change('Saison', String(d.previousSeason), String(d.currentSeason))], ['previousSeason', 'currentSeason']);

    default:
      return result(String(entry.type), [], []);
  }
}
