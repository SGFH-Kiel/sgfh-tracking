# SGFH Tracking — Mitgliederverwaltung & Arbeitsstunden

Mitgliederverwaltung, Arbeitsstunden-Tracking und Bootsreservierungen für die Segelgruppe, gebaut mit React, TypeScript und Firebase.

## Features

- Arbeitsstunden erfassen und bestätigen
- Bootsreservierungen verwalten (Entwurf → Genehmigung → Bestätigung)
- Mitglieder und Rollen verwalten
- Öffentlicher Reservierungsfeed
- Benutzerauthentifizierung
- Responsives Design

## Lokale Entwicklung (empfohlen)

Für lokales Testen gegen Firebase-Emulatoren — ohne Zugriff auf Produktionsdaten:

**Voraussetzung:** Firebase CLI installiert (`npm install -g firebase-tools`)

```bash
npm install
npm run dev:local
```

Das war's. Der Befehl startet automatisch:
- Firebase-Emulatoren (Firestore + Auth)
- Seed mit Testdaten und Testnutzern
- React-App unter http://localhost:3000

Emulator-UI (Firestore & Auth einsehen): **http://localhost:4000**

Weitere Details: [`docs/lokale-entwicklung.md`](docs/lokale-entwicklung.md)

## Setup gegen Produktion

1. Repository klonen und Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. Firebase-Projekt anlegen mit aktivierter Authentication und Firestore
3. `.env`-Datei im Projektverzeichnis anlegen:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```
4. Entwicklungsserver starten:
   ```bash
   npm start
   ```

## Tests

```bash
# Domain-Unit-Tests
npm test -- --watchAll=false --testPathPattern=domain

# Firestore-Sicherheitsregeln (startet Emulator automatisch)
npm run test:rules
```

Weitere Details: [`docs/tests.md`](docs/tests.md)

## Deployment

```bash
npm run deploy
```

Deployed via GitHub Pages. Der `predeploy`-Hook führt `npm run build` automatisch aus.

## Technologien

- React + TypeScript
- Firebase (Authentication & Firestore)
- Material-UI
- Firebase Emulator Suite (lokale Entwicklung)

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [`docs/lokale-entwicklung.md`](docs/lokale-entwicklung.md) | Lokales Setup mit Emulator, Testdaten, Accounts |
| [`docs/tests.md`](docs/tests.md) | Testbereiche und Ausführung |
| [`docs/architektur.md`](docs/architektur.md) | Komponentenstruktur und Architekturentscheidungen |
| [`docs/datenmodell-firestore.md`](docs/datenmodell-firestore.md) | Firestore-Collections und Datenstrukturen |
| [`docs/sicherheit-firestore-regeln.md`](docs/sicherheit-firestore-regeln.md) | Sicherheitsregeln und Zugriffsmodell |
| [`docs/reservierungen.md`](docs/reservierungen.md) | Reservierungsstatusmodell und -logik |
| [`docs/arbeitsstunden-logik.md`](docs/arbeitsstunden-logik.md) | Arbeitsstundenberechnung und Jahreswechsel |
