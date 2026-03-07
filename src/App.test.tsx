import { calculateDurationMinutes } from './domain/workHours';

test('berechnet Minuten robust', () => {
  expect(calculateDurationMinutes(new Date('2025-01-01T10:00:00Z'), new Date('2025-01-01T11:30:00Z'))).toBe(90);
});
