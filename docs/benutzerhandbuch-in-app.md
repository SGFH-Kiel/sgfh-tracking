# In-App-Benutzerhandbuch

Die geführte Kurzanleitung ist in `src/components/Onboarding/UserGuide.tsx` implementiert.

## Verhalten

- wird automatisch geöffnet, wenn `users.onboardingState` nicht gesetzt oder `not_started` ist
- kann übersprungen werden
- kann abgeschlossen werden
- kann jederzeit erneut geöffnet werden: in der klassischen Ansicht über `Hilfe` in der Kopfzeile, in der neuen Oberfläche über das Profilsymbol → „Hilfe“ oder „Mehr“ → „Hilfe“
- passt Texte und Navigationshinweise an die aktive Oberfläche (v1/v2) an
- enthält in v2 zusätzlich den Schritt **„Neu hier“** (Übersicht, Navigation, Prüfen, App installieren, Zurückwechseln). Beim ersten Wechsel auf v2 öffnet sich die Anleitung einmalig von selbst: für Nutzer, die die klassische Anleitung schon abgeschlossen oder übersprungen haben, direkt bei „Neu hier“, sonst vollständig. Gespeichert wird das in `preferences.v2TourSeen`.

## Inhalt

- Navigation und Aufbau der Anwendung
- Erfassen privater Arbeitsstunden
- Saisons (nur bei aktivem Saisonmodell): Zuordnung jedes Eintrags zu einer Saison, Überlappungsphase und Vorschlag der Standard-Saison
- Statuslogik für ausstehende und bestätigte Arbeitsstunden
- finale Reservierungen und unverbindliche Vormerkungen
- öffentliche Reservierungen mit freien Plätzen

## Persistenz

Der Status wird pro Benutzer im Feld `onboardingState` gespeichert:

- `not_started`
- `skipped`
- `completed`

## Neuigkeiten

Änderungen an der App werden nicht im Benutzerhandbuch, sondern unter **Neuigkeiten** angekündigt (siehe `docs/changelog.md`).
