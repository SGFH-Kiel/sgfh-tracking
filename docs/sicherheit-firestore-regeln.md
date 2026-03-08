# Sicherheit der Firestore-Regeln

## Ziele

- Schutz vor Rechteausweitung durch Clients
- Schutz vor Manipulation von Besitzfeldern
- Trennung interner und öffentlicher Daten
- Validierung von Reservierungs- und Terminstrukturen

## Wesentliche Regeln

- `users`
  - Benutzer dürfen nur eigene Basisfelder ändern (`displayName`, `lastLoginAt`, `onboardingState`, `updatedAt`)
  - `onboardingState` darf vom Benutzer selbst gepflegt werden
  - Rollen bleiben für Selbständerungen unveränderlich
- `boatReservations`
  - nur Mitglieder dürfen lesen
  - Erzeugung nur mit gültigen Feldern und gültigem Besitz (inkl. `createdAt`, `updatedAt`)
  - Draft-Reservierungen sind erlaubt
  - finale Reservierungen setzen Mitgliedschaft und Beitrags-/Ausnahmestatus voraus
  - Besitzer dürfen Drafts bearbeiten, finalisieren (mit Berechtigungsprüfung) und stornieren
  - Besitzer dürfen nur `draft`-Reservierungen löschen; finale Reservierungen müssen storniert werden
  - `updatedAt` darf bei allen Besitzer-Änderungen mitgeschrieben werden
- `publicBoatReservations`
  - öffentlich lesbar
  - nicht öffentlich schreibbar
  - nur `pending` und `approved` Reservierungen werden synchronisiert (keine Drafts)
- `workAppointments`
  - Strukturvalidierung für neue Termine
  - private Selbsteinträge bleiben möglich
  - Ersteller eines privaten Einzeleintrags darf diesen bearbeiten, solange der Teilnehmerstatus noch nicht `confirmed` ist

## Wichtige Einschränkung

Die Projektion in `publicBoatReservations` wird aktuell clientseitig synchronisiert. Für maximale Robustheit sollte dies langfristig in eine serverseitige Function verschoben werden.
