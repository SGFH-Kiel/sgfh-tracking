# Architektur

Die Anwendung besteht aus einem React-Frontend mit TypeScript und Firebase als Backend für Authentifizierung und Firestore.

## Hauptbausteine

- `src/contexts/AppContext.tsx`
  - globaler App-Zustand
  - Authentifizierungsfluss
  - Laden des aktuellen Benutzers und der Boote
- `src/components/Layout.tsx`
  - Shell, Navigation, Hilfe/Onboarding
- `src/components/Calendar/CalendarTabs.tsx`
  - Einstieg in Vormerkbuch und Arbeitskalender
- `src/components/Members/WorkHoursTracker.tsx`
  - Benutzeransicht und Freigabeübersicht für Arbeitsstunden
- `src/components/BoatReservationCalendar/*`
  - Reservierungsdialoge, Kalender, Detailansichten
- `src/domain/workHours.ts`
  - zentrale, reine Arbeitsstundenlogik
- `src/domain/seasons.ts`
  - Saisonmodell: Zuordnung von Einträgen zu Saisons, Altmodus über `yearChangeDate`, Standard-Saison, Backfill-Planung
- `src/components/Admin/SeasonControl.tsx`
  - Saisonsteuerung (Backfill, Aktivierung, Saisonwechsel)
- `src/domain/reservations.ts`
  - Konfliktprüfung, Statusmodell und öffentlicher Feed

## Firebase-Nutzung

- Authentifizierung über Firebase Auth
- Datenhaltung in Firestore
- Sicherheitsmodell über `firestore.rules`
- öffentlicher Reservierungsfeed über separate Collection `publicBoatReservations`

## Architekturentscheidungen

- Arbeitsstundenberechnung ist aus den Komponenten herausgezogen und in pure Funktionen zentralisiert.
- Arbeitsstunden zählen pro Saison (explizit am Teilnehmereintrag gespeichert); der Saisonwechsel ist eine bewusste Admin-Aktion statt eines festen Stichtags.
- Öffentliche Reservierungen werden nicht aus der internen Haupt-Collection veröffentlicht, sondern als minimierte Projektion gespeichert.
- Unverbindliche Reservierungen werden als Status `draft` modelliert und nur warnend behandelt.

## Darstellung auf Smartphones

- Breakpoints nach MUI: `xs` < 600 px (Smartphone), `sm` ab 600 px (Tablet), `md` ab 900 px (Desktop).
- `src/hooks/useIsMobile.ts` liefert `useIsMobile()` und `useResponsiveDialogProps()`. Die Hauptdialoge (Termine, Reservierungen, Arbeitsstunden, Import, Boote, Mitglieder, Saisonsteuerung) öffnen auf Smartphones bildschirmfüllend, ihre Aktionsleisten brechen um.
- Die Kopfzeile zeigt auf Smartphones nur den Seitentitel und Symbole für Einstellungen, Hilfe und Abmelden.
- Tabellen blenden auf schmalen Bildschirmen Nebenspalten aus und zeigen die Informationen kompakt in der ersten Spalte (z. B. Uhrzeit unter dem Datum, E-Mail unter dem Namen).
- Beide Kalender haben eine Schaltfläche für neue Einträge („Reservieren“/„Vormerken“, „Termin anlegen“). Auf Touch-Geräten war das sonst nur per langem Druck auf einen Zeitslot möglich. Wochen- und Tagesansicht starten um 07:00.
