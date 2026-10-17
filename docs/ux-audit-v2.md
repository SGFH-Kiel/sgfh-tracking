# UX-Audit und Oberfläche v2

Stand: 17.10.2026. Grundlage: alle Ansichten und Abläufe der App auf Smartphone (375 px), Tablet (768 px) und Desktop (1280 px), dazu der Quellcode.

## 1. Befunde in v1

### Navigation und Orientierung
- **Alle Ziele liegen hinter dem Hamburger-Menü.** Jeder Wechsel kostet zwei Taps, und auf dem Desktop gibt es keine dauerhafte Navigation. Gängige Praxis (Material 3, iOS HIG): bis zu fünf Hauptziele als Navigationsleiste unten auf dem Smartphone bzw. als Seitenleiste auf dem Desktop.
- **Es gibt keine Übersicht.** Ob man reservieren darf, wie viele Stunden fehlen und was ansteht, verteilt sich auf Vormerkbuch (Warnbanner), Arbeitsstunden und Kalender.

### Abläufe
- **Prüfen ist mühsam.** Admins und Bootswarte müssen in „Mitgliederstunden“ jedes Mitglied einzeln aufklappen, um offene Einträge zu finden. Offene Reservierungen erscheinen nur als Termin im Kalender. Es fehlt ein gemeinsamer Eingang „Zu prüfen“.
- **Löschen ohne Rückfrage.** Arbeitstermine und private Einträge werden im Detaildialog sofort gelöscht, ohne Bestätigung und ohne Rückgängig. Nur Boote fragen nach, dort allerdings per Browser-`confirm`.
- **Fehler bleiben unsichtbar.** Bei einigen Aktionen (z. B. Teilnehmen, Austragen, Speichern im Termin-Dialog) landen Fehler nur in der Konsole, der Nutzer bekommt keine Meldung.
- **Kalender auf dem Smartphone.** Die Wochenansicht hat sieben sehr schmale Spalten, und eine Listenansicht fehlt. Neue Einträge ließen sich bis vor Kurzem nur per langem Druck anlegen.

### Darstellung und Sprache
- **Statusbegriffe sind uneinheitlich.** „Unbestätigt“, „Ausstehend“, „Offen“, „Geplant“ und „Prüfen!“ werden für ähnliche Zustände benutzt, teils mit derselben Farbe für Verschiedenes.
- **Anrede gemischt.** Die App spricht fast überall mit „Sie“ an, einzelne neue Texte mit „du“.
- **Seitenmetadaten auf Englisch** (`lang="en"`, Titel, Beschreibung), die Theme-Farbe ist Schwarz statt der Vereinsfarbe.
- **Lade- und Leerzustände.** Es gibt nur einen Ladekreisel ohne Platzhalter. Leere Listen zeigen kaum einen Hinweis, was als Nächstes zu tun ist.

### Datenkonsistenz und Wartbarkeit
- **Jede Ansicht lädt selbst.** Kalender, Stundenübersicht, Reservierungsberechtigung und Saisonvorschlag laden `workAppointments` jeweils einzeln und ohne Live-Aktualisierung. Andere Ansichten zeigen danach veraltete Stände, und es fallen unnötige Lesezugriffe an. Prüfen zwei Personen gleichzeitig, sieht keiner die Änderung des anderen.
- **Doppelte Logik.** „Teilnehmerstatus ändern“ und „Reservierungsstatus ändern“ sind in mehreren Komponenten kopiert (z. B. `WorkHoursTracker`, `AppointmentDetailsDialog`, `ReservationDetailsDialog`).

### App-Fähigkeit
- Das Manifest ist unvollständig (englische Texte, nur ein 192-px-Icon, kein maskierbares Icon), und es gibt keinen Service Worker und keine Installationsmöglichkeit.
- Die Anmeldung gilt nur für die Browsersitzung. Eine installierte App müsste sich daher bei jedem Start neu anmelden.

## 2. Leitlinien für v2

1. **Mobile first.** Navigationsleiste unten (Smartphone) bzw. Seitenleiste (ab Tablet), die Hauptaktion als großer Button (FAB), Touch-Ziele mindestens 44 × 44 px.
2. **Aufgabenorientiert.** Die Übersicht beantwortet die drei häufigsten Fragen: Darf ich segeln? Was fehlt mir? Was steht an?
3. **Ein Eingang für Prüfende.** „Zu prüfen“ bündelt offene Arbeitsstunden und Reservierungen mit direkten Aktionen.
4. **Sichere Aktionen.** Löschen immer mit Rückfrage, und jede Aktion meldet Erfolg oder Fehler sichtbar.
5. **Einheitliche Sprache.** Anrede „Sie“. Status: *Offen* (wartet auf Prüfung), *Bestätigt*, *Abgelehnt*, *Geplant* (bestätigt, liegt in der Zukunft).
6. **Live-Daten aus einer Quelle.** Eine gemeinsame Datenschicht mit Firestore-Listenern für Arbeitstermine und Reservierungen. Alle v2-Ansichten lesen daraus und sehen Änderungen sofort.
7. **Keine zweite Fachlogik.** v2 nutzt dieselben Domänenfunktionen (`src/domain/*`) und dieselben Dialoge wie v1. Statusänderungen laufen über gemeinsame Aktionen (`src/domain/workHourActions.ts`, `src/domain/reservationActions.ts`). Am Datenmodell ändert sich nichts.
8. **Barrierearm.** Beschriftete Icon-Buttons, Status nie allein über Farbe, sinnvolle Überschriftenstruktur.

## 3. Umfang von v2 (erste Ausbaustufe)

| Bereich | v2 |
|---|---|
| Rahmen | Navigationsleiste unten bzw. Seitenleiste; Ziele: Übersicht, Kalender, Stunden, Zu prüfen (nur Prüfende), Mehr |
| Übersicht | Karten „Reservierungsberechtigung“ (Beitrag, Stunden der aktuellen Saison, was fehlt), „Meine nächsten Reservierungen“, „Nächste Arbeitstermine“ mit freien Plätzen, „Zu prüfen“, Neuigkeiten, App installieren |
| Stunden | Kartenliste statt Tabelle, Saisonwahl, Fortschritt, FAB „Stunden eintragen“ |
| Zu prüfen | offene Arbeitsstunden (Admins: alle, Bootswarte: eigene Boote) und offene Reservierungen der eigenen Boote, mit Bestätigen/Ablehnen direkt in der Liste |
| Kalender | bestehende Kalender, zusätzlich Listenansicht, auf dem Smartphone standardmäßig |
| Mehr | Neuigkeiten, Verwaltung (Boote, Mitglieder, Aktivitäten, Systemeinstellungen) mit den bestehenden Seiten, Einstellungen, Hilfe, App installieren, zurück zur klassischen Ansicht, Abmelden |

Verwaltungsseiten und Dialoge stammen in dieser Stufe weiterhin aus v1, wurden aber für Smartphones bereits angepasst. Sie können in späteren Stufen einzeln überarbeitet werden.

## 4. Freischaltung

- Admins und Superadmins können v2 jederzeit als **Vorschau** ein- und ausschalten (Einstellungen bzw. Hinweis in der klassischen Ansicht).
- Superadmins schalten v2 in den Systemeinstellungen auch für **alle Mitglieder** frei (`systemConfig.featureFlags.uiV2ForMembers`). Danach kann jedes Mitglied selbst umschalten.
- Die Wahl wird pro Nutzer in `preferences.uiVersion` (`v1` | `v2`) gespeichert, Standard ist `v1`. Wird die Freigabe zurückgenommen, sehen Mitglieder wieder v1. Daten sind nicht betroffen.
