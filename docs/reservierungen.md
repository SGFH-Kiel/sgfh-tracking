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

## Unverbindliche Reservierungen für Winterplanung

Mitglieder können auch ohne finale Berechtigung eine `draft`-Reservierung anlegen.
Diese ist für Planung gedacht und blockiert nicht hart.
Sobald die Voraussetzungen erfüllt sind, kann die Vormerkung finalisiert werden.
