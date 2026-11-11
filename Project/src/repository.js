'use strict';
const fs = require('fs');

// Deliberately tiny persistence layer: arrays in memory, optionally mirrored to a JSON file.
// Swapping this for SQLite/PostgreSQL later only means re-implementing these few methods.
class Repository {
  constructor({ filePath = null, seed = null } = {}) {
    this.filePath = filePath;
    this.users = [];
    this.labs = [];
    this.bookings = [];
    this.notifications = [];
    this._nextBookingId = 1;

    if (filePath && fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.users = data.users;
      this.labs = data.labs;
      this.bookings = data.bookings;
      this.notifications = data.notifications;
      this._nextBookingId = data.nextBookingId;
    } else if (seed) {
      this.users = seed.users || [];
      this.labs = seed.labs || [];
    }
  }

  addBooking(fields) {
    const booking = { id: this._nextBookingId++, ...fields };
    this.bookings.push(booking);
    return booking;
  }

  addNotification(userId, message) {
    this.notifications.push({ userId, message, at: new Date().toISOString() });
  }

  save() {
    if (!this.filePath) return;
    const data = {
      users: this.users,
      labs: this.labs,
      bookings: this.bookings,
      notifications: this.notifications,
      nextBookingId: this._nextBookingId,
    };
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }
}

const SEED = {
  labs: [
    { id: 'LAB-A', name: 'Software Lab A', capacity: 30 },
    { id: 'LAB-B', name: 'Networks Lab B', capacity: 24 },
  ],
  users: [
    { id: 'u1', name: 'Ali (Student)', role: 'STUDENT' },
    { id: 'u2', name: 'Sara (Student)', role: 'STUDENT' },
    { id: 'u3', name: 'Dr. Khan (Faculty)', role: 'FACULTY' },
    { id: 'u4', name: 'Lab Admin', role: 'ADMIN' },
  ],
};

module.exports = { Repository, SEED };
