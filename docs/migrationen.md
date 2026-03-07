# Migrationen

## Neue Felder

### `users`

- `onboardingState`

### `boatReservations`

- `visibility`
- `publicDetails`
- `eligibilitySnapshot`
- erweiterter `status` mit `draft` und `cancelled`

## Neue Collection

- `publicBoatReservations`

## Neue Indexe

- `boatReservations` nach `boatId`, `startTime`, `endTime`, `status`
- `publicBoatReservations` nach `visibility`, `reservationStatus`, `startTime`

## Backfill-Empfehlung

Bestehende Reservierungen sollten mindestens wie folgt ergänzt werden:

- `visibility: private`
- `status`: bestehende finale Reservierungen auf `approved` oder `pending` abbilden
- `publicDetails`: nur bei bewusst öffentlichen Reservierungen setzen

## Bekannte Folgearbeit

Die Synchronisierung von `publicBoatReservations` sollte mittelfristig von einer Cloud Function übernommen werden.
