# Neuigkeiten (Changelog)

Unter **Menü → Neuigkeiten** (`/changelog`) sehen alle Nutzer die Änderungen an der App. Ungelesene Einträge werden mit einem Punkt am Menü-Symbol und einer Zahl am Menüpunkt angezeigt.

## Pflege

**Jede Änderung an App oder Logik, die Nutzer betrifft, bekommt einen Eintrag** in `src/changelog.ts` – im selben Commit wie die Änderung. Das gilt für neue Funktionen, geänderte Regeln/Rechte, Verbesserungen und Fehlerbehebungen. Rein technische Änderungen ohne sichtbare Auswirkung (Refactoring, Tests, Tooling) brauchen keinen Eintrag.

Aufbau eines Eintrags (`ChangelogEntry`, siehe `src/domain/changelog.ts`):

| Feld | Bedeutung |
|---|---|
| `id` | eindeutig und stabil, z. B. `2026-10-17-saisons`; nie nachträglich ändern (wird pro Nutzer als gelesen gespeichert) |
| `date` | `YYYY-MM-DD`; neueste Einträge stehen oben |
| `type` | `feature`, `improvement`, `fix` oder `security` |
| `title`, `summary` | kurz und aus Nutzersicht |
| `sections[]` | Abschnitte je Zielgruppe mit Stichpunkten |

Zielgruppen (`audience`): `all`, `bootswart`, `admin`, `superadmin`. Höhere Rollen sehen auch die Abschnitte der niedrigeren; Einträge ohne sichtbaren Abschnitt werden ausgeblendet.

Mit `onlyWhen` wird ein Abschnitt an einen Zustand gebunden, z. B. `seasonModelActive` (erst nach Aktivierung des Saisonmodells sichtbar) oder `seasonModelInactive` (nur bis dahin, z. B. Umstellungshinweise für Superadmins).

Schreibstil: kurze deutsche Sätze, ohne Technikbegriffe; Hinweise, was Nutzer tun oder beachten müssen, gehören in den Abschnitt ihrer Rolle.

## Gelesen-Status

Beim Öffnen der Seite werden die IDs aller sichtbaren Einträge in `users/{uid}.preferences.seenChangelogIds` gespeichert. Weil IDs statt eines Datums gespeichert werden, fallen auch Einträge auf, die erst später sichtbar werden (z. B. nach Aktivierung eines Features oder einem Rollenwechsel).
