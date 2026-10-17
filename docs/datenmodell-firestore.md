# Datenmodell Firestore

## Collections

## `users`

Wichtige Felder:

- `displayName`
- `email`
- `roles`
- `feesPaid`
- `skipHours`
- `onboardingState`

## `boats`

Wichtige Felder:

- `name`
- `bootswart` – User-ID des ersten Bootswarts (optional)
- `bootswart2` – User-ID des zweiten Bootswarts (optional)
- `requiresApproval`
- `blocked`
- `color`

## `boatReservations`

Wichtige Felder:

- `boatId`
- `userId`
- `userName`
- `title`
- `description`
- `startTime`
- `endTime`
- `status` (`draft`, `pending`, `approved`, `rejected`, `cancelled`)
- `visibility` (`private`, `public`)
- `publicDetails.freeSeatsText`
- `eligibilitySnapshot`

## `publicBoatReservations`

Datensparsame, extern lesbare Projektion:

- `boatId`
- `boatName`
- `title`
- `startTime`
- `endTime`
- `visibility`
- `reservationStatus`
- `freeSeatsText`
- `updatedAt`

## `workAppointments`

Wichtige Felder:

- `title`
- `description`
- `startTime`
- `endTime`
- `boatId`
- `participants[]`
  - `season` – Saison (Jahreszahl), für die der Eintrag zählt; fehlt bei Alt-Einträgen vor dem Backfill
  - `seasonManual` – `true`, wenn das Mitglied bewusst von der vorgeschlagenen Saison abgewichen ist
- `supplies[]`
- `private`

## `systemConfig/default`

- `yearChangeDate` – Stichtag (nur Tag/Monat). Vor Aktivierung des Saisonmodells Grundlage aller Berechnungen, danach nur Fallback für Einträge ohne `season`
- `workHourThreshold` – Pflichtstunden pro Saison
- `calendarDefaults`
- `featureFlags`
- Saisonmodell (alle optional, siehe `docs/arbeitsstunden-logik.md`):
  - `currentSeason` – aktuelle Saison (zählt für die Reservierungsberechtigung)
  - `nextSeasonOpen` – Buchung für `currentSeason + 1` geöffnet
  - `nextSeasonOpenedAt`, `currentSeasonStartedAt` – Zeitpunkte der letzten Saisonaktionen
  - `seasonBackfillAt` – letzter Backfill der Saisonzuordnung
  - `seasonModelActivatedAt` – Aktivierung des Saisonmodells; ohne diesen Wert gilt ausschließlich `yearChangeDate`
