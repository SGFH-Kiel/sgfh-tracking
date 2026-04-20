# Arbeitsstunden-Logik

Die Arbeitsstundenlogik ist in `src/domain/workHours.ts` zentralisiert.

## Grundregeln

- intern wird mit Minuten gerechnet
- negative oder ungültige Zeitspannen zählen nicht
- bestätigte Einträge zählen erst nach Ende des Termins als abgeschlossen
- ausstehende Einträge bleiben sichtbar und werden separat summiert
- abgelehnte Einträge werden getrennt ausgewiesen

## Jahreswechsel

- das Konfigurationsdatum `yearChangeDate` definiert den Beginn des Arbeitsjahres
- wenn das Datum im aktuellen Kalenderjahr noch nicht erreicht ist, beginnt das aktive Arbeitsjahr im Vorjahr
- die Berechnung ist deterministisch und rein datengetrieben

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

### Sperrbedingung (private Termine)

Ein privater Termin ist für den Ersteller gesperrt, sobald mindestens ein Teilnehmer `status === 'confirmed'` hat (unabhängig davon, ob der Termin in der Vergangenheit liegt).

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
