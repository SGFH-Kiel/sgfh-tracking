# Tests

## Vorhandene Testbereiche

- `src/domain/__tests__/workHours.test.ts`
  - Dauerberechnung
  - Statusklassifikation
  - Jahreswechsel
  - Randfälle um den Jahreswechsel
- `src/domain/__tests__/reservations.test.ts`
  - Konflikterkennung
  - Warn- vs. Blockierkonflikte
  - öffentlicher Feed
- `src/firestore/__tests__/rules.test.ts`
  - anonymer Zugriff
  - Mitgliedszugriff
  - Besitzschutz
  - öffentliche Feed-Rechte

## Hinweise

Da in diesem Arbeitsmodus keine Abhängigkeiten installiert oder Tests ausgeführt werden sollten, wurden die Testdateien vorbereitet, aber nicht lokal ausgeführt.
