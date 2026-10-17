# Kurzinfo für Admins: Arbeitsstunden nach Saisons

## Was ändert sich?

| Bisher | Neu |
|---|---|
| Fester Stichtag 01.10.: An diesem Tag fallen alle Stunden auf 0, und alle verlieren die Reservierungsberechtigung, obwohl die Boote noch im Wasser sind. | Jede Arbeitsstunde gehört zu einer **Saison** (z. B. *Saison 2026*). Für Reservierungen zählt die **aktuelle Saison**, bis ihr die nächste startet. |
| Winterarbeiten vor dem Stichtag zählen für das alte Jahr. | Ab „Buchung öffnen“ zählen Winterarbeiten für die **nächste** Saison. |
| Wer spät dran ist, braucht Ausnahmen. | Wem noch Stunden fehlen, dem schlägt die App automatisch die **laufende** Saison vor. Alle anderen buchen auf die nächste. |

## Bedienung (Systemeinstellungen → Saisonsteuerung)

Zwei Klicks pro Jahr:

1. **Herbst** (z. B. ab Auskranen): **„Buchung für Saison 2027 öffnen“**. Die Reservierungsberechtigung richtet sich weiter nach 2026, gesegelt werden kann weiterhin.
2. **Frühjahr** (z. B. bei Freigabe der Boote): **„Saison 2027 starten“**. Ab jetzt zählen die Stunden für 2027. Der Dialog zeigt vorher, wie viele Mitglieder ihre Stunden schon erfüllt haben.

Die App wechselt nie automatisch. Sind alle Boote freigegeben, erscheint nur ein Hinweis.

## Beim Bestätigen beachten

- Jeder Eintrag zeigt seine Saison. Ein **gelber Chip „Saison X · abweichend“** bedeutet: Das Mitglied hat bewusst eine andere als die vorgeschlagene Saison gewählt. Bitte kurz auf Plausibilität prüfen.
- Ein Klick auf den Saison-Chip ändert die Saison eines Eintrags. Die Änderung wird im Audit-Log festgehalten.
- Unter **Arbeitsstunden** oben die Saison wählen. In der Überlappung können Einträge in **beiden** Saisons auf Prüfung warten (der Hinweis „In Saison 2027 warten X Einträge“ führt direkt dorthin).

## Einmalige Umstellung (nur Superadmin)

1. Daten sichern.
2. Systemeinstellungen → Saisonsteuerung → **Backfill**: „Prüfen“, dann „Backfill ausführen“. Bestehende Stunden werden ihrer Saison zugeordnet, Summen ändern sich nicht.
3. **„Aktivieren …“**: Vorschlag übernehmen (aktuell: **Saison 2026**, Buchung für **2027 geöffnet**). Danach gilt wieder die Berechtigung aus Saison 2026, also für alle, die 2026 ihre Stunden erfüllt haben.

Bis zur Aktivierung bleibt alles wie bisher.

## Weitere Änderungen in diesem Update

- **Strengere Rechteprüfung auf dem Server**:
  - Mitglieder können in öffentlichen Terminen nur noch den eigenen Eintrag ändern.
  - Private Einträge lassen sich nicht selbst bestätigen. Bestätigte private Einträge können nur noch Admins löschen.
  - Bootswarte können Arbeitstermine auch für andere Boote anlegen.
  - Bootswarte können nur noch den Status von Reservierungen ihres Boots ändern.
- **Finale Reservierungen**: nur mit bezahltem Beitrag, und auf gesperrten Booten nur noch als Vormerkung.
- **Admins**: können bei Mitgliedern nur Beitrag und Befreiung ändern. Die übrige Mitgliederverwaltung bleibt beim Superadmin.
