# Aktivitätsverfolgung

## Übersicht

Das Aktivitätsverfolgungsmodul besteht aus zwei Teilen:

1. **Kalenderfilter für stornierte Reservierungen** – Mitglieder sehen im Kalender standardmäßig keine stornierten Reservierungen. Admins und Superadmins können diese über einen Toggle sichtbar machen, der in den Benutzerpräferenzen gespeichert wird.

2. **Aktivitätsverfolgungsansicht** (`/tracking`) – Admin-only-Seite mit zwei Tabs:
   - **Aktuelle Übersicht**: Filterbarer Überblick über alle Entitäten (Reservierungen, Arbeitsstunden, Boote, Mitglieder)
   - **Audit-Log**: Chronologisches Protokoll aller Änderungen an Entitäten

---

## Datenmodell

### `ActivityLogEntry` (Firestore-Collection: `activityLog`)

| Feld        | Typ                  | Beschreibung                                      |
|-------------|----------------------|---------------------------------------------------|
| `id`        | `string`             | Automatisch generierte Firestore-ID               |
| `type`      | `ActivityType`       | Art der Aktivität (z. B. `reservation.created`)   |
| `entityId`  | `string`             | ID der betroffenen Entität                        |
| `entityType`| `string`             | Entitätstyp: `reservation`, `workHour`, `boat`, `member` |
| `actorId`   | `string`             | User-ID des Ausführenden                          |
| `actorName` | `string`             | Anzeigename des Ausführenden                      |
| `timestamp` | `Date`               | Zeitstempel der Aktion (serverseiting)            |
| `details`   | `Record<string, unknown>` | Typ-spezifische Zusatzinformationen          |

### `ActivityType`

```
reservation.created | reservation.status_changed | reservation.deleted
workHour.created    | workHour.updated   | workHour.deleted
boat.created        | boat.updated       | boat.deleted
member.created      | member.updated     | member.deactivated | member.deleted
```

### `UserPreferences` (Erweiterung)

```ts
showCancelledReservations?: boolean
```

Wird für jeden Nutzer in `/users/{userId}.preferences` gespeichert. Standardwert: `false`.

---

## Komponenten

### `ActivityTrackingView` (`src/components/Admin/ActivityTrackingView.tsx`)

- Route: `/tracking`
- Zugang: Nur für `isAdmin` / `isSuperAdmin`
- **Tab 1 – Aktuelle Übersicht**: Lädt Reservierungen, Arbeitsstunden, Boote und Mitglieder aus Firestore; filtert nach Entitätstyp, Zeitraum, Status und Sichtbarkeit.
- **Tab 2 – Audit-Log**: Lädt Einträge aus der `activityLog`-Collection mit serverseitigem Zeitraumfilter (Standard: Anfang des aktuellen Monats); filtert zusätzlich nach Aktionstyp.

### `writeActivityLog` (`src/domain/activityLog.ts`)

Hilfsfunktion zum Erstellen von Audit-Log-Einträgen:

```ts
await writeActivityLog(database, {
  type: 'reservation.created',
  entityId: id,
  entityType: 'reservation',
  actorId: currentUser.id,
  actorName: currentUser.displayName,
  details: { title, status },
});
```

---

## Instrumentierte CRUD-Operationen

| Datei | Operationen |
|---|---|
| `ReservationDialog.tsx` | `reservation.created` |
| `ReservationDetailsDialog.tsx` | `reservation.status_changed` (Stornierung, Genehmigung, Ablehnung, Finalisierung, Bearbeitung) |
| `BoatReservationCalendar.tsx` | `reservation.created` (Serienkopieen) |
| `BoatList.tsx` | `boat.created`, `boat.updated`, `boat.deleted` |
| `MemberList.tsx` | `member.created`, `member.updated`, `member.deactivated` |
| `WorkCalendar.tsx` | `workHour.created`, `workHour.deleted`, `workHour.created` (Serienkopieen) |
| `MemberList.tsx` (Löschen) | `member.deleted` |
| `PrivateWorkHoursDialog.tsx` | `workHour.created`, `workHour.updated` |

---

## Firestore-Sicherheitsregeln

```
match /activityLog/{entryId} {
  allow read: if isAdmin();
  allow create: if isMember();
  allow update, delete: if false;
}
```

- Jedes Mitglied kann Einträge **erstellen** (schreiben beim eigenen CRUD-Vorgang).
- Nur Admins können Einträge **lesen**.
- Einträge sind **unveränderlich** und können nicht gelöscht werden.

---

## Kalenderfilter

- Stornierte Reservierungen (`status === 'cancelled'`) werden im `BoatReservationCalendar` standardmäßig **herausgefiltert**.
- Admins/Superadmins sehen einen Toggle-Chip in der Kalender-Legende zum Einblenden stornierter Reservierungen.
- Der Zustand wird in `currentUser.preferences.showCancelledReservations` gespeichert und beim Laden der App wiederhergestellt.
