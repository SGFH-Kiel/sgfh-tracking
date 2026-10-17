import type React from 'react';
import { Messages } from 'react-big-calendar';
import { CalendarView } from '../../types/models';

/** Ansichten der Kalender; die Listenansicht („agenda“) gibt es nur in v2 und wird nicht als Voreinstellung gespeichert. */
export type CalendarViewOption = CalendarView | 'agenda';

export const CALENDAR_MESSAGES: Messages = {
  next: 'Weiter',
  previous: 'Zurück',
  today: 'Heute',
  month: 'Monat',
  week: 'Woche',
  day: 'Tag',
  agenda: 'Liste',
  date: 'Datum',
  time: 'Zeit',
  event: 'Eintrag',
  noEventsInRange: 'Keine Einträge in diesem Zeitraum.',
  showMore: (count: number) => `+${count} weitere`,
};

/**
 * Höhe der Kalender. v1 unverändert. In v2 füllen Wochen-/Tagesansicht den sichtbaren Bereich
 * (dvh berücksichtigt ein- und ausfahrende Browserleisten), die Listenansicht wächst mit dem Inhalt –
 * so gibt es keinen Scrollbereich im Scrollbereich.
 */
export function getCalendarStyle(v2Layout: boolean, isMobile: boolean, view: CalendarViewOption): React.CSSProperties {
  if (!v2Layout) {
    return { height: 'calc(100vh - 250px)', minHeight: 400 };
  }
  if (view === 'agenda') {
    return { height: 'auto', minHeight: 240 };
  }
  return { height: isMobile ? 'calc(100dvh - 330px)' : 'calc(100dvh - 300px)', minHeight: 380 };
}

