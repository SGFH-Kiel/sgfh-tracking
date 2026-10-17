/**
 * Changelog („Neuigkeiten“) – Logik zur Sichtbarkeit.
 * Die Einträge selbst stehen in `src/changelog.ts`.
 */

/** Zielgruppe eines Abschnitts. Höhere Rollen sehen auch die Abschnitte der niedrigeren. */
export type ChangelogAudience = 'all' | 'bootswart' | 'admin' | 'superadmin';

export type ChangelogEntryType = 'feature' | 'improvement' | 'fix' | 'security';

/** Bedingungen, unter denen ein Abschnitt angezeigt wird (z. B. erst nach Aktivierung eines Features). */
export type ChangelogCondition = 'seasonModelActive' | 'seasonModelInactive';

export interface ChangelogSection {
  audience: ChangelogAudience;
  title?: string;
  items: string[];
  onlyWhen?: ChangelogCondition;
}

export interface ChangelogEntry {
  /** Stabile, eindeutige ID (wird pro Nutzer als „gelesen“ gespeichert). */
  id: string;
  /** ISO-Datum `YYYY-MM-DD` */
  date: string;
  title: string;
  type: ChangelogEntryType;
  summary?: string;
  sections: ChangelogSection[];
}

export interface ChangelogViewer {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isBootswart: boolean;
  seasonModelActive: boolean;
}

export function canSeeAudience(audience: ChangelogAudience, viewer: ChangelogViewer): boolean {
  switch (audience) {
    case 'all':
      return true;
    case 'bootswart':
      return viewer.isBootswart || viewer.isAdmin || viewer.isSuperAdmin;
    case 'admin':
      return viewer.isAdmin || viewer.isSuperAdmin;
    case 'superadmin':
      return viewer.isSuperAdmin;
    default:
      return false;
  }
}

function conditionMet(condition: ChangelogCondition | undefined, viewer: ChangelogViewer): boolean {
  if (!condition) return true;
  if (condition === 'seasonModelActive') return viewer.seasonModelActive;
  return !viewer.seasonModelActive;
}

/** Einträge mit den für den Betrachter sichtbaren Abschnitten; Einträge ohne sichtbaren Abschnitt entfallen. */
export function getVisibleChangelog(entries: ChangelogEntry[], viewer: ChangelogViewer): ChangelogEntry[] {
  return entries
    .map((entry) => ({
      ...entry,
      sections: entry.sections.filter((section) => canSeeAudience(section.audience, viewer) && conditionMet(section.onlyWhen, viewer)),
    }))
    .filter((entry) => entry.sections.length > 0);
}

/**
 * Ungelesene Einträge. Gespeichert werden die IDs gesehener Einträge, damit auch Einträge auffallen,
 * die erst später sichtbar werden (z. B. nach Aktivierung eines Features).
 */
export function getUnseenChangelog(visible: ChangelogEntry[], seenIds: string[] | undefined): ChangelogEntry[] {
  const seen = new Set(seenIds ?? []);
  return visible.filter((entry) => !seen.has(entry.id));
}

/** Neue Liste gesehener IDs nach dem Öffnen der Seite (bereits gesehene bleiben erhalten). */
export function mergeSeenChangelogIds(visible: ChangelogEntry[], seenIds: string[] | undefined): string[] {
  return Array.from(new Set([...(seenIds ?? []), ...visible.map((entry) => entry.id)]));
}
