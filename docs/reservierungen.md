# Reservierungen

## Statusmodell

- `draft`: unverbindliche Vormerkung
- `pending`: finale Reservierung wartet auf Genehmigung
- `approved`: finale Reservierung freigegeben
- `rejected`: abgelehnt
- `cancelled`: storniert

## Fachliches Verhalten

- `draft`-Reservierungen warnen andere Mitglieder bei überlappenden Zeitfenstern
- `pending` und `approved` blockieren das Boot hart
- `rejected` und `cancelled` erzeugen keine Konflikte mehr

## Öffentliche Reservierungen

Reservierungen können als `public` markiert werden, wenn freie Plätze vorhanden sind.
Für externe Ausspielung wird nur die Collection `publicBoatReservations` verwendet.
Nur Reservierungen mit Status `pending` oder `approved` werden in den öffentlichen Feed synchronisiert — `draft`-Vormerkungen sind bewusst ausgeschlossen.

## Unverbindliche Reservierungen für Winterplanung

Mitglieder können auch ohne finale Berechtigung eine `draft`-Reservierung anlegen.
Diese ist für Planung gedacht und blockiert nicht hart.
Sobald die Voraussetzungen erfüllt sind (`feesPaid` oder `skipHours`), kann die Vormerkung über „Finalisieren" in den Status `pending` oder `approved` überführt werden.

## Gesperrte Boote

Ist ein Boot als `blocked` markiert, können nur `draft`-Vormerkungen erstellt werden — keine finalen Reservierungen (`pending`/`approved`).
Wechselt der Benutzer in der Eingabemaske von „Unverbindliche Vormerkung" auf „Finale Reservierung", wird ein ggf. gesperrtes Boot automatisch deselektiert.

## Zeitfenster-Erkennung

Beim Rendern der Bootsauswahl werden nur aktive Reservierungen berücksichtigt (`pending`, `approved`, `draft`).
Stornierte (`cancelled`) und abgelehnte (`rejected`) Reservierungen blockieren das Zeitfenster nicht mehr.
Ebenso wird die Bootsauswahl beim Ändern von Start- oder Endzeit nur zurückgesetzt, wenn das gewählte Boot im neuen Zeitraum tatsächlich bereits reserviert ist.

## Stornierung

Besitzer können eigene Reservierungen aus den Status `draft`, `pending` und `approved` heraus stornieren.
Admins und Bootswarte können jede Reservierung stornieren.
Bereits stornierte oder abgelehnte Reservierungen zeigen keinen Stornieren-Button mehr.

## Löschen

Nur `draft`-Reservierungen dürfen vom Besitzer gelöscht werden.
Finale Reservierungen (`pending`, `approved`) müssen storniert (nicht gelöscht) werden, damit der Statusverlauf erhalten bleibt.
Admins können jede Reservierung unabhängig vom Status löschen.

## Serienkopierfunktion

Über den Button **„Serie"** im `ReservationDetailsDialog` können Reservierungen als Serie kopiert werden.

- Sichtbar für: Besitzer der Reservierung, Bootswart des betreffenden Bootes, Admins
- Nicht sichtbar bei Status `cancelled` oder `rejected`
- Konfigurierbar: Anzahl Kopien (1–52) und Intervall (Tage oder Wochen)
- Alle Kopien werden als **`draft`** mit **`visibility: private`** erstellt — unabhängig vom Status oder der Sichtbarkeit der Ursprungsreservierung
- `publicDetails` wird bewusst **nicht** kopiert
- Die Kopien erhalten die Identität (`userId`, `userName`) und den aktuellen Berechtigungsstatus (`eligibilitySnapshot`) des **ausführenden Benutzers**, nicht des ursprünglichen Besitzers
- Nach Erstellung müssen die Kopien bei Bedarf individuell über „Finalisieren" in einen finalen Status überführt werden
