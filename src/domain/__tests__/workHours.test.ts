import { calculateDurationMinutes, calculateUserWorkHourSnapshot, getAccountingYearStart } from '../workHours';
import { SystemConfig, User, UserRole, WorkAppointment } from '../../types/models';

const config: SystemConfig = {
  id: 'default',
  yearChangeDate: new Date(2000, 0, 1),
  workHourThreshold: 25,
};

const user: User = {
  id: 'u1',
  email: 'user@example.com',
  displayName: 'Test User',
  roles: [UserRole.MEMBER],
  feesPaid: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createAppointment = (overrides: Partial<WorkAppointment>): WorkAppointment => ({
  id: 'a1',
  title: 'Arbeitseinsatz',
  description: 'Test',
  startTime: new Date('2025-01-10T10:00:00Z'),
  endTime: new Date('2025-01-10T12:30:00Z'),
  participants: [{
    userId: user.id,
    userName: user.displayName,
    status: 'confirmed',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  }],
  supplies: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('workHours domain', () => {
  it('calculates basic minutes correctly', () => {
    expect(calculateDurationMinutes(new Date('2025-01-01T10:00:00Z'), new Date('2025-01-01T11:30:00Z'))).toBe(90);
  });

  it('returns zero for invalid negative durations', () => {
    expect(calculateDurationMinutes(new Date('2025-01-01T12:00:00Z'), new Date('2025-01-01T11:30:00Z'))).toBe(0);
  });

  it('classifies confirmed past entries as completed', () => {
    const result = calculateUserWorkHourSnapshot(user, [createAppointment({})], config, new Date('2025-01-11T00:00:00Z'));
    expect(result.summary.completedMinutes).toBe(150);
    expect(result.summary.pendingMinutes).toBe(0);
    expect(result.summary.status).toBe('open');
  });

  it('classifies future confirmed entries as pending until they are in the past', () => {
    const result = calculateUserWorkHourSnapshot(user, [createAppointment({ startTime: new Date('2025-02-01T10:00:00Z'), endTime: new Date('2025-02-01T12:00:00Z') })], config, new Date('2025-01-15T00:00:00Z'));
    expect(result.summary.pendingMinutes).toBe(120);
  });

  it('handles declined entries separately', () => {
    const result = calculateUserWorkHourSnapshot(user, [createAppointment({ participants: [{ userId: user.id, userName: user.displayName, status: 'declined', createdAt: new Date(), updatedAt: new Date() }] })], config, new Date('2025-01-15T00:00:00Z'));
    expect(result.summary.declinedMinutes).toBe(150);
    expect(result.summary.status).toBe('attention');
  });

  it('derives year rollover start deterministically', () => {
    const start = getAccountingYearStart({ ...config, yearChangeDate: new Date(2000, 10, 1) }, new Date('2025-01-15T00:00:00Z'));
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(10);
    expect(start.getDate()).toBe(1);
  });

  it('supports entries around new year boundaries', () => {
    const result = calculateUserWorkHourSnapshot(user, [createAppointment({ startTime: new Date('2024-12-31T22:00:00Z'), endTime: new Date('2025-01-01T01:00:00Z') })], config, new Date('2025-01-02T00:00:00Z'));
    expect(result.summary.completedMinutes).toBe(180);
  });

  it('marks skipHours users as paused', () => {
    const result = calculateUserWorkHourSnapshot({ ...user, skipHours: true }, [createAppointment({})], config, new Date('2025-01-11T00:00:00Z'));
    expect(result.summary.status).toBe('paused');
  });
});
