# Kalender-Einstellungen

## Standardansicht

Sowohl der Vormerkbuch-Kalender als auch der Arbeitskalender unterstützen drei Ansichten: `Monat`, `Woche`, `Tag`.

Die aktive Ansicht wird über folgenden Vorrangsregeln bestimmt:

1. **Benutzerpräferenz** (`User.preferences.calendarDefaults.*`) — individuell pro Benutzer
2. **Systemkonfiguration** (`SystemConfig.calendarDefaults.*`) — Admin-seitig global gesetzt
3. **Fallback** — `week` (Wochenansicht)

## Admin-Konfiguration

Admins können die systemweite Standardansicht für beide Kalender unter **Administration → Systemkonfiguration** einstellen.
Die Einstellung wird im Firestore-Dokument `systemConfig/default` unter dem Feld `calendarDefaults` gespeichert:

```json
{
  "calendarDefaults": {
    "vormerkbuch": "week",
    "arbeitskalender": "month"
  }
}
```

Gültige Werte: `"month"`, `"week"`, `"day"`.

## Benutzerpräferenzen

Jeder angemeldete Benutzer kann seine bevorzugte Ansicht über das **Benutzerprofil-Icon** in der Toolbar öffnen (`UserPreferencesDialog`).

Die Präferenz wird im Firestore-Dokument `users/{uid}` unter `preferences.calendarDefaults` gespeichert:

```json
{
  "preferences": {
    "calendarDefaults": {
      "vormerkbuch": "day",
      "arbeitskalender": "week"
    }
  }
}
```

### Firestore-Regeleinschränkungen

Benutzer dürfen `preferences` und `updatedAt` nur für das eigene Dokument aktualisieren.
Das Ändern von `roles`, `email` oder anderen sicherheitsrelevanten Feldern in derselben Anfrage ist verboten.

## Synchronisierung mit laufendem Kalender

Wenn eine Präferenz gespeichert wird, ruft `UserPreferencesDialog` intern `reloadCurrentUser()` auf.
Die Kalenderkomponenten (`BoatReservationCalendar`, `WorkCalendar`) reagieren darauf über einen `useEffect`, der auf Änderungen in `currentUser.preferences.calendarDefaults` und `systemConfig.calendarDefaults` horcht und `setSelectedView()` entsprechend aktualisiert.

## Serienkopierfunktion (Termine und Reservierungen)

Sowohl Arbeitstermine (`WorkCalendar`) als auch Bootsreservierungen (`BoatReservationCalendar`) können als Serie kopiert werden.

### Ablauf

1. Termin oder Reservierung im Detaildialog öffnen
2. Button **„Serie"** klicken (sichtbar für berechtigte Benutzer, s.u.)
3. Im `CopyAppointmentSeriesDialog` / `CopyReservationSeriesDialog` konfigurieren:
   - **Intervall**: z.B. 1 Woche oder 14 Tage
   - **Anzahl Kopien**: 1–52
   - Vorschau der erzeugten Termine prüfen
4. „Erstellen" klickt — alle Kopien werden parallel per `Promise.all` in Firestore angelegt

### Berechtigungen

| Kalender | Berechtigt |
|---|---|
| Arbeitskalender | Admin, Bootswart des Bootes, Ersteller (canEdit) |
| Vormerkbuch | Admin, Bootswart des Bootes, Besitzer der Reservierung |

### Verhalten der Kopien

| Eigenschaft | Wert |
|---|---|
| Status | Immer `draft` |
| Sichtbarkeit | Immer `private` |
| `publicDetails` | Nicht kopiert |
| `participants` | Leer (Arbeitstermine) |
| `userId` / `userName` | Ausführender Benutzer (nicht ursprünglicher Besitzer) |
| `eligibilitySnapshot` | Aktueller Berechtigungsstatus des ausführenden Benutzers |

### Technische Details

- `FirebaseDatabaseProvider.addDocument()` bereinigt alle `undefined`-Felder vor dem Schreiben via `stripUndefined()`, um Firestore-Fehler zu vermeiden.
- Arbeitstermin-Kopien werden sofort erstellt und der Kalender wird per `refreshAppointments()` aktualisiert.
- Reservierungs-Kopien werden erstellt und `syncPublicReservationFeed()` wird pro Kopie aufgerufen (nur `private`-Kopien werden nicht in den öffentlichen Feed synchronisiert).
