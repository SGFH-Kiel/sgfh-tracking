import { SystemConfig, WorkAppointment, WorkParticipant } from '../types/models';

/**
 * Saisonmodell für Arbeitsstunden.
 *
 * Eine Saison wird über die Jahreszahl ihres Sommers benannt (z. B. 2026).
 * Solange das Saisonmodell nicht aktiviert ist (`seasonModelActivatedAt` fehlt),
 * wird ausschließlich mit dem bisherigen Stichtag `yearChangeDate` gerechnet –
 * gespeicherte `season`-Werte werden dann bewusst ignoriert.
 */

/** Beginn des alten Abrechnungszeitraums (Stichtag `yearChangeDate`, nur Tag und Monat relevant). */
export function getAccountingYearStart(config: SystemConfig, referenceDate: Date): Date {
  const configuredMonth = config.yearChangeDate.getMonth();
  const configuredDay = config.yearChangeDate.getDate();
  const currentYearStart = new Date(referenceDate.getFullYear(), configuredMonth, configuredDay, 0, 0, 0, 0);

  if (referenceDate.getTime() >= currentYearStart.getTime()) {
    return currentYearStart;
  }

  return new Date(referenceDate.getFullYear() - 1, configuredMonth, configuredDay, 0, 0, 0, 0);
}

/** Saisons zählen erst ab diesem Wert als plausibel (Schutz gegen 0/NaN aus Altdaten). */
const MIN_SEASON = 2000;

export function isSeasonModelActive(config: SystemConfig): boolean {
  return !!config.seasonModelActivatedAt && isValidSeason(config.currentSeason);
}

export function isValidSeason(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_SEASON;
}

/**
 * Bildet den alten Abrechnungszeitraum (Stichtag `yearChangeDate`) auf eine Saison ab:
 * Saison = Jahr, in dessen Sommer (1. Juli) der Zeitraum liegt.
 *
 * Beispiele: Stichtag 01.10. → Zeitraum 01.10.2025–30.09.2026 = Saison 2026.
 *            Stichtag 01.04. → Zeitraum 01.04.2026–31.03.2027 = Saison 2026.
 */
export function getLegacySeason(config: SystemConfig, date: Date): number {
  const start = getAccountingYearStart(config, date);
  const julyFirst = new Date(start.getFullYear(), 6, 1, 0, 0, 0, 0);
  return start.getTime() <= julyFirst.getTime() ? start.getFullYear() : start.getFullYear() + 1;
}

/** Saison, deren Stunden aktuell für die Reservierungsberechtigung zählen. */
export function getCurrentSeason(config: SystemConfig, now: Date = new Date()): number {
  return isSeasonModelActive(config) ? config.currentSeason! : getLegacySeason(config, now);
}

export function isNextSeasonOpen(config: SystemConfig): boolean {
  return isSeasonModelActive(config) && config.nextSeasonOpen === true;
}

/** Saisons, auf die Mitglieder aktuell buchen können (aufsteigend). */
export function getBookableSeasons(config: SystemConfig, now: Date = new Date()): number[] {
  const current = getCurrentSeason(config, now);
  return isNextSeasonOpen(config) ? [current, current + 1] : [current];
}

/**
 * Saisons, die Admins/Bootswarte bei Korrekturen wählen können: zusätzlich die Vorsaison
 * und ein ggf. bereits gesetzter Wert außerhalb dieses Fensters.
 */
export function getManageableSeasons(config: SystemConfig, now: Date = new Date(), existing?: number): number[] {
  const current = getCurrentSeason(config, now);
  const seasons = new Set<number>([current - 1, ...getBookableSeasons(config, now)]);
  if (isValidSeason(existing)) {
    seasons.add(existing);
  }
  return Array.from(seasons).sort((a, b) => a - b);
}

export function resolveParticipantEndTime(appointment: WorkAppointment, participant: WorkParticipant): Date {
  return participant.endTime ?? appointment.endTime;
}

/** Saison, für die ein Teilnehmereintrag zählt. */
export function resolveEntrySeason(appointment: WorkAppointment, participant: WorkParticipant, config: SystemConfig): number {
  if (isSeasonModelActive(config) && isValidSeason(participant.season)) {
    return participant.season;
  }
  return getLegacySeason(config, resolveParticipantEndTime(appointment, participant));
}

/**
 * Standard-Saison für einen neuen Eintrag: In der Überlappungsphase zählt ein Eintrag
 * für die aktuelle Saison, solange das Mitglied dort noch Stunden offen hat – sonst für die nächste.
 */
export function getDefaultSeasonForNewEntry(
  config: SystemConfig,
  currentSeasonRequirementMet: boolean,
  now: Date = new Date(),
): number {
  const current = getCurrentSeason(config, now);
  if (!isNextSeasonOpen(config)) {
    return current;
  }
  return currentSeasonRequirementMet ? current + 1 : current;
}

/**
 * Felder, die beim Anlegen eines Teilnehmereintrags gesetzt werden.
 * Vor Aktivierung des Saisonmodells wird nichts geschrieben, damit sich das Verhalten nicht ändert.
 */
export function buildParticipantSeasonFields(
  config: SystemConfig,
  selectedSeason: number,
  defaultSeason: number,
): Pick<WorkParticipant, 'season' | 'seasonManual'> {
  if (!isSeasonModelActive(config)) {
    return {};
  }
  return selectedSeason === defaultSeason
    ? { season: selectedSeason }
    : { season: selectedSeason, seasonManual: true };
}

export function formatSeason(season: number): string {
  return `Saison ${season}`;
}

/**
 * Vorschlag für die Aktivierung: Die aktuelle Saison ist die, deren Segelsommer zuletzt begonnen hat
 * (ab 1. April des Jahres). Ist der alte Stichtag bereits auf die Folgesaison gesprungen,
 * wird die Buchung für die nächste Saison direkt geöffnet.
 */
export function suggestSeasonActivation(config: SystemConfig, now: Date = new Date()): { currentSeason: number; nextSeasonOpen: boolean } {
  const sailingYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const legacy = getLegacySeason(config, now);
  const currentSeason = Math.min(sailingYear, legacy);
  return { currentSeason, nextSeasonOpen: legacy > currentSeason };
}

export interface SeasonBackfillChange {
  appointmentId: string;
  title: string;
  participants: WorkParticipant[];
  changedCount: number;
}

export interface SeasonBackfillPlan {
  changes: SeasonBackfillChange[];
  participantCount: number;
  changedParticipantCount: number;
  /** Anzahl Teilnehmereinträge pro Saison nach dem Backfill. */
  countsBySeason: Record<number, number>;
}

/**
 * Plant den Backfill der `season`-Felder.
 *
 * - Vor der Aktivierung werden alle Einträge auf die Altsaison (Stichtag) synchronisiert – auch solche,
 *   deren Zeit seit dem letzten Backfill geändert wurde.
 * - Nach der Aktivierung werden nur noch fehlende Werte ergänzt; bewusst gewählte Saisons bleiben unangetastet.
 */
export function planSeasonBackfill(appointments: WorkAppointment[], config: SystemConfig): SeasonBackfillPlan {
  const modelActive = isSeasonModelActive(config);
  const changes: SeasonBackfillChange[] = [];
  const countsBySeason: Record<number, number> = {};
  let participantCount = 0;
  let changedParticipantCount = 0;

  appointments.forEach((appointment) => {
    let changedCount = 0;
    const participants = (appointment.participants || []).map((participant) => {
      participantCount += 1;
      const legacySeason = getLegacySeason(config, resolveParticipantEndTime(appointment, participant));
      const hasSeason = isValidSeason(participant.season);
      const needsUpdate = modelActive ? !hasSeason : participant.season !== legacySeason || participant.seasonManual !== undefined;
      const targetSeason = needsUpdate ? legacySeason : (participant.season as number);
      countsBySeason[targetSeason] = (countsBySeason[targetSeason] || 0) + 1;
      if (!needsUpdate) {
        return participant;
      }
      changedCount += 1;
      const { seasonManual: _ignored, ...rest } = participant;
      return { ...rest, season: legacySeason };
    });

    if (changedCount > 0) {
      changedParticipantCount += changedCount;
      changes.push({ appointmentId: appointment.id, title: appointment.title, participants, changedCount });
    }
  });

  return { changes, participantCount, changedParticipantCount, countsBySeason };
}

/** Alle Saisons, für die Einträge existieren, plus aktuelle/buchbare Saisons (absteigend). */
export function collectKnownSeasons(appointments: WorkAppointment[], config: SystemConfig, now: Date = new Date()): number[] {
  const seasons = new Set<number>(getBookableSeasons(config, now));
  appointments.forEach((appointment) => {
    (appointment.participants || []).forEach((participant) => {
      seasons.add(resolveEntrySeason(appointment, participant, config));
    });
  });
  return Array.from(seasons).sort((a, b) => b - a);
}
