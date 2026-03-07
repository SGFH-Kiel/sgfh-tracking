# In-App-Benutzerhandbuch

Die geführte Kurzanleitung ist in `src/components/Onboarding/UserGuide.tsx` implementiert.

## Verhalten

- wird automatisch geöffnet, wenn `users.onboardingState` nicht gesetzt oder `not_started` ist
- kann übersprungen werden
- kann abgeschlossen werden
- kann jederzeit über den Button `Hilfe` in der Kopfzeile erneut geöffnet werden

## Inhalt

- Navigation und Aufbau der Anwendung
- Erfassen privater Arbeitsstunden
- Statuslogik für ausstehende und bestätigte Arbeitsstunden
- finale Reservierungen und unverbindliche Vormerkungen
- öffentliche Reservierungen mit freien Plätzen

## Persistenz

Der Status wird pro Benutzer im Feld `onboardingState` gespeichert:

- `not_started`
- `skipped`
- `completed`
