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

## Saisonmodell für Arbeitsstunden

Das Saisonmodell (siehe `docs/arbeitsstunden-logik.md`) wird ohne Wartungsfenster eingeführt. Nach dem Deployment ändert sich zunächst **nichts**: Solange `systemConfig.seasonModelActivatedAt` fehlt, rechnet die App ausschließlich wie bisher mit `yearChangeDate`.

### Neue Felder

- `workAppointments.participants[].season`, `participants[].seasonManual`
- `systemConfig.currentSeason`, `nextSeasonOpen`, `nextSeasonOpenedAt`, `currentSeasonStartedAt`, `seasonBackfillAt`, `seasonModelActivatedAt`

Es werden keine Felder gelöscht oder umbenannt. `yearChangeDate` bleibt erhalten.

### Ablauf der Umstellung (Superadmin, Systemeinstellungen → Saisonsteuerung)

1. **Sicherung** der Produktionsdaten (`npm run backup`, siehe `docs/backups.md`).
2. **Deployment** von App und `firestore.rules` (Regeln und App gemeinsam ausrollen).
3. **Backfill**: „Prüfen“ zeigt, wie viele Einträge welcher Saison zugeordnet werden. „Backfill ausführen“ schreibt an jeden Teilnehmereintrag die Saison, die sich aus dem bisherigen Stichtag ergibt (Stichtag 01.10.: 01.10.2025–30.09.2026 = Saison 2026). Summen und Berechtigungen ändern sich dadurch nicht. Pro Termin wird der aktuelle Stand gelesen, nur `participants` wird geschrieben. Der Backfill ist idempotent und kann wiederholt werden; vor der Aktivierung korrigiert er auch Einträge, deren Zeit sich seit dem letzten Lauf geändert hat.
4. **Aktivierung**: erst möglich, wenn ein Backfill gelaufen ist und eine erneute Prüfung keine Abweichungen zeigt. Der Dialog schlägt die aktuelle Saison und den Status der Folgesaison vor (Mitte Oktober 2026: aktuelle Saison 2026, Buchung für 2027 geöffnet) und zeigt, wie viele Mitglieder die Stunden der gewählten Saison erfüllt haben.

Ab der Aktivierung erhalten neue Einträge immer eine `season`. Einträge alter Clients ohne `season` fallen auf den Stichtag zurück. Sie lassen sich unter „Erweitert → Fehlende Zuordnungen prüfen“ nachtragen.

### Rücknahme

- Vor der Aktivierung: Backfill-Werte werden ignoriert, keine Aktion nötig.
- Nach der Aktivierung: `seasonModelActivatedAt` im Dokument `systemConfig/default` entfernen (Firebase-Konsole). Die App rechnet dann wieder mit `yearChangeDate`. Gespeicherte `season`-Werte bleiben erhalten und werden ignoriert.
- Einzelner Saisonstart: „Saisonstart zurücknehmen“ (Superadmin).

## Bekannte Folgearbeit

Die Synchronisierung von `publicBoatReservations` sollte mittelfristig von einer Cloud Function übernommen werden.
