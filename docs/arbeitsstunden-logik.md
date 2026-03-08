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

### Wer darf bearbeiten?

| Rolle / Bedingung | Keine bestätigten Teilnehmer | Mit bestätigten Teilnehmern + in der Vergangenheit |
|---|---|---|
| **Superadmin** | ✅ | ✅ |
| **Bootswart des zugewiesenen Boots** | ✅ | 🔒 gesperrt |
| **Ersteller (öffentlicher Termin)** | ✅ | 🔒 gesperrt |
| **Ersteller (privater Termin)** | ✅ | 🔒 gesperrt |
| **Alle anderen** | ❌ | ❌ |

### Sperrbedingung (öffentliche Termine)

Ein öffentlicher Termin gilt als **gesperrt** wenn beide Bedingungen zutreffen:
- `appointment.endTime < now` (Termin liegt in der Vergangenheit)
- mindestens ein Teilnehmer hat `status === 'confirmed'`

### Sperrbedingung (private Termine)

Ein privater Termin ist für den Ersteller gesperrt, sobald mindestens ein Teilnehmer `status === 'confirmed'` hat (unabhängig davon, ob der Termin in der Vergangenheit liegt).

Die Sperre schützt bereits angerechnete Arbeitsstunden vor nachträglicher Manipulation. Superadmins sind davon ausgenommen und können jederzeit korrigieren.

### Implementierung

Die Logik befindet sich in `src/components/WorkCalendar/AppointmentDetailsDialog.tsx`:

```ts
const isAppointmentBootswart = !!appointment.boatId
  && boats.find(b => b.id === appointment.boatId)?.bootswart === currentUser?.id;
const isCreator = !!currentUser && appointment.createdByUserId === currentUser.id;
const isPast = appointment.endTime < new Date();
const hasConfirmedParticipants = appointment.participants.some(p => p.status === 'confirmed');
const isLockedForNonSuperAdmin = isPast && hasConfirmedParticipants;
// Private appointments: editable by creator as long as no participant is confirmed
const canEditOwnPrivate = !!appointment.private && isCreator && !hasConfirmedParticipants;
const canEdit = isSuperAdmin || canEditOwnPrivate || (!isLockedForNonSuperAdmin && (isAppointmentBootswart || isCreator));
```

### Ersteller-Tracking

Beim Anlegen eines Termins werden `createdByUserId` und `createdByUserName` aus dem aktuellen Nutzer gesetzt (siehe `AppointmentDialog.tsx`). Diese Felder sind optional (`?`) für Abwärtskompatibilität mit älteren Einträgen ohne Creator-Tracking.
