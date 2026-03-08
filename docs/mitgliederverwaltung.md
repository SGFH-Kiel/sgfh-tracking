# Mitgliederverwaltung

## Übersicht

Die Mitgliederverwaltung ist unter **Administration → Mitglieder** erreichbar.
Sie ist nur für Superadmins zugänglich.

## Einzelne Mitglieder bearbeiten

Über das Bearbeiten-Icon (✏️) in der Tabelle kann ein Mitglied editiert werden:

- **Name** (`displayName`)
- **Rollen** (`roles`): Mitglied, Admin, Superadmin
- **Beitrag bezahlt** (`feesPaid`): bestimmt ob das Mitglied Reservierungen finalisieren darf
- **Arbeitsstunden ausgesetzt** (`skipHours`): überspringt die Arbeitsstunden-Prüfung bei der Reservierungsberechtigung

Änderungen werden direkt in Firestore (`users/{uid}`) gespeichert.

## Sammelaktionen

### Alle Beiträge als bezahlt markieren

Der Button **„Alle Beiträge bezahlt"** (oben rechts, nur für Superadmins) setzt `feesPaid = true` für alle aktiven Mitglieder, die noch nicht bezahlt haben.

**Ablauf:**
1. Button klicken → Bestätigungsdialog öffnet sich
2. Dialog zeigt Anzahl der betroffenen Mitglieder (aktiv, `feesPaid = false`)
3. „Jetzt markieren" bestätigen → alle Updates laufen parallel per `Promise.all`
4. Erfolgsmeldung mit Anzahl aktualisierter Mitglieder

**Einschränkungen:**
- Deaktivierte Mitglieder (`deactivated = true`) werden nicht berücksichtigt
- Bereits bezahlte Mitglieder werden nicht erneut geschrieben
- Die Aktion kann nicht automatisch rückgängig gemacht werden — `feesPaid` muss pro Mitglied manuell zurückgesetzt werden

**Typischer Anwendungsfall:** Jahreswechsel, nach dem alle Mitgliedsbeiträge eingegangen sind.

## Mitglied hinzufügen

Sichtbar nur wenn das Feature-Flag `systemConfig.featureFlags.enableMemberCreation` gesetzt ist.

Erstellt einen Firebase Auth-Benutzer und sendet eine Einladungs-E-Mail.

## Mitglied deaktivieren / reaktivieren

- **Deaktivieren**: Mitglied verliert den Systemzugang; alle zugehörigen Bootsreservierungen werden gelöscht und aus dem öffentlichen Feed entfernt.
- **Reaktivieren**: Zugang wird wiederhergestellt; Reservierungen werden nicht wiederhergestellt.

## Mitglied löschen

Löscht den Firestore-Datensatz sowie alle zugehörigen Reservierungen und öffentlichen Feed-Einträge. Nur für Superadmins.
