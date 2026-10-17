import humanizeDuration from 'humanize-duration';
import { SystemConfig, User } from '../types/models';
import { formatSeason, isSeasonModelActive } from './seasons';

const humanizer = humanizeDuration.humanizer({ language: 'de', round: true, units: ['h', 'm'], delimiter: ' und ' });

export interface ReservationEligibility {
  canReserve: boolean;
  missingRequirements: string[];
  /** Noch fehlende Pflichtminuten der aktuellen Saison (0, wenn erfüllt oder befreit). */
  missingMinutes: number;
}

/**
 * Voraussetzungen für finale Reservierungen: bezahlter Beitrag, aktives Mitglied und – sofern nicht befreit –
 * erfüllte Pflichtstunden der aktuellen Saison (nur bestätigte, abgeschlossene Einträge zählen).
 */
export function getReservationEligibility(user: User, completedMinutes: number, config: SystemConfig, season: number): ReservationEligibility {
  const missingRequirements: string[] = [];
  if (!user.feesPaid) {
    missingRequirements.push('Mitgliedsbeitrag nicht bezahlt');
  }
  if (user.deactivated) {
    missingRequirements.push('Mitglied deaktiviert');
  }
  let missingMinutes = 0;
  if (!user.skipHours) {
    missingMinutes = Math.max(0, Math.round(config.workHourThreshold * 60) - completedMinutes);
    if (missingMinutes > 0) {
      missingRequirements.push(
        isSeasonModelActive(config)
          ? `Arbeitsstunden ${formatSeason(season)} nicht erfüllt (${humanizer(missingMinutes * 60000)})`
          : `Arbeitsstunden nicht erfüllt (${humanizer(missingMinutes * 60000)})`,
      );
    }
  }
  return { canReserve: missingRequirements.length === 0, missingRequirements, missingMinutes };
}
