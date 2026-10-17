# Sicherheit der Firestore-Regeln

## Ziele

- Schutz vor Rechteausweitung durch Clients
- Schutz vor Manipulation von Besitzfeldern
- Trennung interner und öffentlicher Daten
- Validierung von Reservierungs- und Terminstrukturen

## Rollenmodell

| Rolle | Rechte (Kurzfassung) |
|---|---|
| **Superadmin** | alles, inkl. Mitgliederverwaltung, Systemeinstellungen, Backfill/Aktivierung des Saisonmodells |
| **Admin** | Boote, Reservierungen, Arbeitstermine, Beitrags-/Befreiungsstatus (`feesPaid`, `skipHours`), Saisonwechsel nach Aktivierung |
| **Bootswart** (Mitglied mit `boats.bootswart`/`bootswart2`) | Arbeitstermine und Reservierungsstatus der eigenen Boote, Zustand/Beschreibung der eigenen Boote |
| **Mitglied** | eigene Reservierungen, eigene private Arbeitsstunden, eigener Eintrag in öffentlichen Arbeitsterminen |
| **Bewerber** (APPLICANT) | nur eigenes Benutzerdokument |

## Wesentliche Regeln

- `users`
  - Benutzer dürfen nur eigene Basisfelder ändern (`displayName`, `lastLoginAt`, `onboardingState`, `preferences`, `updatedAt`)
  - Rollen bleiben für Selbständerungen unveränderlich
  - Selbstregistrierung: nur Basisfelder, `email` muss der E-Mail im Login-Token entsprechen, `feesPaid` darf nicht `true` sein, `skipHours` darf nicht gesetzt werden; `MEMBER` nur mit Vereinsdomain, sonst `APPLICANT`
  - Fremde Benutzerdokumente anlegen und löschen dürfen nur Superadmins
  - Admins dürfen ausschließlich `feesPaid`, `skipHours` und `updatedAt` ändern
- `boats`
  - Bootswarte dürfen nur `description`, `color`, `blocked`, `requiresApproval`, `updatedAt` ändern (weder Name noch Bootswart-Zuordnung)
- `boatReservations`
  - nur Mitglieder dürfen lesen
  - Erzeugung nur mit gültigen Feldern und gültigem Besitz (inkl. `createdAt`, `updatedAt`)
  - Draft-Reservierungen sind erlaubt
  - finale Reservierungen setzen `feesPaid == true` voraus und sind auf gesperrten Booten nicht möglich
  - `approved` ohne Genehmigungsschritt nur bei Booten ohne `requiresApproval` oder für deren Bootswart
  - Besitzer dürfen Drafts bearbeiten, finalisieren (mit Berechtigungsprüfung) und stornieren
  - Besitzer dürfen nur `draft`-Reservierungen löschen; finale Reservierungen müssen storniert werden
  - Bootswarte ändern nur `status` (`approved`, `rejected`, `cancelled`) und `updatedAt`
- `publicBoatReservations`
  - öffentlich lesbar
  - nicht öffentlich schreibbar
  - nur `pending` und `approved` Reservierungen werden synchronisiert (keine Drafts)
  - die Projektion muss exakt zur Reservierung passen (inkl. Bootsname, Status und Freitext)
- `workAppointments`
  - Strukturvalidierung für neue Termine
  - öffentliche Termine ohne `boatId` bleiben Admins vorbehalten; Bootswarte dürfen Termine für jedes Boot anlegen (für fremde Boote nur ohne Teilnehmer und mit Nachweis über das eigene Boot in `createdAsBootswartOfBoatId`) und Termine ihres Boots einem anderen Boot zuordnen
  - private Selbsteinträge von Mitgliedern werden als `pending` ohne Bestätigungsfelder angelegt; Admins (immer) und Bootswarte (nur mit eigenem Boot) dürfen eigene private Einträge direkt bestätigt anlegen, weil sie sonst niemand prüft
  - Ersteller eines privaten Einzeleintrags darf diesen bearbeiten und löschen, solange der Teilnehmerstatus nicht `confirmed` ist; Status, Ersteller und `private` bleiben unverändert
  - bestätigte private Einträge dürfen nur Admins löschen (auch nicht der Bootswart des Boots)
  - Mitglieder ändern in öffentlichen Terminen nur den eigenen Eintrag (eintragen als `pending`, austragen solange unbestätigt, Zeit/Saison anpassen). Die Prüfung erfolgt über Listendifferenzen (`removeAll`), unabhängig von der Position in der Liste.
  - Saisonfelder (`season`, `seasonManual`): vor Aktivierung des Saisonmodells dürfen Mitglieder sie nicht setzen oder ändern; danach nur auf die aktuelle bzw. – in der Überlappung – die nächste Saison
- `systemConfig/default`
  - lesbar für angemeldete Nutzer, schreibbar für Superadmins
  - Admins dürfen nach Aktivierung nur die Saisonfelder (`currentSeason` gleich oder +1, `nextSeasonOpen`, Zeitstempel) ändern
- `activityLog`
  - nur Admins lesen, Einträge unveränderlich
  - Anlage nur mit eigener `actorId`, festen Feldern, gültigem `entityType` und Zeitstempel ±1 h

## Bekannte Einschränkungen

- Die Projektion in `publicBoatReservations` wird clientseitig synchronisiert. Für maximale Robustheit sollte dies langfristig in eine serverseitige Function verschoben werden.
- Die Arbeitsstunden-Prüfung für Reservierungen ist clientseitig (Summen sind in Regeln nicht berechenbar).
- Admin-Sperren für vergangene, bestätigte öffentliche Termine sind clientseitig.
- **Offen (fachliche Entscheidung nötig):** Die Selbstregistrierung mit Vereinsdomain per E-Mail/Passwort prüft nicht, ob die Adresse verifiziert ist (`email_verified`). Eine Prüfung würde den aktuellen Registrierungsablauf brechen und braucht einen Verifizierungs- und Freischaltschritt im Client.
- **Offen:** Ein gelöschtes Benutzerdokument wird beim nächsten Login mit Vereinsdomain neu als `MEMBER` angelegt, weil der Auth-Account bestehen bleibt. Mitglieder sollten deaktiviert statt gelöscht werden.
