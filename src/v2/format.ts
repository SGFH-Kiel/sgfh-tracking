/** Minuten als kurze Stundenangabe, z. B. „4,5 h“ oder „45 min“. */
export function formatHours(minutes: number): string {
  if (minutes > 0 && minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours.toLocaleString('de-DE')} h`;
}
