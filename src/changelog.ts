import { ChangelogEntry } from './domain/changelog';

/**
 * Neuigkeiten / Changelog der App – neueste Einträge zuerst.
 *
 * Jede Änderung an App oder Logik, die Nutzer betrifft, bekommt hier einen Eintrag (siehe docs/changelog.md):
 * - `id` eindeutig und stabil (Datum + Stichwort), nie nachträglich ändern
 * - Abschnitte je Zielgruppe: `all`, `bootswart`, `admin`, `superadmin`
 * - kurze, verständliche Sätze aus Sicht der Nutzer, keine Technikdetails
 * - `onlyWhen`, wenn ein Abschnitt erst nach Aktivierung eines Features gilt
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-10-17-neuigkeiten',
    date: '2026-10-17',
    title: 'Neuigkeiten in der App',
    type: 'feature',
    sections: [
      {
        audience: 'all',
        items: [
          'Unter „Neuigkeiten“ im Menü stehen ab sofort alle Änderungen an der App – neue Funktionen, geänderte Regeln und Fehlerbehebungen.',
          'Ein Punkt am Menü-Symbol zeigt, wenn es etwas Neues gibt.',
        ],
      },
    ],
  },
  {
    id: '2026-10-17-saisons',
    date: '2026-10-17',
    title: 'Arbeitsstunden nach Saisons',
    type: 'feature',
    summary: 'Kein harter Jahreswechsel mehr: Arbeitsstunden zählen jetzt für eine Saison, die Reservierungsberechtigung bleibt bis zum Start der neuen Saison bestehen.',
    sections: [
      {
        audience: 'all',
        onlyWhen: 'seasonModelActive',
        items: [
          'Jede Arbeitsstunde gehört zu einer Saison (z. B. „Saison 2026“). Für Reservierungen zählen die Stunden der aktuellen Saison.',
          'Bisher fielen am Stichtag 01.10. alle Stunden auf 0 – auch wenn die Boote noch im Wasser waren. Jetzt gilt die Berechtigung weiter, bis die neue Saison im Frühjahr gestartet wird.',
          'Gegen Saisonende (z. B. ab dem Auskranen) kann schon für die nächste Saison gebucht werden – Winterarbeiten zählen dann für die neue Saison.',
          'Beim Eintragen schlägt die App die passende Saison vor: Fehlen dir noch Stunden für die laufende Saison, zählt der Eintrag für diese, sonst für die nächste. Du kannst abweichend wählen.',
          'Unter „Arbeitsstunden“ lässt sich oben die Saison auswählen – auch vergangene Saisons sind einsehbar.',
        ],
      },
      {
        audience: 'bootswart',
        title: 'Beim Bestätigen',
        onlyWhen: 'seasonModelActive',
        items: [
          'Jeder Eintrag zeigt seine Saison. Ein gelber Chip „Saison X · abweichend“ bedeutet: Das Mitglied hat bewusst eine andere als die vorgeschlagene Saison gewählt – bitte kurz auf Plausibilität prüfen.',
          'Ein Klick auf den Saison-Chip ändert die Saison eines Eintrags (wird im Audit-Log festgehalten).',
          'In der Übergangsphase können Einträge in beiden Saisons auf Prüfung warten – der Hinweis „In Saison … warten … Einträge“ führt direkt dorthin.',
        ],
      },
      {
        audience: 'admin',
        title: 'Saisonsteuerung (Systemeinstellungen)',
        onlyWhen: 'seasonModelActive',
        items: [
          'Zwei Klicks pro Jahr: im Herbst „Buchung für Saison N+1 öffnen“, im Frühjahr (z. B. bei Freigabe der Boote) „Saison N+1 starten“.',
          'Vor dem Start zeigt die App, wie viele Mitglieder ihre Stunden für die neue Saison schon erfüllt haben.',
          'Die App wechselt nie automatisch. Sind alle Boote freigegeben, erscheint nur ein Hinweis.',
        ],
      },
      {
        audience: 'superadmin',
        title: 'Einmalige Umstellung',
        onlyWhen: 'seasonModelInactive',
        items: [
          'Bis zur Aktivierung rechnet die App unverändert mit dem Stichtag. Für die Umstellung: Daten sichern, dann unter Systemeinstellungen → Saisonsteuerung „Backfill“ ausführen und anschließend „Aktivieren …“.',
          'Vorschlag bei Aktivierung im Herbst 2026: aktuelle Saison 2026, Buchung für 2027 geöffnet. Damit erhalten alle, die 2026 ihre Stunden erfüllt haben, ihre Reservierungsberechtigung zurück.',
        ],
      },
    ],
  },
  {
    id: '2026-10-17-rechte',
    date: '2026-10-17',
    title: 'Klarere Rechte bei Arbeitsstunden und Reservierungen',
    type: 'security',
    sections: [
      {
        audience: 'all',
        items: [
          'Private Arbeitsstunden werden von einem Admin oder Bootswart bestätigt. Bestätigte private Einträge können nur noch Admins löschen.',
          'In öffentlichen Arbeitsterminen kann jedes Mitglied nur den eigenen Eintrag ändern: eintragen, austragen (solange nicht bestätigt) sowie Zeit und Saison anpassen.',
          'Finale Reservierungen setzen einen bezahlten Mitgliedsbeitrag voraus. Gesperrte Boote können nur vorgemerkt werden.',
        ],
      },
      {
        audience: 'bootswart',
        items: [
          'Bootswarte können Arbeitstermine auch für andere Boote anlegen und Termine ihres Boots einem anderen Boot zuordnen.',
          'Bei fremden Reservierungen ihres Boots ändern Bootswarte den Status (genehmigen, ablehnen, stornieren).',
        ],
      },
      {
        audience: 'admin',
        items: [
          'Admins legen eigene private Einträge weiterhin direkt bestätigt an.',
          'Bei Mitgliedern ändern Admins Beitrag und Befreiung von den Arbeitsstunden; die übrige Mitgliederverwaltung liegt beim Superadmin.',
        ],
      },
    ],
  },
  {
    id: '2026-10-17-mobil',
    date: '2026-10-17',
    title: 'Bessere Bedienung auf dem Smartphone',
    type: 'improvement',
    sections: [
      {
        audience: 'all',
        items: [
          'Dialoge öffnen auf dem Smartphone bildschirmfüllend – alle Schaltflächen (z. B. „Teilnehmen“) sind erreichbar.',
          'Kompakte Kopfzeile und Tabellen ohne seitliches Scrollen.',
          'Neue Schaltflächen „Reservieren“ bzw. „Vormerken“ im Vormerkbuch; Wochen- und Tagesansicht starten um 07:00.',
        ],
      },
      {
        audience: 'bootswart',
        items: [
          'Neue Schaltfläche „Termin anlegen“ im Arbeitskalender – ohne langes Drücken auf einen Zeitslot.',
        ],
      },
      {
        audience: 'admin',
        items: [
          'Behoben: In der Mitgliederliste erschien der Chip „Bootswart“ bei allen Mitgliedern, sobald der Betrachter selbst Bootswart war.',
        ],
      },
    ],
  },
];
