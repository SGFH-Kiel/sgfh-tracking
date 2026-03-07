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
