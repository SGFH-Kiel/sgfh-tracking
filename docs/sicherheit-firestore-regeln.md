# Sicherheit der Firestore-Regeln

## Ziele

- Schutz vor Rechteausweitung durch Clients
- Schutz vor Manipulation von Besitzfeldern
- Trennung interner und öffentlicher Daten
- Validierung von Reservierungs- und Terminstrukturen

## Wesentliche Regeln

- `users`
  - Benutzer dürfen nur eigene Basisfelder ändern
  - `onboardingState` darf vom Benutzer selbst gepflegt werden
  - Rollen bleiben für Selbständerungen unveränderlich
- `boatReservations`
  - nur Mitglieder dürfen lesen
  - Erzeugung nur mit gültigen Feldern und gültigem Besitz
  - Draft-Reservierungen sind erlaubt
  - finale Reservierungen setzen Mitgliedschaft und Beitrags-/Ausnahmestatus voraus
- `publicBoatReservations`
  - öffentlich lesbar
  - nicht öffentlich schreibbar
- `workAppointments`
  - Strukturvalidierung für neue Termine
  - private Selbsteinträge bleiben möglich

## Wichtige Einschränkung

Die Projektion in `publicBoatReservations` wird aktuell clientseitig synchronisiert. Für maximale Robustheit sollte dies langfristig in eine serverseitige Function verschoben werden.
