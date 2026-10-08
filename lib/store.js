'use strict';
/* Minimal Postgres-backed session store for express-session (Vercel). */
const session = require('express-session');
const { db } = require('./db');

class PgStore extends session.Store {
  get(sid, cb) {
    db.prepare('SELECT data, expires FROM sessions WHERE id = ?').get(sid)
      .then((row) => {
        if (!row || Number(row.expires) < Date.now()) {
          if (row) db.prepare('DELETE FROM sessions WHERE id = ?').run(sid).catch(() => {});
          return cb(null, null);
        }
        try { cb(null, JSON.parse(row.data)); }
        catch (e) { cb(e); }
      })
      .catch((e) => cb(e));
  }
  set(sid, sess, cb) {
    const expires = Date.now() + (sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 12 * 3600e3);
    db.prepare(`INSERT INTO sessions (id, data, expires) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, expires = excluded.expires`)
      .run(sid, JSON.stringify(sess), expires)
      .then(() => cb(null))
      .catch((e) => cb(e));
  }
  destroy(sid, cb) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sid)
      .then(() => cb(null))
      .catch((e) => cb(e));
  }
  touch(sid, sess, cb) { this.set(sid, sess, cb || (() => {})); }
}
module.exports = PgStore;
