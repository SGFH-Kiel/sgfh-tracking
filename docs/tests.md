# Tests

## Testbereiche

- `src/domain/__tests__/workHours.test.ts`
  - Dauerberechnung
  - Statusklassifikation
  - Jahreswechsel
  - Randfälle um den Jahreswechsel
- `src/domain/__tests__/seasons.test.ts`
  - Abbildung des Stichtags auf Saisons (01.10., 01.04., 01.01.)
  - Altmodus: gespeicherte Saisons werden ignoriert, Berechnung identisch zum Stichtag
  - aktives Saisonmodell: Zählung nach gespeicherter Saison, Fallback, keine Berechtigungsklippe
  - Standard-Saison in der Überlappung, abweichende Wahl
  - Aktivierungsvorschlag, Backfill-Planung (vor/nach Aktivierung)
- `src/domain/__tests__/reservations.test.ts`
  - Konflikterkennung
  - Warn- vs. Blockierkonflikte
  - öffentlicher Feed
- `src/domain/__tests__/seriesCopy.test.ts`
  - `stripUndefined`: entfernt `undefined`-Felder, behält `null`, `Date`, Arrays
  - Reservierungs-Seriekopie: Anzahl, Intervall, Dauer, Benutzeridentität, Status, Sichtbarkeit, keine `publicDetails`, `eligibilitySnapshot`, Beschreibung
  - Arbeitstermin-Seriekopie: Anzahl, Intervall, Dauer, leere Teilnehmer, Zubehör, optionale Felder, fehlende `boatId`
- `src/firestore/__tests__/rules.test.ts`
  - anonymer Zugriff
  - Mitgliedszugriff
  - Besitzschutz
  - öffentliche Feed-Rechte
  - Direktgenehmigung durch Bootswart
  - Regression: Besitzer kann `status=approved` nicht direkt setzen wenn Boot `requiresApproval` hat
  - Benutzerpräferenzen: eigene `preferences` aktualisieren erlaubt, fremde verweigert, Rollen-Manipulation verweigert
  - Seriekopie: Draft mit eigener Identität erlaubt, fremde Identität verweigert, fehlender `eligibilitySnapshot` verweigert
  - Arbeitstermine: Admin kann erstellen, Mitglied ohne Bootswart-Rolle wird verweigert
  - Saisonmodell: Saisonfelder vor Aktivierung gesperrt, buchbare Saisons, Überlappung, Admin-Saisonwechsel, Backfill/Aktivierung nur Superadmin
  - Teilnehmerlisten: nur eigener Eintrag (eintragen, austragen, ändern), keine Selbstbestätigung, `maxParticipants`
  - Private Einträge: keine Selbstbestätigung beim Anlegen (außer Admin bzw. Bootswart des eigenen Boots), `private`/Status unveränderlich, Löschen durch Ersteller/Bootswart nur unbestätigt, bestätigte nur durch Admins
  - Benutzer: Selbstregistrierung nur mit Basisfeldern, Admin-Rechte auf `feesPaid`/`skipHours` begrenzt
  - Reservierungen: `approved` nur ohne Genehmigungspflicht, gesperrte Boote, `feesPaid` Pflicht, Bootswart nur Status
  - Öffentlicher Feed: passende Projektion erlaubt, manipulierte verweigert
  - Bootswarte: keine Änderung der Bootswart-Zuordnung, Termine für fremde Boote nur leer und mit Nachweis, Verschieben auf andere Boote (nicht „kein Boot“)
  - Audit-Log: eigene `actorId`, keine Rückdatierung, nur Admins lesen

## Tests ausführen

### Domain-Unit-Tests (kein Emulator erforderlich)

```bash
npm test -- --watchAll=false --testPathPattern=domain
```

### Firestore-Sicherheitsregeln-Tests (Emulator erforderlich)

```bash
npm run test:rules
```

Der Befehl startet den Firestore-Emulator automatisch auf Port 9099, führt alle Regeltests aus (aktuell 69)und beendet den Emulator danach.

**Voraussetzung:** Firebase CLI muss installiert sein (`npm install -g firebase-tools`), außerdem Java 11+ für den Emulator.

## Technische Details

- Regeltests laufen mit `jest` direkt (Node-Umgebung) über `jest.rules.config.js`, **nicht** über `react-scripts`, da `react-scripts` jsdom erzwingt und damit gRPC/`setImmediate` bricht.
- Die `console.warn`-Ausgaben mit `PERMISSION_DENIED` während der Regeltests sind erwartet — sie stammen aus den `assertFails`-Tests.
