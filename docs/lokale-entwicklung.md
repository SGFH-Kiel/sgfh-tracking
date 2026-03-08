# Lokale Entwicklung mit Firebase-Emulator

Für die lokale Entwicklung und das manuelle Testen aller Features kann die Anwendung vollständig gegen lokale Firebase-Emulatoren betrieben werden — ohne Zugriff auf die Produktionsdatenbank.

## Voraussetzungen

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Abhängigkeiten installiert (`npm install`)

## Schnellstart

```bash
npm run dev:local
```

Dieser Befehl führt automatisch aus:

1. **Emulator-Start** — Firestore (Port 9099) und Auth (Port 9098) werden gestartet
2. **Bereitschaftsprüfung** — wartet bis beide Emulatoren erreichbar sind
3. **Test-Daten** — befüllt den Emulator mit Testnutzern, Booten, Arbeitsterminen und Reservierungen
4. **React-App** — startet die App unter http://localhost:3000 mit Emulator-Konfiguration
5. **Aufräumen** — beim Beenden (`Ctrl+C`) werden die Emulatoren sauber gestoppt

## Emulator-UI

Die Firebase Emulator-Oberfläche ist unter **http://localhost:4000** erreichbar und bietet:

- Firestore-Dokumente direkt einsehen und bearbeiten
- Auth-Nutzer verwalten
- Logs der Sicherheitsregeln-Auswertungen

## Test-Accounts

| E-Mail | Passwort | Rolle | Besonderheiten |
|---|---|---|---|
| `admin@segelgruppe-kiel.de` | `password123` | SUPERADMIN | `skipHours`, `feesPaid` |
| `bootswart@segelgruppe-kiel.de` | `password123` | MEMBER | Bootswart für Laser + Optimist |
| `member@segelgruppe-kiel.de` | `password123` | MEMBER | `feesPaid=true`, Onboarding ausstehend |
| `member-nofees@segelgruppe-kiel.de` | `password123` | MEMBER | `feesPaid=false` — ineligibel |
| `member-skiphours@segelgruppe-kiel.de` | `password123` | MEMBER | `skipHours=true` — stundenfrei |

## Vorhandene Testdaten

Die Seed-Daten in `scripts/seed-emulator.mjs` erzeugen folgende Ausgangssituation:

**Boote:**
- **Laser** — `requiresApproval=true`, Bootswart gesetzt
- **Optimist** — `requiresApproval=false`, direkt reservierbar
- **Piraten (gesperrt)** — `blocked=true`

**Reservierungen:**
- `res-approved-1` — genehmigt, öffentlich, in 3 Tagen (Laser, Bootswart)
- `res-pending-1` — ausstehend, privat, in 7 Tagen (Laser, Max Mustermann)
- `res-draft-1` — Entwurf, privat, in 5 Tagen (Optimist, Max Mustermann)
- `res-past-1` — genehmigt, vergangen (Optimist, Hans Freigestellt)

**Arbeitstermine:**
- `wa-past-1` — Bootsputztag vor 30 Tagen, mit bestätigten Teilnehmern
- `wa-past-2` — Segelreparatur vor 10 Tagen, ausstehende Teilnahme
- `wa-future-1` — Slip-Arbeit in 14 Tagen, offen

## Nur Test-Daten neu einpflegen

Falls die Emulatoren bereits laufen und die Daten neu gesetzt werden sollen:

```bash
npm run seed
```

Der Seed-Befehl ist idempotent — er überschreibt vorhandene Dokumente und überspringt bereits existierende Auth-Nutzer.

## Wie es funktioniert

Die Datei `src/config/firebase.ts` verbindet sich mit den Emulatoren wenn `REACT_APP_USE_EMULATOR=true` gesetzt ist:

```ts
if (process.env.REACT_APP_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 9099);
  connectAuthEmulator(auth, 'http://localhost:9098', { disableWarnings: true });
}
```

Die Env-Datei `.env.emulator` enthält Dummy-Werte für die Firebase-Konfiguration — der Emulator validiert diese nicht.

Das Shell-Skript `scripts/dev-local.sh` orchestriert den gesamten Ablauf. Der Seed verwendet das Firebase Admin SDK (`firebase-admin`), das Firestore-Sicherheitsregeln umgeht — korrekt für initiales Befüllen.

## Unterschied zu `npm start`

| | `npm start` | `npm run dev:local` |
|---|---|---|
| Firebase-Backend | Produktion | Lokaler Emulator |
| Auth | Echte Nutzer | Test-Accounts |
| Daten | Produktionsdaten | Seed-Testdaten |
| Sicherheitsregeln | Echte Regeln | Echte Regeln (Emulator) |
| Emulator-UI | — | http://localhost:4000 |
