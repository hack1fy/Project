# LabSlot - Campus Lab Booking System

A small web app for booking university lab slots. It stops double bookings, limits how much one student can book, and lets faculty/admin override lower-priority bookings (the affected user gets a notification).

Built for **SCD (SW315) Lab 16 - Open-Ended Lab**, MUET Jamshoro.
**Author:** Mehmood Ali (24SW109)

## Features
- Book, cancel and view hourly availability for a lab (08:00-20:00)
- No overlapping bookings in the same lab
- Student limits: max 3 hours per booking, 2 bookings per day
- Priority: Student < Faculty < Admin; higher roles can bump lower ones
- Notifications for bumped bookings
- Clear error codes (`CONFLICT`, `OUTSIDE_HOURS`, `TOO_LONG`, `DAILY_LIMIT`, ...)

## Tech
Node.js 20, plain `http` server, JSON-file storage, Jest for tests, GitHub Actions for CI.

## Run
```bash
npm install
npm start      # open http://localhost:3000
npm test       # runs the 17 Jest tests
```

## Project structure
```
src/bookingService.js   business rules (validation, limits, priority)
src/repository.js       data storage (in-memory + optional JSON file)
server.js, public/      REST API and web UI
tests/                  automated tests
docs/                   use case, class and sequence diagrams
.github/workflows/      CI pipeline (test on every push)
```

## API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/availability?labId=&date=` | hourly availability |
| GET | `/api/bookings?labId=&date=` | list bookings |
| POST | `/api/bookings` | create a booking |
| DELETE | `/api/bookings/:id?actorId=` | cancel a booking |
| GET | `/api/notifications?userId=` | user notifications |

## Known limitations
JSON file storage is single-process, there is no real login (user is chosen from a list), and dates use UTC.
