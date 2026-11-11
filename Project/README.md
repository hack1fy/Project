# LabSlot - Campus Lab Booking (SCD Lab 16)

Small web app for booking university lab slots with fairness limits and priority-based overrides.

## Run
```bash
npm install
npm start        # http://localhost:3000
npm test         # 17 Jest tests
```

## Rules (see `DEFAULT_RULES` in `src/bookingService.js`)
- Open 08:00-20:00, whole-hour slots, no past dates
- Students: max 3 h per booking, max 2 bookings per day
- No overlaps in the same lab, unless the requester has strictly higher priority (Student 1 < Faculty 2 < Admin 3); bumped users get a notification
- Owners can cancel their own bookings; Admin can cancel any

## API
`GET /api/labs` `GET /api/users` `GET /api/bookings?labId&date` `GET /api/availability?labId&date`
`GET /api/notifications?userId` `POST /api/bookings` `DELETE /api/bookings/:id?actorId=`

## Layout
`src/` logic and storage, `server.js` + `public/` API and UI, `tests/` Jest tests, `docs/` UML diagrams, `.github/workflows/ci.yml` CI.
