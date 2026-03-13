# Zweiter Bootswart

## Übersicht

Pro Boot können zwei Bootswarte hinterlegt werden: `bootswart` (primär) und `bootswart2` (sekundär). Beide haben identische Rechte – es gibt keine Hierarchie zwischen den beiden.

## Betroffene Stellen im Code

### Datenmodell – `src/types/models.ts`

```ts
interface Boat {
  bootswart?: string;   // User-ID des ersten Bootswarts
  bootswart2?: string;  // User-ID des zweiten Bootswarts (neu)
}
```

Beide Felder sind optional. Bestehende Boote ohne `bootswart2` funktionieren unverändert.

### Berechtigungslogik

Überall, wo zuvor nur `boat.bootswart === currentUser.id` geprüft wurde, wird jetzt geprüft:

```ts
boat.bootswart === currentUser.id || boat.bootswart2 === currentUser.id
```

Die betroffenen Dateien im Einzelnen:

| Datei | Variable / Stelle | Auswirkung |
|---|---|---|
| `src/contexts/AppContext.tsx` | `isAnyBootswart` | Globales Flag – bestimmt, ob der Nutzer überhaupt Bootswart-Ansichten sieht |
| `src/components/Boats/BoatList.tsx` | `isAnyBootswart`, `handleOpen`, Aktionsspalte | Bearbeitungsrechte für Bootsverwaltung |
| `src/components/WorkCalendar/AppointmentDetailsDialog.tsx` | `isAppointmentBootswart` | Bearbeiten/Löschen/Bestätigen von Arbeitsterminen im Kalender |
| `src/components/Members/WorkHoursTracker.tsx` | `isBootswart` | Bestätigen/Ablehnen von Arbeitsstunden in der Mitgliederliste |
| `src/components/Members/PrivateWorkHoursDialog.tsx` | `autoConfirm` | Direkte Bestätigung beim Eintragen privater Arbeitsstunden |
| `src/components/BoatReservationCalendar/ReservationDialog.tsx` | `finalStatus` | Reservierung geht direkt auf `approved` statt `pending` |
| `src/components/BoatReservationCalendar/ReservationDetailsDialog.tsx` | `isBootswartOrAdmin` | Genehmigen/Ablehnen/Stornieren von Reservierungen |

### Firestore-Regeln – `firestore.rules`

Die `isBootswart(boatId)`-Hilfsfunktion wurde erweitert:

```
function isBootswart(boatId) {
  return isMember() && boatId != null && boatId != '' && (
    get(...).data.bootswart == request.auth.uid ||
    get(...).data.bootswart2 == request.auth.uid
  );
}
```

Diese Funktion sichert folgende Collections:
- `boats` – Update erlaubt für zugewiesene Bootswarte
- `boatReservations` – Update (Genehmigung/Ablehnung) erlaubt
- `workAppointments` – Create, Update, Delete erlaubt

### UI – Bootsverwaltung (`src/components/Boats/BoatList.tsx`)

- Formular zeigt zwei Dropdowns: **Bootswart 1** und **Bootswart 2**
- Tabelle zeigt beide Namen untereinander in der Bootswart-Spalte
- Beide Bootswarte dürfen ihr Boot bearbeiten

## Rückwärtskompatibilität

`bootswart2` ist optional. Boote ohne dieses Feld verhalten sich exakt wie bisher. Kein Datenbankschema-Update oder Migration notwendig.

## Tests – `src/firestore/__tests__/rules.test.ts`

Folgende Szenarien sind abgedeckt:

| Testfall | Erwartetes Ergebnis |
|---|---|
| `bootswart2` aktualisiert eigenes Boot | ✅ erlaubt |
| `bootswart2` aktualisiert fremdes Boot | ❌ verweigert |
| `bootswart2` genehmigt Reservierung für eigenes Boot | ✅ erlaubt |
| `bootswart2` genehmigt Reservierung für fremdes Boot | ❌ verweigert |
| `bootswart2` erstellt Arbeitstermin für eigenes Boot | ✅ erlaubt |
| `bootswart2` erstellt Arbeitstermin für fremdes Boot | ❌ verweigert |
| `bootswart2` aktualisiert Arbeitstermin für eigenes Boot | ✅ erlaubt |
| `bootswart2` löscht Arbeitstermin für eigenes Boot | ✅ erlaubt |
