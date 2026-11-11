'use strict';
const { Repository, SEED } = require('../src/repository');
const { BookingService } = require('../src/bookingService');

const FIXED_NOW = new Date('2026-11-11T09:00:00Z');
const DAY = '2026-11-20';

function setup() {
  const repo = new Repository({ seed: JSON.parse(JSON.stringify(SEED)) });
  const service = new BookingService(repo, { clock: () => FIXED_NOW });
  return { repo, service };
}

const book = (service, over = {}) =>
  service.createBooking({ userId: 'u1', labId: 'LAB-A', date: DAY, startHour: 10, endHour: 12, ...over });

const codeOf = (fn) => {
  try { fn(); } catch (e) { return e.code; }
  return null;
};

describe('Positive cases', () => {
  test('TC-01 student books a free slot', () => {
    const { service } = setup();
    const { booking, bumped } = book(service);
    expect(booking.status).toBe('CONFIRMED');
    expect(bumped).toEqual([]);
  });

  test('TC-02 back-to-back bookings do not conflict (10-11 then 11-12)', () => {
    const { service } = setup();
    book(service, { startHour: 10, endHour: 11 });
    expect(() => book(service, { userId: 'u2', startHour: 11, endHour: 12 })).not.toThrow();
  });

  test('TC-03 same slot in a different lab is allowed', () => {
    const { service } = setup();
    book(service);
    expect(() => book(service, { userId: 'u2', labId: 'LAB-B' })).not.toThrow();
  });

  test('TC-04 cancelled slot becomes bookable again', () => {
    const { service } = setup();
    const { booking } = book(service);
    service.cancelBooking(booking.id, 'u1');
    expect(() => book(service, { userId: 'u2' })).not.toThrow();
  });

  test('TC-05 faculty bumps a student booking and the student is notified', () => {
    const { service } = setup();
    const { booking: student } = book(service);
    const result = service.createBooking({
      userId: 'u3', labId: 'LAB-A', date: DAY, startHour: 11, endHour: 13, purpose: 'class',
    });
    expect(result.bumped).toEqual([student.id]);
    expect(service.listBookings({ labId: 'LAB-A', date: DAY }).find((b) => b.id === student.id).status).toBe('BUMPED');
    expect(service.getNotifications('u1')).toHaveLength(1);
  });

  test('TC-06 availability grid reflects bookings', () => {
    const { service } = setup();
    book(service, { startHour: 9, endHour: 11 });
    const slots = service.getAvailability('LAB-A', DAY);
    expect(slots.filter((s) => !s.free).map((s) => s.hour)).toEqual([9, 10]);
    expect(slots).toHaveLength(12);
  });
});

describe('Negative cases', () => {
  test('TC-07 overlapping student booking is rejected (CONFLICT)', () => {
    const { service } = setup();
    book(service);
    expect(codeOf(() => book(service, { userId: 'u2', startHour: 11, endHour: 13 }))).toBe('CONFLICT');
  });

  test('TC-08 student cannot bump another student or faculty', () => {
    const { service } = setup();
    service.createBooking({ userId: 'u3', labId: 'LAB-A', date: DAY, startHour: 10, endHour: 12 });
    expect(codeOf(() => book(service))).toBe('CONFLICT');
  });

  test('TC-09 faculty cannot bump another faculty booking (equal priority)', () => {
    const { repo, service } = setup();
    repo.users.push({ id: 'u5', name: 'Dr. Ahmed', role: 'FACULTY' });
    service.createBooking({ userId: 'u3', labId: 'LAB-A', date: DAY, startHour: 10, endHour: 12 });
    expect(codeOf(() => book(service, { userId: 'u5' }))).toBe('CONFLICT');
  });

  test('TC-10 booking outside opening hours is rejected', () => {
    const { service } = setup();
    expect(codeOf(() => book(service, { startHour: 6, endHour: 8 }))).toBe('OUTSIDE_HOURS');
    expect(codeOf(() => book(service, { startHour: 19, endHour: 21 }))).toBe('OUTSIDE_HOURS');
  });

  test('TC-11 end before start / non-integer hours are rejected', () => {
    const { service } = setup();
    expect(codeOf(() => book(service, { startHour: 12, endHour: 10 }))).toBe('INVALID_TIME');
    expect(codeOf(() => book(service, { startHour: 10.5, endHour: 12 }))).toBe('INVALID_TIME');
  });

  test('TC-12 student booking longer than 3 hours is rejected', () => {
    const { service } = setup();
    expect(codeOf(() => book(service, { startHour: 9, endHour: 13 }))).toBe('TOO_LONG');
  });

  test('TC-13 student exceeding 2 bookings per day is rejected', () => {
    const { service } = setup();
    book(service, { startHour: 8, endHour: 9 });
    book(service, { startHour: 10, endHour: 11 });
    expect(codeOf(() => book(service, { startHour: 12, endHour: 13 }))).toBe('DAILY_LIMIT');
  });

  test('TC-14 past dates and invalid dates are rejected', () => {
    const { service } = setup();
    expect(codeOf(() => book(service, { date: '2026-11-10' }))).toBe('PAST_DATE');
    expect(codeOf(() => book(service, { date: '2026-02-31' }))).toBe('INVALID_DATE');
    expect(codeOf(() => book(service, { date: 'tomorrow' }))).toBe('INVALID_DATE');
  });

  test('TC-15 unknown user or lab is rejected', () => {
    const { service } = setup();
    expect(codeOf(() => book(service, { userId: 'nobody' }))).toBe('UNKNOWN_USER');
    expect(codeOf(() => book(service, { labId: 'LAB-Z' }))).toBe('UNKNOWN_LAB');
  });

  test('TC-16 only the owner or an admin may cancel', () => {
    const { service } = setup();
    const { booking } = book(service);
    expect(codeOf(() => service.cancelBooking(booking.id, 'u2'))).toBe('FORBIDDEN');
    expect(service.cancelBooking(booking.id, 'u4').status).toBe('CANCELLED');
  });

  test('TC-17 cancelling twice / unknown booking is rejected', () => {
    const { service } = setup();
    const { booking } = book(service);
    service.cancelBooking(booking.id, 'u1');
    expect(codeOf(() => service.cancelBooking(booking.id, 'u1'))).toBe('NOT_ACTIVE');
    expect(codeOf(() => service.cancelBooking(999, 'u1'))).toBe('UNKNOWN_BOOKING');
  });
});
