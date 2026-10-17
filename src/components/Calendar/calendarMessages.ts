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
