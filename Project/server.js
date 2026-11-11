'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { Repository, SEED } = require('./src/repository');
const { BookingService, BookingError } = require('./src/bookingService');

const repo = new Repository({ filePath: path.join(__dirname, 'data.json'), seed: SEED });
const service = new BookingService(repo);

const STATUS_FOR = { CONFLICT: 409, FORBIDDEN: 403, UNKNOWN_BOOKING: 404, UNKNOWN_USER: 404, UNKNOWN_LAB: 404 };

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new BookingError('BAD_JSON', 'Body is not valid JSON')); } });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const full = path.join(__dirname, 'public', path.normalize(file));
      if (!full.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(full)) return send(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(fs.readFileSync(full));
    }
    if (req.method === 'GET' && url.pathname === '/api/labs') return send(res, 200, repo.labs);
    if (req.method === 'GET' && url.pathname === '/api/users') return send(res, 200, repo.users);
    if (req.method === 'GET' && url.pathname === '/api/bookings') {
      return send(res, 200, service.listBookings({ labId: url.searchParams.get('labId') || undefined, date: url.searchParams.get('date') || undefined }));
    }
    if (req.method === 'GET' && url.pathname === '/api/availability') {
      return send(res, 200, service.getAvailability(url.searchParams.get('labId'), url.searchParams.get('date')));
    }
    if (req.method === 'GET' && url.pathname === '/api/notifications') {
      return send(res, 200, service.getNotifications(url.searchParams.get('userId')));
    }
    if (req.method === 'POST' && url.pathname === '/api/bookings') {
      return send(res, 201, service.createBooking(await readJson(req)));
    }
    const del = url.pathname.match(/^\/api\/bookings\/(\d+)$/);
    if (req.method === 'DELETE' && del) {
      return send(res, 200, service.cancelBooking(Number(del[1]), url.searchParams.get('actorId')));
    }
    return send(res, 404, { error: 'Not found' });
  } catch (err) {
    if (err instanceof BookingError) return send(res, STATUS_FOR[err.code] || 400, { code: err.code, message: err.message });
    console.error(err);
    return send(res, 500, { error: 'Internal error' });
  }
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`LabSlot running on http://localhost:${port}`));
}
module.exports = server;
