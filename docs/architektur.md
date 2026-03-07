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
- `src/domain/reservations.ts`
  - Konfliktprüfung, Statusmodell und öffentlicher Feed

## Firebase-Nutzung

- Authentifizierung über Firebase Auth
- Datenhaltung in Firestore
- Sicherheitsmodell über `firestore.rules`
- öffentlicher Reservierungsfeed über separate Collection `publicBoatReservations`

## Architekturentscheidungen

- Arbeitsstundenberechnung ist aus den Komponenten herausgezogen und in pure Funktionen zentralisiert.
- Öffentliche Reservierungen werden nicht aus der internen Haupt-Collection veröffentlicht, sondern als minimierte Projektion gespeichert.
- Unverbindliche Reservierungen werden als Status `draft` modelliert und nur warnend behandelt.
