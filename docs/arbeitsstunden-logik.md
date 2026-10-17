# Arbeitsstunden-Logik

Die Arbeitsstundenlogik ist in `src/domain/workHours.ts` zentralisiert.

## Grundregeln

- intern wird mit Minuten gerechnet
- negative oder ungültige Zeitspannen zählen nicht
- bestätigte Einträge zählen erst nach Ende des Termins als abgeschlossen
- ausstehende Einträge bleiben sichtbar und werden separat summiert
- abgelehnte Einträge werden getrennt ausgewiesen

## Saisonmodell

Die Saisonlogik liegt in `src/domain/seasons.ts`. Eine Saison wird über die Jahreszahl ihres Segelsommers benannt (z. B. **Saison 2026**).

### Grundidee: Saison als Klammer

- Jeder Teilnehmereintrag gehört explizit zu einer Saison (`WorkParticipant.season`).
- `systemConfig.currentSeason` ist die **aktuelle Saison**. Nur ihre Stunden zählen für die Reservierungsberechtigung.
- `systemConfig.nextSeasonOpen` öffnet die **Überlappungsphase**. Dann können Einträge auch schon für `currentSeason + 1` gebucht werden.
- Der Wechsel erfolgt über zwei Admin-Aktionen (Systemeinstellungen → Saisonsteuerung), nicht über ein festes Datum:
  1. **„Buchung für Saison N+1 öffnen“**, typischerweise im Herbst ab Auskranen oder Winterarbeiten. Die Reservierungsberechtigung richtet sich weiter nach Saison N, die Boote bleiben nutzbar.
  2. **„Saison N+1 starten“**, typischerweise im Frühjahr bei Freigabe der Boote. Ab dann zählt Saison N+1 für Reservierungen, und die Überlappung endet.
- Ein separates „Saison beenden“ gibt es nicht: Saison N endet implizit mit dem Start von N+1.

```
 Frühjahr N            Sommer N              Herbst N (Auskranen)      Frühjahr N+1
 ──[Saison N starten]────────────────────────[N+1 öffnen]──────────────[Saison N+1 starten]──
   Berechtigung: Stunden N ───────────────────────────────────────────►│ Stunden N+1
   Buchbar: N ───────────────────────────────►│ Buchbar: N oder N+1 ───►│ Buchbar: N+1
```

### Standard-Saison neuer Einträge

- Außerhalb der Überlappung gilt immer die aktuelle Saison.
- In der Überlappung zählt ein neuer Eintrag für die **aktuelle** Saison, solange das Mitglied dort noch Stunden offen hat. Bestätigte und ausstehende Einträge werden dabei eingerechnet. Sind die Stunden abgedeckt, zählt der Eintrag für die **nächste** Saison.
- Mitglieder können abweichend wählen. Dann wird `seasonManual: true` gespeichert und bei der Bestätigung als gelber Chip „Saison X · abweichend“ angezeigt (Termindetails und Mitgliederstunden).
- Admins und zuständige Bootswarte können die Saison eines Eintrags jederzeit über den Saison-Chip korrigieren: Vorsaison, aktuelle Saison und – falls offen – die nächste. Diese Korrektur gilt als verbindlich (`seasonManual` entfällt) und wird im Audit-Log protokolliert (`action: season_changed`).
- Mitglieder können die Saison eigener, noch nicht bestätigter Einträge selbst ändern.

### Alt-Einträge und `yearChangeDate`

- Solange das Saisonmodell nicht aktiviert ist (`seasonModelActivatedAt` fehlt), wird **ausschließlich** wie bisher mit dem Stichtag `yearChangeDate` gerechnet. Gespeicherte `season`-Werte werden ignoriert, Saisonelemente in der UI ausgeblendet.
- Der alte Abrechnungszeitraum wird so auf eine Saison abgebildet: Saison = Jahr, in dessen Sommer (1. Juli) der Zeitraum liegt. Bei Stichtag 01.10. ist der Zeitraum 01.10.2025 – 30.09.2026 also **Saison 2026**.
- Nach der Aktivierung dient `yearChangeDate` nur noch als Fallback für Einträge ohne gespeicherte Saison.
- Umstellung: siehe `docs/migrationen.md` (Backfill → Aktivierung).

### Ansicht „Arbeitsstunden“

- Bei aktivem Saisonmodell gibt es oben eine Saison-Auswahl (aktuelle, nächste und alle früheren Saisons mit Einträgen). Die Anzahl offener Prüfungen steht pro Saison dabei.
- In der Überlappung zeigt „Meine Stunden“ zusätzlich den Stand der nächsten Saison an.
- Liegen in einer anderen Saison offene Prüfungen, weist die Mitgliederübersicht darauf hin.
- Der Excel-Export enthält die angezeigte Saison (Metadaten und Dateiname).

## Status

- `done`: Pflichtstunden erfüllt
- `planned`: durch bestätigte und ausstehende Einträge vollständig eingeplant
- `open`: noch nicht erfüllt
- `attention`: mindestens ein abgelehnter Eintrag vorhanden
- `paused`: Arbeitsstundenpflicht ausgesetzt

## Pending-Verhalten

Neue private Arbeitsstunden erscheinen sofort in der Liste.
Wenn sie nicht automatisch bestätigt werden, bleiben sie sichtbar als `Unbestätigt` und werden erst nach Freigabe voll angerechnet.

## Bearbeitungsberechtigungen für Arbeitstermine

Bearbeiten und Löschen von Arbeitsterminen (`workAppointments`) ist rollenabhängig.

## Anlegen von Arbeitsterminen

- **Öffentliche Termine ohne Bootzuordnung** können nur von **Admins / Superadmins** angelegt werden.
- **Bootswarte** können weiterhin öffentliche Termine für ihre zugewiesenen Boote anlegen.
- **Private Arbeitsstunden** bleiben unverändert und werden weiterhin separat als private Eigeneinträge erfasst.

### Termin-Metadaten

Für Titel, Beschreibung, Terminzeit, Material, Löschen und Serienkopie gilt weiterhin eine Sperre für bestätigte öffentliche Termine in der Vergangenheit.

| Rolle / Bedingung | Öffentlicher Termin ohne bestätigte Vergangenheitsbuchung | Öffentlicher Termin in der Vergangenheit mit bestätigten Teilnehmern | Privater Eigeneintrag |
|---|---|---|---|
| **Superadmin** | ✅ | ✅ | ✅ |
| **Admin** | ✅ | 🔒 gesperrt | ❌ |
| **Bootswart des zugewiesenen Boots** | ✅ | 🔒 gesperrt | ❌ |
| **Ersteller (privater Termin)** | ❌ | ❌ | ✅ bis zur ersten Bestätigung |
| **Alle anderen** | ❌ | ❌ | ❌ |

### Teilnehmerverwaltung bei öffentlichen Terminen

Für die Teilnehmerliste gelten bewusst andere Regeln als für die Termin-Metadaten:

- **Admin, Superadmin und zuständiger Bootswart** dürfen Teilnehmer auch nach Terminende weiter verwalten.
- Das umfasst weiterhin:
  - Teilnehmer bestätigen oder ablehnen
  - weitere Teilnehmer zu einem vergangenen Termin hinzufügen
  - sich selbst nachträglich als Teilnehmer eintragen
  - Teilnehmerzeiten individuell korrigieren
- Wenn sich der zuständige **Bootswart selbst** zu einem öffentlichen Termin hinzufügt, wird dieser Teilnehmer direkt als `confirmed` angelegt.
- Die Teilnehmerverwaltung bleibt damit auch **am nächsten Tag** nach einem erledigten Termin möglich.

### Sperrbedingung (öffentliche Termin-Metadaten)

Ein öffentlicher Termin ist für Metadaten-Änderungen gesperrt, wenn beide Bedingungen zutreffen:
- `appointment.endTime < now` (Termin liegt in der Vergangenheit)
- mindestens ein Teilnehmer hat `status === 'confirmed'`

Die Sperren für Admins (vergangene, bestätigte öffentliche Termine) und der Ausschluss von Admins bei privaten Einträgen werden **nur clientseitig** durchgesetzt. Die Firestore-Regeln erlauben Admins weiterhin alle Änderungen an Arbeitsterminen.

### Sperrbedingung (private Termine)

Ein privater Termin ist für den Ersteller gesperrt, sobald mindestens ein Teilnehmer `status === 'confirmed'` hat (unabhängig davon, ob der Termin in der Vergangenheit liegt). Die Sperre gilt auch für das Löschen und wird zusätzlich in den Firestore-Regeln durchgesetzt. Serienkopien werden für private Einträge nicht angeboten.

### Mitglieder in öffentlichen Terminen

Mitglieder dürfen ausschließlich ihren **eigenen** Teilnehmereintrag ändern (serverseitig per Firestore-Regel geprüft):

- **Eintragen**: neuer Eintrag mit Status `pending` am Ende der Liste, keine Bestätigungsfelder, `maxParticipants` wird eingehalten
- **Austragen**: nur, solange der eigene Eintrag nicht bestätigt ist
- **Bearbeiten**: Zeiten und Saison des eigenen, nicht bestätigten Eintrags

Bootswarte dürfen Termine nur ihren eigenen Booten zuordnen. Beim Speichern von Termin-Metadaten wird die Teilnehmerliste nicht mitgeschrieben, damit gleichzeitige Bestätigungen nicht überschrieben werden.

Die private Sperre schützt bereits angerechnete Arbeitsstunden vor nachträglicher Manipulation. Superadmins sind davon ausgenommen und können jederzeit korrigieren.

### Implementierung

Die Logik befindet sich in `src/components/WorkCalendar/AppointmentDetailsDialog.tsx`:

```ts
const isAppointmentBootswart = !!appointment.boatId
  && (boats.find(b => b.id === appointment.boatId)?.bootswart === currentUser?.id
    || boats.find(b => b.id === appointment.boatId)?.bootswart2 === currentUser?.id);
const isCreator = !!currentUser && appointment.createdByUserId === currentUser.id;
const isPast = appointment.endTime < new Date();
const hasConfirmedParticipants = appointment.participants.some(p => p.status === 'confirmed');
const isLockedPublicAppointment = !appointment.private && isPast && hasConfirmedParticipants;
const canManageParticipants = isSuperAdmin || isAdmin || isAppointmentBootswart;
const canEditOwnPrivate = !!appointment.private && isCreator && !hasConfirmedParticipants;
const canEdit = isSuperAdmin || canEditOwnPrivate || (canManageParticipants && !isLockedPublicAppointment);
```

### Ersteller-Tracking

Beim Anlegen eines Termins werden `createdByUserId` und `createdByUserName` aus dem aktuellen Nutzer gesetzt (siehe `AppointmentDialog.tsx`). Diese Felder sind optional (`?`) für Abwärtskompatibilität mit älteren Einträgen ohne Creator-Tracking.

## Freigabe-Tracking

Der Datentyp `WorkParticipant` enthält drei optionale Felder, die festhalten, wer eine Bestätigung erteilt hat:

| Feld | Beschreibung |
|---|---|
| `confirmedByUserId` | User-ID des Admins/Bootswarts, der `status` auf `confirmed` gesetzt hat |
| `confirmedByUserName` | Anzeigename desselben Nutzers (Snapshot zum Zeitpunkt der Bestätigung) |
| `confirmedAt` | Zeitpunkt der Bestätigung |

Die Felder werden in `AppointmentDetailsDialog` und `WorkHoursTracker` jeweils beim Wechsel auf `confirmed` gesetzt und beim Wechsel zurück auf `pending` oder zu `declined` automatisch entfernt. Sie werden ausschließlich im Detail-Dialog angezeigt (als Untertext beim Teilnehmer-Status). Bestandseinträge ohne diese Felder bleiben funktional.

## Freigabe zurücknehmen

Bestätigte Teilnehmer-Einträge können durch Admins, Superadmins und zuständige Bootswarte wieder auf `pending` zurückgesetzt werden („Freigabe zurücknehmen"-Button mit Replay-Icon). Das eigene Mitglied selbst kann eine Freigabe nicht zurücknehmen. Beim Zurücknehmen werden die `confirmedBy*`-Felder gelöscht und ein zusätzlicher `activityLog`-Eintrag geschrieben (siehe `docs/aktivitaetsverfolgung.md`).

## Bootzuordnung nachträglich ändern

Admins und Superadmins können die Bootzuordnung eines öffentlichen Termins **jederzeit** ändern, auch wenn der Termin bereits in der Vergangenheit liegt und bestätigte Teilnehmer enthält. Im `AppointmentDetailsDialog` steht dafür ein Inline-Edit-Icon neben dem Boot-Chip im Kopfbereich zur Verfügung; im normalen Edit-Modus existiert zusätzlich ein Boot-Auswahlfeld. Bootswarte können das Boot weiterhin nur im regulären Edit-Modus (also bei nicht gesperrten Terminen) anpassen.

## Übersicht „Mitgliederstunden"

Die Übersicht für Admins und Bootswarte (`WorkHoursTracker`) bietet:

- **Suche** nach Anzeigename (clientseitig, case-insensitive)
- **Filter** „Nur ausstehende Prüfung" — zeigt nur Mitglieder mit `pending`-Einträgen aus den eigenen Booten
- **Boot-Filter** — zeigt nur Mitglieder mit Einträgen für ein bestimmtes Boot (oder ohne Boot). Die jährlichen Summen sind dabei nicht boot-spezifisch — der Filter wirkt nur auf die Sichtbarkeit der Zeile.
- **Sortierung** nach Name, Fortschritt, Restdauer oder Status (über `TableSortLabel`)

Statusänderungen an Teilnehmern werden optimistisch im lokalen State gespiegelt und im Hintergrund neu geladen, ohne dass die Tabelle ausgetauscht wird; dadurch bleibt die Scroll-Position erhalten.
