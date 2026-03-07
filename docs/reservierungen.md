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

## Stornierung

Besitzer können eigene Reservierungen aus den Status `draft`, `pending` und `approved` heraus stornieren.
Admins und Bootswarte können jede Reservierung stornieren.
Bereits stornierte oder abgelehnte Reservierungen zeigen keinen Stornieren-Button mehr.

## Löschen

Nur `draft`-Reservierungen dürfen vom Besitzer gelöscht werden.
Finale Reservierungen (`pending`, `approved`) müssen storniert (nicht gelöscht) werden, damit der Statusverlauf erhalten bleibt.
Admins können jede Reservierung unabhängig vom Status löschen.
