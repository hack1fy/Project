'use strict';

const ROLES = { STUDENT: 'STUDENT', FACULTY: 'FACULTY', ADMIN: 'ADMIN' };

// Business rules live in one object so they can be changed (or tested) without touching logic.
const DEFAULT_RULES = {
  openHour: 8,
  closeHour: 20,
  maxStudentHours: 3, // longest single booking a student may make
  maxStudentBookingsPerDay: 2, // fairness: stops one student hogging a lab
  priority: { STUDENT: 1, FACULTY: 2, ADMIN: 3 }, // higher priority may bump lower priority
};

class BookingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BookingError';
    this.code = code;
  }
}

class BookingService {
  constructor(repo, { rules = DEFAULT_RULES, clock = () => new Date() } = {}) {
    this.repo = repo;
    this.rules = rules;
    this.clock = clock;
  }

  // ---- validation helpers -------------------------------------------------
  _requireUser(userId) {
    const user = this.repo.users.find((u) => u.id === userId);
    if (!user) throw new BookingError('UNKNOWN_USER', `User ${userId} does not exist`);
    return user;
  }

  _requireLab(labId) {
    const lab = this.repo.labs.find((l) => l.id === labId);
    if (!lab) throw new BookingError('UNKNOWN_LAB', `Lab ${labId} does not exist`);
    return lab;
  }

  _validateDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      throw new BookingError('INVALID_DATE', 'Date must be YYYY-MM-DD');
    }
    const d = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
      throw new BookingError('INVALID_DATE', `${date} is not a real calendar date`);
    }
    const today = this.clock().toISOString().slice(0, 10);
    if (date < today) throw new BookingError('PAST_DATE', 'Cannot book a date in the past');
  }

  _validateHours(startHour, endHour) {
    if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) {
      throw new BookingError('INVALID_TIME', 'Start and end must be whole hours');
    }
    if (endHour <= startHour) {
      throw new BookingError('INVALID_TIME', 'End hour must be after start hour');
    }
    if (startHour < this.rules.openHour || endHour > this.rules.closeHour) {
      throw new BookingError(
        'OUTSIDE_HOURS',
        `Labs are open ${this.rules.openHour}:00-${this.rules.closeHour}:00`
      );
    }
  }

  _activeBookings(labId, date) {
    return this.repo.bookings.filter(
      (b) => b.labId === labId && b.date === date && b.status === 'CONFIRMED'
    );
  }

  // ---- use cases ----------------------------------------------------------
  createBooking({ userId, labId, date, startHour, endHour, purpose = '' }) {
    const user = this._requireUser(userId);
    this._requireLab(labId);
    this._validateDate(date);
    this._validateHours(startHour, endHour);

    if (user.role === ROLES.STUDENT) {
      if (endHour - startHour > this.rules.maxStudentHours) {
        throw new BookingError('TOO_LONG', `Students may book at most ${this.rules.maxStudentHours} hours`);
      }
      const mine = this.repo.bookings.filter(
        (b) => b.userId === userId && b.date === date && b.status === 'CONFIRMED'
      );
      if (mine.length >= this.rules.maxStudentBookingsPerDay) {
        throw new BookingError(
          'DAILY_LIMIT',
          `Limit of ${this.rules.maxStudentBookingsPerDay} bookings per day reached`
        );
      }
    }

    const overlapping = this._activeBookings(labId, date).filter(
      (b) => startHour < b.endHour && b.startHour < endHour
    );

    // A requester may only bump bookings made by strictly lower-priority roles.
    const myPriority = this.rules.priority[user.role];
    const blocking = overlapping.filter((b) => {
      const owner = this.repo.users.find((u) => u.id === b.userId);
      return this.rules.priority[owner.role] >= myPriority;
    });
    if (blocking.length > 0) {
      throw new BookingError('CONFLICT', 'That slot overlaps an existing booking you cannot override');
    }

    for (const b of overlapping) {
      b.status = 'BUMPED';
      this.repo.addNotification(
        b.userId,
        `Your booking of ${b.labId} on ${b.date} ${b.startHour}:00-${b.endHour}:00 was moved aside by ${user.name} (${user.role}). Please rebook.`
      );
    }

    const booking = this.repo.addBooking({
      userId, labId, date, startHour, endHour, purpose, status: 'CONFIRMED',
    });
    this.repo.save();
    return { booking, bumped: overlapping.map((b) => b.id) };
  }

  cancelBooking(bookingId, actorId) {
    const actor = this._requireUser(actorId);
    const booking = this.repo.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new BookingError('UNKNOWN_BOOKING', `Booking ${bookingId} does not exist`);
    if (booking.status !== 'CONFIRMED') {
      throw new BookingError('NOT_ACTIVE', 'Only confirmed bookings can be cancelled');
    }
    if (booking.userId !== actorId && actor.role !== ROLES.ADMIN) {
      throw new BookingError('FORBIDDEN', 'You can only cancel your own bookings');
    }
    booking.status = 'CANCELLED';
    this.repo.save();
    return booking;
  }

  listBookings({ labId, date } = {}) {
    return this.repo.bookings.filter(
      (b) => (!labId || b.labId === labId) && (!date || b.date === date)
    );
  }

  getAvailability(labId, date) {
    this._requireLab(labId);
    this._validateDate(date);
    const active = this._activeBookings(labId, date);
    const slots = [];
    for (let h = this.rules.openHour; h < this.rules.closeHour; h += 1) {
      const taken = active.find((b) => h >= b.startHour && h < b.endHour);
      slots.push({ hour: h, free: !taken, bookingId: taken ? taken.id : null });
    }
    return slots;
  }

  getNotifications(userId) {
    this._requireUser(userId);
    return this.repo.notifications.filter((n) => n.userId === userId);
  }
}

module.exports = { BookingService, BookingError, ROLES, DEFAULT_RULES };
